'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { tmdb } from '@/lib/tmdb';
import { Movie } from '@/types';
import Link from 'next/link';

interface SearchBarProps {
  placeholder?: string;
  onMovieSelect?: (movie: Movie) => void;
}

const SearchBar = ({ placeholder = "Search movies...", onMovieSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchMovies = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const response = await tmdb.searchMovies(query);
        setResults(response.results.slice(0, 8));
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMovies, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleMovieSelect = (movie: Movie) => {
    setQuery('');
    setIsOpen(false);
    if (onMovieSelect) {
      onMovieSelect(movie);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
        />
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map((movie) => (
              <div
                key={movie.id}
                onClick={() => handleMovieSelect(movie)}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <img
                  src={tmdb.getImageUrl(movie.poster_path, 'w92')}
                  alt={movie.title}
                  className="w-12 h-16 object-cover rounded flex-shrink-0"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {movie.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-yellow-600">⭐</span>
                    <span className="text-xs text-gray-500 ml-1">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">No movies found</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
