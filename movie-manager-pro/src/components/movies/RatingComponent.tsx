'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { UserMovie } from '@/types';
import toast from 'react-hot-toast';

interface RatingComponentProps {
  movieId: number;
  userMovie?: UserMovie | null;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showAverage?: boolean;
}

const RatingComponent = ({ 
  movieId, 
  userMovie, 
  onRatingChange,
  size = 'md',
  readonly = false,
  showAverage = false
}: RatingComponentProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(userMovie?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRating(userMovie?.rating || 0);
  }, [userMovie]);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleRating = async (newRating: number) => {
    if (!user || readonly) return;

    setLoading(true);
    try {
      if (userMovie) {
        await database.updateUserMovie(userMovie.id, { rating: newRating });
      } else {
        // Create new user movie entry with rating
        await database.addUserMovie({
          userId: user.uid,
          movieId,
          status: 'watched',
          rating: newRating,
          tags: [],
          isFavorite: false,
          watchCount: 1,
          watchedDate: new Date(),
        });
      }

      // Add rating activity
      await database.addActivity({
        userId: user.uid,
        type: 'rated',
        movieId,
        rating: newRating,
      });

      setRating(newRating);
      onRatingChange?.(newRating);
      toast.success(`Rated ${newRating} star${newRating !== 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error saving rating:', error);
      toast.error('Failed to save rating');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isActive = (hoverRating || rating) >= starValue;

      return (
        <button
          key={index}
          type="button"
          disabled={readonly || loading}
          onClick={() => handleRating(starValue)}
          onMouseEnter={() => !readonly && setHoverRating(starValue)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className={`${sizeClasses[size]} ${
            readonly 
              ? 'cursor-default' 
              : 'cursor-pointer hover:scale-110 transition-transform'
          } disabled:opacity-50`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              isActive 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            } transition-colors`}
          />
        </button>
      );
    });
  };

  if (showAverage) {
    // This would show average rating from all users
    // For now, we'll show the user's rating
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          {renderStars()}
        </div>
        {rating > 0 && (
          <span className="text-sm text-gray-600">
            {rating}/5
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        {renderStars()}
      </div>
      {rating > 0 && (
        <span className="text-sm text-gray-600">
          {rating}/5
        </span>
      )}
      {!readonly && !user && (
        <span className="text-xs text-gray-500">Sign in to rate</span>
      )}
    </div>
  );
};

export default RatingComponent;
