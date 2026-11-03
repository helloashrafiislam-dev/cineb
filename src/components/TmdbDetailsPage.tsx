import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
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
import {
  Movie,
  TmdbDiscoveryItem,
  TmdbMovieFullDetails,
  AdSlot,
  AdSettings
} from '../types.ts';
import { TmdbAttribution } from './TmdbAttribution.tsx';
import { TmdbMovieCard } from './TmdbMovieCard.tsx';
import { ProviderPlayer } from './ProviderPlayer.tsx';
import { AdBanner } from './Ads/AdBanner.tsx';
import { BottomAdsRow } from './Ads/BottomAdsRow.tsx';
import { SidebarAds } from './Ads/SidebarAds.tsx';
import { LegalMiniFooter } from './Legal/LegalMiniFooter.tsx';

interface TmdbDetailsPageProps {
  tmdbId: number;
  onBack: () => void;
  onPlayLocal: (movie: Movie) => void;
  onSelectTmdb: (item: TmdbDiscoveryItem) => void;
  adSlots?: AdSlot[];
  adSettings?: AdSettings;
}

export const TmdbDetailsPage: React.FC<TmdbDetailsPageProps> = ({
  tmdbId,
  onBack,
  onPlayLocal,
  onSelectTmdb,
  adSlots = [],
  adSettings
}) => {
  const [details, setDetails] = useState<TmdbMovieFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  const showAds = Boolean(adSettings?.masterEnabled && adSettings?.detailsAdsEnabled);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    let alive = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setError(null);
    setDetails(null);

    const applyDetails = (detailsPayload: TmdbMovieFullDetails) => {
      setDetails(detailsPayload);
      if (detailsPayload?.title) {
        document.title = `${detailsPayload.title} (${detailsPayload.releaseYear}) | CineStream`;
        const desc = document.querySelector('meta[name="description"]');
        if (desc && detailsPayload.overview) {
          desc.setAttribute('content', detailsPayload.overview.slice(0, 160));
        }
      }
    };

    api
      .getTmdbMovieDetails(tmdbId)
      .then(res => {
        if (!alive) return;
        applyDetails(res.details);

        // Background provider match may complete shortly after first paint — soft refetch once
        const stream = res.details?.stream || res.details?.nexStream;
        if (!stream?.hasStream && !stream?.hasNexStream) {
          pollTimer = setTimeout(() => {
            api
              .getTmdbMovieDetails(tmdbId)
              .then(second => {
                if (alive) applyDetails(second.details);
              })
              .catch(() => undefined);
          }, 2500);
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
      if (pollTimer) clearTimeout(pollTimer);
      document.title = 'CineStream - Modern Movie Streaming & Admin Platform';
    };
  }, [tmdbId]);

  const localMovie = details?.localMovie || null;
  const streamInfo = details?.stream || details?.nexStream;
  const canPlayLocal = Boolean(localMovie?.streamingUrl && String(localMovie.streamingUrl).trim());
  // Owner direct link wins — hide provider live stream / provider ads for that title
  const canPlayProvider =
    !canPlayLocal &&
    Boolean((streamInfo?.hasStream || streamInfo?.hasNexStream) && streamInfo?.playerPath);
  const canPlay = canPlayLocal || canPlayProvider;
  const streamingUnavailable =
    Boolean(details) &&
    !canPlay &&
    (streamInfo?.streamStatus === 'unavailable' ||
      streamInfo?.streamStatus === 'failed' ||
      streamInfo?.streamStatus === 'disabled' ||
      !(streamInfo?.hasStream || streamInfo?.hasNexStream));
  const activeProviderLabel = streamInfo?.providerName || 'Provider';

  return (
    <div className="relative pb-16">
      {showAds && adSettings && <SidebarAds slots={adSlots} settings={adSettings} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center gap-3 text-neutral-400">
          <div className="w-full max-w-4xl h-56 sm:h-72 bg-neutral-900 animate-pulse rounded-2xl" />
          <p className="text-sm">Loading TMDB details…</p>
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-white text-xs cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      )}

      {details && !loading && (
        <motion.div
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <div className="relative w-full h-64 sm:h-80 md:h-[420px] rounded-3xl overflow-hidden border border-neutral-800">
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
              <h1 className="text-3xl sm:text-5xl font-black text-white drop-shadow-md">
                {details.title}
              </h1>
              {details.originalTitle && details.originalTitle !== details.title && (
                <p className="text-sm text-neutral-400 mt-1">{details.originalTitle}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
            <div className="space-y-4">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 max-w-[200px]">
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
              {showAds && adSettings && (
                <AdBanner
                  position="movie_details_below_poster"
                  slots={adSlots}
                  settings={adSettings}
                  className="my-1"
                />
              )}
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

              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                {details.overview || 'No overview available for this title yet.'}
              </p>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Synopsis and credits are provided for discovery. CineStream does not claim ownership of
                this title. Official trailer links open on YouTube when available.
              </p>

              {showAds && adSettings && (
                <AdBanner
                  position="movie_details_mid"
                  slots={adSlots}
                  settings={adSettings}
                  className="my-3"
                />
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {canPlayLocal && localMovie && (
                  <button
                    onClick={() => onPlayLocal(localMovie)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm cursor-pointer shadow-lg shadow-red-950"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Watch Movie
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-bold uppercase tracking-wide">
                      Direct
                    </span>
                  </button>
                )}

                {canPlayProvider && (
                  <a
                    href="#provider-player"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-950"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Watch Now
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-bold uppercase tracking-wide">
                      {activeProviderLabel}
                    </span>
                  </a>
                )}

                {(streamingUnavailable || streamInfo?.complianceBlockReason) && !canPlay && (
                  <div className="flex flex-col gap-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 text-xs max-w-md">
                    <span className="flex items-center gap-2">
                      <Film className="w-4 h-4 shrink-0" />
                      {streamInfo?.complianceBlockReason
                        ? 'Playback not authorized'
                        : 'Streaming currently unavailable'}
                    </span>
                    {streamInfo?.complianceBlockReason && (
                      <span className="text-neutral-500 leading-relaxed pl-6">
                        {streamInfo.complianceBlockReason}
                      </span>
                    )}
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

          {canPlayProvider && streamInfo?.playerPath && (
            <div id="provider-player">
              <ProviderPlayer
                tmdbId={details.tmdbId}
                title={details.title}
                playerPath={streamInfo.playerPath}
                providerName={streamInfo.providerName}
              />
            </div>
          )}

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
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-400" />
                Cast
              </h2>
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
                    <p className="text-[10px] text-neutral-500 line-clamp-1">{person.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {details.productionCompanies?.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-400" />
                Production
              </h2>
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
              <h2 className="text-lg font-bold text-white mb-3">Recommended</h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                {details.recommendations.map(item => (
                  <TmdbMovieCard key={item.tmdbId} item={item} onDetails={onSelectTmdb} />
                ))}
              </div>
            </section>
          )}

          {details.similar?.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">Similar Movies</h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                {details.similar.map(item => (
                  <TmdbMovieCard key={item.tmdbId} item={item} onDetails={onSelectTmdb} />
                ))}
              </div>
            </section>
          )}

          {showAds && adSettings && (
            <div className="pt-6 border-t border-neutral-800/80">
              <BottomAdsRow
                slots={adSlots}
                settings={adSettings}
                positions={['movie_details_below_related', 'home_footer']}
              />
            </div>
          )}

          <TmdbAttribution className="pt-4 border-t border-neutral-800" />
          <LegalMiniFooter />
        </motion.div>
      )}
    </div>
  );
};
