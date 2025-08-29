'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { tmdb } from '@/lib/tmdb';
import { Users, TrendingUp, Star, Clock, Filter } from 'lucide-react';
import Link from 'next/link';
import RecommendationCard from '@/components/recommendations/RecommendationCard';

interface TrendingUser {
  id: string;
  displayName: string;
  moviesWatched: number;
  recentActivity: string;
  isFollowing: boolean;
}

interface PopularList {
  id: string;
  name: string;
  description: string;
  creatorName: string;
  movieCount: number;
  likes: number;
  isFollowing: boolean;
}

const SocialDiscovery = () => {
  const { user } = useAuth();
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [popularLists, setPopularLists] = useState<PopularList[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [communityReviews, setCommunityReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'lists' | 'movies' | 'reviews'>('users');

  useEffect(() => {
    loadDiscoveryData();
  }, [user]);

  const loadDiscoveryData = async () => {
    try {
      await Promise.all([
        loadTrendingUsers(),
        loadPopularLists(),
        loadTrendingMovies(),
        loadCommunityReviews()
      ]);
    } catch (error) {
      console.error('Error loading discovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingUsers = async () => {
    // Mock data - in real app, would query most active users
    const mockUsers: TrendingUser[] = [
      {
        id: '1',
        displayName: 'Movie Critic Pro',
        moviesWatched: 247,
        recentActivity: 'Watched "Dune" 2 hours ago',
        isFollowing: false
      },
      {
        id: '2',
        displayName: 'Film Enthusiast',
        moviesWatched: 189,
        recentActivity: 'Rated "Oppenheimer" 5 stars',
        isFollowing: true
      },
      {
        id: '3',
        displayName: 'Cinema Explorer',
        moviesWatched: 156,
        recentActivity: 'Created "Best Sci-Fi 2024" list',
        isFollowing: false
      }
    ];
    setTrendingUsers(mockUsers);
  };

  const loadPopularLists = async () => {
    try {
      const lists = await database.getPublicLists();
      const popularListsData: PopularList[] = lists.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        creatorName: 'Movie Fan', // Would fetch from user profile
        movieCount: list.movies.length,
        likes: list.likes,
        isFollowing: false
      }));
      setPopularLists(popularListsData);
    } catch (error) {
      console.error('Error loading popular lists:', error);
    }
  };

  const loadTrendingMovies = async () => {
    try {
      const trending = await tmdb.getTrending();
      setTrendingMovies(trending.results.slice(0, 8));
    } catch (error) {
      console.error('Error loading trending movies:', error);
    }
  };

  const loadCommunityReviews = async () => {
    // Mock data for community reviews
    const mockReviews = [
      {
        id: '1',
        movieTitle: 'Dune: Part Two',
        userName: 'SciFi Fan',
        rating: 5,
        excerpt: 'Absolutely stunning visuals and incredible sound design...',
        likes: 23
      },
      {
        id: '2',
        movieTitle: 'Oppenheimer',
        userName: 'History Buff',
        rating: 4,
        excerpt: 'Nolan delivers another masterpiece with incredible...',
        likes: 18
      }
    ];
    setCommunityReviews(mockReviews);
  };

  const handleFollowUser = async (userId: string) => {
    if (!user) return;
    
    try {
      await database.addFollow(user.uid, userId);
      setTrendingUsers(users => 
        users.map(u => u.id === userId ? { ...u, isFollowing: true } : u)
      );
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const TabButton = ({ tabKey, label, icon: Icon }: { tabKey: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
        activeTab === tabKey
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-64 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Discover</h1>
        <p className="text-gray-600">Find trending movies, users, and lists in the community</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2">
        <TabButton tabKey="users" label="Trending Users" icon={Users} />
        <TabButton tabKey="lists" label="Popular Lists" icon={Star} />
        <TabButton tabKey="movies" label="Trending Movies" icon={TrendingUp} />
        <TabButton tabKey="reviews" label="Recent Reviews" icon={Clock} />
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Trending Users */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Most Active Users</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {user.displayName[0]}
                    </div>
                    <div className="flex-1">
                      <Link 
                        href={`/user/${user.id}`}
                        className="font-semibold text-gray-900 hover:text-primary"
                      >
                        {user.displayName}
                      </Link>
                      <p className="text-sm text-gray-600">{user.moviesWatched} movies watched</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4">{user.recentActivity}</p>
                  
                  <button
                    onClick={() => handleFollowUser(user.id)}
                    disabled={user.isFollowing}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                      user.isFollowing
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-secondary'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Lists */}
        {activeTab === 'lists' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Most Liked Lists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {popularLists.map((list) => (
                <div key={list.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-between items-start mb-3">
                    <Link 
                      href={`/list/${list.id}`}
                      className="text-xl font-semibold text-gray-900 hover:text-primary"
                    >
                      {list.name}
                    </Link>
                    <div className="flex items-center text-sm text-gray-500">
                      <Star className="h-4 w-4 mr-1" />
                      {list.likes}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{list.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      by {list.creatorName} • {list.movieCount} movies
                    </span>
                    <Link 
                      href={`/list/${list.id}`}
                      className="text-primary hover:text-secondary font-medium"
                    >
                      View List
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Movies */}
        {activeTab === 'movies' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">What's Trending</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trendingMovies.map((movie) => (
                <RecommendationCard
                  key={movie.id}
                  movie={movie}
                  reason="Trending this week"
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Community Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Latest Reviews</h2>
            <div className="space-y-4">
              {communityReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                        {review.userName[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{review.userName}</p>
                        <p className="text-sm text-gray-600">reviewed {review.movieTitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{review.excerpt}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Star className="h-4 w-4 mr-1" />
                      {review.likes} people found this helpful
                    </div>
                    <Link 
                      href={`/movie/${review.movieId}`}
                      className="text-primary hover:text-secondary text-sm font-medium"
                    >
                      Read Full Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialDiscovery;
