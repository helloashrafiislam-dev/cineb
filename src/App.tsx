import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Film,
  Search,
  Layers,
  RotateCcw
} from 'lucide-react';
import { Movie, Category, AdminUser, FilterState, AdSlot, AdSettings, TmdbDiscoveryItem } from './types.ts';
import { api, authStorage } from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { MovieRow } from './components/MovieRow.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { MovieDetailsPage } from './components/MovieDetailsPage.tsx';
import { TmdbDiscoveryRow } from './components/TmdbDiscoveryRow.tsx';
import { TmdbMovieCard } from './components/TmdbMovieCard.tsx';
import { TmdbBrowseGrid, TmdbBrowseSection } from './components/TmdbBrowseGrid.tsx';
import { TmdbDetailsPage } from './components/TmdbDetailsPage.tsx';
import { TmdbAttribution } from './components/TmdbAttribution.tsx';
import { VideoPlayer } from './components/VideoPlayer.tsx';
import { AdminLoginPage } from './components/Admin/AdminLoginPage.tsx';
import { AdminDashboard } from './components/Admin/AdminDashboard.tsx';
import { AdBanner } from './components/Ads/AdBanner.tsx';
import { SidebarAds } from './components/Ads/SidebarAds.tsx';
import { PopupAdManager } from './components/Ads/PopupAdManager.tsx';
import { Reveal, Stagger, StaggerItem } from './components/motion/Reveal.tsx';
import { PageTransition } from './components/motion/PageTransition.tsx';
import { tryCardClickAd, openOwnerAdOnce, hasDirectStreamUrl } from './utils/cardClickAdGate.ts';
import {
  buildTmdbMoviePath,
  buildLocalMoviePath,
  parseDetailsRoute
} from './utils/slug.ts';
import { BottomAdsRow } from './components/Ads/BottomAdsRow.tsx';

function isAdminPath(pathname: string = window.location.pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function navigateTo(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function App() {
  // Navigation & View States
  const [currentTab, setCurrentTab] = useState('home');
  const [pathname, setPathname] = useState(window.location.pathname);
  const [activePlaybackMovie, setActivePlaybackMovie] = useState<Movie | null>(null);
  const detailsRoute = parseDetailsRoute(pathname);
  const detailsMovieId = detailsRoute?.kind === 'local' ? detailsRoute.movieId : null;
  const tmdbDetailsId = detailsRoute?.kind === 'tmdb' ? detailsRoute.tmdbId : null;

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(authStorage.getUser());
  const [adminAuthChecked, setAdminAuthChecked] = useState(!authStorage.getToken());
  const onAdminRoute = isAdminPath(pathname);

  // Local catalog (admin-imported only — no demo seed)
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Advertising Monetization States
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);

  // TMDB discovery (metadata catalog — playback only when imported locally)
  const [tmdbConfigured, setTmdbConfigured] = useState(false);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbSectionErrors, setTmdbSectionErrors] = useState<Record<string, string>>({});
  const [tmdbTrending, setTmdbTrending] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbHollywood, setTmdbHollywood] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbBollywood, setTmdbBollywood] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbSouthIndian, setTmdbSouthIndian] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbBengali, setTmdbBengali] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbPopular, setTmdbPopular] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbTopRated, setTmdbTopRated] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbNowPlaying, setTmdbNowPlaying] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbUpcoming, setTmdbUpcoming] = useState<TmdbDiscoveryItem[]>([]);
  const [tmdbPopularTv, setTmdbPopularTv] = useState<TmdbDiscoveryItem[]>([]);
  const [browseSection, setBrowseSection] = useState<TmdbBrowseSection | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    genre: 'All',
    language: 'All',
    quality: 'All',
    year: 'All',
    category: 'All'
  });

  // Keep SPA path in sync for /admin route
  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  // Verify stored admin token on boot
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      setAdminAuthChecked(true);
      return;
    }

    api.getAdminMe()
      .then(res => setAdminUser(res.admin))
      .catch(() => {
        authStorage.removeToken();
        setAdminUser(null);
      })
      .finally(() => setAdminAuthChecked(true));
  }, []);

  // Fetch local catalog + ads (playback library only; discovery is TMDB)
  const loadData = async () => {
    try {
      const [moviesRes, categoriesRes, adsRes] = await Promise.all([
        api.getMovies(),
        api.getCategories(),
        api.getAds()
      ]);

      setAllMovies(moviesRes.movies);
      setCategories(categoriesRes.categories);
      setAdSlots(adsRes.slots || []);
      setAdSettings(adsRes.settings);
    } catch (err) {
      console.error('Failed to load catalog and advertising data:', err);
    }
  };

  const loadTmdbDiscovery = async () => {
    try {
      setTmdbLoading(true);
      setTmdbError(null);
      const status = await api.getTmdbStatus();
      setTmdbConfigured(status.configured);
      if (!status.configured) {
        setTmdbError(
          'TMDB is not configured on the server. Set TMDB_ACCESS_TOKEN or TMDB_API_KEY in the environment and restart the server.'
        );
        return;
      }

      const disc = await api.getTmdbDiscover(1);
      // Guard against a stale Express process that still serves the pre-industry
      // discover payload (Vite HMR updates the UI without restarting the API).
      const industryKeys = ['hollywood', 'bollywood', 'southIndian', 'bengali'] as const;
      const missingIndustry = industryKeys.filter(key => !(key in disc));
      if (missingIndustry.length > 0) {
        setTmdbError(
          'TMDB API is outdated on the server. Restart `npm run dev` / the Node process so industry sections (Hollywood, Bollywood, South Indian, Bengali) can load.'
        );
      }

      setTmdbTrending(disc.trending || []);
      setTmdbHollywood(disc.hollywood || []);
      setTmdbBollywood(disc.bollywood || []);
      setTmdbSouthIndian(disc.southIndian || []);
      setTmdbBengali(disc.bengali || []);
      setTmdbPopular(disc.popular || []);
      setTmdbTopRated(disc.topRated || []);
      setTmdbNowPlaying(disc.nowPlaying || []);
      setTmdbUpcoming(disc.upcoming || []);
      setTmdbPopularTv(disc.popularTv || []);
      setTmdbSectionErrors(disc.sectionErrors || {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load TMDB discovery';
      console.error('TMDB discovery unavailable:', err);
      setTmdbError(message);
      setTmdbConfigured(false);
    } finally {
      setTmdbLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadTmdbDiscovery();
  }, []);

  const handleOpenTmdbDetails = (item: TmdbDiscoveryItem) => {
    if (item.mediaType === 'tv') {
      // TV shows are browse/metadata only in this catalog
      window.open(`https://www.themoviedb.org/tv/${item.tmdbId}`, '_blank', 'noopener,noreferrer');
      return;
    }

    // If this title already has an owner direct link, skip chance card-ads (ad runs on Play)
    const local = item.localMovieId
      ? allMovies.find(m => m.id === item.localMovieId)
      : allMovies.find(m => m.tmdbId === item.tmdbId);
    if (!hasDirectStreamUrl(local)) {
      if (tryCardClickAd(`tmdb-${item.tmdbId}`, adSettings, adSlots)) {
        return;
      }
    }

    navigateTo(buildTmdbMoviePath(item.title, item.tmdbId));
  };

  const handlePlayTmdbItem = (item: TmdbDiscoveryItem) => {
    if (item.localMovieId) {
      const local = allMovies.find(m => m.id === item.localMovieId);
      if (local && hasDirectStreamUrl(local)) {
        handlePlayMovie(local);
        return;
      }
    }
    handleOpenTmdbDetails(item);
  };

  // Filter change handlers
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      query: '',
      genre: 'All',
      language: 'All',
      quality: 'All',
      year: 'All',
      category: 'All'
    });
    setSearchQuery('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genre !== 'All') count++;
    if (filters.language !== 'All') count++;
    if (filters.quality !== 'All') count++;
    if (filters.year !== 'All') count++;
    if (filters.category !== 'All') count++;
    return count;
  }, [filters]);

  // Deduped TMDB catalog for search / tab views
  const allTmdbItems = useMemo(() => {
    const map = new Map<number, TmdbDiscoveryItem>();
    for (const item of [
      ...tmdbTrending,
      ...tmdbHollywood,
      ...tmdbBollywood,
      ...tmdbSouthIndian,
      ...tmdbBengali,
      ...tmdbPopular,
      ...tmdbTopRated,
      ...tmdbNowPlaying,
      ...tmdbUpcoming,
      ...tmdbPopularTv
    ]) {
      map.set(item.tmdbId, item);
    }
    return Array.from(map.values());
  }, [
    tmdbTrending,
    tmdbHollywood,
    tmdbBollywood,
    tmdbSouthIndian,
    tmdbBengali,
    tmdbPopular,
    tmdbTopRated,
    tmdbNowPlaying,
    tmdbUpcoming,
    tmdbPopularTv
  ]);

  const browseMeta: Record<TmdbBrowseSection, { title: string; subtitle: string }> = {
    trending: {
      title: 'Trending Movies',
      subtitle: 'What the world is watching this week on TMDB'
    },
    hollywood: {
      title: 'Popular Hollywood Movies',
      subtitle: 'English original-language films sorted by popularity'
    },
    bollywood: {
      title: 'Bollywood Movies',
      subtitle: 'Hindi (hi) original-language films from TMDB Discover'
    },
    'south-indian': {
      title: 'South Indian Movies',
      subtitle: 'Tamil, Telugu, Malayalam & Kannada (ta, te, ml, kn)'
    },
    bengali: {
      title: 'Bengali Movies',
      subtitle: 'Bengali (bn) original-language films from TMDB Discover'
    },
    'top-rated': {
      title: 'Top Rated Movies',
      subtitle: 'Highest-rated films on The Movie Database'
    },
    upcoming: {
      title: 'Upcoming Movies',
      subtitle: 'Coming soon to theaters worldwide'
    },
    popular: {
      title: 'Popular Movies',
      subtitle: 'Worldwide popular titles on TMDB'
    },
    'now-playing': {
      title: 'Now Playing',
      subtitle: 'Currently in cinemas'
    },
    'tv-popular': {
      title: 'Popular TV Shows',
      subtitle: 'Browse-only metadata from TMDB'
    }
  };

  const openBrowse = (section: TmdbBrowseSection) => {
    setBrowseSection(section);
    if (section === 'trending') setCurrentTab('trending');
    else if (section === 'hollywood') setCurrentTab('movies');
    else if (section === 'upcoming') setCurrentTab('latest');
    else setCurrentTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeBrowse = () => {
    setBrowseSection(null);
    setCurrentTab('home');
  };

  const filteredTmdbItems = useMemo(() => {
    return allTmdbItems.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          item.title.toLowerCase().includes(q) ||
          (item.overview || '').toLowerCase().includes(q) ||
          item.language.toLowerCase().includes(q) ||
          String(item.releaseYear || '').includes(q);
        if (!matchesQuery) return false;
      }

      if (filters.year !== 'All' && String(item.releaseYear || '') !== filters.year) {
        return false;
      }

      if (filters.language !== 'All') {
        const filterLang = filters.language.toLowerCase();
        const code = item.language.toUpperCase();
        if (filterLang.includes('english')) {
          if (code !== 'EN') return false;
        } else if (!filterLang.includes(code.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [allTmdbItems, searchQuery, filters.language, filters.year]);

  // Hero auto-slider: up to 8 unique titles (prefer trending, fill from Hollywood)
  const heroSlidesSource = useMemo(() => {
    const map = new Map<number, TmdbDiscoveryItem>();
    for (const item of [...tmdbTrending, ...tmdbHollywood, ...tmdbPopular]) {
      if (item.mediaType === 'tv') continue;
      if (!map.has(item.tmdbId)) map.set(item.tmdbId, item);
      if (map.size >= 8) break;
    }
    return Array.from(map.values()).slice(0, 8);
  }, [tmdbTrending, tmdbHollywood, tmdbPopular]);

  const heroSlides = useMemo(
    () =>
      heroSlidesSource.map((item, i) => ({
        id: `hero-${item.tmdbId}`,
        title: item.title,
        description: item.overview || 'Discover this title on The Movie Database.',
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl || item.posterUrl,
        rating: item.rating,
        releaseYear: item.releaseYear,
        language: item.language,
        category: item.mediaType === 'tv' ? 'TV Show' : 'Movie',
        badge: i === 0 ? 'Trending on TMDB' : 'Featured',
        canPlay: Boolean(item.hasPlayback)
      })),
    [heroSlidesSource]
  );

  // Tab switching
  const handleSelectTab = (tab: string) => {
    setBrowseSection(null);
    if (tab === 'trending') {
      setCurrentTab('trending');
      return;
    }
    if (tab === 'movies') {
      openBrowse('hollywood');
      return;
    }
    if (tab === 'latest') {
      openBrowse('upcoming');
      return;
    }
    setCurrentTab(tab);
  };

  // Playback & Details triggers
  const handlePlayMovie = (movie: Movie) => {
    // Direct-link titles: open owner's ad once in a new tab, then play the link
    if (hasDirectStreamUrl(movie)) {
      openOwnerAdOnce(`direct-play-${movie.id}`, adSettings, adSlots);
      setActivePlaybackMovie(movie);
      return;
    }
    setActivePlaybackMovie(movie);
  };

  const handleOpenDetails = (movie: Movie) => {
    // Direct-link movies skip chance card-ads; their ad fires once on Play instead
    if (!hasDirectStreamUrl(movie)) {
      if (tryCardClickAd(`movie-${movie.id}`, adSettings, adSlots)) {
        return;
      }
    }
    if (movie.tmdbId) {
      navigateTo(buildTmdbMoviePath(movie.title, movie.tmdbId));
      return;
    }
    navigateTo(buildLocalMoviePath(movie.title, movie.id));
  };

  const goHome = useCallback(() => {
    navigateTo('/');
  }, []);

  const handleAdminLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    navigateTo('/admin');
  };

  const handleAdminLogout = () => {
    api.adminLogout();
    setAdminUser(null);
    navigateTo('/');
  };

  // Dedicated /admin route — login page or dashboard (no public UI button)
  if (onAdminRoute) {
    if (!adminAuthChecked) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 text-sm">
          Checking admin session...
        </div>
      );
    }

    if (adminUser) {
      return (
        <AdminDashboard
          adminUser={adminUser}
          onLogout={handleAdminLogout}
          onClose={goHome}
          onPlayMovie={handlePlayMovie}
          onMoviesUpdated={loadData}
        />
      );
    }

    return (
      <AdminLoginPage
        onLoginSuccess={handleAdminLoginSuccess}
        onBackHome={goHome}
      />
    );
  }

  // If in Video Playback Mode
  if (activePlaybackMovie) {
    return (
      <VideoPlayer
        movie={activePlaybackMovie}
        onBack={() => setActivePlaybackMovie(null)}
        adSlots={adSlots}
        adSettings={adSettings || undefined}
      />
    );
  }

  // Dedicated movie / TMDB details pages (full page with ad placements)
  if (detailsMovieId || tmdbDetailsId !== null) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600 selection:text-white">
        <Navbar
          currentTab={currentTab}
          onSelectTab={tab => {
            goHome();
            handleSelectTab(tab);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isFilterOpen={false}
          onToggleFilter={() => {
            goHome();
            setIsFilterOpen(true);
          }}
          activeFilterCount={activeFilterCount}
        />
        <main className="pt-16 sm:pt-20">
          {detailsMovieId && (
            <MovieDetailsPage
              key={detailsMovieId}
              movieId={detailsMovieId}
              onBack={goHome}
              onPlay={handlePlayMovie}
              onSelectMovie={handleOpenDetails}
              adSlots={adSlots}
              adSettings={adSettings || undefined}
            />
          )}
          {tmdbDetailsId !== null && (
            <TmdbDetailsPage
              key={`tmdb-${tmdbDetailsId}`}
              tmdbId={tmdbDetailsId}
              onBack={goHome}
              onPlayLocal={handlePlayMovie}
              onSelectTmdb={handleOpenTmdbDetails}
              adSlots={adSlots}
              adSettings={adSettings || undefined}
            />
          )}
        </main>
        {adSettings && <PopupAdManager slots={adSlots} settings={adSettings} />}
      </div>
    );
  }

  const isBrowsingWithFilters = searchQuery.trim().length > 0 || activeFilterCount > 0;
  const showHomepageAds = Boolean(adSettings?.masterEnabled && adSettings?.homeAdsEnabled);

  // Find in-feed card ad for movie rows
  const inFeedAd = adSlots.find(s => s.position === 'home_between_cards' && s.enabled);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600 selection:text-white">
      {/* 1. Desktop Sticky Left & Right Sidebar Ads (Requirement 1.B & 5) */}
      {showHomepageAds && adSettings && (
        <SidebarAds slots={adSlots} settings={adSettings} />
      )}

      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content Area */}
      <main className="pt-16 sm:pt-20">

        {/* Filter Drawer */}
        <FilterBar
          filters={filters}
          onChangeFilter={handleFilterChange}
          onResetFilters={handleResetFilters}
          categories={categories}
          totalResults={filteredTmdbItems.length}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />

        <PageTransition
          viewKey={
            isBrowsingWithFilters
              ? `filter-${searchQuery}-${activeFilterCount}`
              : browseSection
                ? `browse-${browseSection}`
                : currentTab
          }
        >
          {browseSection && !isBrowsingWithFilters ? (
            <TmdbBrowseGrid
              section={browseSection}
              title={browseMeta[browseSection].title}
              subtitle={browseMeta[browseSection].subtitle}
              onBack={closeBrowse}
              onDetails={handleOpenTmdbDetails}
              onPlay={handlePlayTmdbItem}
            />
          ) : isBrowsingWithFilters ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              <Reveal variant="fade-up">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                  <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                      <Search className="w-6 h-6 text-red-500" />
                      <span>
                        {searchQuery ? `Search results for "${searchQuery}"` : 'Filtered Movies'}
                      </span>
                    </h1>
                    <p className="text-xs text-neutral-400 mt-1">
                      Showing {filteredTmdbItems.length}{' '}
                      {filteredTmdbItems.length === 1 ? 'title' : 'titles'} from TMDB
                    </p>
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </Reveal>

              {filteredTmdbItems.length === 0 ? (
                <Reveal variant="scale-in" className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                    <Film className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">No Titles Match Your Criteria</h3>
                  <p className="text-sm text-neutral-400 max-w-md mx-auto">
                    Try adjusting your search terms or year filter, then browse TMDB sections on Home.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </Reveal>
              ) : (
                <Stagger
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
                  stagger={0.045}
                >
                  {filteredTmdbItems.map(item => (
                    <StaggerItem key={`${item.mediaType}-${item.tmdbId}`} variant="scale-in">
                      <TmdbMovieCard
                        item={item}
                        onDetails={handleOpenTmdbDetails}
                        onPlay={handlePlayTmdbItem}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          ) : (
            <>
              {currentTab === 'home' && (
                <HeroBanner
                  slides={heroSlides}
                  loading={tmdbLoading && heroSlides.length === 0}
                  onPlay={slide => {
                    const item = heroSlidesSource.find(s => `hero-${s.tmdbId}` === slide.id);
                    if (item) handlePlayTmdbItem(item);
                  }}
                  onDetails={slide => {
                    const item = heroSlidesSource.find(s => `hero-${s.tmdbId}` === slide.id);
                    if (item) handleOpenTmdbDetails(item);
                  }}
                />
              )}

              {tmdbError && !tmdbLoading && (currentTab === 'home' || currentTab === 'trending' || currentTab === 'movies' || currentTab === 'latest') && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
                  <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p>
                      <span className="font-semibold text-red-100">TMDB unavailable: </span>
                      {tmdbError}
                    </p>
                    <button
                      type="button"
                      onClick={() => loadTmdbDiscovery()}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {showHomepageAds && adSettings && currentTab === 'home' && (
                <Reveal variant="fade-up" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6 flex justify-center">
                  <AdBanner
                    position="home_between_sections"
                    slots={adSlots}
                    settings={adSettings}
                    className="my-2"
                  />
                </Reveal>
              )}

              {/* Optional local library after admin TMDB import */}
              {currentTab === 'home' && allMovies.length > 0 && (
                <MovieRow
                  title="Your Library"
                  subtitle="Titles imported for streaming playback"
                  movies={allMovies}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                  inFeedAdSlot={showHomepageAds ? inFeedAd : undefined}
                />
              )}

              {/* Industry & language catalog sections (original_language filters) */}
              {(currentTab === 'home' || currentTab === 'trending') && (tmdbConfigured || tmdbLoading) && (
                <TmdbDiscoveryRow
                  title="Trending Movies"
                  subtitle="Live weekly trends from The Movie Database"
                  items={tmdbTrending}
                  loading={tmdbLoading && tmdbTrending.length === 0}
                  error={tmdbSectionErrors.trending}
                  showEmpty
                  onDetails={handleOpenTmdbDetails}
                  onPlay={handlePlayTmdbItem}
                  onViewAll={() => openBrowse('trending')}
                />
              )}

              {currentTab === 'home' && (tmdbConfigured || tmdbLoading) && (
                <>
                  <TmdbDiscoveryRow
                    title="Popular Hollywood Movies"
                    subtitle="English (en) · TMDB Discover by original language"
                    items={tmdbHollywood}
                    loading={tmdbLoading && tmdbHollywood.length === 0}
                    error={tmdbSectionErrors.hollywood}
                    showEmpty
                    onDetails={handleOpenTmdbDetails}
                    onPlay={handlePlayTmdbItem}
                    onViewAll={() => openBrowse('hollywood')}
                  />

                  <TmdbDiscoveryRow
                    title="Bollywood Movies"
                    subtitle="Hindi (hi) · TMDB Discover by original language"
                    items={tmdbBollywood}
                    loading={tmdbLoading && tmdbBollywood.length === 0}
                    error={tmdbSectionErrors.bollywood}
                    showEmpty
                    onDetails={handleOpenTmdbDetails}
                    onPlay={handlePlayTmdbItem}
                    onViewAll={() => openBrowse('bollywood')}
                  />

                  <TmdbDiscoveryRow
                    title="South Indian Movies"
                    subtitle="Tamil, Telugu, Malayalam & Kannada (ta, te, ml, kn)"
                    items={tmdbSouthIndian}
                    loading={tmdbLoading && tmdbSouthIndian.length === 0}
                    error={tmdbSectionErrors.southIndian}
                    showEmpty
                    onDetails={handleOpenTmdbDetails}
                    onPlay={handlePlayTmdbItem}
                    onViewAll={() => openBrowse('south-indian')}
                  />

                  <TmdbDiscoveryRow
                    title="Bengali Movies"
                    subtitle="Bengali (bn) · TMDB Discover by original language"
                    items={tmdbBengali}
                    loading={tmdbLoading && tmdbBengali.length === 0}
                    error={tmdbSectionErrors.bengali}
                    showEmpty
                    onDetails={handleOpenTmdbDetails}
                    onPlay={handlePlayTmdbItem}
                    onViewAll={() => openBrowse('bengali')}
                  />

                  <TmdbDiscoveryRow
                    title="Top Rated Movies"
                    subtitle="Highest-rated films on TMDB"
                    items={tmdbTopRated}
                    loading={tmdbLoading && tmdbTopRated.length === 0}
                    error={tmdbSectionErrors.topRated}
                    showEmpty
                    onDetails={handleOpenTmdbDetails}
                    onPlay={handlePlayTmdbItem}
                    onViewAll={() => openBrowse('top-rated')}
                  />

                  <TmdbDiscoveryRow
                    title="Upcoming Movies"
                    subtitle="Coming soon to theaters"
                    items={tmdbUpcoming}
                    loading={tmdbLoading && tmdbUpcoming.length === 0}
                    error={tmdbSectionErrors.upcoming}
                    showEmpty
                    onDetails={handleOpenTmdbDetails}
                    onPlay={handlePlayTmdbItem}
                    onViewAll={() => openBrowse('upcoming')}
                  />

                  <TmdbDiscoveryRow
                    title="Popular TV Shows"
                    subtitle="Browse-only metadata (opens on TMDB)"
                    items={tmdbPopularTv}
                    loading={tmdbLoading && tmdbPopularTv.length === 0}
                    error={tmdbSectionErrors.popularTv}
                    onDetails={handleOpenTmdbDetails}
                    onViewAll={() => openBrowse('tv-popular')}
                  />
                </>
              )}

              {currentTab === 'categories' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                  <Reveal variant="fade-right">
                    <h1 className="text-3xl font-black text-white flex items-center gap-2">
                      <Layers className="w-8 h-8 text-red-500" />
                      <span>Explore by Genre & Category</span>
                    </h1>
                    <p className="text-sm text-neutral-400 mt-1">
                      Select a genre below to browse dedicated full-length streaming catalogs
                    </p>
                  </Reveal>

                  <Stagger
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    stagger={0.07}
                  >
                    {categories.map((cat, index) => {
                      const bgThumb =
                        tmdbHollywood[index % Math.max(tmdbHollywood.length, 1)]?.posterUrl ||
                        tmdbPopular[index % Math.max(tmdbPopular.length, 1)]?.posterUrl ||
                        tmdbTrending[index % Math.max(tmdbTrending.length, 1)]?.posterUrl ||
                        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';

                      return (
                        <StaggerItem key={cat.id} variant="slide-soft">
                          <div
                            onClick={() => {
                              setSearchQuery(cat.name);
                              setIsFilterOpen(false);
                            }}
                            className="group relative h-48 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-red-500/60 transition-all duration-300 shadow-xl cursor-pointer transform hover:-translate-y-1"
                          >
                            <img
                              src={bgThumb}
                              alt={cat.name}
                              className="w-full h-full object-cover filter brightness-50 group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                                  {cat.name}
                                </h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-600/30 text-sky-300 border border-sky-500/40 font-semibold">
                                  TMDB
                                </span>
                              </div>
                              <p className="text-xs text-neutral-300 mt-1 line-clamp-2">
                                {cat.description}
                              </p>
                            </div>
                          </div>
                        </StaggerItem>
                      );
                    })}
                  </Stagger>
                </div>
              )}
            </>
          )}
        </PageTransition>

        {showHomepageAds && adSettings && (
          <Reveal variant="fade-up" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <BottomAdsRow
              slots={adSlots}
              settings={adSettings}
              positions={['home_footer', 'movie_details_below_related']}
            />
          </Reveal>
        )}
      </main>

      <footer className="mt-12 border-t border-neutral-900 bg-neutral-950/80 py-12 px-4 sm:px-6 lg:px-8">
        <Reveal variant="fade-up">
          <div className="max-w-7xl mx-auto flex flex-col gap-8 text-xs text-neutral-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-neutral-300">CineStream Cinema</p>
                  <p>© 2026 CineStream Inc. All streaming rights reserved.</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => handleSelectTab('home')}
                  className="hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Home
                </button>
                <button
                  onClick={() => handleSelectTab('trending')}
                  className="hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Trending
                </button>
                <button
                  onClick={() => handleSelectTab('categories')}
                  className="hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Categories
                </button>
              </div>
            </div>
            {(tmdbConfigured || tmdbLoading) && <TmdbAttribution />}
          </div>
        </Reveal>
      </footer>

      {/* Policy-Compliant Popunder / Popup Manager (Requirement 2) */}
      {adSettings && (
        <PopupAdManager slots={adSlots} settings={adSettings} />
      )}
    </div>
  );
}
