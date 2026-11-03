import React, { useEffect, useState } from 'react';
import { X, Play, Star, Calendar, Clock, Film, Globe, Layers, Eye, ExternalLink } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Movie, AdSlot, AdSettings } from '../types.ts';
import { api } from '../services/api.ts';
import { AdBanner } from './Ads/AdBanner.tsx';
import { Stagger, StaggerItem } from './motion/Reveal.tsx';

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  adSlots?: AdSlot[];
  adSettings?: AdSettings;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  onClose,
  onPlay,
  onSelectMovie,
  adSlots = [],
  adSettings
}) => {
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!movie) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let isMounted = true;
    const fetchDetails = async () => {
      try {
        setLoadingRelated(true);
        const data = await api.getMovieById(movie.id);
        if (isMounted) {
          setRelatedMovies(data.related || []);
        }
      } catch (err) {
        console.error('Failed to load related movies:', err);
      } finally {
        if (isMounted) setLoadingRelated(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
      document.body.style.overflow = prevOverflow;
    };
  }, [movie]);

  const reduced = useReducedMotion();

  if (!movie) return null;

  const bgImage = movie.backdropUrl || movie.posterUrl;
  const isMkv = movie.streamingUrl?.toLowerCase().includes('.mkv');
  const isHls = movie.streamingUrl?.toLowerCase().includes('.m3u8');

  const showAds = adSettings?.masterEnabled && adSettings?.detailsAdsEnabled;
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden />

      {/* items-start (not center) so tall modals are never clipped at the top */}
      <div className="relative z-10 flex min-h-full justify-center items-start p-3 sm:p-6 py-6 sm:py-10">
        <motion.div
          className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl"
          initial={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, y: 24, scale: 0.98, filter: 'blur(8px)' }
          }
          animate={
            reduced
              ? { opacity: 1 }
              : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
          }
          exit={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, y: 16, scale: 0.98 }
          }
          transition={{ duration: reduced ? 0.15 : 0.4, ease }}
        >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Ad Placement: Above Movie Information Banner (Requirement 1.C) */}
        {showAds && (
          <div className="p-4 bg-neutral-950 border-b border-neutral-800/80 flex justify-center">
            <AdBanner
              position="movie_details_top"
              slots={adSlots}
              settings={adSettings}
              className="my-0"
            />
          </div>
        )}

        {/* Hero Backdrop in Modal */}
        <div className="relative w-full h-72 sm:h-96 overflow-hidden">
          <img
            src={bgImage}
            alt={movie.title}
            className="w-full h-full object-cover object-center filter brightness-90"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-neutral-950/30 to-transparent" />

          {/* Quick Header Overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold uppercase tracking-wider">
                  {movie.quality}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {movie.rating.toFixed(1)} / 10
                </span>
                <span className="text-xs text-neutral-300 font-medium">
                  {movie.releaseYear}
                </span>
                <span className="text-xs text-neutral-400">
                  • {movie.duration}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {movie.title}
              </h2>
            </div>

            {/* 2. Before Watch Now Button Ad & Watch Button (Requirement 1.C) */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              {showAds && (
                <div className="hidden lg:block max-w-[280px]">
                  <AdBanner
                    position="movie_details_before_watch"
                    slots={adSlots}
                    settings={adSettings}
                    className="my-0 scale-90"
                  />
                </div>
              )}

              <button
                onClick={() => onPlay(movie)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm sm:text-base transition-all duration-200 transform hover:scale-105 shadow-xl shadow-red-950 cursor-pointer active:scale-95 shrink-0"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Watch Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left 2 Cols: Description & Details */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Storyline & Synopsis
                </h3>
                <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                  {movie.description}
                </p>
              </div>

              {/* 3. Between movie description and movie details ad (Requirement 1.C) */}
              {showAds && (
                <AdBanner
                  position="movie_details_mid"
                  slots={adSlots}
                  settings={adSettings}
                  className="my-3"
                />
              )}

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Globe className="w-3.5 h-3.5 text-red-400" />
                    <span>Language</span>
                  </div>
                  <div className="text-white text-sm font-semibold truncate">
                    {movie.language}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Layers className="w-3.5 h-3.5 text-red-400" />
                    <span>Quality</span>
                  </div>
                  <div className="text-white text-sm font-semibold">
                    {movie.quality} Ultra HD
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Eye className="w-3.5 h-3.5 text-red-400" />
                    <span>Total Views</span>
                  </div>
                  <div className="text-white text-sm font-semibold">
                    {movie.views.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Streaming URL source indicator */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 space-y-1.5">
                <div className="flex items-center justify-between text-neutral-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-red-500" />
                    Streaming Source Information
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                    {isMkv ? 'MKV Container' : isHls ? 'HLS (.m3u8)' : 'Direct Video'}
                  </span>
                </div>
                <p className="truncate text-neutral-400 font-mono text-[11px]">
                  {movie.streamingUrl}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={movie.streamingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold underline text-xs"
                  >
                    <span>Open direct stream link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Poster Thumbnail & Meta Info */}
            <div className="space-y-4">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl max-w-[200px] mx-auto md:max-w-none">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              {/* 4. Below Movie Poster Ad (Requirement 1.C) */}
              {showAds && (
                <div className="pt-2">
                  <AdBanner
                    position="movie_details_below_poster"
                    slots={adSlots}
                    settings={adSettings}
                    className="my-1"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <div className="text-xs text-neutral-400">
                  <span className="text-neutral-500 block mb-1">Genres:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.genre.map(g => (
                      <span key={g} className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-neutral-400 pt-1">
                  <span className="text-neutral-500 block mb-1">Category:</span>
                  <span className="text-neutral-200 font-medium">{movie.category}</span>
                </div>
              </div>
            </div>
          </div>

          {relatedMovies.length > 0 && (
            <div className="pt-6 border-t border-neutral-800/80">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>Related Movies</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
              </h3>

              <Stagger
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                stagger={0.05}
              >
                {relatedMovies.map(relMovie => (
                  <StaggerItem key={relMovie.id} variant="scale-in">
                    <div
                      onClick={() => onSelectMovie(relMovie)}
                      className="cursor-pointer group"
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 group-hover:border-red-500/60 transition-colors">
                        <img
                          src={relMovie.posterUrl}
                          alt={relMovie.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
                          }}
                        />
                      </div>
                      <h5 className="text-xs font-semibold text-neutral-200 mt-1.5 truncate group-hover:text-red-400 transition-colors">
                        {relMovie.title}
                      </h5>
                      <div className="text-[10px] text-neutral-400">
                        {relMovie.releaseYear} • {relMovie.quality}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          )}

          {showAds && (
            <div className="pt-4 border-t border-neutral-800/80">
              <AdBanner
                position="movie_details_below_related"
                slots={adSlots}
                settings={adSettings}
              />
            </div>
          )}
        </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
