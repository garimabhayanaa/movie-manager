'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { 
  Award, 
  Trophy, 
  Star, 
  Film, 
  Calendar,
  Target,
  Flame,
  Users,
  Heart,
  MessageSquare
} from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'movies' | 'social' | 'streaks' | 'reviews' | 'lists';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: 'movies_watched' | 'genre_count' | 'streak_days' | 'reviews_written' | 'lists_created' | 'followers_gained' | 'likes_received';
    value: number;
    genre?: string;
  };
  earnedAt?: Date;
  isEarned: boolean;
}

interface UserBadges {
  earned: Badge[];
  available: Badge[];
  progress: { [badgeId: string]: number };
}

const BadgeSystem = () => {
  const { user, userProfile } = useAuth();
  const [userBadges, setUserBadges] = useState<UserBadges | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | Badge['category']>('all');

  useEffect(() => {
    if (user) {
      loadUserBadges();
    }
  }, [user]);

  const loadUserBadges = async () => {
    if (!user) return;

    try {
      const badges = await getAllBadges();
      const earnedBadges = await database.getUserBadges(user.uid);
      const progress = await calculateBadgeProgress(user.uid, badges);

      const earnedIds = new Set(earnedBadges.map(b => b.badgeId));

      const userBadgesData: UserBadges = {
        earned: badges.filter(badge => earnedIds.has(badge.id)).map(badge => ({
          ...badge,
          isEarned: true,
          earnedAt: earnedBadges.find(eb => eb.badgeId === badge.id)?.earnedAt
        })),
        available: badges.filter(badge => !earnedIds.has(badge.id)).map(badge => ({
          ...badge,
          isEarned: false
        })),
        progress
      };

      setUserBadges(userBadgesData);
    } catch (error) {
      console.error('Error loading user badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAllBadges = async (): Promise<Badge[]> => {
    // In a real app, this would come from Firestore
    return [
      // Movie Watching Badges
      {
        id: 'first_movie',
        name: 'First Steps',
        description: 'Watch your first movie',
        icon: 'film',
        category: 'movies',
        rarity: 'common',
        criteria: { type: 'movies_watched', value: 1 },
        isEarned: false
      },
      {
        id: 'movie_buff',
        name: 'Movie Buff',
        description: 'Watch 25 movies',
        icon: 'film',
        category: 'movies',
        rarity: 'rare',
        criteria: { type: 'movies_watched', value: 25 },
        isEarned: false
      },
      {
        id: 'cinema_addict',
        name: 'Cinema Addict',
        description: 'Watch 100 movies',
        icon: 'trophy',
        category: 'movies',
        rarity: 'epic',
        criteria: { type: 'movies_watched', value: 100 },
        isEarned: false
      },
      {
        id: 'horror_fan',
        name: 'Horror Enthusiast',
        description: 'Watch 10 horror movies',
        icon: 'film',
        category: 'movies',
        rarity: 'rare',
        criteria: { type: 'genre_count', value: 10, genre: 'Horror' },
        isEarned: false
      },

      // Streak Badges
      {
        id: 'week_streak',
        name: 'Weekly Warrior',
        description: 'Watch movies for 7 consecutive days',
        icon: 'flame',
        category: 'streaks',
        rarity: 'rare',
        criteria: { type: 'streak_days', value: 7 },
        isEarned: false
      },
      {
        id: 'month_streak',
        name: 'Monthly Master',
        description: 'Watch movies for 30 consecutive days',
        icon: 'flame',
        category: 'streaks',
        rarity: 'epic',
        criteria: { type: 'streak_days', value: 30 },
        isEarned: false
      },

      // Social Badges
      {
        id: 'first_review',
        name: 'Critic in Training',
        description: 'Write your first review',
        icon: 'message-square',
        category: 'reviews',
        rarity: 'common',
        criteria: { type: 'reviews_written', value: 1 },
        isEarned: false
      },
      {
        id: 'prolific_reviewer',
        name: 'Prolific Reviewer',
        description: 'Write 50 reviews',
        icon: 'message-square',
        category: 'reviews',
        rarity: 'epic',
        criteria: { type: 'reviews_written', value: 50 },
        isEarned: false
      },
      {
        id: 'list_creator',
        name: 'List Master',
        description: 'Create 10 movie lists',
        icon: 'target',
        category: 'lists',
        rarity: 'rare',
        criteria: { type: 'lists_created', value: 10 },
        isEarned: false
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Get 100 followers',
        icon: 'users',
        category: 'social',
        rarity: 'epic',
        criteria: { type: 'followers_gained', value: 100 },
        isEarned: false
      }
    ];
  };

  const calculateBadgeProgress = async (userId: string, badges: Badge[]): Promise<{ [badgeId: string]: number }> => {
    const progress: { [badgeId: string]: number } = {};
    
    try {
      const userMovies = await database.getUserMovies(userId);
      const watchedMovies = userMovies.filter(um => um.status === 'watched');
      const userLists = await database.getUserLists(userId);
      
      // Calculate current stats
      const stats = {
        moviesWatched: watchedMovies.length,
        reviewsWritten: watchedMovies.filter(um => um.review).length,
        listsCreated: userLists.length,
        currentStreak: userProfile?.currentStreak || 0,
        followersCount: 0, // Would get from followers collection
        likesReceived: 0, // Would calculate from likes collection
      };

      // Calculate progress for each badge
      badges.forEach(badge => {
        let currentValue = 0;
        
        switch (badge.criteria.type) {
          case 'movies_watched':
            currentValue = stats.moviesWatched;
            break;
          case 'reviews_written':
            currentValue = stats.reviewsWritten;
            break;
          case 'lists_created':
            currentValue = stats.listsCreated;
            break;
          case 'streak_days':
            currentValue = stats.currentStreak;
            break;
          case 'followers_gained':
            currentValue = stats.followersCount;
            break;
          case 'genre_count':
            // Would calculate genre-specific count
            currentValue = 0;
            break;
        }
        
        progress[badge.id] = Math.min(currentValue / badge.criteria.value, 1);
      });
      
    } catch (error) {
      console.error('Error calculating badge progress:', error);
    }
    
    return progress;
  };

  const getBadgeIcon = (iconName: string, isEarned: boolean) => {
    const iconClass = `h-8 w-8 ${isEarned ? 'text-yellow-500' : 'text-gray-400'}`;
    
    switch (iconName) {
      case 'film':
        return <Film className={iconClass} />;
      case 'trophy':
        return <Trophy className={iconClass} />;
      case 'star':
        return <Star className={iconClass} />;
      case 'flame':
        return <Flame className={iconClass} />;
      case 'target':
        return <Target className={iconClass} />;
      case 'users':
        return <Users className={iconClass} />;
      case 'heart':
        return <Heart className={iconClass} />;
      case 'message-square':
        return <MessageSquare className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  const getRarityColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-300 bg-gray-50';
      case 'rare':
        return 'border-blue-300 bg-blue-50';
      case 'epic':
        return 'border-purple-300 bg-purple-50';
      case 'legendary':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityTextColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-700';
      case 'rare':
        return 'text-blue-700';
      case 'epic':
        return 'text-purple-700';
      case 'legendary':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  const filteredBadges = (badges: Badge[]) => {
    if (selectedCategory === 'all') return badges;
    return badges.filter(badge => badge.category === selectedCategory);
  };

  if (!user || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-48 rounded"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Achievements</h1>
        <p className="text-gray-600 mb-6">
          Earn badges by watching movies, writing reviews, and engaging with the community
        </p>
        
        {userBadges && (
          <div className="flex justify-center space-x-8 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{userBadges.earned.length}</p>
              <p className="text-sm text-gray-600">Badges Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{userBadges.available.length}</p>
              <p className="text-sm text-gray-600">Still Available</p>
            </div>
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { key: 'all', label: 'All Badges' },
          { key: 'movies', label: 'Movies' },
          { key: 'social', label: 'Social' },
          { key: 'streaks', label: 'Streaks' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'lists', label: 'Lists' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key as any)}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              selectedCategory === key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {userBadges && (
        <>
          {/* Earned Badges */}
          {filteredBadges(userBadges.earned).length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Earned Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredBadges(userBadges.earned).map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-6 rounded-lg border-2 ${getRarityColor(badge.rarity)} relative`}
                  >
                    <div className="text-center">
                      <div className="mb-4">
                        {getBadgeIcon(badge.icon, true)}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{badge.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRarityTextColor(badge.rarity)} bg-white/70`}>
                        {badge.rarity.toUpperCase()}
                      </span>
                      {badge.earnedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Earned {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Badges */}
          {filteredBadges(userBadges.available).length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredBadges(userBadges.available).map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-6 rounded-lg border-2 ${getRarityColor(badge.rarity)} opacity-75`}
                  >
                    <div className="text-center">
                      <div className="mb-4">
                        {getBadgeIcon(badge.icon, false)}
                      </div>
                      <h3 className="font-bold text-gray-500 mb-2">{badge.name}</h3>
                      <p className="text-sm text-gray-500 mb-3">{badge.description}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRarityTextColor(badge.rarity)} bg-white/70`}>
                        {badge.rarity.toUpperCase()}
                      </span>
                      
                      {/* Progress Bar */}
                      {userBadges.progress[badge.id] !== undefined && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${userBadges.progress[badge.id] * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(userBadges.progress[badge.id] * 100)}% complete
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BadgeSystem;
