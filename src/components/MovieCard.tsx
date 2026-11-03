import React, { useState } from 'react';
import { Play, Info, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Movie } from '../types.ts';

interface MovieCardProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onDetails: (movie: Movie) => void;
  rank?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onPlay, onDetails, rank }) => {
  const [imgError, setImgError] = useState(false);
  const reduced = useReducedMotion();

  const getQualityBadgeColor = (q: string) => {
    switch (q) {
      case '4K':
        return 'bg-amber-500/90 text-black font-extrabold border-amber-400';
      case '1080p':
        return 'bg-red-600/90 text-white font-bold border-red-500';
      case '720p':
        return 'bg-blue-600/90 text-white font-bold border-blue-500';
      default:
        return 'bg-neutral-700/90 text-neutral-200 border-neutral-600';
    }
  };

  const fallbackPoster =
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';

  return (
    <motion.div
      className="relative group shrink-0"
      whileHover={
        reduced
          ? undefined
          : {
              y: -10,
              transition: { type: 'spring', stiffness: 380, damping: 22 }
            }
      }
    >
      {rank !== undefined && (
        <motion.span
          className="absolute -left-3 bottom-0 text-7xl sm:text-8xl font-black text-neutral-800/80 select-none pointer-events-none drop-shadow-md z-0 leading-none"
          initial={reduced ? false : { opacity: 0, x: -12 }}
          whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {rank}
        </motion.span>
      )}

      <div
        className={`relative w-40 sm:w-48 md:w-56 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg group-hover:shadow-2xl group-hover:shadow-red-950/40 group-hover:border-neutral-700 transition-colors duration-300 cursor-pointer ${
          rank !== undefined ? 'ml-6' : ''
        }`}
      >
        <img
          src={imgError ? fallbackPoster : movie.posterUrl || fallbackPoster}
          alt={movie.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
        />

        {/* Soft light sweep on hover */}
        {!reduced && (
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] duration-700" />
        )}

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span
            className={`text-[10px] px-2 py-0.5 rounded shadow-md border ${getQualityBadgeColor(
              movie.quality
            )}`}
          >
            {movie.quality}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-amber-400 font-bold border border-amber-500/30 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            {movie.rating.toFixed(1)}
          </span>
        </div>

        <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-950/80 backdrop-blur-sm text-neutral-300 font-medium border border-neutral-700/60 line-clamp-1 max-w-[130px]">
            {movie.language}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3.5 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(movie);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950 cursor-pointer transition-colors"
              title="Watch movie"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetails(movie);
              }}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer transition-colors"
              title="Movie Details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
            <h3 className="text-white text-xs sm:text-sm font-bold line-clamp-1 leading-snug">
              {movie.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <span>{movie.releaseYear}</span>
              <span>•</span>
              <span className="line-clamp-1">{movie.genre.slice(0, 2).join(', ')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-2 ${rank !== undefined ? 'ml-6' : ''} max-w-40 sm:max-w-48 md:max-w-56`}>
        <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-red-400 transition-colors truncate">
          {movie.title}
        </h4>
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-0.5">
          <span>{movie.releaseYear}</span>
          <span className="text-[11px] text-neutral-400 truncate max-w-[100px]">
            {movie.category}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
