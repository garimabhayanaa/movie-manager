'use client';

import Link from 'next/link';
import { Movie } from '@/types';
import { tmdb } from '@/lib/tmdb';
import { Star, Calendar, TrendingUp } from 'lucide-react';

interface RecommendationCardProps {
  movie: Movie;
  reason?: string;
  size?: 'sm' | 'md' | 'lg';
}

const RecommendationCard = ({ movie, reason, size = 'md' }: RecommendationCardProps) => {
  const sizeClasses = {
    sm: 'w-32',
    md: 'w-40',
    lg: 'w-48'
  };

  const imageSize = {
    sm: 'w154',
    md: 'w185',
    lg: 'w300'
  };

  return (
    <Link href={`/movie/${movie.id}`} className="movie-card group block">
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <img
          src={tmdb.getImageUrl(movie.poster_path, imageSize[size])}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover rounded-lg"
        />
        
        <div className="mt-3">
          <h3 className="font-semibold text-sm group-hover:text-primary transition line-clamp-2">
            {movie.title}
          </h3>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">
              {movie.release_date ? new Date(movie.release_date).getFullYear() : '—'}
            </span>
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-xs text-gray-600">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
          
          {reason && (
            <div className="mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 text-primary mr-1" />
              <span className="text-xs text-primary truncate">{reason}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default RecommendationCard;
