'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface LikeButtonProps {
  targetType: 'review' | 'list' | 'comment';
  targetId: string;
  initialLikeCount?: number;
  initialIsLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const LikeButton = ({ 
  targetType, 
  targetId, 
  initialLikeCount = 0, 
  initialIsLiked = false,
  size = 'md',
  showCount = true 
}: LikeButtonProps) => {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkLikeStatus();
    }
  }, [user, targetId]);

  const checkLikeStatus = async () => {
    if (!user) return;
    
    try {
      const likeStatus = await database.checkLikeStatus(targetType, targetId, user.uid);
      setIsLiked(likeStatus);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like content');
      return;
    }

    if (loading) return;

    setLoading(true);
    const previousIsLiked = isLiked;
    const previousCount = likeCount;

    try {
      // Optimistic update
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

      // Update database
      await database.toggleLike(targetType, targetId, user.uid);

      // Add activity for likes (optional)
      if (!previousIsLiked) {
        await database.addActivity({
          userId: user.uid,
          type: 'liked',
          targetType,
          targetId,
        });
      }

    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={loading}
      className={`flex items-center space-x-1 rounded-lg transition-all duration-200 ${buttonSizeClasses[size]} ${
        isLiked
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Heart
        className={`${sizeClasses[size]} transition-all duration-200 ${
          isLiked ? 'fill-current text-red-500' : 'text-gray-500'
        }`}
      />
      {showCount && (
        <span className={`font-medium ${isLiked ? 'text-red-600' : 'text-gray-600'}`}>
          {likeCount}
        </span>
      )}
    </button>
  );
};

export default LikeButton;
