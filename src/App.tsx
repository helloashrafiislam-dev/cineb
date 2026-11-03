import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Film,
  Search,
  Layers,
  RotateCcw
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Movie, Category, AdminUser, FilterState, AdSlot, AdSettings } from './types.ts';
import { api, authStorage } from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { MovieRow } from './components/MovieRow.tsx';
import { MovieCard } from './components/MovieCard.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { MovieDetailsModal } from './components/MovieDetailsModal.tsx';
import { VideoPlayer } from './components/VideoPlayer.tsx';
import { AdminLoginPage } from './components/Admin/AdminLoginPage.tsx';
import { AdminDashboard } from './components/Admin/AdminDashboard.tsx';
import { AdBanner } from './components/Ads/AdBanner.tsx';
import { SidebarAds } from './components/Ads/SidebarAds.tsx';
import { PopupAdManager } from './components/Ads/PopupAdManager.tsx';
import { Reveal, Stagger, StaggerItem } from './components/motion/Reveal.tsx';
import { PageTransition } from './components/motion/PageTransition.tsx';

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
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(authStorage.getUser());
  const [adminAuthChecked, setAdminAuthChecked] = useState(!authStorage.getToken());
  const onAdminRoute = isAdminPath(pathname);

  // Movie Data States
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Advertising Monetization States
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);

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

  // Fetch all public movie and advertising data
  const loadData = async () => {
    try {
      setLoading(true);
      const [featuredRes, moviesRes, categoriesRes, adsRes] = await Promise.all([
        api.getFeatured(),
        api.getMovies(),
        api.getCategories(),
        api.getAds()
      ]);

      setHeroMovie(featuredRes.hero);
      setTrendingMovies(featuredRes.trending);
      setPopularMovies(featuredRes.popular);
      setLatestMovies(featuredRes.latest);
      setAllMovies(moviesRes.movies);
      setCategories(categoriesRes.categories);
      setAdSlots(adsRes.slots || []);
      setAdSettings(adsRes.settings);
    } catch (err) {
      console.error('Failed to load catalog and advertising data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Movies matching active search & filters
  const filteredMovies = useMemo(() => {
    return allMovies.filter(movie => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          movie.title.toLowerCase().includes(q) ||
          movie.description.toLowerCase().includes(q) ||
          movie.genre.some(g => g.toLowerCase().includes(q)) ||
          movie.language.toLowerCase().includes(q) ||
          movie.releaseYear.toString().includes(q);
        if (!matchesQuery) return false;
      }

      // Genre filter
      if (filters.genre !== 'All') {
        const gTerm = filters.genre.toLowerCase();
        if (!movie.genre.some(g => g.toLowerCase() === gTerm)) return false;
      }

      // Language filter
      if (filters.language !== 'All') {
        const lTerm = filters.language.toLowerCase();
        if (!movie.language.toLowerCase().includes(lTerm)) return false;
      }

      // Quality filter
      if (filters.quality !== 'All') {
        if (movie.quality.toLowerCase() !== filters.quality.toLowerCase()) return false;
      }

      // Year filter
      if (filters.year !== 'All') {
        if (movie.releaseYear.toString() !== filters.year) return false;
      }

      // Category filter
      if (filters.category !== 'All') {
        if (!movie.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
      }

      return true;
    });
  }, [allMovies, searchQuery, filters]);

  // Tab switching
  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'trending') {
      handleFilterChange('genre', 'All');
    } else if (tab === 'latest') {
      handleFilterChange('year', '2026');
    }
  };

  // Playback & Details triggers
  const handlePlayMovie = (movie: Movie) => {
    setActivePlaybackMovie(movie);
    setDetailsMovie(null);
  };

  const handleOpenDetails = (movie: Movie) => {
    setDetailsMovie(movie);
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
          totalResults={filteredMovies.length}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />

        <PageTransition
          viewKey={
            isBrowsingWithFilters
              ? `filter-${searchQuery}-${activeFilterCount}`
              : currentTab
          }
        >
          {/* When active filter or search is applied, show Grid View */}
          {isBrowsingWithFilters ? (
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
                      Showing {filteredMovies.length}{' '}
                      {filteredMovies.length === 1 ? 'movie' : 'movies'}
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

              {filteredMovies.length === 0 ? (
                <Reveal variant="scale-in" className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                    <Film className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">No Movies Match Your Criteria</h3>
                  <p className="text-sm text-neutral-400 max-w-md mx-auto">
                    Try adjusting your search terms, removing genre or audio filters, or explore our
                    curated categories below.
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
                  {filteredMovies.map(movie => (
                    <StaggerItem key={movie.id} variant="scale-in">
                      <MovieCard
                        movie={movie}
                        onPlay={handlePlayMovie}
                        onDetails={handleOpenDetails}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          ) : (
            /* Standard Curated Views */
            <>
              {currentTab === 'home' && (
                <HeroBanner
                  movie={heroMovie}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                />
              )}

              {(currentTab === 'home' || currentTab === 'trending') && (
                <MovieRow
                  title="Trending Movies Right Now"
                  subtitle="Top watched blockbuster films streaming today"
                  movies={trendingMovies.length > 0 ? trendingMovies : allMovies.slice(0, 5)}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                  showRanking={true}
                  inFeedAdSlot={showHomepageAds ? inFeedAd : undefined}
                />
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

              {(currentTab === 'home' || currentTab === 'latest') && (
                <MovieRow
                  title="Latest 2026 Cinema Releases"
                  subtitle="Fresh additions in 1080p and 4K Ultra HD"
                  movies={latestMovies.length > 0 ? latestMovies : allMovies}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                />
              )}

              {(currentTab === 'home' || currentTab === 'movies') && (
                <MovieRow
                  title="Popular & Critically Acclaimed"
                  subtitle="High-rating cinematic masterpieces"
                  movies={popularMovies.length > 0 ? popularMovies : allMovies}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                />
              )}

              {currentTab === 'home' && (
                <MovieRow
                  title="Action & High-Stakes Thrills"
                  subtitle="Intense showdowns and gripping adrenaline"
                  movies={allMovies.filter(m => m.genre.includes('Action'))}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                />
              )}

              {currentTab === 'home' && (
                <MovieRow
                  title="Sci-Fi & Futuristic Odyssey"
                  subtitle="Interstellar missions, cyber realms, and cosmic explorations"
                  movies={allMovies.filter(m => m.genre.includes('Sci-Fi'))}
                  onPlay={handlePlayMovie}
                  onDetails={handleOpenDetails}
                />
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
                    {categories.map(cat => {
                      const sampleMovie = allMovies.find(
                        m =>
                          m.category.toLowerCase().includes(cat.name.toLowerCase()) ||
                          m.genre.some(g => g.toLowerCase() === cat.name.toLowerCase())
                      );
                      const bgThumb =
                        sampleMovie?.posterUrl ||
                        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';

                      return (
                        <StaggerItem key={cat.id} variant="slide-soft">
                          <div
                            onClick={() => {
                              handleFilterChange('genre', cat.name);
                              setIsFilterOpen(true);
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
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40 font-semibold">
                                  {cat.movieCount || 0} Titles
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
          <Reveal variant="fade-up" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 flex justify-center">
            <AdBanner
              position="home_footer"
              slots={adSlots}
              settings={adSettings}
              className="my-4"
            />
          </Reveal>
        )}
      </main>

      <footer className="mt-12 border-t border-neutral-900 bg-neutral-950/80 py-12 px-4 sm:px-6 lg:px-8">
        <Reveal variant="fade-up">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
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
        </Reveal>
      </footer>

      <AnimatePresence>
        {detailsMovie && (
          <MovieDetailsModal
            key={detailsMovie.id}
            movie={detailsMovie}
            onClose={() => setDetailsMovie(null)}
            onPlay={handlePlayMovie}
            onSelectMovie={movie => setDetailsMovie(movie)}
            adSlots={adSlots}
            adSettings={adSettings || undefined}
          />
        )}
      </AnimatePresence>

      {/* Policy-Compliant Popunder / Popup Manager (Requirement 2) */}
      {adSettings && (
        <PopupAdManager slots={adSlots} settings={adSettings} />
      )}
    </div>
  );
}
