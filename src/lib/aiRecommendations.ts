import { GoogleGenerativeAI } from '@google/generative-ai';
import { database } from './database';
import { tmdb } from './tmdb';
import { UserMovie, Movie } from '@/types';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface UserPreferences {
  favoriteGenres: { name: string; weight: number }[];
  averageRating: number;
  preferredDecades: string[];
  favoriteDirectors: string[];
  favoriteActors: string[];
  watchingPatterns: {
    preferredRuntime: number;
    watchingFrequency: string;
  };
}

interface AIRecommendationRequest {
  userId: string;
  context?: string;
  excludeWatched?: boolean;
  limit?: number;
}

interface AIRecommendation {
  movie: Movie;
  confidence: number;
  reasoning: string;
  matchFactors: string[];
}

export class GeminiRecommendationEngine {
  static async generatePersonalizedRecommendations(
    request: AIRecommendationRequest
  ): Promise<AIRecommendation[]> {
    const { userId, context, excludeWatched = true, limit = 10 } = request;

    try {
      // 1. Analyze user preferences
      const userPreferences = await this.analyzeUserPreferences(userId);
      
      // 2. Get user's watched movies for context
      const watchedMovies = await this.getUserWatchedMovies(userId);
      
      // 3. Generate Gemini AI-powered recommendations
      const aiRecommendations = await this.getGeminiRecommendations(
        userPreferences, 
        watchedMovies, 
        context
      );
      
      // 4. Fetch detailed movie data and calculate confidence scores
      const detailedRecommendations = await this.enrichRecommendations(
        aiRecommendations,
        userPreferences,
        watchedMovies
      );

      return detailedRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating Gemini recommendations:', error);
      // Fallback to basic recommendations
      return this.getFallbackRecommendations(userId, limit);
    }
  }

  static async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    const userMovies = await database.getUserMovies(userId);
    const watchedMovies = userMovies.filter(um => um.status === 'watched');
    
    if (watchedMovies.length === 0) {
      return this.getDefaultPreferences();
    }

    const genreWeights: { [genre: string]: number } = {};
    const decades: { [decade: string]: number } = {};
    const directors: { [director: string]: number } = {};
    const actors: { [actor: string]: number } = {};
    let totalRating = 0;
    let ratedCount = 0;
    let totalRuntime = 0;

    // Analyze each watched movie
    for (const userMovie of watchedMovies) {
      try {
        const movieDetails = await tmdb.getMovie(userMovie.movieId);
        
        // Analyze genres with rating weights
        const ratingWeight = userMovie.rating || 3;
        movieDetails.genres?.forEach(genre => {
          genreWeights[genre.name] = (genreWeights[genre.name] || 0) + ratingWeight;
        });

        // Analyze decades
        if (movieDetails.release_date) {
          const year = new Date(movieDetails.release_date).getFullYear();
          const decade = `${Math.floor(year / 10) * 10}s`;
          decades[decade] = (decades[decade] || 0) + ratingWeight;
        }

        // Analyze directors and actors
        const director = movieDetails.credits?.crew?.find(c => c.job === 'Director');
        if (director) {
          directors[director.name] = (directors[director.name] || 0) + ratingWeight;
        }

        movieDetails.credits?.cast?.slice(0, 3).forEach(actor => {
          actors[actor.name] = (actors[actor.name] || 0) + ratingWeight;
        });

        // Calculate averages
        if (userMovie.rating) {
          totalRating += userMovie.rating;
          ratedCount++;
        }
        
        totalRuntime += movieDetails.runtime || 120;
      } catch (error) {
        console.error(`Error analyzing movie ${userMovie.movieId}:`, error);
      }
    }

    // Convert to sorted arrays
    const favoriteGenres = Object.entries(genreWeights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, weight]) => ({ name, weight }));

    const preferredDecades = Object.entries(decades)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([decade]) => decade);

    return {
      favoriteGenres,
      averageRating: ratedCount > 0 ? totalRating / ratedCount : 3.5,
      preferredDecades,
      favoriteDirectors: Object.entries(directors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name]) => name),
      favoriteActors: Object.entries(actors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name),
      watchingPatterns: {
        preferredRuntime: Math.round(totalRuntime / watchedMovies.length),
        watchingFrequency: watchedMovies.length > 20 ? 'frequent' : 'casual'
      }
    };
  }

  static async getGeminiRecommendations(
    preferences: UserPreferences,
    watchedMovies: UserMovie[],
    context?: string
  ): Promise<{ titles: string[], reasoning: string }> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      // Build context prompt
      const watchedTitles = await Promise.all(
        watchedMovies.slice(0, 10).map(async (um) => {
          try {
            const movie = await tmdb.getMovie(um.movieId);
            return `${movie.title} (${movie.release_date?.split('-')[0] || 'Unknown'}) - Rating: ${um.rating || 'Not rated'}`;
          } catch (error) {
            return null;
          }
        })
      );

      const prompt = `
You are an expert movie recommendation AI. Based on the user's viewing history and preferences, recommend 15 movies they would love.

USER PREFERENCES:
- Favorite Genres: ${preferences.favoriteGenres.map(g => g.name).join(', ')}
- Average Rating Given: ${preferences.averageRating}/5
- Preferred Decades: ${preferences.preferredDecades.join(', ')}
- Favorite Directors: ${preferences.favoriteDirectors.join(', ')}
- Favorite Actors: ${preferences.favoriteActors.join(', ')}
- Preferred Runtime: ~${preferences.watchingPatterns.preferredRuntime} minutes
- Viewing Style: ${preferences.watchingPatterns.watchingFrequency}

RECENTLY WATCHED MOVIES:
${watchedTitles.filter(Boolean).join('\n')}

${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

INSTRUCTIONS:
1. Recommend 15 movies that match their taste profile
2. Include a mix of popular and hidden gems
3. Avoid movies they've already watched
4. Include movies from different decades but favor their preferences
5. Provide brief reasoning for your recommendations

FORMAT YOUR RESPONSE AS:
RECOMMENDATIONS:
1. Movie Title (Year)
2. Movie Title (Year)
... (continue for 15 movies)

REASONING:
[Explain your recommendation strategy in 2-3 sentences]
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse the response
      const sections = response.split('REASONING:');
      const recommendationsSection = sections[0].replace('RECOMMENDATIONS:', '').trim();
      const reasoning = sections[1]?.trim() || 'AI-powered recommendations based on your viewing history.';

      // Extract movie titles
      const movieLines = recommendationsSection.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);

      // Clean up titles (remove year info for search)
      const titles = movieLines.map(line => {
        const match = line.match(/^(.+?)\s*\(\d{4}\)/);
        return match ? match[1].trim() : line.split('(')[0].trim();
      });

      return { titles, reasoning };
    } catch (error) {
      console.error('Error getting Gemini recommendations:', error);
      return { 
        titles: ['The Shawshank Redemption', 'Inception', 'Pulp Fiction'], 
        reasoning: 'Fallback recommendations due to AI service error.'
      };
    }
  }

  static async enrichRecommendations(
    aiResponse: { titles: string[], reasoning: string },
    preferences: UserPreferences,
    watchedMovies: UserMovie[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    const watchedMovieIds = new Set(watchedMovies.map(m => m.movieId));

    for (const title of aiResponse.titles) {
      try {
        // Search for the movie
        const searchResults = await tmdb.searchMovies(title, 1);
        if (searchResults.results.length === 0) continue;

        const movie = searchResults.results[0];
        
        // Skip if already watched
        if (watchedMovieIds.has(movie.id)) continue;

        // Calculate confidence score
        const confidence = this.calculateConfidenceScore(movie, preferences);

        // Generate match factors
        const matchFactors = this.generateMatchFactors(movie, preferences);

        recommendations.push({
          movie,
          confidence,
          reasoning: aiResponse.reasoning,
          matchFactors
        });
      } catch (error) {
        console.error(`Error enriching recommendation for "${title}":`, error);
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  static calculateConfidenceScore(movie: Movie, preferences: UserPreferences): number {
    let score = 0;
    
    // Base score from TMDB rating
    score += (movie.vote_average / 10) * 30;
    
    // Genre matching (40% of score)
    const movieGenres = movie.genre_ids || [];
    let genreScore = 0;
    movieGenres.forEach(genreId => {
      const genreMatch = preferences.favoriteGenres.find(g => 
        this.getGenreIdByName(g.name) === genreId
      );
      if (genreMatch) {
        genreScore += genreMatch.weight * 5;
      }
    });
    score += Math.min(genreScore, 40);
    
    // Release year preference (20% of score)
    if (movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      const decade = `${Math.floor(year / 10) * 10}s`;
      if (preferences.preferredDecades.includes(decade)) {
        score += 20;
      }
    }
    
    // Popularity boost (10% of score)
    score += Math.min(movie.vote_average, 10);
    
    return Math.min(score, 100);
  }

  static generateMatchFactors(movie: Movie, preferences: UserPreferences): string[] {
    const factors: string[] = [];
    
    // Check genre matches
    const movieGenres = movie.genre_ids || [];
    movieGenres.forEach(genreId => {
      const genreMatch = preferences.favoriteGenres.find(g => 
        this.getGenreIdByName(g.name) === genreId
      );
      if (genreMatch) {
        factors.push(`Matches your love for ${genreMatch.name}`);
      }
    });
    
    // Check decade preference
    if (movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      const decade = `${Math.floor(year / 10) * 10}s`;
      if (preferences.preferredDecades.includes(decade)) {
        factors.push(`From your preferred ${decade} era`);
      }
    }
    
    // High rating
    if (movie.vote_average >= 7) {
      factors.push('Highly rated by critics and audiences');
    }
    
    return factors.slice(0, 3); // Limit to top 3 factors
  }

  static getGenreIdByName(name: string): number {
    const genreMap: { [key: string]: number } = {
      'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
      'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
      'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
      'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878,
      'TV Movie': 10770, 'Thriller': 53, 'War': 10752, 'Western': 37
    };
    return genreMap[name] || 0;
  }

  static async getUserWatchedMovies(userId: string): Promise<UserMovie[]> {
    const userMovies = await database.getUserMovies(userId);
    return userMovies.filter(um => um.status === 'watched');
  }

  static getDefaultPreferences(): UserPreferences {
    return {
      favoriteGenres: [
        { name: 'Drama', weight: 4 },
        { name: 'Action', weight: 3 },
        { name: 'Comedy', weight: 3 }
      ],
      averageRating: 3.5,
      preferredDecades: ['2010s', '2000s'],
      favoriteDirectors: [],
      favoriteActors: [],
      watchingPatterns: {
        preferredRuntime: 120,
        watchingFrequency: 'casual'
      }
    };
  }

  static async getFallbackRecommendations(userId: string, limit: number): Promise<AIRecommendation[]> {
    try {
      const popular = await tmdb.getPopular();
      return popular.results.slice(0, limit).map((movie: Movie) => ({
        movie,
        confidence: 75,
        reasoning: 'Popular movies currently trending',
        matchFactors: ['Currently popular', 'Highly rated']
      }));
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  // Context-aware recommendations for specific scenarios
  static async getContextualRecommendations(
    userId: string,
    context: 'date_night' | 'family_time' | 'solo_binge' | 'weekend_marathon'
  ): Promise<AIRecommendation[]> {
    const contextPrompts = {
      date_night: 'romantic movies perfect for a date night',
      family_time: 'family-friendly movies everyone can enjoy',
      solo_binge: 'engaging movies perfect for solo viewing',
      weekend_marathon: 'binge-worthy movie series or trilogies'
    };

    return this.generatePersonalizedRecommendations({
      userId,
      context: contextPrompts[context],
      limit: 8
    });
  }
}
