'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { 
  MessageSquare, 
  Heart, 
  Reply, 
  Send,
  MoreHorizontal,
  Edit3,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  likes: number;
  replies: Comment[];
  isLiked?: boolean;
}

interface CommentSectionProps {
  targetType: 'movie' | 'review' | 'list';
  targetId: string;
}

const CommentSection = ({ targetType, targetId }: CommentSectionProps) => {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  const loadComments = async () => {
    try {
      // This would fetch from comments collection in Firestore
      const commentsData = await fetchComments(targetType, targetId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (targetType: string, targetId: string): Promise<Comment[]> => {
    // Mock data for demonstration
    return [
      {
        id: '1',
        userId: 'user1',
        userName: 'Movie Critic',
        content: 'This movie was absolutely fantastic! The cinematography was stunning and the performances were top-notch.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        likes: 12,
        replies: [
          {
            id: '2',
            userId: 'user2',
            userName: 'Film Buff',
            content: 'I agree! The director really outdid themselves.',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            likes: 3,
            replies: [],
          }
        ],
        isLiked: false,
      }
    ];
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      const commentData = {
        targetType,
        targetId,
        userId: user.uid,
        content: newComment.trim(),
        parentId: null,
        createdAt: new Date(),
      };

      await database.addComment(commentData);
      
      // Add to local state for immediate UI update
      const newCommentObj: Comment = {
        id: Date.now().toString(),
        userId: user.uid,
        userName: userProfile?.displayName || 'You',
        content: newComment.trim(),
        createdAt: new Date(),
        likes: 0,
        replies: [],
        isLiked: false,
      };

      setComments([newCommentObj, ...comments]);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyText.trim()) return;

    try {
      const replyData = {
        targetType,
        targetId,
        userId: user.uid,
        content: replyText.trim(),
        parentId,
        createdAt: new Date(),
      };

      await database.addComment(replyData);
      
      // Update local state
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [
              ...comment.replies,
              {
                id: Date.now().toString(),
                userId: user.uid,
                userName: userProfile?.displayName || 'You',
                content: replyText.trim(),
                createdAt: new Date(),
                likes: 0,
                replies: [],
                isLiked: false,
              }
            ]
          };
        }
        return comment;
      }));

      setReplyText('');
      setReplyingTo(null);
      toast.success('Reply added!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      // Toggle like in database
      await database.toggleCommentLike(commentId, user.uid);
      
      // Update local state
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            isLiked: !comment.isLiked,
          };
        }
        return comment;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const CommentComponent = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-12 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {comment.userName[0]?.toUpperCase()}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">{comment.userName}</h4>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-gray-700">{comment.content}</p>
          </div>

          {/* Comment Actions */}
          <div className="flex items-center space-x-4 mt-2">
            <button
              onClick={() => handleLikeComment(comment.id)}
              className={`flex items-center space-x-1 text-xs ${
                comment.isLiked ? 'text-red-500' : 'text-gray-500'
              } hover:text-red-500 transition`}
            >
              <Heart className={`h-3 w-3 ${comment.isLiked ? 'fill-current' : ''}`} />
              <span>{comment.likes}</span>
            </button>

            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitReply(comment.id);
              }}
              className="mt-3 flex space-x-2"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-secondary transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentComponent key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {userProfile?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Comment</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            <a href="/auth/login" className="text-primary hover:underline">
              Sign in
            </a>{' '}
            to join the conversation
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="bg-gray-300 w-8 h-8 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-300 h-4 rounded w-1/4"></div>
                <div className="bg-gray-300 h-16 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentComponent key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
