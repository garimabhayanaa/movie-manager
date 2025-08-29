'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { RecommendationEngine } from '@/lib/recommendations';
import { UserMovie, Movie, Activity } from '@/types';
import { 
  Film, 
  Star, 
  Calendar, 
  TrendingUp, 
  Award,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import WatchingTracker from '@/components/movies/WatchingTracker';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import Link from 'next/link';
import { tmdb } from '@/lib/tmdb';

interface DashboardStats {
  totalWatched: number;
  totalRuntime: number;
  averageRating: number;
  favoriteGenres: { name: string; count: number }[];
  recentActivity: Activity[];
  thisMonthCount: number;
  currentStreak: number;
}

const Dashboard = () => {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user movies and calculate stats
      const userMovies = await database.getUserMovies(user.uid);
      const watchedMovies = userMovies.filter(um => um.status === 'watched');
      
      // Calculate stats
      const dashboardStats = await calculateStats(watchedMovies);
      setStats(dashboardStats);

      // Get recommendations
      const recs = await RecommendationEngine.getRecommendations(user.uid, 12);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (watchedMovies: UserMovie[]): Promise<DashboardStats> => {
    const genreCounts: { [key: string]: number } = {};
    let totalRuntime = 0;
    let totalRating = 0;
    let ratedMoviesCount = 0;
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let thisMonthCount = 0;

    // Process each watched movie
    for (const userMovie of watchedMovies) {
      try {
        const movie = await tmdb.getMovie(userMovie.movieId);
        
        // Runtime calculation
        totalRuntime += movie.runtime || 120;
        
        // Rating calculation
        if (userMovie.rating) {
          totalRating += userMovie.rating;
          ratedMoviesCount++;
        }
        
        // Genre counting
        movie.genres?.forEach(genre => {
          genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
        });
        
        // This month count
        if (userMovie.watchedDate && new Date(userMovie.watchedDate) >= thisMonthStart) {
          thisMonthCount++;
        }
      } catch (error) {
        console.error(`Error processing movie ${userMovie.movieId}:`, error);
      }
    }

    // Get favorite genres
    const favoriteGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Get recent activity
    const recentActivity = await database.getActivities(user?.uid, 10);

    return {
      totalWatched: watchedMovies.length,
      totalRuntime,
      averageRating: ratedMoviesCount > 0 ? totalRating / ratedMoviesCount : 0,
      favoriteGenres,
      recentActivity,
      thisMonthCount,
      currentStreak: userProfile?.currentStreak || 0,
    };
  };

  if (!user || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-64 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {userProfile?.displayName}! 🎬
        </h1>
        <p className="text-xl opacity-90">
          Here's your movie journey so far
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Film className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalWatched}</p>
                <p className="text-gray-600">Movies Watched</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(stats.totalRuntime / 60)}h
                </p>
                <p className="text-gray-600">Hours Watched</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                </p>
                <p className="text-gray-600">Average Rating</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.currentStreak}</p>
                <p className="text-gray-600">Day Streak</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Currently Watching */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <WatchingTracker />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recommendations */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
              <Link 
                href="/recommendations" 
                className="text-primary hover:text-secondary transition"
              >
                View All
              </Link>
            </div>
            
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendations.slice(0, 8).map((movie) => (
                  <RecommendationCard
                    key={movie.id}
                    movie={movie}
                    size="sm"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Film className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Watch a few movies to get personalized recommendations!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Favorite Genres */}
          {stats && stats.favoriteGenres.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                Favorite Genres
              </h3>
              <div className="space-y-3">
                {stats.favoriteGenres.map((genre, index) => (
                  <div key={genre.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{genre.name}</span>
                      <span className="text-sm text-gray-500">{genre.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ 
                          width: `${(genre.count / stats.favoriteGenres[0].count) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* This Month */}
          {stats && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                This Month
              </h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.thisMonthCount}</p>
                <p className="text-gray-600">Movies Watched</p>
                {stats.thisMonthCount > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Keep up the great work! 🎉
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/discover"
                className="block w-full bg-primary text-white text-center py-3 rounded-lg hover:bg-secondary transition"
              >
                Discover New Movies
              </Link>
              <Link
                href="/lists"
                className="block w-full border border-primary text-primary text-center py-3 rounded-lg hover:bg-primary hover:text-white transition"
              >
                Manage Lists
              </Link>
              <Link
                href="/profile"
                className="block w-full border border-gray-300 text-gray-700 text-center py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
