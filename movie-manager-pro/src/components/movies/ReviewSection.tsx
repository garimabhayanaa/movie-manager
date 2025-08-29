'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { UserMovie } from '@/types';
import { MessageSquare, Edit3, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import RatingComponent from './RatingComponent';

interface ReviewSectionProps {
  movieId: number;
  userMovie?: UserMovie | null;
  onUpdate?: () => void;
}

const ReviewSection = ({ movieId, userMovie, onUpdate }: ReviewSectionProps) => {
  const { user, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [reviewText, setReviewText] = useState(userMovie?.review || '');
  const [loading, setLoading] = useState(false);

  const handleSaveReview = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (userMovie) {
        await database.updateUserMovie(userMovie.id, { review: reviewText });
      } else {
        await database.addUserMovie({
          userId: user.uid,
          movieId,
          status: 'watched',
          review: reviewText,
          tags: [],
          isFavorite: false,
          watchCount: 1,
          watchedDate: new Date(),
        });
      }

      // Add review activity
      if (reviewText.trim()) {
        await database.addActivity({
          userId: user.uid,
          type: 'reviewed',
          movieId,
          review: reviewText,
        });
      }

      toast.success('Review saved!');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Sign in to write a review</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Review</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 text-primary hover:text-secondary"
          >
            <Edit3 className="h-4 w-4" />
            <span>{userMovie?.review ? 'Edit' : 'Write'} Review</span>
          </button>
        )}
      </div>

      {/* Rating Component */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating
        </label>
        <RatingComponent
          movieId={movieId}
          userMovie={userMovie}
          onRatingChange={() => onUpdate?.()}
        />
      </div>

      {/* Review Text */}
      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your thoughts about this movie..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={6}
          />
          <div className="flex space-x-3">
            <button
              onClick={handleSaveReview}
              disabled={loading}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Review'}</span>
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setReviewText(userMovie?.review || '');
              }}
              className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : userMovie?.review ? (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
              {userProfile?.displayName?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{userProfile?.displayName}</p>
              <p className="text-sm text-gray-500">Your review</p>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">{userMovie.review}</p>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">You haven't written a review yet</p>
          <p className="text-sm text-gray-500">Click "Write Review" to share your thoughts</p>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
