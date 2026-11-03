import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Shield,
  Film,
  Eye,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Play,
  ExternalLink,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  DollarSign,
  Layers,
  Sliders,
  TrendingUp
} from 'lucide-react';
import { Movie, AdminUser, AdminStats, TmdbDiscoveryItem } from '../../types.ts';
import { api } from '../../services/api.ts';
import { MovieFormModal } from './MovieFormModal.tsx';
import { AdManagementTab } from './Ads/AdManagementTab.tsx';
import { AdAnalyticsTab } from './Ads/AdAnalyticsTab.tsx';
import { StreamingManagementTab } from './StreamingManagementTab.tsx';
import { TmdbMoviesListPanel } from './TmdbMoviesListPanel.tsx';
import { ContentComplianceTab } from './ContentComplianceTab.tsx';

interface AdminDashboardProps {
  adminUser: AdminUser;
  onLogout: () => void;
  onClose: () => void;
  onPlayMovie: (movie: Movie) => void;
  onMoviesUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onLogout,
  onClose,
  onPlayMovie,
  onMoviesUpdated
}) => {
  const [activeTab, setActiveTab] = useState<
    'movies' | 'streaming' | 'ads' | 'analytics' | 'compliance'
  >('movies');
  const [movieCatalogView, setMovieCatalogView] = useState<'local' | 'tmdb'>('tmdb');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [movieToEdit, setMovieToEdit] = useState<Movie | null>(null);
  const [seedTmdbItem, setSeedTmdbItem] = useState<TmdbDiscoveryItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  const fetchAdminData = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (silent) setStatsRefreshing(true);
      else setLoading(true);
      const [moviesRes, statsRes] = await Promise.all([
        api.getAdminMovies(),
        api.getAdminStats()
      ]);
      setMovies(moviesRes.movies);
      setStats(statsRes.stats);
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      if (silent) setStatsRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // Keep dashboard cards live (TMDB totals + local counts)
    const timer = window.setInterval(() => {
      fetchAdminData({ silent: true });
    }, 45000);
    return () => window.clearInterval(timer);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setMovieToEdit(null);
    setSeedTmdbItem(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (movie: Movie) => {
    setMovieToEdit(movie);
    setSeedTmdbItem(null);
    setIsFormModalOpen(true);
  };

  const handleOpenManualTmdbImport = (item: TmdbDiscoveryItem) => {
    setMovieToEdit(null);
    setSeedTmdbItem(item);
    setIsFormModalOpen(true);
  };

  const handleSaveSuccess = (savedMovie: Movie) => {
    setSeedTmdbItem(null);
    fetchAdminData();
    onMoviesUpdated();
    showNotification(`Movie "${savedMovie.title}" successfully saved! Changes are live.`);
  };

  const handleTmdbImported = (savedMovie: Movie) => {
    setMovies(prev => {
      if (prev.some(m => m.id === savedMovie.id || m.tmdbId === savedMovie.tmdbId)) {
        return prev.map(m =>
          m.id === savedMovie.id || m.tmdbId === savedMovie.tmdbId ? savedMovie : m
        );
      }
      return [savedMovie, ...prev];
    });
    fetchAdminData();
    onMoviesUpdated();
  };

  const handleDeleteMovie = async (movie: Movie) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${movie.title}"?`)) {
      return;
    }

    try {
      await api.deleteMovie(movie.id);
      fetchAdminData();
      onMoviesUpdated();
      showNotification(`Movie "${movie.title}" has been deleted.`);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleTogglePublished = async (movie: Movie) => {
    try {
      const nextState = !movie.isPublished;
      await api.updateMovie(movie.id, { isPublished: nextState });
      fetchAdminData();
      onMoviesUpdated();
      showNotification(`"${movie.title}" is now ${nextState ? 'Published' : 'Unpublished (Draft)'}.`);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleToggleFeatured = async (movie: Movie) => {
    try {
      const nextState = !movie.isFeatured;
      await api.updateMovie(movie.id, { isFeatured: nextState });
      fetchAdminData();
      onMoviesUpdated();
      showNotification(`"${movie.title}" featured banner status set to ${nextState ? 'Active' : 'Off'}.`);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset catalog to verified default data including The Paradise (2026)?')) {
      return;
    }
    try {
      await api.resetSeedData();
      fetchAdminData();
      onMoviesUpdated();
      showNotification('Catalog successfully reset to default test data including The Paradise!');
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter movies
  const filteredMovies = movies.filter(m => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.language.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'published') return m.isPublished;
    if (statusFilter === 'draft') return !m.isPublished;
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              title="Return to public website"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-950">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                  CineStream Admin Console
                </h1>
                <p className="text-[11px] text-neutral-400">
                  Signed in as: <span className="text-red-400 font-semibold">{adminUser.username}</span> ({adminUser.email})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-800 transition-colors cursor-pointer"
            >
              View Live Website
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold border border-red-800/60 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Navigation Tabs (Movies, Ad Management, Analytics) */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-900/80 rounded-2xl border border-neutral-800/90 w-fit max-w-full">
          <button
            onClick={() => setActiveTab('movies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'movies'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Movie Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('streaming')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'streaming'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Streaming</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Providers
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ads'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Ad Monetization</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live slots
            </span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'compliance'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Content Compliance</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Revenue Analytics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Real events
            </span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-sm flex items-center justify-between shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-emerald-400 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: MOVIE MANAGEMENT */}
        {activeTab === 'movies' && (
          <div className="space-y-6">
            {/* Stats Grid — local catalog only (real DB counts) */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => fetchAdminData({ silent: true })}
                disabled={statsRefreshing || loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-300 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${statsRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Movies</span>
                  <Film className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {(stats?.totalMovies ?? movies.length).toLocaleString()}
                </div>
                <div className="text-[11px] text-neutral-500">Imported in local database</div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Published</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {(stats?.publishedMovies ?? movies.filter(m => m.isPublished).length).toLocaleString()}
                </div>
                <div className="text-[11px] text-neutral-500">Published in local catalog</div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Drafts</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">
                  {(stats?.draftMovies ?? movies.filter(m => !m.isPublished).length).toLocaleString()}
                </div>
                <div className="text-[11px] text-neutral-500">Unpublished local entries</div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
                  <Eye className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {(stats?.totalViews ?? movies.reduce((acc, m) => acc + (m.views || 0), 0)).toLocaleString()}
                </div>
                <div className="text-[11px] text-neutral-500">Real local playback views</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 bg-neutral-900/70 rounded-xl border border-neutral-800 w-fit">
              <button
                onClick={() => setMovieCatalogView('tmdb')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  movieCatalogView === 'tmdb'
                    ? 'bg-sky-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All TMDB Movies
              </button>
              <button
                onClick={() => setMovieCatalogView('local')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  movieCatalogView === 'local'
                    ? 'bg-red-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Imported Catalog ({movies.length})
              </button>
            </div>

            {movieCatalogView === 'tmdb' ? (
              <TmdbMoviesListPanel
                localMovies={movies}
                onImported={handleTmdbImported}
                onEditLocal={handleOpenEdit}
                onOpenManualImport={handleOpenManualTmdbImport}
              />
            ) : (
              <>
                {/* Action Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleOpenAdd}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-bold text-sm shadow-xl shadow-purple-950/40 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>✨ Add Movie (AI Auto-Fill)</span>
                    </button>

                    <button
                      onClick={handleResetSeed}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
                      title="Ensure test data like The Paradise (2026) is present"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ensure Test Movie (The Paradise)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="published">Published Only</option>
                      <option value="draft">Drafts Only</option>
                    </select>

                    <div className="relative">
                      <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search movies..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 w-44 sm:w-56"
                      />
                    </div>
                  </div>
                </div>

                {/* Movies Management Table */}
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-neutral-300">
                      <thead className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="py-3.5 px-4">Movie</th>
                          <th className="py-3.5 px-4">Quality & Audio</th>
                          <th className="py-3.5 px-4">Genre / Category</th>
                          <th className="py-3.5 px-4">Direct Stream Link</th>
                          <th className="py-3.5 px-4">Visibility</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/80 font-normal">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-neutral-500">
                              Loading movies from database...
                            </td>
                          </tr>
                        ) : filteredMovies.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-neutral-500">
                              No imported movies yet. Switch to{' '}
                              <button
                                onClick={() => setMovieCatalogView('tmdb')}
                                className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
                              >
                                All TMDB Movies
                              </button>{' '}
                              to import titles.
                            </td>
                          </tr>
                        ) : (
                          filteredMovies.map(movie => {
                            const isMkv = movie.streamingUrl?.toLowerCase().includes('.mkv');
                            const isHls = movie.streamingUrl?.toLowerCase().includes('.m3u8');

                            return (
                              <tr key={movie.id} className="hover:bg-neutral-900/40 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={movie.posterUrl}
                                      alt={movie.title}
                                      className="w-10 h-14 object-cover rounded-lg bg-neutral-800 border border-neutral-700 shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
                                      }}
                                    />
                                    <div>
                                      <div className="font-bold text-white text-sm hover:text-red-400 transition-colors flex items-center gap-2 flex-wrap">
                                        <span>{movie.title}</span>
                                        {movie.isFeatured && (
                                          <span className="text-[10px] px-1.5 py-0.2 bg-red-600/30 text-red-400 border border-red-500/40 rounded font-semibold">
                                            Hero
                                          </span>
                                        )}
                                        {movie.streamingUrl?.trim() ? (
                                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 rounded font-semibold">
                                            Direct link
                                          </span>
                                        ) : (
                                          <span className="text-[10px] px-1.5 py-0.2 bg-sky-600/20 text-sky-400 border border-sky-500/40 rounded font-semibold">
                                            Provider
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-neutral-400">
                                        {movie.releaseYear} • ★ {movie.rating.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="space-y-1">
                                    <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-white">
                                      {movie.quality}
                                    </span>
                                    <div className="text-xs text-neutral-400">
                                      {movie.language}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="space-y-1">
                                    <div className="text-xs font-semibold text-neutral-200">
                                      {movie.category}
                                    </div>
                                    <div className="text-[11px] text-neutral-400">
                                      {movie.genre.slice(0, 2).join(', ')}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 max-w-[200px]">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono font-bold">
                                        {movie.streamingUrl
                                          ? isMkv
                                            ? 'MKV'
                                            : isHls
                                              ? 'HLS'
                                              : 'DIRECT'
                                          : 'PROVIDER'}
                                      </span>
                                      {movie.streamingUrl ? (
                                        <>
                                          <button
                                            onClick={() => copyUrl(movie.id, movie.streamingUrl)}
                                            className="text-neutral-400 hover:text-white p-0.5 rounded"
                                            title="Copy stream URL"
                                          >
                                            {copiedId === movie.id ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                          <a
                                            href={movie.streamingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-neutral-400 hover:text-red-400 p-0.5"
                                            title="Test link in new tab"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        </>
                                      ) : null}
                                    </div>
                                    <p
                                      className="text-[11px] font-mono text-neutral-500 truncate"
                                      title={movie.streamingUrl || 'Provider playback via TMDB'}
                                    >
                                      {movie.streamingUrl || 'No direct URL — using stream providers'}
                                    </p>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleTogglePublished(movie)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                        movie.isPublished
                                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                                      }`}
                                    >
                                      {movie.isPublished ? 'Published' : 'Draft'}
                                    </button>
                                    <button
                                      onClick={() => handleToggleFeatured(movie)}
                                      className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                        movie.isFeatured
                                          ? 'bg-red-600/20 text-red-400 border-red-500/40'
                                          : 'bg-neutral-800/60 text-neutral-500 border-neutral-800 hover:text-neutral-300'
                                      }`}
                                      title="Toggle featured hero banner"
                                    >
                                      Hero
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => onPlayMovie(movie)}
                                      disabled={!movie.streamingUrl}
                                      className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                                      title={
                                        movie.streamingUrl
                                          ? 'Preview in video player'
                                          : 'No direct stream URL — open from public TMDB page'
                                      }
                                    >
                                      <Play className="w-4 h-4 fill-current" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEdit(movie)}
                                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                                      title="Edit movie"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMovie(movie)}
                                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/60 text-neutral-400 hover:text-red-300 transition-colors cursor-pointer"
                                      title="Delete movie"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
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
              </>
            )}
          </div>
        )}

        {/* TAB: Multi-provider Streaming Management */}
        {activeTab === 'streaming' && <StreamingManagementTab />}

        {/* TAB: AD MONETIZATION MANAGEMENT */}
        {activeTab === 'ads' && (
          <AdManagementTab onAdDataChanged={onMoviesUpdated} />
        )}

        {activeTab === 'compliance' && <ContentComplianceTab />}

        {/* TAB 3: REVENUE & PERFORMANCE ANALYTICS */}
        {activeTab === 'analytics' && (
          <AdAnalyticsTab />
        )}
      </main>

      {/* Add / Edit Movie Modal */}
      <MovieFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSeedTmdbItem(null);
        }}
        onSaveSuccess={handleSaveSuccess}
        movieToEdit={movieToEdit}
        seedTmdbItem={seedTmdbItem}
      />
    </div>
  );
};
