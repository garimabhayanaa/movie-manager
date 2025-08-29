'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { Movie, UserMovie } from '@/types';
import { Check, Plus, Eye, Star, Heart, Clock, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckInButtonProps {
  movie: Movie;
  userMovie?: UserMovie | null;
  onUpdate?: () => void;
}

const CheckInButton = ({ movie, userMovie, onUpdate }: CheckInButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  if (!user) {
    return (
      <button 
        onClick={() => toast.error('Please log in to track movies')}
        className="flex items-center space-x-2 bg-gray-200 text-gray-600 px-4 py-2 rounded-lg"
      >
        <Plus className="h-4 w-4" />
        <span>Sign in to Track</span>
      </button>
    );
  }

  const handleStatusChange = async (status: 'watched' | 'watching' | 'want_to_watch') => {
    setLoading(true);
    try {
      const movieData = {
        userId: user.uid,
        movieId: movie.id,
        status,
        tags: userMovie?.tags || [],
        isFavorite: userMovie?.isFavorite || false,
        watchCount: status === 'watched' ? (userMovie?.watchCount || 0) + 1 : userMovie?.watchCount || 0,
        watchedDate: status === 'watched' ? new Date() : userMovie?.watchedDate,
        rating: userMovie?.rating,
        review: userMovie?.review,
      };

      if (userMovie) {
        await database.updateUserMovie(userMovie.id, movieData);
      } else {
        await database.addUserMovie(movieData);
      }

      // Add activity
      await database.addActivity({
        userId: user.uid,
        type: status === 'watched' ? 'watched' : 'listed',
        movieId: movie.id,
      });

      // Update user stats if marking as watched
      if (status === 'watched' && (!userMovie || userMovie.status !== 'watched')) {
        // This would be handled by a cloud function in production
        // For now, we'll update the count client-side
      }

      toast.success(
        status === 'watched' ? 'Movie marked as watched!' :
        status === 'watching' ? 'Added to currently watching!' :
        'Added to watchlist!'
      );
      
      setShowOptions(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating movie status:', error);
      toast.error('Failed to update movie status');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!userMovie) return;
    
    setLoading(true);
    try {
      await database.updateUserMovie(userMovie.id, { status: 'removed' });
      toast.success('Removed from your movies');
      onUpdate?.();
    } catch (error) {
      console.error('Error removing movie:', error);
      toast.error('Failed to remove movie');
    } finally {
      setLoading(false);
    }
  };

  const getStatusButton = () => {
    if (!userMovie || userMovie.status === 'removed') {
      return (
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={loading}
          className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Add to List</span>
        </button>
      );
    }

    const statusConfig = {
      watched: { icon: Check, text: 'Watched', color: 'bg-green-500' },
      watching: { icon: Eye, text: 'Watching', color: 'bg-blue-500' },
      want_to_watch: { icon: Bookmark, text: 'Watchlist', color: 'bg-yellow-500' },
    };

    const config = statusConfig[userMovie.status];
    const Icon = config.icon;

    return (
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`flex items-center space-x-2 ${config.color} text-white px-4 py-2 rounded-lg hover:opacity-90 transition`}
      >
        <Icon className="h-4 w-4" />
        <span>{config.text}</span>
      </button>
    );
  };

  return (
    <div className="relative">
      {getStatusButton()}
      
      {/* Options Dropdown */}
      {showOptions && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
          <button
            onClick={() => handleStatusChange('watched')}
            disabled={loading}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            <Check className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">Mark as Watched</div>
              <div className="text-sm text-gray-500">Add to your watched movies</div>
            </div>
          </button>
          
          <button
            onClick={() => handleStatusChange('watching')}
            disabled={loading}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            <Eye className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium">Currently Watching</div>
              <div className="text-sm text-gray-500">Track your progress</div>
            </div>
          </button>
          
          <button
            onClick={() => handleStatusChange('want_to_watch')}
            disabled={loading}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            <Bookmark className="h-4 w-4 text-yellow-500" />
            <div>
              <div className="font-medium">Add to Watchlist</div>
              <div className="text-sm text-gray-500">Save for later</div>
            </div>
          </button>

          {userMovie && userMovie.status !== 'removed' && (
            <>
              <hr className="my-1" />
              <button
                onClick={handleRemove}
                disabled={loading}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 text-red-600 disabled:opacity-50"
              >
                <span className="text-sm">Remove from lists</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CheckInButton;
