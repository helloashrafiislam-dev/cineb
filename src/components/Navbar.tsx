import React, { useState, useEffect } from 'react';
import { Film, Search, X, Menu, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  activeFilterCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  isFilterOpen,
  onToggleFilter,
  activeFilterCount
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'trending', label: 'Trending' },
    { id: 'movies', label: 'Hollywood' },
    { id: 'latest', label: 'Upcoming' },
    { id: 'categories', label: 'Categories' }
  ];

  return (
    <motion.header
      initial={reduced ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 shadow-2xl py-3'
          : 'bg-gradient-to-b from-neutral-950/95 via-neutral-950/60 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                onSelectTab('home');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:scale-105 transition-transform duration-200">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-black tracking-wider text-white flex items-center gap-1 font-sans">
                  CINE<span className="text-red-500">STREAM</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium tracking-widest uppercase -mt-1">
                  HD & 4K CINEMA
                </span>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => onSelectTab(link.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentTab === link.id
                      ? 'text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800/40'
                  }`}
                >
                  {currentTab === link.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-neutral-800/80 shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <div
                className={`flex items-center bg-neutral-900/90 border border-neutral-700/80 rounded-full px-3 py-1.5 transition-all duration-300 ${
                  showSearchInput || searchQuery
                    ? 'w-48 sm:w-64 border-red-500/80 ring-2 ring-red-500/20'
                    : 'w-9 sm:w-48 bg-transparent sm:bg-neutral-900/60 border-transparent sm:border-neutral-800'
                }`}
              >
                <Search
                  className="w-4 h-4 text-neutral-400 shrink-0 cursor-pointer"
                  onClick={() => setShowSearchInput(true)}
                />
                <input
                  type="text"
                  placeholder="Search title, genre, year..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  onFocus={() => setShowSearchInput(true)}
                  className={`bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none ml-2 transition-all duration-300 ${
                    showSearchInput || searchQuery ? 'w-full' : 'hidden sm:block sm:w-full'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="text-neutral-400 hover:text-white shrink-0 cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onToggleFilter}
              className={`relative p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-red-600/20 border-red-500/60 text-red-400'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title="Filter Movies"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto', y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden mt-3 pt-3 border-t border-neutral-800 bg-neutral-950/95 rounded-b-xl p-3 flex flex-col gap-2 overflow-hidden"
            >
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.id}
                  initial={reduced ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    onSelectTab(link.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                    currentTab === link.id
                      ? 'text-red-400 bg-red-600/20 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  {link.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};
