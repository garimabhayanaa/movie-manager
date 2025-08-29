'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { UserMovie, MovieList } from '@/types';
import { 
  User, 
  Calendar, 
  Film, 
  Star, 
  Users, 
  Award,
  Edit3,
  UserPlus,
  UserMinus,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface UserProfileProps {
  userId: string;
  isOwnProfile?: boolean;
}

interface ProfileStats {
  moviesWatched: number;
  averageRating: number;
  listsCreated: number;
  followers: number;
  following: number;
  joinDate: string;
  favoriteGenres: string[];
  currentStreak: number;
  longestStreak: number;
}

interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

const UserProfile = ({ userId, isOwnProfile = false }: UserProfileProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [recentMovies, setRecentMovies] = useState<UserMovie[]>([]);
  const [publicLists, setPublicLists] = useState<MovieList[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      // Load user profile
      const userProfile = await getUserProfile(userId);
      setProfile(userProfile);

      // Load profile stats
      const profileStats = await calculateProfileStats(userId);
      setStats(profileStats);

      // Load recent movies (public only for other users)
      const movies = await database.getUserMovies(userId);
      setRecentMovies(movies.slice(0, 6));

      // Load public lists
      const lists = await database.getUserLists(userId);
      setPublicLists(lists.filter(list => list.isPublic || isOwnProfile));

      // Check if current user is following this profile
      if (user && !isOwnProfile) {
        const followRelation = await checkFollowStatus(user.uid, userId);
        setIsFollowing(!!followRelation);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserProfile = async (uid: string) => {
    // This would be implemented with Firestore
    return {
      displayName: 'Movie Lover',
      bio: 'Passionate about cinema and storytelling',
      profilePicture: null,
      joinDate: new Date('2024-01-01'),
    };
  };

  const calculateProfileStats = async (uid: string): Promise<ProfileStats> => {
    const userMovies = await database.getUserMovies(uid);
    const watchedMovies = userMovies.filter(um => um.status === 'watched');
    const lists = await database.getUserLists(uid);

    return {
      moviesWatched: watchedMovies.length,
      averageRating: watchedMovies.reduce((acc, movie) => acc + (movie.rating || 0), 0) / watchedMovies.length || 0,
      listsCreated: lists.length,
      followers: 0, // Would be calculated from follows collection
      following: 0, // Would be calculated from follows collection
      joinDate: new Date().toISOString(),
      favoriteGenres: ['Action', 'Drama', 'Sci-Fi'], // Would be calculated from watching history
      currentStreak: 7,
      longestStreak: 15,
    };
  };

  const checkFollowStatus = async (followerId: string, followingId: string) => {
    // Implementation would check follows collection in Firestore
    return null;
  };

  const handleFollowToggle = async () => {
    if (!user || isOwnProfile) return;

    try {
      if (isFollowing) {
        // Unfollow logic
        await database.removeFollow(user.uid, userId);
        setIsFollowing(false);
      } else {
        // Follow logic
        await database.addFollow(user.uid, userId);
        setIsFollowing(true);
        
        // Add activity
        await database.addActivity({
          userId: user.uid,
          type: 'followed',
          targetUserId: userId,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-40 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-4xl font-bold">
              {profile?.displayName?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile?.displayName || 'Unknown User'}
              </h1>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 mt-4 md:mt-0">
                {isOwnProfile ? (
                  <Link
                    href="/profile/edit"
                    className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                ) : user && (
                  <button
                    onClick={handleFollowToggle}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-primary text-white hover:bg-secondary'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-gray-600 mb-6">{profile.bio}</p>
            )}

            {/* Profile Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.moviesWatched}</p>
                  <p className="text-sm text-gray-600">Movies</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.listsCreated}</p>
                  <p className="text-sm text-gray-600">Lists</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.followers}</p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.following}</p>
                  <p className="text-sm text-gray-600">Following</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Movies */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">Recent Movies</h2>
            {recentMovies.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {recentMovies.map((userMovie) => (
                  <div key={userMovie.id} className="text-center">
                    <div className="bg-gray-200 aspect-[2/3] rounded-lg mb-2"></div>
                    <p className="text-xs text-gray-600">Movie Title</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Film className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No movies watched yet</p>
              </div>
            )}
          </div>

          {/* Public Lists */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6">
              {isOwnProfile ? 'Your Lists' : 'Public Lists'}
            </h2>
            {publicLists.length > 0 ? (
              <div className="space-y-4">
                {publicLists.map((list) => (
                  <Link
                    key={list.id}
                    href={`/list/${list.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <h3 className="font-semibold">{list.name}</h3>
                    {list.description && (
                      <p className="text-sm text-gray-600 mt-1">{list.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {list.movies.length} movies
                      </span>
                      <span className="text-xs text-gray-500">
                        {list.likes} likes
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Film className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No public lists yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Detailed Stats */}
          {stats && (
            <>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Rating</span>
                    <span className="font-semibold">
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Streak</span>
                    <span className="font-semibold">{stats.currentStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Longest Streak</span>
                    <span className="font-semibold">{stats.longestStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-semibold">
                      {new Date(stats.joinDate).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Favorite Genres */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Favorite Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.favoriteGenres.map((genre) => (
                    <span
                      key={genre}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
