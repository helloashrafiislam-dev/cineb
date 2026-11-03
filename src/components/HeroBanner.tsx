import React, { useEffect, useRef, useState } from 'react';
import { Play, Info, Star, Sparkles, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

export interface HeroContent {
  id: string;
  title: string;
  description: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating: number;
  releaseYear?: number;
  language?: string;
  category?: string;
  quality?: string;
  duration?: string;
  badge?: string;
  canPlay?: boolean;
}

interface HeroBannerProps {
  slides: HeroContent[];
  loading?: boolean;
  intervalMs?: number;
  onPlay?: (slide: HeroContent) => void;
  onDetails: (slide: HeroContent) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const AUTO_MS = 6000;

export const HeroBanner: React.FC<HeroBannerProps> = ({
  slides,
  loading,
  intervalMs = AUTO_MS,
  onPlay,
  onDetails
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start']
  });

  const bgY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '22%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  // Keep index in range when slides change
  useEffect(() => {
    if (count === 0) {
      setIndex(0);
      return;
    }
    setIndex(prev => (prev >= count ? 0 : prev));
  }, [count]);

  // Auto-advance
  useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex(prev => (prev + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused, reduced]);

  if (loading || count === 0) {
    return (
      <div className="relative w-full h-[65vh] min-h-[480px] bg-neutral-900 animate-pulse flex items-center justify-center">
        <Film className="w-16 h-16 text-neutral-800" />
      </div>
    );
  }

  const content = slides[index] || slides[0];
  const showPlay = Boolean(content.canPlay && onPlay);
  const bgImage = content.backdropUrl || content.posterUrl;

  const goPrev = () => setIndex(prev => (prev - 1 + count) % count);
  const goNext = () => setIndex(prev => (prev + 1) % count);

  return (
    <div
      ref={sectionRef}
      className="relative w-full h-[75vh] min-h-[520px] max-h-[750px] overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={content.id}
            className="absolute inset-0"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: reduced ? 0.2 : 0.7, ease: EASE }}
          >
            {bgImage ? (
              <img
                src={bgImage}
                alt={content.title}
                className={`w-full h-full object-cover object-center scale-105 transform filter brightness-75 ${
                  reduced ? '' : 'animate-ken-burns'
                }`}
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <div className="w-full h-full bg-neutral-900" />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent w-full md:w-3/4" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-neutral-950/20 to-neutral-950/80" />
      </motion.div>

      {/* Prev / Next */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous featured title"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-neutral-950/55 hover:bg-neutral-900/80 border border-white/15 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next featured title"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-neutral-950/55 hover:bg-neutral-900/80 border border-white/15 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <motion.div
        className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 sm:pb-20 z-10"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`copy-${content.id}`}
            className="max-w-2xl space-y-4"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: reduced ? 0.15 : 0.45, ease: EASE }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-lg shadow-red-950">
                <Sparkles className={`w-3.5 h-3.5 ${reduced ? '' : 'animate-float-soft'}`} />
                {content.badge || 'Featured'}
              </span>
              {content.quality && (
                <span className="px-2.5 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md border border-neutral-700/80 text-xs font-semibold text-neutral-200">
                  {content.quality}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md border border-neutral-700/80 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" />
                {content.rating.toFixed(1)}
              </span>
              {content.releaseYear ? (
                <span className="text-xs font-semibold text-neutral-300">{content.releaseYear}</span>
              ) : null}
              {content.duration ? (
                <span className="text-xs font-medium text-neutral-400">• {content.duration}</span>
              ) : null}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md leading-none">
              {content.title}
            </h1>

            <div className="flex items-center gap-2 text-sm text-neutral-300 flex-wrap">
              {content.language && (
                <>
                  <span className="font-semibold text-red-400">Audio:</span>
                  <span className="bg-neutral-800/90 border border-neutral-700 px-2 py-0.5 rounded text-xs text-white">
                    {content.language}
                  </span>
                </>
              )}
              {content.category && (
                <>
                  {content.language && <span className="text-neutral-500">•</span>}
                  <span className="text-neutral-300 font-medium">{content.category}</span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-base text-neutral-300 line-clamp-3 leading-relaxed drop-shadow">
              {content.description}
            </p>

            <div className="flex items-center gap-3 pt-2">
              {showPlay && (
                <button
                  type="button"
                  onClick={() => onPlay?.(content)}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-red-950/60 cursor-pointer transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Watch Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onDetails(content)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm sm:text-base cursor-pointer transition-transform hover:scale-[1.03] active:scale-95 ${
                  showPlay
                    ? 'bg-neutral-800/80 hover:bg-neutral-700/80 text-white backdrop-blur-md border border-neutral-700/80'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/60'
                }`}
              >
                <Info className="w-5 h-5 text-neutral-300" />
                <span>More Info</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators + progress */}
        {count > 1 && (
          <div className="absolute bottom-5 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 flex items-center gap-2 max-w-7xl mx-auto">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}: ${slide.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="relative h-1.5 flex-1 max-w-[56px] rounded-full overflow-hidden bg-white/20 cursor-pointer"
              >
                {i === index && !paused && !reduced ? (
                  <span
                    key={`prog-${index}-${intervalMs}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-red-500"
                    style={{ animation: `hero-progress ${intervalMs}ms linear forwards` }}
                  />
                ) : (
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full bg-red-500 ${
                      i === index || i < index ? 'w-full' : 'w-0'
                    } ${i < index ? 'opacity-40' : ''}`}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes hero-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};
