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
  Play,
  Search,
  Loader2,
  Globe,
  CheckCircle2,
  ArrowDown,
  Wand2
} from 'lucide-react';
import { Movie } from '../../types.ts';
import { api } from '../../services/api.ts';

interface MovieFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (savedMovie: Movie) => void;
  movieToEdit?: Movie | null;
}

export const MovieFormModal: React.FC<MovieFormModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  movieToEdit
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

  // AI Movie Auto-Fill states
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<Array<{ title: string; url: string }>>([]);
  const [highlightUrlField, setHighlightUrlField] = useState(false);
  const streamingUrlRef = useRef<HTMLInputElement>(null);

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
    } else {
      // Defaults for new movie
      setTitle('');
      setDescription('');
      setReleaseYear(2026);
      setSelectedGenres(['Action', 'Drama']);
      setCategory('Action / Drama');
      setQuality('1080p');
      setLanguage('Hindi + Telugu');
      setStreamingUrl('');
      setPosterUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80');
      setBackdropUrl('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80');
      setIsFeatured(false);
      setIsTrending(true);
      setIsPopular(true);
      setIsPublished(true);
      setRating(8.5);
      setDuration('2h 20m');
    }
    setError(null);
    setAiSuccessMessage(null);
    setAiSources([]);
    setHighlightUrlField(false);
  }, [movieToEdit, isOpen]);

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

  // AI Movie Search & Auto-Fill from Google
  const handleAiAutoFill = async (customQuery?: string) => {
    const q = (customQuery || aiQuery).trim();
    if (!q) {
      setError('Please enter a movie title to search with AI.');
      return;
    }

    try {
      setIsAiLoading(true);
      setError(null);
      setAiSuccessMessage(null);
      setAiSources([]);

      const res = await api.fetchMovieAiDetails(q);
      const d = res.movieDetails;

      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.releaseYear) setReleaseYear(Number(d.releaseYear));
      if (d.genre && Array.isArray(d.genre) && d.genre.length > 0) {
        setSelectedGenres(d.genre);
      }
      if (d.category) setCategory(d.category);
      if (d.quality && ['480p', '720p', '1080p', '4K'].includes(d.quality)) {
        setQuality(d.quality as '480p' | '720p' | '1080p' | '4K');
      }
      if (d.language) setLanguage(d.language);
      if (d.rating) setRating(Number(d.rating));
      if (d.duration) setDuration(d.duration);
      if (d.posterUrl) setPosterUrl(d.posterUrl);
      if (d.backdropUrl) setBackdropUrl(d.backdropUrl);

      if (res.sources && res.sources.length > 0) {
        setAiSources(res.sources);
      }

      setAiSuccessMessage(`✨ Details and official poster for "${d.title || q}" auto-filled from Google! Now simply paste your streaming video link below.`);
      setHighlightUrlField(true);

      // Focus the streaming URL field
      setTimeout(() => {
        if (streamingUrlRef.current) {
          streamingUrlRef.current.focus();
          streamingUrlRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);

      // Dismiss highlight after 6 seconds
      setTimeout(() => {
        setHighlightUrlField(false);
      }, 6000);
    } catch (err: any) {
      setError(`AI Auto-Fill Error: ${err.message || 'Failed to retrieve movie details.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

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
    if (!streamingUrl.trim()) {
      setError('Movie video streaming URL is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim() || 'No description provided.',
        releaseYear: Number(releaseYear) || 2026,
        genre: selectedGenres,
        category: category.trim() || selectedGenres.join(' / '),
        quality,
        language: language.trim(),
        streamingUrl: streamingUrl.trim(),
        posterUrl: posterUrl.trim() || presetPosters[0].url,
        backdropUrl: backdropUrl.trim() || undefined,
        isFeatured,
        isTrending,
        isPopular,
        isPublished,
        rating: Number(rating) || 8.0,
        duration: duration.trim() || '2h 15m'
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
          {/* AI Movie Search & Auto-Fill from Google */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/70 via-purple-950/50 to-neutral-900 border border-purple-500/50 p-5 shadow-xl shadow-purple-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-900">
                  <Wand2 className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>AI Movie Auto-Fill from Google</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                      Google Search Grounded
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-300">
                    Search any movie name to auto-fetch official poster, synopsis, year, genre & ratings from Google. You only need to add your video streaming link!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAiAutoFill();
                    }
                  }}
                  placeholder="Type movie name (e.g. Pushpa 2, Kalki 2898 AD, Inception, Dune)..."
                  className="w-full bg-neutral-950/90 border border-purple-500/40 focus:border-purple-400 rounded-xl pl-10 pr-8 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
                {aiQuery && (
                  <button
                    type="button"
                    onClick={() => setAiQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAiAutoFill()}
                disabled={isAiLoading || !aiQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:to-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-950 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching Google...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Auto-Fill Details</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-neutral-400 font-medium">Quick Suggestions:</span>
              {['Pushpa 2: The Rule', 'Kalki 2898 AD', 'Jawan', 'Animal', 'Dune: Part Two', 'The Paradise'].map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setAiQuery(name);
                    handleAiAutoFill(name);
                  }}
                  disabled={isAiLoading}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-purple-900/50 text-neutral-300 hover:text-purple-200 border border-neutral-700/60 hover:border-purple-500/50 transition-colors cursor-pointer"
                >
                  + {name}
                </button>
              ))}
            </div>

            {/* Success Banner */}
            {aiSuccessMessage && (
              <div className="mt-3.5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-emerald-200">{aiSuccessMessage}</p>
                  {aiSources.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Grounded Google Sources:
                      </span>
                      {aiSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-300 hover:text-white underline truncate max-w-[150px] inline-flex items-center gap-0.5"
                          title={s.title}
                        >
                          <span>{s.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                <span>Movie Video Streaming URL (Direct Link)</span>
                <span className="text-xs text-red-400 font-normal">*required</span>
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
              Paste the direct video link (MP4, WebM, HLS .m3u8, or MKV). The movie player will stream it directly in the browser, or provide an "Open Movie Link" button if restricted.
            </p>

            <div className="flex gap-2">
              <input
                ref={streamingUrlRef}
                type="text"
                value={streamingUrl}
                onChange={e => setStreamingUrl(e.target.value)}
                placeholder="http://ftp13.circleftp.net/.../The%20Paradise.mkv or https://.../movie.mp4"
                className={`flex-1 bg-neutral-950 border rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none transition-all ${
                  highlightUrlField
                    ? 'border-emerald-400 focus:border-emerald-300 ring-2 ring-emerald-500/40'
                    : 'border-neutral-700 focus:border-red-500'
                }`}
                required
              />
              {streamingUrl && (
                <a
                  href={streamingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Test link in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test Link</span>
                </a>
              )}
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
