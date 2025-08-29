'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { tmdb } from '@/lib/tmdb';
import { Movie } from '@/types';
import Link from 'next/link';
import { Star, Calendar, Filter } from 'lucide-react';

const SearchResults = () => {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    if (query) {
      searchMovies();
    }
  }, [query, page, sortBy, yearFilter]);

  const searchMovies = async () => {
    setLoading(true);
    try {
      const response = await tmdb.searchMovies(query, page);
      let results = response.results;

      // Apply filters
      if (yearFilter) {
        results = results.filter((movie: Movie) => 
          movie.release_date && movie.release_date.startsWith(yearFilter)
        );
      }

      // Apply sorting
      if (sortBy === 'rating') {
        results.sort((a: Movie, b: Movie) => b.vote_average - a.vote_average);
      } else if (sortBy === 'year') {
        results.sort((a: Movie, b: Movie) => 
          new Date(b.release_date || '').getTime() - new Date(a.release_date || '').getTime()
        );
      }

      setMovies(results);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!query) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Search Movies</h1>
        <p className="text-gray-600">Enter a search term to find movies</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search Results</h1>
          <p className="text-gray-600">
            {loading ? 'Searching...' : `Found results for "${query}"`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mt-4 md:mt-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="rating">Sort by Rating</option>
            <option value="year">Sort by Year</option>
          </select>
          
          <input
            type="number"
            placeholder="Year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary w-24"
            min="1900"
            max="2030"
          />
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 aspect-[2/3] rounded-lg"></div>
              <div className="bg-gray-300 h-4 rounded mt-2"></div>
              <div className="bg-gray-300 h-3 rounded mt-1"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {movies.map((movie) => (
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
                <h3 className="font-semibold mt-2 text-sm group-hover:text-primary transition line-clamp-2">
                  {movie.title}
                </h3>
                <div className="flex items-center justify-between mt-1">
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
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-12 space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 bg-primary text-white rounded-lg">
                {page} of {Math.min(totalPages, 500)}
              </span>
              
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || page >= 500}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
