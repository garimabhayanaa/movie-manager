const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const tmdb = {
  searchMovies: async (query: string, page = 1) => {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
    );
    return response.json();
  },

  getMovie: async (id: number) => {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
    );
    return response.json();
  },

  getTrending: async (timeWindow: 'day' | 'week' = 'week') => {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`
    );
    return response.json();
  },

  getPopular: async (page = 1) => {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
    );
    return response.json();
  },

  getGenres: async () => {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`
    );
    return response.json();
  },

  getImageUrl: (path: string, size = 'w500') => {
    if (!path) return '/images/no-poster.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },
};
