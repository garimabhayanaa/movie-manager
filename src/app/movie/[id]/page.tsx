import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { tmdb } from '@/lib/tmdb';
import MovieDetails from '@/components/movies/MovieDetails';

interface PageProps {
  params: {
    id: string;
  };
}

async function getMovie(id: string) {
  try {
    const movie = await tmdb.getMovie(parseInt(id));
    return movie;
  } catch (error) {
    console.error('Error fetching movie:', error);
    return null;
  }
}

export default async function MoviePage({ params }: PageProps) {
  const movie = await getMovie(params.id);

  if (!movie) {
    notFound();
  }

  return (
    <Suspense fallback={<MovieDetailsSkeleton />}>
      <MovieDetails movie={movie} />
    </Suspense>
  );
}

function MovieDetailsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-96 bg-gray-300"></div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-300 h-8 w-64 rounded mb-4"></div>
        <div className="bg-gray-300 h-4 w-full rounded mb-2"></div>
        <div className="bg-gray-300 h-4 w-3/4 rounded"></div>
      </div>
    </div>
  );
}
