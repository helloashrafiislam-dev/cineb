import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Link,
  Film,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Search,
  Loader2,
  Globe,
  CheckCircle2,
  ArrowDown
} from 'lucide-react';
import { Movie, TmdbDiscoveryItem } from '../../types.ts';
import { api } from '../../services/api.ts';

interface MovieFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (savedMovie: Movie) => void;
  movieToEdit?: Movie | null;
  /** Prefill form from a TMDB discovery item when adding (not editing). */
  seedTmdbItem?: TmdbDiscoveryItem | null;
}

export const MovieFormModal: React.FC<MovieFormModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  movieToEdit,
  seedTmdbItem = null
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(2026);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action', 'Drama']);
  const [category, setCategory] = useState('Action / Drama');
  const [quality, setQuality] = useState<'480p' | '720p' | '1080p' | '4K'>('1080p');
  const [language, setLanguage] = useState('Hindi + Telugu');
  const [streamingUrl, setStreamingUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(true);
  const [isPopular, setIsPopular] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [rating, setRating] = useState<number>(8.5);
  const [duration, setDuration] = useState('2h 15m');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string>('');

  // TMDB import states
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [tmdbImporting, setTmdbImporting] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<Array<TmdbDiscoveryItem & { alreadyImported?: boolean }>>([]);
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);
  const [tmdbId, setTmdbId] = useState<number | undefined>(undefined);
  const [originalTitle, setOriginalTitle] = useState('');
  const [posterPath, setPosterPath] = useState<string | null | undefined>(undefined);
  const [backdropPath, setBackdropPath] = useState<string | null | undefined>(undefined);
  const [releaseDate, setReleaseDate] = useState('');
  const [runtime, setRuntime] = useState<number | undefined>(undefined);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [tmdbSuccessMessage, setTmdbSuccessMessage] = useState<string | null>(null);
  const [highlightUrlField, setHighlightUrlField] = useState(false);
  const streamingUrlRef = useRef<HTMLInputElement>(null);
  const tmdbSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableGenres = [
    'Action',
    'Drama',
    'Sci-Fi',
    'Thriller',
    'Comedy',
    'Animation',
    'Crime',
    'Adventure',
    'Romance',
    'Horror'
  ];

  const presetPosters = [
    { label: 'Action/Thriller Poster', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80' },
    { label: 'Cyberpunk Sci-Fi', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80' },
    { label: 'Cinematic Drama', url: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&auto=format&fit=crop&q=80' },
    { label: 'Space Expedition', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80' }
  ];

  useEffect(() => {
    if (movieToEdit) {
      setTitle(movieToEdit.title);
      setDescription(movieToEdit.description);
      setReleaseYear(movieToEdit.releaseYear);
      setSelectedGenres(movieToEdit.genre || ['Action']);
      setCategory(movieToEdit.category || movieToEdit.genre?.[0] || 'Action');
      setQuality(movieToEdit.quality || '1080p');
      setLanguage(movieToEdit.language || 'English');
      setStreamingUrl(movieToEdit.streamingUrl || '');
      setPosterUrl(movieToEdit.posterUrl || '');
      setBackdropUrl(movieToEdit.backdropUrl || '');
      setIsFeatured(movieToEdit.isFeatured);
      setIsTrending(movieToEdit.isTrending);
      setIsPopular(movieToEdit.isPopular);
      setIsPublished(movieToEdit.isPublished);
      setRating(movieToEdit.rating || 8.0);
      setDuration(movieToEdit.duration || '2h 10m');
      setTmdbId(movieToEdit.tmdbId);
      setOriginalTitle(movieToEdit.originalTitle || '');
      setPosterPath(movieToEdit.posterPath);
      setBackdropPath(movieToEdit.backdropPath);
      setReleaseDate(movieToEdit.releaseDate || '');
      setRuntime(movieToEdit.runtime);
      setTrailerUrl(movieToEdit.trailerUrl || '');
      setSelectedTmdbId(movieToEdit.tmdbId ?? null);
    } else {
      setTitle('');
      setDescription('');
      setReleaseYear(new Date().getFullYear());
      setSelectedGenres(['Action', 'Drama']);
      setCategory('Action / Drama');
      setQuality('1080p');
      setLanguage('English');
      setStreamingUrl('');
      setPosterUrl('');
      setBackdropUrl('');
      setIsFeatured(false);
      setIsTrending(true);
      setIsPopular(true);
      setIsPublished(true);
      setRating(8.0);
      setDuration('2h 00m');
      setTmdbId(undefined);
      setOriginalTitle('');
      setPosterPath(undefined);
      setBackdropPath(undefined);
      setReleaseDate('');
      setRuntime(undefined);
      setTrailerUrl('');
      setSelectedTmdbId(null);
    }
    setError(null);
    setTmdbSuccessMessage(null);
    setTmdbResults([]);
    setTmdbQuery('');
    setHighlightUrlField(false);
  }, [movieToEdit, isOpen]);

  const handleSelectTmdbResult = async (item: TmdbDiscoveryItem & { alreadyImported?: boolean }) => {
    if (item.mediaType === 'tv') {
      setError('TV import is browse-only for now. Select a movie title to import.');
      return;
    }

    try {
      setTmdbImporting(true);
      setError(null);
      setSelectedTmdbId(item.tmdbId);
      const res = await api.getTmdbMovieForImport(item.tmdbId);
      const m = res.metadata;

      if (res.existingMovie && !movieToEdit) {
        setError(
          `"${res.existingMovie.title}" is already imported (TMDB #${item.tmdbId}). Edit that entry instead of creating a duplicate.`
        );
      }

      setTmdbId(m.tmdbId);
      setTitle(m.title || '');
      setOriginalTitle(m.originalTitle || '');
      setDescription(m.overview || m.description || '');
      setReleaseYear(m.releaseYear);
      setReleaseDate(m.releaseDate || '');
      setSelectedGenres(m.genres?.length ? m.genres : ['Drama']);
      setCategory(m.category || m.genres?.[0] || 'Drama');
      setLanguage((m.language || 'EN').toUpperCase());
      setRating(m.rating || 0);
      setDuration(m.duration || '2h 00m');
      setRuntime(m.runtime);
      setPosterUrl(m.posterUrl || '');
      setBackdropUrl(m.backdropUrl || '');
      setPosterPath(m.posterPath);
      setBackdropPath(m.backdropPath);
      setTrailerUrl(m.trailerUrl || '');

      setTmdbSuccessMessage(
        `TMDB metadata loaded for "${m.title}". Review fields, then paste the actual movie playback URL below (trailer ≠ movie file).`
      );
      setHighlightUrlField(true);
      setTmdbResults([]);
      setTmdbQuery(m.title);

      setTimeout(() => {
        streamingUrlRef.current?.focus();
        streamingUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      setTimeout(() => setHighlightUrlField(false), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to load TMDB movie metadata');
    } finally {
      setTmdbImporting(false);
    }
  };

  // Prefill from All TMDB Movies list ("+ URL" action)
  useEffect(() => {
    if (!isOpen || movieToEdit || !seedTmdbItem) return;
    void handleSelectTmdbResult(seedTmdbItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when modal opens with a seed item
  }, [isOpen, movieToEdit, seedTmdbItem?.tmdbId]);

  // Debounced TMDB search while typing
  useEffect(() => {
    if (!isOpen) return;
    if (tmdbSearchTimer.current) clearTimeout(tmdbSearchTimer.current);

    const q = tmdbQuery.trim();
    if (q.length < 2) {
      setTmdbResults([]);
      return;
    }

    tmdbSearchTimer.current = setTimeout(async () => {
      try {
        setTmdbSearching(true);
        setError(null);
        const res = await api.searchTmdbMovies(q);
        setTmdbResults(res.results || []);
      } catch (err: any) {
        setError(err.message || 'TMDB search failed');
        setTmdbResults([]);
      } finally {
        setTmdbSearching(false);
      }
    }, 400);

    return () => {
      if (tmdbSearchTimer.current) clearTimeout(tmdbSearchTimer.current);
    };
  }, [tmdbQuery, isOpen]);

  // Format detection on streamingUrl change
  useEffect(() => {
    if (!streamingUrl) {
      setDetectedFormat('');
      return;
    }
    const clean = streamingUrl.toLowerCase().split('?')[0];
    if (clean.endsWith('.mp4')) setDetectedFormat('MP4 (Standard Video)');
    else if (clean.endsWith('.webm')) setDetectedFormat('WebM (Standard Video)');
    else if (clean.endsWith('.m3u8')) setDetectedFormat('HLS Streaming (.m3u8)');
    else if (clean.endsWith('.mkv')) setDetectedFormat('MKV Video File');
    else if (clean.startsWith('ftp://')) setDetectedFormat('FTP Video Stream');
    else setDetectedFormat('Direct Video Stream URL');
  }, [streamingUrl]);

  if (!isOpen) return null;

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter(g => g !== genre));
      }
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Movie title is required.');
      return;
    }
    if (!streamingUrl.trim() && !tmdbId) {
      setError('Movie video streaming URL is required (or import with a TMDB id).');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const directUrl = streamingUrl.trim();
      const payload = {
        title: title.trim(),
        description: description.trim() || 'No description provided.',
        releaseYear: Number(releaseYear) || new Date().getFullYear(),
        genre: selectedGenres,
        category: category.trim() || selectedGenres.join(' / '),
        quality,
        language: language.trim(),
        streamingUrl: directUrl,
        posterUrl: posterUrl.trim() || presetPosters[0].url,
        backdropUrl: backdropUrl.trim() || undefined,
        isFeatured,
        isTrending,
        isPopular,
        isPublished,
        rating: Number(rating) || 8.0,
        duration: duration.trim() || '2h 15m',
        tmdbId,
        originalTitle: originalTitle.trim() || undefined,
        posterPath: posterPath ?? undefined,
        backdropPath: backdropPath ?? undefined,
        releaseDate: releaseDate || undefined,
        runtime,
        trailerUrl: trailerUrl.trim() || undefined,
        manualPlaybackOverride: Boolean(directUrl)
      };

      let resultMovie: Movie;
      if (movieToEdit) {
        const res = await api.updateMovie(movieToEdit.id, payload);
        resultMovie = res.movie;
      } else {
        const res = await api.createMovie(payload);
        resultMovie = res.movie;
      }

      onSaveSuccess(resultMovie);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save movie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {movieToEdit ? 'Edit Movie Details' : 'Add New Movie Link'}
              </h2>
              <p className="text-xs text-neutral-400">
                Paste direct video streaming link and configure movie information
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* TMDB Search & Import */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-950/70 via-neutral-900 to-neutral-950 border border-sky-500/40 p-5 shadow-xl">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Search TMDB
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase tracking-wider">
                    Metadata only
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Type a title → pick a match → metadata auto-fills. Then paste your own playback URL (TMDB does not provide movie files).
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tmdbQuery}
                onChange={e => setTmdbQuery(e.target.value)}
                placeholder="Search movie title on TMDB…"
                className="w-full bg-neutral-950/90 border border-sky-500/40 focus:border-sky-400 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
              {(tmdbSearching || tmdbImporting) && (
                <Loader2 className="w-4 h-4 animate-spin text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {tmdbResults.length > 0 && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-neutral-800 divide-y divide-neutral-800 bg-neutral-950/80">
                {tmdbResults.map(item => (
                  <button
                    key={item.tmdbId}
                    type="button"
                    disabled={tmdbImporting}
                    onClick={() => handleSelectTmdbResult(item)}
                    className={`w-full flex items-center gap-3 p-2.5 text-left hover:bg-neutral-900 transition-colors cursor-pointer ${
                      selectedTmdbId === item.tmdbId ? 'bg-sky-950/40' : ''
                    }`}
                  >
                    <img
                      src={
                        item.posterUrl ||
                        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=60'
                      }
                      alt=""
                      className="w-10 h-14 object-cover rounded-md bg-neutral-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-neutral-400">
                        {item.releaseYear || '—'} · ★ {item.rating.toFixed(1)} · {item.language}
                        {item.alreadyImported ? ' · Already imported' : ''}
                      </p>
                    </div>
                    {item.alreadyImported ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {tmdbSuccessMessage && (
              <div className="mt-3.5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="font-medium">{tmdbSuccessMessage}</p>
              </div>
            )}

            {tmdbId && (
              <p className="mt-2 text-[11px] text-sky-400/90 font-mono">
                Linked TMDB ID: {tmdbId}
                {originalTitle ? ` · ${originalTitle}` : ''}
              </p>
            )}
          </div>

          {/* Important Movie Link Feature Section (Prominent Highlight) */}
          <div className={`p-5 rounded-2xl transition-all duration-500 space-y-3 ${
            highlightUrlField
              ? 'bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-900 border-2 border-emerald-400 ring-4 ring-emerald-500/30 shadow-2xl shadow-emerald-950'
              : 'bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border border-red-500/40'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Link className={`w-4 h-4 ${highlightUrlField ? 'text-emerald-400' : 'text-red-500'}`} />
                <span>Direct Stream Link</span>
                <span className="text-xs text-neutral-500 font-normal">(optional)</span>
              </label>

              <div className="flex items-center gap-2">
                {highlightUrlField && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500 text-black font-extrabold flex items-center gap-1 animate-pulse">
                    <ArrowDown className="w-3 h-3" />
                    PASTE LINK HERE
                  </span>
                )}
                {detectedFormat && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-mono font-medium">
                    {detectedFormat}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-neutral-400">
              Add your direct video URL (MP4 / HLS / MKV). When set, Play uses this link (no provider stream) and opens
              your ad once in a new tab. Leave empty to keep normal provider streaming (provider ads).
            </p>

            <div className="flex gap-2">
              <input
                ref={streamingUrlRef}
                type="url"
                value={streamingUrl}
                onChange={e => setStreamingUrl(e.target.value)}
                placeholder="https://…/movie.mp4  or  http://…/movie.mkv"
                className={`flex-1 bg-neutral-950 border rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none transition-all ${
                  highlightUrlField
                    ? 'border-emerald-400 focus:border-emerald-300 ring-2 ring-emerald-500/40'
                    : 'border-neutral-700 focus:border-red-500'
                }`}
              />
              {streamingUrl.trim() && (
                <>
                  <button
                    type="button"
                    onClick={() => setStreamingUrl('')}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-semibold cursor-pointer"
                    title="Clear link — fall back to provider streaming"
                  >
                    Clear
                  </button>
                  <a
                    href={streamingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Test link in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Test</span>
                  </a>
                </>
              )}
            </div>

            <div
              className={`text-[11px] rounded-lg px-3 py-2 border ${
                streamingUrl.trim()
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : 'bg-sky-950/30 border-sky-800/40 text-sky-300'
              }`}
            >
              {streamingUrl.trim()
                ? 'Mode: Direct link playback + your site ad (1× new tab on Play)'
                : 'Mode: Provider streaming (provider player ads) — add a link above to override'}
            </div>
          </div>

          {/* Basic Movie Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Movie Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. The Paradise"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Release Year
              </label>
              <input
                type="number"
                value={releaseYear}
                onChange={e => setReleaseYear(parseInt(e.target.value, 10))}
                min={1900}
                max={2035}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Movie Description / Synopsis
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Enter synopsis or storyline details..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          {/* Quality & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Video Quality
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['480p', '720p', '1080p', '4K'] as const).map(q => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      quality === q
                        ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Language (Audio)
              </label>
              <input
                type="text"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                placeholder="e.g. Hindi + Telugu, English, Tamil"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Genres (Multi-select) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Genres (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map(g => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-red-600/30 text-red-300 border-red-500'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-red-400" />}
                    <span>{g}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Category Label
            </label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Action / Drama"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Poster & Backdrop URLs */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Movie Poster Image URL
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-500">Preset:</span>
                  {presetPosters.slice(0, 2).map((p, idx) => (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => setPosterUrl(p.url)}
                      className="text-[11px] text-red-400 hover:underline cursor-pointer"
                    >
                      Preset {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={posterUrl}
                onChange={e => setPosterUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono text-xs"
              />
            </div>

            {posterUrl && (
              <div className="flex items-center gap-3 p-2 bg-neutral-900 rounded-xl border border-neutral-800">
                <img
                  src={posterUrl}
                  alt="Poster preview"
                  className="w-12 h-16 object-cover rounded-lg border border-neutral-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = presetPosters[0].url;
                  }}
                />
                <span className="text-xs text-neutral-400">Poster Preview confirmed</span>
              </div>
            )}
          </div>

          {/* Rating & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Rating (out of 10)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={rating}
                onChange={e => setRating(parseFloat(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Runtime Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="2h 28m"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Status Switches */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Display & Visibility Status
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <span className="font-semibold">Published</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={e => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <span>Hero Banner</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={e => setIsTrending(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <span>Trending</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={e => setIsPopular(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <span>Popular</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm font-semibold border border-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-red-950 transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Movie...' : movieToEdit ? 'Save Changes' : 'Save Movie'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
