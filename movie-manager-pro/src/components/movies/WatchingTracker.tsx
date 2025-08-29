'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { tmdb } from '@/lib/tmdb';
import { UserMovie, Movie } from '@/types';
import { Play, Pause, RotateCcw, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface WatchingSession {
  id: string;
  movieId: number;
  userId: string;
  episodeNumber?: number;
  totalEpisodes?: number;
  watchTime: number; // minutes watched
  totalRuntime: number; // total minutes
  lastWatched: Date;
  notes?: string;
}

const WatchingTracker = () => {
  const { user } = useAuth();
  const [watchingMovies, setWatchingMovies] = useState<UserMovie[]>([]);
  const [movieDetails, setMovieDetails] = useState<{ [key: number]: Movie }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWatchingMovies();
    }
  }, [user]);

  const fetchWatchingMovies = async () => {
    if (!user) return;

    try {
      const movies = await database.getUserMovies(user.uid, 'watching');
      setWatchingMovies(movies);

      // Fetch movie details for each watching movie
      const details: { [key: number]: Movie } = {};
      await Promise.all(
        movies.map(async (userMovie) => {
          try {
            const movie = await tmdb.getMovie(userMovie.movieId);
            details[userMovie.movieId] = movie;
          } catch (error) {
            console.error('Error fetching movie details:', error);
          }
        })
      );
      setMovieDetails(details);
    } catch (error) {
      console.error('Error fetching watching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWatchingStatus = async (userMovieId: string, newStatus: string) => {
    try {
      await database.updateUserMovie(userMovieId, { 
        status: newStatus as any,
        watchedDate: newStatus === 'watched' ? new Date() : undefined
      });

      if (newStatus === 'watched') {
        toast.success('Movie marked as completed!');
      } else {
        toast.success('Movie removed from currently watching');
      }

      fetchWatchingMovies();
    } catch (error) {
      console.error('Error updating movie status:', error);
      toast.error('Failed to update movie status');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Sign in to track what you're currently watching</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg p-6">
            <div className="flex space-x-4">
              <div className="bg-gray-300 w-20 h-28 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-300 h-4 rounded w-3/4"></div>
                <div className="bg-gray-300 h-3 rounded w-1/2"></div>
                <div className="bg-gray-300 h-2 rounded w-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (watchingMovies.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No movies currently watching
        </h3>
        <p className="text-gray-600 mb-6">
          Start tracking movies you're in the middle of watching
        </p>
        <Link
          href="/discover"
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
        >
          Discover Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Currently Watching</h2>
        <span className="text-sm text-gray-500">
          {watchingMovies.length} movie{watchingMovies.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-6">
        {watchingMovies.map((userMovie) => {
          const movie = movieDetails[userMovie.movieId];
          if (!movie) return null;

          const progressPercentage = Math.min(
            ((userMovie.watchCount || 0) * (movie.runtime || 120)) / (movie.runtime || 120) * 100,
            100
          );

          return (
            <div key={userMovie.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex space-x-4">
                {/* Movie Poster */}
                <Link href={`/movie/${movie.id}`} className="flex-shrink-0">
                  <img
                    src={tmdb.getImageUrl(movie.poster_path, 'w154')}
                    alt={movie.title}
                    className="w-20 h-28 object-cover rounded-lg hover:opacity-75 transition"
                  />
                </Link>

                {/* Movie Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/movie/${movie.id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-primary transition"
                      >
                        {movie.title}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">
                        {movie.release_date ? new Date(movie.release_date).getFullYear() : ''} • {movie.runtime} min
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => updateWatchingStatus(userMovie.id, 'watched')}
                        className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600 transition"
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete</span>
                      </button>
                      
                      <button
                        onClick={() => updateWatchingStatus(userMovie.id, 'want_to_watch')}
                        className="flex items-center space-x-1 bg-gray-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-600 transition"
                        title="Move to watchlist"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Pause</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Last Watched */}
                  {userMovie.watchedDate && (
                    <p className="text-sm text-gray-500 mt-3">
                      Last watched: {new Date(userMovie.watchedDate).toLocaleDateString()}
                    </p>
                  )}

                  {/* Movie Overview */}
                  {movie.overview && (
                    <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                      {movie.overview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WatchingTracker;
