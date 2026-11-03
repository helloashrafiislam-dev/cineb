import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Film,
  Loader2,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import { Movie, TmdbDiscoveryItem } from '../../types.ts';
import { api } from '../../services/api.ts';

type CatalogSection =
  | 'trending'
  | 'hollywood'
  | 'bollywood'
  | 'south-indian'
  | 'bengali'
  | 'popular'
  | 'top-rated'
  | 'now-playing'
  | 'upcoming';

const SECTIONS: Array<{ id: CatalogSection; label: string }> = [
  { id: 'trending', label: 'Trending' },
  { id: 'hollywood', label: 'Hollywood' },
  { id: 'bollywood', label: 'Bollywood' },
  { id: 'south-indian', label: 'South Indian' },
  { id: 'bengali', label: 'Bengali' },
  { id: 'popular', label: 'Popular' },
  { id: 'top-rated', label: 'Top Rated' },
  { id: 'now-playing', label: 'Now Playing' },
  { id: 'upcoming', label: 'Upcoming' }
];

interface TmdbMoviesListPanelProps {
  localMovies: Movie[];
  onImported: (movie: Movie) => void;
  onEditLocal: (movie: Movie) => void;
  onOpenManualImport: (item: TmdbDiscoveryItem) => void;
}

export const TmdbMoviesListPanel: React.FC<TmdbMoviesListPanelProps> = ({
  localMovies,
  onImported,
  onEditLocal,
  onOpenManualImport
}) => {
  const [section, setSection] = useState<CatalogSection>('trending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [items, setItems] = useState<TmdbDiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingId, setImportingId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const importedByTmdbId = useMemo(() => {
    const map = new Map<number, Movie>();
    for (const m of localMovies) {
      if (m.tmdbId) map.set(m.tmdbId, m);
    }
    return map;
  }, [localMovies]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTmdbSection(section, page);
      setItems((res.results || []).filter(r => r.mediaType !== 'tv'));
      setTotalPages(Math.max(1, res.totalPages || 1));
      setTotalResults(res.totalResults || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load TMDB movie list');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [section, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [section]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.originalTitle || '').toLowerCase().includes(q) ||
        String(item.tmdbId).includes(q)
    );
  }, [items, searchQuery]);

  const handleQuickImport = async (item: TmdbDiscoveryItem) => {
    if (importedByTmdbId.has(item.tmdbId)) {
      const existing = importedByTmdbId.get(item.tmdbId)!;
      onEditLocal(existing);
      return;
    }

    try {
      setImportingId(item.tmdbId);
      const res = await api.importTmdbMovie(item.tmdbId);
      onImported(res.movie);
      showFlash(`Imported "${res.movie.title}" into local catalog.`);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  const handleImportPage = async () => {
    const pending = filteredItems.filter(i => !importedByTmdbId.has(i.tmdbId));
    if (pending.length === 0) {
      showFlash('All visible movies on this page are already imported.');
      return;
    }

    try {
      setBulkBusy(true);
      setError(null);
      let ok = 0;
      let failed = 0;
      for (const item of pending) {
        try {
          const res = await api.importTmdbMovie(item.tmdbId);
          onImported(res.movie);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      showFlash(`Imported ${ok} movie${ok === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Bulk import failed');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            All TMDB Movies
          </h2>
          <p className="text-[11px] text-neutral-400 mt-1">
            Browse every title shown on the public site. Quick-import adds it to your local catalog
            (provider playback — paste a direct file URL later if needed).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading || bulkBusy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleImportPage}
            disabled={loading || bulkBusy || filteredItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Import this page
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
              section === s.id
                ? 'bg-red-600 text-white'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter this page by title or TMDB id…"
            className="bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 w-full sm:w-72"
          />
        </div>
        <div className="text-[11px] text-neutral-500">
          Page {page} of {totalPages}
          {totalResults > 0 ? ` · ${totalResults.toLocaleString()} titles` : ''}
          {searchQuery.trim() ? ` · showing ${filteredItems.length} on page` : ''}
        </div>
      </div>

      {flash && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {flash}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-950/70 border border-red-700/70 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">Movie</th>
                <th className="py-3.5 px-4">Year</th>
                <th className="py-3.5 px-4">Lang</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading TMDB movies…
                    </span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No movies found in this section.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const local = importedByTmdbId.get(item.tmdbId);
                  const busy = importingId === item.tmdbId;

                  return (
                    <tr key={item.tmdbId} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.posterUrl ||
                              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=80'
                            }
                            alt={item.title}
                            className="w-10 h-14 object-cover rounded-lg bg-neutral-800 border border-neutral-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate">{item.title}</div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              TMDB #{item.tmdbId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-400">
                        {item.releaseYear || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-400">{item.language || '—'}</td>
                      <td className="py-3 px-4 text-xs text-amber-300/90">
                        ★ {(item.rating || 0).toFixed(1)}
                      </td>
                      <td className="py-3 px-4">
                        {local ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            In catalog
                          </span>
                        ) : (
                          <span className="inline-flex text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-400 border border-neutral-700">
                            Not imported
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`https://www.themoviedb.org/movie/${item.tmdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                            title="Open on TMDB"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {local ? (
                            <button
                              onClick={() => onEditLocal(local)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 cursor-pointer"
                            >
                              Edit
                            </button>
                          ) : (
                            <>
                              <button
                                disabled={busy || bulkBusy}
                                onClick={() => onOpenManualImport(item)}
                                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 disabled:opacity-50 cursor-pointer"
                                title="Open form to paste a direct stream URL"
                              >
                                + URL
                              </button>
                              <button
                                disabled={busy || bulkBusy}
                                onClick={() => handleQuickImport(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                              >
                                {busy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                Import
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          disabled={page <= 1 || loading || bulkBusy}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
        >
          Previous
        </button>
        <span className="text-xs text-neutral-500">
          {SECTIONS.find(s => s.id === section)?.label} · page {page}
        </span>
        <button
          disabled={page >= totalPages || loading || bulkBusy}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
};
