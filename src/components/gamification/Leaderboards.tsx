'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { 
  Trophy, 
  Medal, 
  Award,
  Crown,
  Users,
  Calendar,
  Star,
  TrendingUp,
  Filter,
  Flame
} from 'lucide-react';
import Link from 'next/link';

interface LeaderboardUser {
  id: string;
  displayName: string;
  profilePicture?: string;
  score: number;
  rank: number;
  streak: number;
  moviesWatched: number;
  averageRating: number;
  isCurrentUser?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'special';
  startDate: Date;
  endDate: Date;
  target: number;
  participants: number;
  reward: string;
  isActive: boolean;
  userProgress?: number;
  isParticipating?: boolean;
}

const Leaderboards = () => {
  const { user, userProfile } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'allTime'>('week');
  const [selectedCategory, setSelectedCategory] = useState<'movies' | 'streaks' | 'reviews' | 'social'>('movies');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
    loadChallenges();
  }, [selectedPeriod, selectedCategory, user]);

  const loadLeaderboardData = async () => {
    try {
      // Mock leaderboard data - in real app, would query database
      const mockData: LeaderboardUser[] = [
        {
          id: '1',
          displayName: 'Cinema Master',
          score: 247,
          rank: 1,
          streak: 45,
          moviesWatched: 247,
          averageRating: 4.2,
          isCurrentUser: false
        },
        {
          id: '2',
          displayName: 'Movie Buff Pro',
          score: 198,
          rank: 2,
          streak: 23,
          moviesWatched: 198,
          averageRating: 4.0,
          isCurrentUser: false
        },
        {
          id: '3',
          displayName: 'Film Critic',
          score: 156,
          rank: 3,
          streak: 15,
          moviesWatched: 156,
          averageRating: 3.8,
          isCurrentUser: false
        },
        {
          id: user?.uid || '4',
          displayName: userProfile?.displayName || 'You',
          score: 89,
          rank: 15,
          streak: userProfile?.currentStreak || 7,
          moviesWatched: userProfile?.moviesWatched || 89,
          averageRating: 4.1,
          isCurrentUser: true
        }
      ];

      // Sort by rank and add current user if not in top 10
      let sortedData = mockData.sort((a, b) => a.rank - b.rank);
      const currentUserInTop = sortedData.slice(0, 10).find(u => u.isCurrentUser);
      
      if (!currentUserInTop && user) {
        sortedData = [...sortedData.slice(0, 10), sortedData.find(u => u.isCurrentUser)!];
      }

      setLeaderboardData(sortedData);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    }
  };

  const loadChallenges = async () => {
    try {
      // Mock challenges data
      const mockChallenges: Challenge[] = [
        {
          id: '1',
          title: 'Weekend Movie Marathon',
          description: 'Watch 5 movies this weekend',
          type: 'weekly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          target: 5,
          participants: 234,
          reward: 'Weekend Warrior Badge',
          isActive: true,
          userProgress: 2,
          isParticipating: true
        },
        {
          id: '2',
          title: 'Horror Movie Month',
          description: 'Watch 10 horror movies in October',
          type: 'monthly',
          startDate: new Date('2024-10-01'),
          endDate: new Date('2024-10-31'),
          target: 10,
          participants: 456,
          reward: 'Horror Enthusiast Badge',
          isActive: true,
          userProgress: 0,
          isParticipating: false
        },
        {
          id: '3',
          title: 'Rate & Review Challenge',
          description: 'Rate and review 20 movies this month',
          type: 'monthly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          target: 20,
          participants: 189,
          reward: 'Critic Badge + 100 points',
          isActive: true,
          userProgress: 7,
          isParticipating: true
        }
      ];

      setChallenges(mockChallenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      // In real app, would make API call
      setChallenges(challenges.map(challenge => 
        challenge.id === challengeId 
          ? { ...challenge, isParticipating: true, participants: challenge.participants + 1 }
          : challenge
      ));
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-500" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  const getChallengeTypeColor = (type: Challenge['type']) => {
    switch (type) {
      case 'weekly':
        return 'bg-green-100 text-green-800';
      case 'monthly':
        return 'bg-blue-100 text-blue-800';
      case 'special':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeLeft = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days left`;
    if (hours > 0) return `${hours} hours left`;
    return 'Ending soon';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-64 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-96 rounded-lg"></div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Leaderboards & Challenges</h1>
        <p className="text-gray-600">Compete with friends and join community challenges</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-primary" />
                  Leaderboard
                </h2>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="allTime">All Time</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="movies">Movies Watched</option>
                  <option value="streaks">Longest Streaks</option>
                  <option value="reviews">Reviews Written</option>
                  <option value="social">Social Activity</option>
                </select>
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="divide-y divide-gray-100">
              {leaderboardData.map((user, index) => (
                <div 
                  key={user.id} 
                  className={`p-4 flex items-center space-x-4 ${
                    user.isCurrentUser ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 flex justify-center">
                    {getRankIcon(user.rank)}
                  </div>

                  {/* User Info */}
                  <Link href={`/user/${user.id}`} className="flex-1 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {user.displayName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.displayName}
                        {user.isCurrentUser && (
                          <span className="text-primary text-sm ml-2">(You)</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{user.moviesWatched} movies</span>
                        <span>⭐ {user.averageRating}</span>
                        <span className="flex items-center">
                          <Flame className="h-3 w-3 mr-1 text-orange-500" />
                          {user.streak} day streak
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{user.score}</p>
                    <p className="text-xs text-gray-600">points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Challenges Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Active Challenges
            </h3>

            <div className="space-y-4">
              {challenges.filter(c => c.isActive).map((challenge) => (
                <div key={challenge.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{challenge.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getChallengeTypeColor(challenge.type)}`}>
                      {challenge.type}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {challenge.isParticipating && challenge.userProgress !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Your Progress</span>
                        <span className="text-sm font-medium">
                          {challenge.userProgress}/{challenge.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(challenge.userProgress / challenge.target) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-600">
                      <Users className="h-4 w-4 inline mr-1" />
                      {challenge.participants} participants
                    </div>
                    <div className="text-gray-600">
                      {formatTimeLeft(challenge.endDate)}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                      🏆 Reward: {challenge.reward}
                    </p>
                  </div>

                  {!challenge.isParticipating && (
                    <button
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full mt-3 bg-primary text-white py-2 rounded-lg text-sm hover:bg-secondary transition"
                    >
                      Join Challenge
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Rank</span>
                <span className="font-semibold">
                  #{leaderboardData.find(u => u.isCurrentUser)?.rank || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Points</span>
                <span className="font-semibold">
                  {leaderboardData.find(u => u.isCurrentUser)?.score || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Challenges</span>
                <span className="font-semibold">
                  {challenges.filter(c => c.isParticipating && c.isActive).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Streak</span>
                <span className="font-semibold flex items-center">
                  <Flame className="h-4 w-4 mr-1 text-orange-500" />
                  {userProfile?.currentStreak || 0} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
