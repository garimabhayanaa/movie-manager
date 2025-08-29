'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { tmdb } from '@/lib/tmdb';
import { Movie, UserMovie, CastMember, CrewMember } from '@/types';
import { 
  Calendar, 
  Clock, 
  Star, 
  Users, 
  Award,
  Play,
  Share,
  Heart,
  Plus
} from 'lucide-react';
import CheckInButton from './CheckInButton';
import RatingComponent from './RatingComponent';
import ReviewSection from './ReviewSection';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import { RecommendationEngine } from '@/lib/recommendations';
import Link from 'next/link';

interface MovieDetailsProps {
  movie: Movie;
}

const MovieDetails = ({ movie }: MovieDetailsProps) => {
  const { user } = useAuth();
  const [userMovie, setUserMovie] = useState<UserMovie | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadSimilarMovies();
  }, [movie.id, user]);

  const loadUserData = async () => {
    if (user) {
      try {
        const um = await database.getUserMovie(user.uid, movie.id);
        setUserMovie(um);
      } catch (error) {
        console.error('Error loading user movie data:', error);
      }
    }
    setLoading(false);
  };

  const loadSimilarMovies = async () => {
    try {
      const similar = await RecommendationEngine.getSimilarMovies(movie.id);
      setSimilarMovies(similar.slice(0, 8));
    } catch (error) {
      console.error('Error loading similar movies:', error);
    }
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative">
        {/* Backdrop */}
        {movie.backdrop_path && (
          <div className="h-96 bg-gray-900 relative overflow-hidden">
            <img
              src={tmdb.getImageUrl(movie.backdrop_path, 'original')}
              alt={movie.title}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
          </div>
        )}

        {/* Movie Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Poster */}
              <div className="flex-shrink-0">
                <img
                  src={tmdb.getImageUrl(movie.poster_path, 'w500')}
                  alt={movie.title}
                  className="w-64 h-96 object-cover rounded-lg shadow-2xl"
                />
              </div>

              {/* Movie Info */}
              <div className="flex-1 text-white">
                <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>
                
                {/* Meta Info */}
                <div className="flex flex-wrap items-center space-x-6 mb-6 text-sm">
                  {movie.release_date && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                  )}
                  {movie.runtime && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatRuntime(movie.runtime)}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-400" />
                    <span>{movie.vote_average.toFixed(1)}/10</span>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres?.map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-white/20 px-3 py-1 rounded-full text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Overview */}
                <p className="text-lg leading-relaxed mb-6 max-w-3xl">
                  {movie.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center space-x-4">
                  <CheckInButton 
                    movie={movie} 
                    userMovie={userMovie}
                    onUpdate={loadUserData}
                  />
                  <button className="flex items-center space-x-2 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg hover:bg-white/30 transition">
                    <Share className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg hover:bg-white/30 transition">
                    <Plus className="h-4 w-4" />
                    <span>Add to List</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Rating & Review Section */}
            <ReviewSection
              movieId={movie.id}
              userMovie={userMovie}
              onUpdate={loadUserData}
            />

            {/* Cast */}
            {movie.credits?.cast && movie.credits.cast.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-2xl font-bold mb-6">Cast</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {movie.credits.cast.slice(0, 12).map((person: CastMember) => (
                    <div key={person.id} className="text-center">
                      <img
                        src={tmdb.getImageUrl(person.profile_path, 'w185')}
                        alt={person.name}
                        className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                      />
                      <h3 className="font-semibold text-sm">{person.name}</h3>
                      <p className="text-xs text-gray-600">{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Movies */}
            {similarMovies.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-2xl font-bold mb-6">More Like This</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {similarMovies.map((similarMovie) => (
                    <RecommendationCard
                      key={similarMovie.id}
                      movie={similarMovie}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Movie Details */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Release Date:</span>
                  <span className="ml-2 text-gray-600">
                    {movie.release_date ? 
                      new Date(movie.release_date).toLocaleDateString() : 
                      'Unknown'
                    }
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Runtime:</span>
                  <span className="ml-2 text-gray-600">
                    {movie.runtime ? formatRuntime(movie.runtime) : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Rating:</span>
                  <span className="ml-2 text-gray-600">
                    ⭐ {movie.vote_average.toFixed(1)}/10
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Votes:</span>
                  <span className="ml-2 text-gray-600">
                    {movie.vote_count?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Crew */}
            {movie.credits?.crew && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Key Crew</h3>
                <div className="space-y-3">
                  {movie.credits.crew
                    .filter((person: CrewMember) => 
                      ['Director', 'Producer', 'Writer', 'Screenplay'].includes(person.job)
                    )
                    .slice(0, 8)
                    .map((person: CrewMember) => (
                      <div key={`${person.id}-${person.job}`} className="flex justify-between">
                        <span className="font-medium text-sm">{person.name}</span>
                        <span className="text-sm text-gray-600">{person.job}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;
