import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Movie, AdSlot } from '../types.ts';
import { MovieCard } from './MovieCard.tsx';
import { InFeedAdCard } from './Ads/InFeedAdCard.tsx';
import { Reveal } from './motion/Reveal.tsx';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onDetails: (movie: Movie) => void;
  showRanking?: boolean;
  inFeedAdSlot?: AdSlot;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  movies,
  onPlay,
  onDetails,
  showRanking = false,
  inFeedAdSlot
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const reduced = useReducedMotion();

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [movies]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <Reveal variant="blur-up" className="relative my-8 sm:my-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Row Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Row Wrapper with Scroll Buttons */}
      <div className="relative group/row">
        {canScrollLeft && (
          <motion.button
            onClick={() => handleScroll('left')}
            whileHover={reduced ? undefined : { scale: 1.06, x: -2 }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 z-20 w-9 h-14 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-700/80 rounded-r-lg flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 shadow-xl cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        )}

        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie, index) => (
            <React.Fragment key={movie.id}>
              {inFeedAdSlot && index === 2 && <InFeedAdCard slot={inFeedAdSlot} />}
              <motion.div
                initial={reduced ? false : { opacity: 0, x: 28, y: 10 }}
                whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(index * 0.05, 0.35),
                  ease: EASE
                }}
              >
                <MovieCard
                  movie={movie}
                  onPlay={onPlay}
                  onDetails={onDetails}
                  rank={showRanking ? index + 1 : undefined}
                />
              </motion.div>
            </React.Fragment>
          ))}
        </div>

        {canScrollRight && (
          <motion.button
            onClick={() => handleScroll('right')}
            whileHover={reduced ? undefined : { scale: 1.06, x: 2 }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 z-20 w-9 h-14 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-700/80 rounded-l-lg flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 shadow-xl cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        )}
      </div>
    </Reveal>
  );
};
