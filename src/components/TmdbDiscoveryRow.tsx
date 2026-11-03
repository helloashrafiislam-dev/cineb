import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, ChevronRight as ViewIcon } from 'lucide-react';
import { TmdbDiscoveryItem } from '../types.ts';
import { TmdbMovieCard } from './TmdbMovieCard.tsx';
import { Reveal } from './motion/Reveal.tsx';

interface TmdbDiscoveryRowProps {
  title: string;
  subtitle?: string;
  items: TmdbDiscoveryItem[];
  loading?: boolean;
  error?: string | null;
  onDetails: (item: TmdbDiscoveryItem) => void;
  onPlay?: (item: TmdbDiscoveryItem) => void;
  onViewAll?: () => void;
  /** When true, show an empty-state card instead of hiding the row */
  showEmpty?: boolean;
}

export const TmdbDiscoveryRow: React.FC<TmdbDiscoveryRowProps> = ({
  title,
  subtitle,
  items,
  loading,
  error,
  onDetails,
  onPlay,
  onViewAll,
  showEmpty = false
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
    setTimeout(checkScroll, 350);
  };

  const isEmpty = !loading && (!items || items.length === 0) && !error;
  if (isEmpty && !showEmpty) return null;

  return (
    <Reveal variant="blur-up" className="relative my-8 sm:my-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="truncate">{title}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block shrink-0" />
          </h2>
          {subtitle && <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>

        {onViewAll && !loading && items.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-400 hover:text-red-300 cursor-pointer"
          >
            View All
            <ViewIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && !loading && items.length === 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-6 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex gap-4 sm:gap-6 overflow-hidden py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-40 sm:w-48 md:w-56 aspect-[2/3] rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="relative group/row">
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-9 h-14 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-700/80 rounded-r-lg flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div
            ref={rowRef}
            onScroll={checkScroll}
            className="flex items-start gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 px-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map(item => (
              <TmdbMovieCard
                key={`${item.mediaType}-${item.tmdbId}`}
                item={item}
                onDetails={onDetails}
                onPlay={onPlay}
              />
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-9 h-14 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-700/80 rounded-l-lg flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      ) : (
        showEmpty &&
        !error && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-8 text-center space-y-1">
            <p className="text-sm text-neutral-400">No titles available in this section right now.</p>
            <p className="text-xs text-neutral-500">
              If other TMDB rows are loading, check the language filter or try again shortly.
            </p>
          </div>
        )
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading from TMDB…
        </div>
      )}
    </Reveal>
  );
};
