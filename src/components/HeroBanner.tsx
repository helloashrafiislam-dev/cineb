import React, { useRef } from 'react';
import { Play, Info, Star, Sparkles, Film } from 'lucide-react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Movie } from '../types.ts';

interface HeroBannerProps {
  movie: Movie | null;
  onPlay: (movie: Movie) => void;
  onDetails: (movie: Movie) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export const HeroBanner: React.FC<HeroBannerProps> = ({ movie, onPlay, onDetails }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start']
  });

  const bgY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '22%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  if (!movie) {
    return (
      <div className="relative w-full h-[65vh] min-h-[480px] bg-neutral-900 animate-pulse flex items-center justify-center">
        <Film className="w-16 h-16 text-neutral-800" />
      </div>
    );
  }

  const bgImage = movie.backdropUrl || movie.posterUrl;

  return (
    <div
      ref={sectionRef}
      className="relative w-full h-[75vh] min-h-[520px] max-h-[750px] overflow-hidden select-none"
    >
      {/* Parallax background with slow ken-burns */}
      <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
        <img
          src={bgImage}
          alt={movie.title}
          className={`w-full h-full object-cover object-center scale-105 transform filter brightness-75 ${
            reduced ? '' : 'animate-ken-burns'
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent w-full md:w-3/4" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-neutral-950/20 to-neutral-950/80" />
      </motion.div>

      {/* Content with staggered entrance + scroll fade */}
      <motion.div
        className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 sm:pb-20 z-10"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          className="max-w-2xl space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: reduced ? 0 : 0.09,
                delayChildren: reduced ? 0 : 0.12
              }
            }
          }}
        >
          <motion.div
            className="flex items-center gap-2 flex-wrap"
            variants={{
              hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
            }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-lg shadow-red-950">
              <Sparkles className={`w-3.5 h-3.5 ${reduced ? '' : 'animate-float-soft'}`} />
              Featured Release
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md border border-neutral-700/80 text-xs font-semibold text-neutral-200">
              {movie.quality}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md border border-neutral-700/80 text-xs font-semibold text-amber-400 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400" />
              {movie.rating.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-neutral-300">{movie.releaseYear}</span>
            <span className="text-xs font-medium text-neutral-400">• {movie.duration}</span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md leading-none"
            variants={{
              hidden: { opacity: 0, y: 32, filter: 'blur(8px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
            }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            {movie.title}
          </motion.h1>

          <motion.div
            className="flex items-center gap-2 text-sm text-neutral-300 flex-wrap"
            variants={{
              hidden: { opacity: 0, x: -24 },
              visible: { opacity: 1, x: 0 }
            }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="font-semibold text-red-400">Audio:</span>
            <span className="bg-neutral-800/90 border border-neutral-700 px-2 py-0.5 rounded text-xs text-white">
              {movie.language}
            </span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-300 font-medium">
              {movie.category || movie.genre.join(', ')}
            </span>
          </motion.div>

          <motion.p
            className="text-sm sm:text-base text-neutral-300 line-clamp-3 leading-relaxed drop-shadow"
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {movie.description}
          </motion.p>

          <motion.div
            className="flex items-center gap-3 pt-2"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <motion.button
              onClick={() => onPlay(movie)}
              whileHover={reduced ? undefined : { scale: 1.05 }}
              whileTap={reduced ? undefined : { scale: 0.96 }}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-red-950/60 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Watch Now</span>
            </motion.button>

            <motion.button
              onClick={() => onDetails(movie)}
              whileHover={reduced ? undefined : { scale: 1.05 }}
              whileTap={reduced ? undefined : { scale: 0.96 }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-neutral-700/80 cursor-pointer"
            >
              <Info className="w-5 h-5 text-neutral-300" />
              <span>More Info</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};
