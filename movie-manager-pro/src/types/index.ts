export interface Movie {
    id: number;
    title: string;
    overview: string;
    poster_path?: string;
    backdrop_path?: string;
    release_date: string;
    vote_average: number;
    genre_ids: number[];
    genres?: Genre[];
    runtime?: number;
    cast?: CastMember[];
    crew?: CrewMember[];
  }
  
  export interface Genre {
    id: number;
    name: string;
  }
  
  export interface CastMember {
    id: number;
    name: string;
    character: string;
    profile_path?: string;
  }
  
  export interface CrewMember {
    id: number;
    name: string;
    job: string;
    profile_path?: string;
  }
  
  export interface UserMovie {
    id: string;
    userId: string;
    movieId: number;
    status: 'watched' | 'watching' | 'want_to_watch';
    rating?: number;
    review?: string;
    watchedDate?: Date;
    tags: string[];
    isFavorite: boolean;
    watchCount: number;
  }
  
  export interface MovieList {
    id: string;
    userId: string;
    name: string;
    description: string;
    isPublic: boolean;
    movies: number[];
    createdAt: Date;
    updatedAt: Date;
    followers: string[];
    likes: number;
  }
  
  export interface Activity {
    id: string;
    userId: string;
    type: 'watched' | 'rated' | 'reviewed' | 'listed' | 'followed';
    movieId?: number;
    listId?: string;
    targetUserId?: string;
    rating?: number;
    review?: string;
    createdAt: Date;
  }
  
  export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    criteria: {
      type: 'movies_watched' | 'genre_count' | 'streak_days' | 'reviews_written';
      value: number;
      genre?: string;
    };
  }
  
  export interface UserBadge {
    id: string;
    userId: string;
    badgeId: string;
    earnedAt: Date;
  }
  