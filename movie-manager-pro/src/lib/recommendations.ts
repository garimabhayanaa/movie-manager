import { database } from './database';
import { tmdb } from './tmdb';
import { UserMovie, Movie, Genre } from '@/types';

interface RecommendationScore {
  movieId: number;
  score: number;
  reasons: string[];
}

export class RecommendationEngine {
  static async getRecommendations(userId: string, limit = 20): Promise<Movie[]> {
    try {
      // Get user's movie history
      const userMovies = await database.getUserMovies(userId);
      const watchedMovies = userMovies.filter(um => um.status === 'watched');

      if (watchedMovies.length === 0) {
        // Return popular movies for new users
        const popular = await tmdb.getPopular();
        return popular.results.slice(0, limit);
      }

      // Analyze user preferences
      const preferences = await this.analyzeUserPreferences(watchedMovies);
      
      // Get recommendations based on preferences
      const recommendations = await this.generateRecommendations(preferences, watchedMovies, limit);
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback to popular movies
      const popular = await tmdb.getPopular();
      return popular.results.slice(0, limit);
    }
  }

  static async analyzeUserPreferences(watchedMovies: UserMovie[]): Promise<{
    favoriteGenres: { [genreId: number]: number };
    averageRating: number;
    ratingDistribution: { [rating: number]: number };
    preferredDecades: { [decade: string]: number };
  }> {
    const genreScores: { [genreId: number]: number } = {};
    const ratingDistribution: { [rating: number]: number } = {};
    const decadeScores: { [decade: string]: number } = {};
    let totalRating = 0;
    let ratedMoviesCount = 0;

    // Fetch movie details for analysis
    for (const userMovie of watchedMovies) {
      try {
        const movie = await tmdb.getMovie(userMovie.movieId);
        
        // Analyze genres (weight by rating if available)
        const weight = userMovie.rating || 3.5;
        movie.genres?.forEach((genre: Genre) => {
          genreScores[genre.id] = (genreScores[genre.id] || 0) + weight;
        });

        // Analyze ratings
        if (userMovie.rating) {
          ratingDistribution[userMovie.rating] = (ratingDistribution[userMovie.rating] || 0) + 1;
          totalRating += userMovie.rating;
          ratedMoviesCount++;
        }

        // Analyze release decades
        if (movie.release_date) {
          const year = new Date(movie.release_date).getFullYear();
          const decade = `${Math.floor(year / 10) * 10}s`;
          decadeScores[decade] = (decadeScores[decade] || 0) + weight;
        }
      } catch (error) {
        console.error(`Error fetching movie ${userMovie.movieId}:`, error);
      }
    }

    return {
      favoriteGenres: genreScores,
      averageRating: ratedMoviesCount > 0 ? totalRating / ratedMoviesCount : 3.5,
      ratingDistribution,
      preferredDecades: decadeScores,
    };
  }

  static async generateRecommendations(
    preferences: any,
    watchedMovies: UserMovie[],
    limit: number
  ): Promise<Movie[]> {
    const watchedMovieIds = new Set(watchedMovies.map(um => um.movieId));
    const candidateMovies: RecommendationScore[] = [];

    // Get top genres
    const sortedGenres = Object.entries(preferences.favoriteGenres)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3);

    // Fetch movies from favorite genres
    for (const [genreId, score] of sortedGenres) {
      try {
        const genreMovies = await this.getMoviesByGenre(parseInt(genreId));
        
        genreMovies.forEach(movie => {
          if (!watchedMovieIds.has(movie.id)) {
            const movieScore = this.calculateMovieScore(movie, preferences);
            candidateMovies.push({
              movieId: movie.id,
              score: movieScore,
              reasons: [`Popular in ${movie.genres?.find(g => g.id === parseInt(genreId))?.name}`]
            });
          }
        });
      } catch (error) {
        console.error(`Error fetching genre ${genreId} movies:`, error);
      }
    }

    // Add trending movies with lower priority
    try {
      const trending = await tmdb.getTrending();
      trending.results.forEach((movie: Movie) => {
        if (!watchedMovieIds.has(movie.id)) {
          const movieScore = this.calculateMovieScore(movie, preferences) * 0.7; // Lower weight for trending
          candidateMovies.push({
            movieId: movie.id,
            score: movieScore,
            reasons: ['Currently trending']
          });
        }
      });
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    }

    // Sort by score and remove duplicates
    const uniqueMovies = new Map();
    candidateMovies.forEach(candidate => {
      if (!uniqueMovies.has(candidate.movieId) || 
          uniqueMovies.get(candidate.movieId).score < candidate.score) {
        uniqueMovies.set(candidate.movieId, candidate);
      }
    });

    const sortedRecommendations = Array.from(uniqueMovies.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fetch full movie details
    const recommendations: Movie[] = [];
    for (const rec of sortedRecommendations) {
      try {
        const movie = await tmdb.getMovie(rec.movieId);
        recommendations.push(movie);
      } catch (error) {
        console.error(`Error fetching recommended movie ${rec.movieId}:`, error);
      }
    }

    return recommendations;
  }

  static calculateMovieScore(movie: Movie, preferences: any): number {
    let score = 0;
    
    // Base score from TMDB rating
    score += movie.vote_average * 0.3;
    
    // Genre preference score
    movie.genre_ids?.forEach(genreId => {
      if (preferences.favoriteGenres[genreId]) {
        score += preferences.favoriteGenres[genreId] * 0.4;
      }
    });
    
    // Release date preference
    if (movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      const decade = `${Math.floor(year / 10) * 10}s`;
      if (preferences.preferredDecades[decade]) {
        score += preferences.preferredDecades[decade] * 0.2;
      }
    }
    
    // Popularity boost
    score += Math.log(movie.vote_average + 1) * 0.1;
    
    return score;
  }

  static async getMoviesByGenre(genreId: number): Promise<Movie[]> {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching movies by genre:', error);
      return [];
    }
  }

  static async getSimilarMovies(movieId: number): Promise<Movie[]> {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching similar movies:', error);
      return [];
    }
  }
}
