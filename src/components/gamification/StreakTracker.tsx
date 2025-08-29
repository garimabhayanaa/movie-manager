'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { Flame, Calendar, Trophy, Target, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays } from 'date-fns';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weeklyActivity: { [date: string]: number };
  monthlyStats: {
    thisMonth: number;
    lastMonth: number;
    avgPerWeek: number;
  };
  streakHistory: {
    date: Date;
    count: number;
  }[];
}

const StreakTracker = () => {
  const { user, userProfile } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    if (user) {
      loadStreakData();
    }
  }, [user]);

  const loadStreakData = async () => {
    if (!user) return;

    try {
      const userMovies = await database.getUserMovies(user.uid);
      const watchedMovies = userMovies.filter(um => um.status === 'watched');
      
      const streakData = calculateStreakData(watchedMovies);
      setStreakData(streakData);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreakData = (watchedMovies: any[]): StreakData => {
    const today = new Date();
    const watchDates = watchedMovies
      .filter(movie => movie.watchedDate)
      .map(movie => new Date(movie.watchedDate))
      .sort((a, b) => b.getTime() - a.getTime());

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (true) {
      const hasWatchedOnDate = watchDates.some(date => 
        isSameDay(date, checkDate)
      );
      
      if (hasWatchedOnDate) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else if (currentStreak === 0 && isSameDay(checkDate, today)) {
        // If no movie watched today, check yesterday
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const dateSet = new Set(watchDates.map(date => format(date, 'yyyy-MM-dd')));
    
    // Check each day in the last year
    for (let i = 365; i >= 0; i--) {
      const checkDate = subDays(today, i);
      const dateKey = format(checkDate, 'yyyy-MM-dd');
      
      if (dateSet.has(dateKey)) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Weekly activity (last 7 days)
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const weeklyActivity: { [date: string]: number } = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const count = watchDates.filter(date => 
        isSameDay(date, day)
      ).length;
      weeklyActivity[dayKey] = count;
    });

    // Monthly stats
    const thisMonth = watchedMovies.filter(movie => {
      const watchDate = new Date(movie.watchedDate);
      return watchDate.getMonth() === today.getMonth() && 
             watchDate.getFullYear() === today.getFullYear();
    }).length;

    const lastMonth = watchedMovies.filter(movie => {
      const watchDate = new Date(movie.watchedDate);
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return watchDate.getMonth() === lastMonthDate.getMonth() && 
             watchDate.getFullYear() === lastMonthDate.getFullYear();
    }).length;

    const avgPerWeek = thisMonth / 4;

    // Streak history (last 30 days)
    const streakHistory = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const count = watchDates.filter(watchDate => 
        isSameDay(watchDate, date)
      ).length;
      streakHistory.push({ date, count });
    }

    return {
      currentStreak,
      longestStreak,
      weeklyActivity,
      monthlyStats: {
        thisMonth,
        lastMonth,
        avgPerWeek
      },
      streakHistory
    };
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return `${streak} days strong! 🔥`;
    if (streak < 30) return `Amazing ${streak} day streak! 🚀`;
    return `Incredible ${streak} day streak! You're a legend! 👑`;
  };

  const ActivityDot = ({ count, date }: { count: number, date: Date }) => {
    let colorClass = 'bg-gray-200';
    if (count >= 3) colorClass = 'bg-red-500';
    else if (count >= 2) colorClass = 'bg-orange-500';
    else if (count >= 1) colorClass = 'bg-yellow-500';

    return (
      <div
        className={`w-3 h-3 rounded-sm ${colorClass} hover:scale-125 transition-transform cursor-pointer`}
        title={`${format(date, 'MMM d')}: ${count} movie${count !== 1 ? 's' : ''}`}
      />
    );
  };

  if (!user || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-48 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Movie Streaks</h1>
        <p className="text-gray-600">Track your movie watching consistency and build healthy viewing habits</p>
      </div>

      {streakData && (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Current Streak</h3>
                <Flame className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold mb-2">{streakData.currentStreak} days</p>
              <p className="text-orange-100">{getStreakMessage(streakData.currentStreak)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Longest Streak</h3>
                <Trophy className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold mb-2">{streakData.longestStreak} days</p>
              <p className="text-blue-100">Your personal best!</p>
            </div>

            <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">This Month</h3>
                <Calendar className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold mb-2">{streakData.monthlyStats.thisMonth} movies</p>
              <p className="text-green-100">
                {streakData.monthlyStats.avgPerWeek.toFixed(1)} per week avg
              </p>
            </div>
          </div>

          {/* Activity Calendar */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold mb-6">30-Day Activity</h3>
            <div className="mb-4">
              <div className="grid grid-cols-10 gap-1 mb-2">
                {streakData.streakHistory.map((day, index) => (
                  <ActivityDot 
                    key={index} 
                    count={day.count} 
                    date={day.date} 
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>30 days ago</span>
                <div className="flex items-center space-x-2">
                  <span>Less</span>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                    <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  </div>
                  <span>More</span>
                </div>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold mb-6">This Week</h3>
            <div className="grid grid-cols-7 gap-4">
              {Object.entries(streakData.weeklyActivity).map(([date, count]) => {
                const dayDate = new Date(date);
                const dayName = format(dayDate, 'EEE');
                const isToday = isSameDay(dayDate, new Date());
                
                return (
                  <div 
                    key={date} 
                    className={`text-center p-3 rounded-lg ${
                      isToday ? 'bg-primary text-white' : 'bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium mb-2">{dayName}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs opacity-75">
                      movie{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streak Tips */}
          <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
            <h3 className="text-xl font-semibold mb-4">🎯 Streak Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Build Consistency</h4>
                <p className="text-sm opacity-90">
                  Watch at least one movie every day to maintain your streak. Short films count too!
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Set Goals</h4>
                <p className="text-sm opacity-90">
                  Aim for milestone streaks: 7 days, 30 days, 100 days. Each milestone earns special badges!
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StreakTracker;
