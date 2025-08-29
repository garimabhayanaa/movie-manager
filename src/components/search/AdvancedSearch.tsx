'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tmdb } from '@/lib/tmdb';
import { Movie, Genre } from '@/types';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  Star,
  Clock,
  DollarSign,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface SearchFilters {
  query: string;
  genres: number[];
  yearRange: [number, number];
  ratingRange: [number, number];
  runtimeRange: [number, number];
  sortBy: 'popularity.desc' | 'popularity.asc' | 'release_date.desc' | 'release_date.asc' | 'vote_average.desc' | 'vote_average.asc';
  includeAdult: boolean;
  language: string;
  withCast: string;
  withCrew: string;
  withKeywords: string;
}

const AdvancedSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams?.get('q') || '',
    genres: [],
    yearRange: [1900, new Date().getFullYear() + 2],
    ratingRange: [0, 10],
    runtimeRange: [0, 300],
    sortBy: 'popularity.desc',
    includeAdult: false,
    language: 'en',
    withCast: '',
    withCrew: '',
    withKeywords: '',
  });

  useEffect(() => {
    loadGenres();
    if (searchParams?.get('q')) {
      performSearch();
    }
  }, []);

  useEffect(() => {
    if (filters.query || filters.genres.length > 0) {
      performSearch();
    }
  }, [filters, currentPage]);

  const loadGenres = async () => {
    try {
      const genreData = await tmdb.getGenres();
      setGenres(genreData.genres);
    } catch (error) {
      console.error('Error loading genres:', error);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResults = await advancedMovieSearch(filters, currentPage);
      setMovies(searchResults.results);
      setTotalResults(searchResults.total_results);
      
      // Update URL with search parameters
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.genres.length > 0) params.set('genres', filters.genres.join(','));
      if (filters.yearRange[0] !== 1900 || filters.yearRange[1] !== new Date().getFullYear() + 2) {
        params.set('year_start', filters.yearRange[0].toString());
        params.set('year_end', filters.yearRange[1].toString());
      }
      if (filters.sortBy !== 'popularity.desc') params.set('sort_by', filters.sortBy);
      
      router.push(`/search/advanced?${params.toString()}`, { shallow: true });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const advancedMovieSearch = async (searchFilters: SearchFilters, page: number) => {
    const params = new URLSearchParams();
    
    if (searchFilters.query) {
      // Use search endpoint if there's a query
      params.set('api_key', process.env.NEXT_PUBLIC_TMDB_API_KEY!);
      params.set('query', searchFilters.query);
      params.set('page', page.toString());
      
      const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params.toString()}`);
      return response.json();
    } else {
      // Use discover endpoint for filtering
      params.set('api_key', process.env.NEXT_PUBLIC_TMDB_API_KEY!);
      params.set('page', page.toString());
      params.set('sort_by', searchFilters.sortBy);
      params.set('include_adult', searchFilters.includeAdult.toString());
      params.set('language', searchFilters.language);
      
      if (searchFilters.genres.length > 0) {
        params.set('with_genres', searchFilters.genres.join(','));
      }
      
      if (searchFilters.yearRange[0] > 1900) {
        params.set('primary_release_date.gte', `${searchFilters.yearRange[0]}-01-01`);
      }
      
      if (searchFilters.yearRange[1] < new Date().getFullYear() + 2) {
        params.set('primary_release_date.lte', `${searchFilters.yearRange[1]}-12-31`);
      }
      
      if (searchFilters.ratingRange[0] > 0) {
        params.set('vote_average.gte', searchFilters.ratingRange[0].toString());
      }
      
      if (searchFilters.ratingRange[1] < 10) {
        params.set('vote_average.lte', searchFilters.ratingRange[1].toString());
      }
      
      if (searchFilters.runtimeRange[0] > 0) {
        params.set('with_runtime.gte', searchFilters.runtimeRange[0].toString());
      }
      
      if (searchFilters.runtimeRange[1] < 300) {
        params.set('with_runtime.lte', searchFilters.runtimeRange[1].toString());
      }
      
      if (searchFilters.withCast) {
        params.set('with_cast', searchFilters.withCast);
      }
      
      if (searchFilters.withCrew) {
        params.set('with_crew', searchFilters.withCrew);
      }
      
      if (searchFilters.withKeywords) {
        params.set('with_keywords', searchFilters.withKeywords);
      }
      
      const response = await fetch(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`);
      return response.json();
    }
  };

  const handleGenreToggle = (genreId: number) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId]
    }));
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      genres: [],
      yearRange: [1900, new Date().getFullYear() + 2],
      ratingRange: [0, 10],
      runtimeRange: [0, 300],
      sortBy: 'popularity.desc',
      includeAdult: false,
      language: 'en',
      withCast: '',
      withCrew: '',
      withKeywords: '',
    });
    setCurrentPage(1);
  };

  const RangeSlider = ({ 
    label, 
    min, 
    max, 
    value, 
    onChange, 
    step = 1,
    unit = ''
  }: {
    label: string;
    min: number;
    max: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    step?: number;
    unit?: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="px-3">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{value[0]}{unit}</span>
          <span>{value[1]}{unit}</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            value={value[0]}
            step={step}
            onChange={(e) => onChange([parseInt(e.target.value), value[1]])}
            className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="range"
            min={min}
            max={max}
            value={value[1]}
            step={step}
            onChange={(e) => onChange([value[0], parseInt(e.target.value)])}
            className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Advanced Movie Search</h1>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main Search Bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Search for movies, actors, directors..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            />
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Filter Toggle & Search Button */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-3 border rounded-lg transition ${
                showFilters ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
            
            <button
              onClick={performSearch}
              disabled={loading}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={resetFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset All
                </button>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="popularity.desc">Most Popular</option>
                  <option value="popularity.asc">Least Popular</option>
                  <option value="release_date.desc">Newest First</option>
                  <option value="release_date.asc">Oldest First</option>
                  <option value="vote_average.desc">Highest Rated</option>
                  <option value="vote_average.asc">Lowest Rated</option>
                </select>
              </div>

              {/* Genres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Genres</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreToggle(genre.id)}
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        filters.genres.includes(genre.id)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Range */}
              <RangeSlider
                label="Release Year"
                min={1900}
                max={new Date().getFullYear() + 2}
                value={filters.yearRange}
                onChange={(value) => setFilters(prev => ({ ...prev, yearRange: value }))}
              />

              {/* Rating Range */}
              <RangeSlider
                label="Rating"
                min={0}
                max={10}
                value={filters.ratingRange}
                onChange={(value) => setFilters(prev => ({ ...prev, ratingRange: value }))}
                step={0.1}
                unit="/10"
              />

              {/* Runtime Range */}
              <RangeSlider
                label="Runtime"
                min={0}
                max={300}
                value={filters.runtimeRange}
                onChange={(value) => setFilters(prev => ({ ...prev, runtimeRange: value }))}
                unit=" min"
              />

              {/* Cast/Crew Search */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">With Cast</label>
                  <input
                    type="text"
                    value={filters.withCast}
                    onChange={(e) => setFilters(prev => ({ ...prev, withCast: e.target.value }))}
                    placeholder="Actor names..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">With Crew</label>
                  <input
                    type="text"
                    value={filters.withCrew}
                    onChange={(e) => setFilters(prev => ({ ...prev, withCrew: e.target.value }))}
                    placeholder="Director, writer names..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                  <input
                    type="text"
                    value={filters.withKeywords}
                    onChange={(e) => setFilters(prev => ({ ...prev, withKeywords: e.target.value }))}
                    placeholder="Movie themes, keywords..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Additional Options */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.includeAdult}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeAdult: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include adult content</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          {/* Results Header */}
          {totalResults > 0 && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Found {totalResults.toLocaleString()} results
                {filters.query && ` for "${filters.query}"`}
              </p>
              
              {/* Active Filters */}
              <div className="flex flex-wrap gap-2">
                {filters.genres.map(genreId => {
                  const genre = genres.find(g => g.id === genreId);
                  return genre ? (
                    <span
                      key={genreId}
                      className="inline-flex items-center bg-primary text-white px-2 py-1 rounded-full text-xs"
                    >
                      {genre.name}
                      <button
                        onClick={() => handleGenreToggle(genreId)}
                        className="ml-1 hover:text-gray-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Movie Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-300 aspect-[2/3] rounded-lg"></div>
                  <div className="bg-gray-300 h-4 rounded mt-2"></div>
                  <div className="bg-gray-300 h-3 rounded mt-1"></div>
                </div>
              ))}
            </div>
          ) : movies.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {movies.map((movie) => (
                  <Link key={movie.id} href={`/movie/${movie.id}`} className="movie-card group">
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
                        <span className="text-xs text-gray-600">{movie.vote_average.toFixed(1)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {Math.ceil(totalResults / 20) > 1 && (
                <div className="flex justify-center mt-12 space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <span className="px-4 py-2 bg-primary text-white rounded-lg">
                    {currentPage} of {Math.min(Math.ceil(totalResults / 20), 500)}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(totalResults / 20), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(totalResults / 20) || currentPage >= 500}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search criteria or filters</p>
              <button
                onClick={resetFilters}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
