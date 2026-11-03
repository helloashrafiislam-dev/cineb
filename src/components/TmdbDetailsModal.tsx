import React, { useEffect, useState } from 'react';
import {
  X,
  Play,
  Star,
  Calendar,
  Clock,
  Film,
  ExternalLink,
  AlertCircle,
  Users,
  Building2
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../services/api.ts';
import { Movie, TmdbDiscoveryItem, TmdbMovieFullDetails } from '../types.ts';
import { TmdbAttribution } from './TmdbAttribution.tsx';
import { TmdbMovieCard } from './TmdbMovieCard.tsx';

interface TmdbDetailsModalProps {
  tmdbId: number;
  onClose: () => void;
  onPlayLocal: (movie: Movie) => void;
  onSelectTmdb: (item: TmdbDiscoveryItem) => void;
}

export const TmdbDetailsModal: React.FC<TmdbDetailsModalProps> = ({
  tmdbId,
  onClose,
  onPlayLocal,
  onSelectTmdb
}) => {
  const [details, setDetails] = useState<TmdbMovieFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let alive = true;
    setLoading(true);
    setError(null);
    setDetails(null);

    api
      .getTmdbMovieDetails(tmdbId)
      .then(res => {
        if (!alive) return;
        setDetails(res.details);
        // Lightweight SEO hint for SPA
        if (res.details?.title) {
          document.title = `${res.details.title} (${res.details.releaseYear}) | CineStream`;
          const desc = document.querySelector('meta[name="description"]');
          if (desc && res.details.overview) {
            desc.setAttribute('content', res.details.overview.slice(0, 160));
          }
        }
      })
      .catch(err => {
        if (alive) setError(err.message || 'Failed to load movie details');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      document.body.style.overflow = prev;
      document.title = 'CineStream - Modern Movie Streaming & Admin Platform';
    };
  }, [tmdbId]);

  const localMovie = details?.localMovie || null;
  const canPlay = Boolean(localMovie?.streamingUrl);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex min-h-full justify-center items-start p-3 sm:p-6 py-6 sm:py-10">
        <motion.div
          className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {loading && (
            <div className="p-16 flex flex-col items-center gap-3 text-neutral-400">
              <div className="w-full h-56 sm:h-72 bg-neutral-900 animate-pulse" />
              <p className="text-sm">Loading TMDB details…</p>
            </div>
          )}

          {error && (
            <div className="p-10 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

          {details && !loading && (
            <>
              <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
                <img
                  src={
                    details.backdropUrl ||
                    details.posterUrl ||
                    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80'
                  }
                  alt={`${details.title} backdrop`}
                  className="w-full h-full object-cover brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-sky-600 text-white text-xs font-bold">
                      TMDB
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-black/70 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {details.rating.toFixed(1)}
                    </span>
                    {details.releaseDate && (
                      <span className="text-xs text-neutral-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {details.releaseDate}
                      </span>
                    )}
                    {details.duration && (
                      <span className="text-xs text-neutral-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {details.duration}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">
                    {details.title}
                  </h1>
                  {details.originalTitle && details.originalTitle !== details.title && (
                    <p className="text-sm text-neutral-400 mt-1">{details.originalTitle}</p>
                  )}
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 max-w-[180px]">
                    <img
                      src={details.posterUrl || ''}
                      alt={`${details.title} poster`}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                      {details.genres?.map(g => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200"
                        >
                          {g}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-400 uppercase">
                        {details.language}
                      </span>
                    </div>

                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {details.overview || 'No overview available.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {canPlay && localMovie ? (
                        <button
                          onClick={() => onPlayLocal(localMovie)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm cursor-pointer shadow-lg shadow-red-950"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          Watch Movie
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 text-xs">
                          <Film className="w-4 h-4" />
                          Playback URL not configured yet — import via Admin to stream
                        </div>
                      )}

                      {details.trailerKey && (
                        <a
                          href={`https://www.youtube.com/watch?v=${details.trailerKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm font-semibold"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Official Trailer
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {details.trailerKey && (
                  <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-black aspect-video">
                    <iframe
                      title={`${details.title} trailer`}
                      src={`https://www.youtube.com/embed/${details.trailerKey}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                )}

                {details.cast?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-red-400" />
                      Cast
                    </h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
                      {details.cast.map(person => (
                        <div key={person.id} className="shrink-0 w-24 text-center">
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 mb-1.5">
                            {person.profileUrl ? (
                              <img
                                src={person.profileUrl}
                                alt={person.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                                N/A
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-neutral-200 line-clamp-2">
                            {person.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 line-clamp-1">
                            {person.character}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {details.productionCompanies?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-red-400" />
                      Production
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {details.productionCompanies.map(c => (
                        <div
                          key={c.id}
                          className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2"
                        >
                          {c.logoUrl && (
                            <img
                              src={c.logoUrl}
                              alt=""
                              className="h-5 w-auto object-contain max-w-[80px] bg-white/90 rounded px-1"
                            />
                          )}
                          {c.name}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {details.recommendations?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-white mb-3">Recommended</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                      {details.recommendations.map(item => (
                        <TmdbMovieCard
                          key={item.tmdbId}
                          item={item}
                          onDetails={onSelectTmdb}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {details.similar?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-white mb-3">Similar Movies</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                      {details.similar.map(item => (
                        <TmdbMovieCard
                          key={item.tmdbId}
                          item={item}
                          onDetails={onSelectTmdb}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <TmdbAttribution className="pt-4 border-t border-neutral-800" />
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
