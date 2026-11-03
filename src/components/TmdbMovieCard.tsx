import React, { useState } from 'react';
import { Star, Play, Info, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { TmdbDiscoveryItem } from '../types.ts';

interface TmdbMovieCardProps {
  item: TmdbDiscoveryItem;
  onDetails: (item: TmdbDiscoveryItem) => void;
  onPlay?: (item: TmdbDiscoveryItem) => void;
}

export const TmdbMovieCard: React.FC<TmdbMovieCardProps> = ({ item, onDetails, onPlay }) => {
  const [imgError, setImgError] = useState(false);
  const reduced = useReducedMotion();
  const fallback =
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';

  return (
    <motion.div
      className="relative group shrink-0 cursor-pointer"
      whileHover={
        reduced
          ? undefined
          : { y: -8, transition: { type: 'spring', stiffness: 380, damping: 22 } }
      }
      onClick={() => onDetails(item)}
    >
      <div className="relative w-40 sm:w-48 md:w-56 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg group-hover:shadow-2xl group-hover:shadow-red-950/40 group-hover:border-neutral-700 transition-colors duration-300">
        <img
          src={imgError || !item.posterUrl ? fallback : item.posterUrl}
          alt={`${item.title} poster`}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-600/90 text-white font-bold border border-sky-400/40">
            TMDB
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-amber-400 font-bold border border-amber-500/30 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            {item.rating.toFixed(1)}
          </span>
        </div>

        {item.hasPlayback && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600/90 text-white font-semibold border border-emerald-400/40 inline-flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Watchable
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3.5 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-2">
            {item.hasPlayback && onPlay && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onPlay(item);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Play
              </button>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                onDetails(item);
              }}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer"
              title="Details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <h3 className="text-white text-xs sm:text-sm font-bold line-clamp-2">{item.title}</h3>
        </div>
      </div>

      <div className="mt-2 max-w-40 sm:max-w-48 md:max-w-56">
        <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-red-400 transition-colors truncate">
          {item.title}
        </h4>
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-0.5">
          <span>{item.releaseYear || '—'}</span>
          <span className="uppercase">{item.language}</span>
        </div>
      </div>
    </motion.div>
  );
};
