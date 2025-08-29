'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { tmdb } from '@/lib/tmdb';
import { Activity } from '@/types';
import { 
  Film, 
  Star, 
  Heart, 
  MessageSquare, 
  Users, 
  Calendar,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  userId?: string; // If provided, show only this user's activities
  following?: boolean; // If true, show activities from followed users
}

interface ActivityWithDetails extends Activity {
  userName: string;
  userAvatar?: string;
  movieTitle?: string;
  moviePoster?: string;
  listName?: string;
}

const ActivityFeed = ({ userId, following = false }: ActivityFeedProps) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadActivities();
  }, [userId, following, filter]);

  const loadActivities = async () => {
    try {
      let activityList: Activity[] = [];

      if (following && user) {
        // Get activities from followed users
        const followingList = await database.getFollowing(user.uid);
        const followingIds = followingList.map(f => f.followingId);
        
        // Fetch activities for each followed user
        for (const followingId of followingIds) {
          const userActivities = await database.getActivities(followingId, 10);
          activityList.push(...userActivities);
        }
        
        // Sort by date
        activityList.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (userId) {
        // Get activities for specific user
        activityList = await database.getActivities(userId, 20);
      } else {
        // Get global activities (public feed)
        activityList = await database.getActivities(undefined, 20);
      }

      // Filter activities if needed
      if (filter !== 'all') {
        activityList = activityList.filter(activity => activity.type === filter);
      }

      // Enrich activities with additional details
      const enrichedActivities = await enrichActivitiesWithDetails(activityList);
      setActivities(enrichedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichActivitiesWithDetails = async (activities: Activity[]): Promise<ActivityWithDetails[]> => {
    const enriched: ActivityWithDetails[] = [];

    for (const activity of activities) {
      try {
        // Get user details
        const userProfile = await getUserDetails(activity.userId);
        
        let movieDetails: any = {};
        if (activity.movieId) {
          movieDetails = await tmdb.getMovie(activity.movieId);
        }

        let listDetails: any = {};
        if (activity.listId) {
          listDetails = await getListDetails(activity.listId);
        }

        enriched.push({
          ...activity,
          userName: userProfile?.displayName || 'Unknown User',
          userAvatar: userProfile?.profilePicture,
          movieTitle: movieDetails?.title,
          moviePoster: movieDetails?.poster_path,
          listName: listDetails?.name,
        });
      } catch (error) {
        console.error('Error enriching activity:', error);
        // Still add the activity with basic info
        enriched.push({
          ...activity,
          userName: 'Unknown User',
        });
      }
    }

    return enriched;
  };

  const getUserDetails = async (userId: string) => {
    // This would fetch from users collection in Firestore
    return {
      displayName: 'Movie Fan',
      profilePicture: null,
    };
  };

  const getListDetails = async (listId: string) => {
    // This would fetch list details from Firestore
    return {
      name: 'My Favorite Movies',
    };
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'watched':
        return <Film className="h-4 w-4 text-green-500" />;
      case 'rated':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'reviewed':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'listed':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'followed':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Film className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: ActivityWithDetails) => {
    switch (activity.type) {
      case 'watched':
        return (
          <>
            watched{' '}
            <Link href={`/movie/${activity.movieId}`} className="font-semibold hover:text-primary">
              {activity.movieTitle}
            </Link>
          </>
        );
      case 'rated':
        return (
          <>
            rated{' '}
            <Link href={`/movie/${activity.movieId}`} className="font-semibold hover:text-primary">
              {activity.movieTitle}
            </Link>
            {activity.rating && (
              <span className="ml-2 text-yellow-500">
                {'★'.repeat(activity.rating)}
              </span>
            )}
          </>
        );
      case 'reviewed':
        return (
          <>
            reviewed{' '}
            <Link href={`/movie/${activity.movieId}`} className="font-semibold hover:text-primary">
              {activity.movieTitle}
            </Link>
          </>
        );
      case 'listed':
        return (
          <>
            added{' '}
            <Link href={`/movie/${activity.movieId}`} className="font-semibold hover:text-primary">
              {activity.movieTitle}
            </Link>
            {' '}to{' '}
            <Link href={`/list/${activity.listId}`} className="font-semibold hover:text-primary">
              {activity.listName}
            </Link>
          </>
        );
      case 'followed':
        return (
          <>
            started following{' '}
            <Link href={`/user/${activity.targetUserId}`} className="font-semibold hover:text-primary">
              someone
            </Link>
          </>
        );
      default:
        return 'had some activity';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex space-x-3">
              <div className="bg-gray-300 w-10 h-10 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-300 h-4 rounded w-3/4"></div>
                <div className="bg-gray-300 h-3 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Activity', icon: TrendingUp },
            { key: 'watched', label: 'Watched', icon: Film },
            { key: 'rated', label: 'Rated', icon: Star },
            { key: 'reviewed', label: 'Reviewed', icon: MessageSquare },
            { key: 'listed', label: 'Listed', icon: Heart },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition ${
                filter === key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex space-x-3">
                {/* User Avatar */}
                <Link href={`/user/${activity.userId}`} className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {activity.userName[0]?.toUpperCase()}
                  </div>
                </Link>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {getActivityIcon(activity.type)}
                    <p className="text-sm">
                      <Link 
                        href={`/user/${activity.userId}`}
                        className="font-semibold hover:text-primary"
                      >
                        {activity.userName}
                      </Link>{' '}
                      {getActivityText(activity)}
                    </p>
                  </div>

                  {/* Movie Poster for movie-related activities */}
                  {activity.moviePoster && (
                    <div className="mt-3">
                      <Link href={`/movie/${activity.movieId}`}>
                        <img
                          src={tmdb.getImageUrl(activity.moviePoster, 'w154')}
                          alt={activity.movieTitle}
                          className="w-16 h-24 object-cover rounded"
                        />
                      </Link>
                    </div>
                  )}

                  {/* Review Text */}
                  {activity.review && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 italic">
                        "{activity.review.length > 150 
                          ? activity.review.substring(0, 150) + '...' 
                          : activity.review}"
                      </p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Activity Yet
            </h3>
            <p className="text-gray-600 mb-6">
              {following 
                ? "Follow some users to see their movie activity here" 
                : "Start watching and rating movies to see activity"}
            </p>
            <Link
              href="/discover"
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
            >
              Discover Movies
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
