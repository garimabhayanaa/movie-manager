'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Film, Users, TrendingUp, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tmdb } from '@/lib/tmdb';
import { Movie } from '@/types';

export default function Home() {
  const { user, userProfile } = useAuth();
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await tmdb.getTrending();
        setTrendingMovies(response.results.slice(0, 6));
      } catch (error) {
        console.error('Error fetching trending movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (user && userProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-8 text-white mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {userProfile.displayName}! 🎬
          </h1>
          <p className="text-xl opacity-90">
            You've watched {userProfile.moviesWatched} movies and created {userProfile.listsCreated} lists
          </p>
          <div className="flex space-x-4 mt-6">
            <Link 
              href="/dashboard" 
              className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              View Dashboard
            </Link>
            <Link 
              href="/discover" 
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition"
            >
              Discover Movies
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <Film className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{userProfile.moviesWatched}</p>
                <p className="text-gray-600">Movies Watched</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{userProfile.listsCreated}</p>
                <p className="text-gray-600">Lists Created</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{userProfile.currentStreak}</p>
                <p className="text-gray-600">Day Streak</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{userProfile.badges.length}</p>
                <p className="text-gray-600">Badges Earned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Movies */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6">Trending This Week</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-300 aspect-[2/3] rounded-lg"></div>
                  <div className="bg-gray-300 h-4 rounded mt-2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {trendingMovies.map((movie) => (
                <Link 
                  key={movie.id} 
                  href={`/movie/${movie.id}`}
                  className="movie-card group"
                >
                  <img
                    src={tmdb.getImageUrl(movie.poster_path)}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover rounded-lg"
                  />
                  <h3 className="font-semibold mt-2 text-sm group-hover:text-primary transition">
                    {movie.title}
                  </h3>
                  <p className="text-gray-600 text-xs">
                    ⭐ {movie.vote_average.toFixed(1)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="hero-gradient min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <div className="flex justify-center mb-8">
            <Film className="h-24 w-24 text-white" />
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mb-6 text-shadow-lg">
            Movie Manager
          </h1>
          <p className="text-2xl md:text-3xl mb-8 opacity-90">
            Track, Rate, and Discover Movies Like Never Before
          </p>
          <p className="text-xl mb-12 opacity-80 max-w-2xl mx-auto">
            Join thousands of movie lovers. Create watchlists, track what you've watched, 
            rate movies, and get personalized recommendations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/signup" 
              className="bg-primary hover:bg-secondary text-white font-bold py-4 px-8 rounded-full text-lg transition duration-300 transform hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link 
              href="/auth/login" 
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary font-bold py-4 px-8 rounded-full text-lg transition duration-300"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Everything You Need to Track Movies
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-primary bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Film className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Track & Rate</h3>
              <p className="text-gray-600">
                Keep track of movies you've watched, rate them, and write reviews. 
                Never forget what you thought about a film.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Social Features</h3>
              <p className="text-gray-600">
                Follow friends, see their activity, share lists, and discover 
                movies through your social network.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Smart Recommendations</h3>
              <p className="text-gray-600">
                Get personalized movie recommendations based on your viewing history 
                and ratings using AI-powered suggestions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your Movie Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join our community and discover your next favorite film
          </p>
          <Link 
            href="/auth/signup"
            className="bg-primary hover:bg-secondary text-white font-bold py-4 px-12 rounded-full text-lg transition duration-300 transform hover:scale-105"
          >
            Sign Up Now - It's Free!
          </Link>
        </div>
      </div>
    </div>
  );
}

