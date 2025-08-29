'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { tmdb } from '@/lib/tmdb';
import { 
  Calendar, 
  Film, 
  Star, 
  TrendingUp, 
  Award,
  Clock,
  Heart,
  Users,
  Trophy,
  Target
} from 'lucide-react';

interface YearStats {
  year: number;
  totalMovies: number;
  totalHours: number;
  averageRating: number;
  topGenres: { name: string; count: number; percentage: number }[];
  favoriteDirector: string;
  favoriteActor: string;
  mostWatchedMonth: { name: string; count: number };
  longestStreak: number;
  topRatedMovie: { title: string; rating: number; poster?: string };
  mostPopularDecade: { decade: string; count: number };
  reviewsWritten: number;
  listsCreated: number;
  socialStats: {
    followers: number;
    following: number;
    likes: number;
  };
  personalMilestones: string[];
  watchingPattern: { [month: string]: number };
  ratingDistribution: { [rating: number]: number };
}

const YearInReview = () => {
  const { user, userProfile } = useAuth();
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (user) {
      generateYearStats();
    }
  }, [user, selectedYear]);

  const generateYearStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all user movies for the selected year
      const allUserMovies = await database.getUserMovies(user.uid);
      const yearMovies = allUserMovies.filter(movie => {
        const watchDate = new Date(movie.watchedDate || movie.createdAt);
        return watchDate.getFullYear() === selectedYear && movie.status === 'watched';
      });

      if (yearMovies.length === 0) {
        setYearStats(null);
        setLoading(false);
        return;
      }

      // Fetch movie details for analysis
      const movieDetails = [];
      for (const userMovie of yearMovies) {
        try {
          const movie = await tmdb.getMovie(userMovie.movieId);
          movieDetails.push({ ...movie, userMovie });
        } catch (error) {
          console.error(`Error fetching movie ${userMovie.movieId}:`, error);
        }
      }

      // Calculate comprehensive stats
      const stats = await calculateComprehensiveStats(yearMovies, movieDetails, selectedYear);
      setYearStats(stats);
    } catch (error) {
      console.error('Error generating year stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateComprehensiveStats = async (yearMovies: any[], movieDetails: any[], year: number): Promise<YearStats> => {
    // Basic counts
    const totalMovies = yearMovies.length;
    const totalHours = movieDetails.reduce((sum, movie) => sum + (movie.runtime || 120), 0) / 60;
    
    // Rating analysis
    const ratedMovies = yearMovies.filter(m => m.rating);
    const averageRating = ratedMovies.length > 0 
      ? ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length 
      : 0;

    // Rating distribution
    const ratingDistribution: { [rating: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = ratedMovies.filter(m => m.rating === i).length;
    }

    // Top genres analysis
    const genreCounts: { [genre: string]: number } = {};
    movieDetails.forEach(movie => {
      movie.genres?.forEach((genre: any) => {
        genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalMovies) * 100)
      }));

    // Director and actor analysis
    const directorCounts: { [director: string]: number } = {};
    const actorCounts: { [actor: string]: number } = {};
    
    movieDetails.forEach(movie => {
      // Director analysis
      const director = movie.credits?.crew?.find((c: any) => c.job === 'Director');
      if (director) {
        directorCounts[director.name] = (directorCounts[director.name] || 0) + 1;
      }
      
      // Actor analysis (top 3 cast members)
      movie.credits?.cast?.slice(0, 3).forEach((actor: any) => {
        actorCounts[actor.name] = (actorCounts[actor.name] || 0) + 1;
      });
    });

    const favoriteDirector = Object.entries(directorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
    
    const favoriteActor = Object.entries(actorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

    // Monthly watching pattern
    const monthlyPattern: { [month: string]: number } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    monthNames.forEach(month => monthlyPattern[month] = 0);
    
    yearMovies.forEach(movie => {
      const watchDate = new Date(movie.watchedDate || movie.createdAt);
      const monthName = monthNames[watchDate.getMonth()];
      monthlyPattern[monthName]++;
    });

    const mostWatchedMonth = Object.entries(monthlyPattern)
      .sort(([,a], [,b]) => b - a)[0];

    // Decade analysis
    const decadeCounts: { [decade: string]: number } = {};
    movieDetails.forEach(movie => {
      if (movie.release_date) {
        const releaseYear = new Date(movie.release_date).getFullYear();
        const decade = `${Math.floor(releaseYear / 10) * 10}s`;
        decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
      }
    });

    const mostPopularDecade = Object.entries(decadeCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Top rated movie
    const topRatedMovie = ratedMovies
      .sort((a, b) => b.rating - a.rating)[0];
    
    let topRatedMovieData = {
      title: 'None',
      rating: 0,
      poster: undefined
    };

    if (topRatedMovie) {
      const movieDetail = movieDetails.find(m => m.id === topRatedMovie.movieId);
      topRatedMovieData = {
        title: movieDetail?.title || 'Unknown',
        rating: topRatedMovie.rating,
        poster: movieDetail?.poster_path
      };
    }

    // Social stats (mock data - would be calculated from actual follows/likes)
    const socialStats = {
      followers: 0,
      following: 0,
      likes: 0
    };

    // Personal milestones
    const milestones = [];
    if (totalMovies >= 100) milestones.push(`🎬 Watched ${totalMovies} movies`);
    if (totalHours >= 200) milestones.push(`⏱️ Spent ${Math.round(totalHours)} hours watching`);
    if (ratedMovies.length >= 50) milestones.push(`⭐ Rated ${ratedMovies.length} movies`);
    if (yearMovies.filter(m => m.review).length >= 10) milestones.push(`📝 Wrote ${yearMovies.filter(m => m.review).length} reviews`);

    return {
      year,
      totalMovies,
      totalHours: Math.round(totalHours),
      averageRating: Math.round(averageRating * 10) / 10,
      topGenres,
      favoriteDirector,
      favoriteActor,
      mostWatchedMonth: {
        name: mostWatchedMonth?.[0] || 'None',
        count: mostWatchedMonth?.[1] || 0
      },
      longestStreak: userProfile?.longestStreak || 0,
      topRatedMovie: topRatedMovieData,
      mostPopularDecade: {
        decade: mostPopularDecade?.[0] || 'Unknown',
        count: mostPopularDecade?.[1] || 0
      },
      reviewsWritten: yearMovies.filter(m => m.review).length,
      listsCreated: 0, // Would calculate from lists created in that year
      socialStats,
      personalMilestones: milestones,
      watchingPattern: monthlyPattern,
      ratingDistribution
    };
  };

  const handleShare = async () => {
    if (!yearStats) return;
    
    setSharing(true);
    try {
      // Generate shareable content
      const shareText = `My ${yearStats.year} Movie Year in Review 🎬\n\n` +
        `🎞️ ${yearStats.totalMovies} movies watched\n` +
        `⏱️ ${yearStats.totalHours} hours of entertainment\n` +
        `⭐ ${yearStats.averageRating}/5 average rating\n` +
        `🎭 Favorite genre: ${yearStats.topGenres[0]?.name}\n\n` +
        `What was your movie year like? #MovieYear ${yearStats.year} #MovieManager`;

      if (navigator.share) {
        await navigator.share({
          title: `My ${yearStats.year} Movie Year in Review`,
          text: shareText,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Year in Review copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSharing(false);
    }
  };

  const availableYears = Array.from(
    { length: 5 }, 
    (_, i) => new Date().getFullYear() - i
  );

  if (!user || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-64 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-40 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {selectedYear} Year in Review 🎬
        </h1>
        <p className="text-gray-600 mb-6">
          Your complete movie journey through the year
        </p>
        
        {/* Year Selector */}
        <div className="flex justify-center space-x-2 mb-6">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedYear === year
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {yearStats ? (
        <>
          {/* Hero Stats */}
          <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-8 text-white text-center">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Film className="h-8 w-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{yearStats.totalMovies}</p>
                <p className="text-sm opacity-90">Movies Watched</p>
              </div>
              <div>
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{yearStats.totalHours}h</p>
                <p className="text-sm opacity-90">Hours of Entertainment</p>
              </div>
              <div>
                <Star className="h-8 w-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{yearStats.averageRating}/5</p>
                <p className="text-sm opacity-90">Average Rating</p>
              </div>
              <div>
                <Trophy className="h-8 w-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{yearStats.longestStreak}</p>
                <p className="text-sm opacity-90">Longest Streak</p>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Genres */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-primary" />
                Your Favorite Genres
              </h3>
              <div className="space-y-3">
                {yearStats.topGenres.map((genre, index) => (
                  <div key={genre.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">#{index + 1} {genre.name}</span>
                      <span className="text-sm text-gray-600">
                        {genre.count} movies ({genre.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${genre.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Pattern */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                Your Watching Pattern
              </h3>
              <div className="grid grid-cols-6 gap-2 mb-4">
                {Object.entries(yearStats.watchingPattern).map(([month, count]) => (
                  <div key={month} className="text-center">
                    <div className="text-xs text-gray-600 mb-1">{month}</div>
                    <div 
                      className="bg-primary rounded h-8 flex items-end justify-center text-white text-xs font-bold"
                      style={{ 
                        height: `${Math.max(8, (count / Math.max(...Object.values(yearStats.watchingPattern))) * 32)}px` 
                      }}
                    >
                      {count > 0 && count}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Your busiest month was <strong>{yearStats.mostWatchedMonth.name}</strong> with{' '}
                <strong>{yearStats.mostWatchedMonth.count} movies</strong>
              </p>
            </div>

            {/* Top Rated Movie */}
            {yearStats.topRatedMovie.rating > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary" />
                  Your Highest Rated Movie
                </h3>
                <div className="flex items-center space-x-4">
                  {yearStats.topRatedMovie.poster && (
                    <img
                      src={tmdb.getImageUrl(yearStats.topRatedMovie.poster, 'w154')}
                      alt={yearStats.topRatedMovie.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-lg">{yearStats.topRatedMovie.title}</h4>
                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < yearStats.topRatedMovie.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 font-semibold">
                        {yearStats.topRatedMovie.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fun Facts */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Fun Facts About Your Year
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Favorite Director</span>
                  <span className="font-semibold">{yearStats.favoriteDirector}</span>
                </div>
                <div className="flex justify-between">
                  <span>Favorite Actor</span>
                  <span className="font-semibold">{yearStats.favoriteActor}</span>
                </div>
                <div className="flex justify-between">
                  <span>Favorite Decade</span>
                  <span className="font-semibold">
                    {yearStats.mostPopularDecade.decade} ({yearStats.mostPopularDecade.count} movies)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reviews Written</span>
                  <span className="font-semibold">{yearStats.reviewsWritten}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Milestones */}
          {yearStats.personalMilestones.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-primary" />
                Your {selectedYear} Achievements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {yearStats.personalMilestones.map((milestone, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Award className="h-6 w-6 text-yellow-500" />
                    <span className="font-medium">{milestone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Button */}
          <div className="text-center">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50 font-semibold"
            >
              {sharing ? 'Sharing...' : `Share Your ${selectedYear} Year in Review`}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Data for {selectedYear}
          </h3>
          <p className="text-gray-600 mb-6">
            You didn't watch any movies in {selectedYear} or haven't started tracking yet.
          </p>
          <button
            onClick={() => window.location.href = '/discover'}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
          >
            Start Watching Movies
          </button>
        </div>
      )}
    </div>
  );
};

export default YearInReview;
