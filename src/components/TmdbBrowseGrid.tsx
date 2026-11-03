import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, Film } from 'lucide-react';
import { TmdbDiscoveryItem } from '../types.ts';
import { api } from '../services/api.ts';
import { TmdbMovieCard } from './TmdbMovieCard.tsx';
import { Reveal, Stagger, StaggerItem } from './motion/Reveal.tsx';

export type TmdbBrowseSection =
  | 'trending'
  | 'hollywood'
  | 'bollywood'
  | 'south-indian'
  | 'bengali'
  | 'top-rated'
  | 'upcoming'
  | 'popular'
  | 'now-playing'
  | 'tv-popular';

interface TmdbBrowseGridProps {
  section: TmdbBrowseSection;
  title: string;
  subtitle?: string;
  onBack: () => void;
  onDetails: (item: TmdbDiscoveryItem) => void;
  onPlay?: (item: TmdbDiscoveryItem) => void;
}

export const TmdbBrowseGrid: React.FC<TmdbBrowseGridProps> = ({
  section,
  title,
  subtitle,
  onBack,
  onDetails,
  onPlay
}) => {
  const [items, setItems] = useState<TmdbDiscoveryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[] | null>(null);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else {
          setLoading(true);
          setError(null);
        }

        const res = await api.getTmdbSection(section, nextPage);
        setLanguages(res.languages);
        setTotalPages(Math.max(1, res.totalPages || 1));
        setPage(res.page || nextPage);
        setItems(prev => {
          if (!append) return res.results || [];
          const map = new Map<number, TmdbDiscoveryItem>();
          for (const item of [...prev, ...(res.results || [])]) {
            map.set(item.tmdbId, item);
          }
          return Array.from(map.values());
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load movies';
        if (!append) {
          setItems([]);
          setError(message);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [section]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setItems([]);
    setPage(1);
    loadPage(1, false);
  }, [section, loadPage]);

  const canLoadMore = page < totalPages;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Reveal variant="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
            {subtitle && <p className="text-sm text-neutral-400">{subtitle}</p>}
            {languages && languages.length > 0 && (
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                Original language filter: {languages.join(', ')}
              </p>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            Page {page} of {totalPages}
            {items.length > 0 ? ` · ${items.length} titles loaded` : ''}
          </p>
        </div>
      </Reveal>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-xl bg-neutral-900 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && items.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-300 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => loadPage(1, false)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <Film className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-neutral-300 text-sm font-semibold">No movies found in this section</p>
          <p className="text-neutral-500 text-xs max-w-md mx-auto">
            TMDB returned no results for this language filter. Try another industry section.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <Stagger
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
            stagger={0.03}
          >
            {items.map(item => (
              <StaggerItem key={`${item.mediaType}-${item.tmdbId}`} variant="scale-in">
                <TmdbMovieCard item={item} onDetails={onDetails} onPlay={onPlay} />
              </StaggerItem>
            ))}
          </Stagger>

          <div className="flex flex-col items-center gap-3 pt-4">
            {error && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            {canLoadMore ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadPage(page + 1, true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            ) : (
              <p className="text-xs text-neutral-500">End of results</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
