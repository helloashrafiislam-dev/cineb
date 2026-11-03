import React from 'react';
import { RotateCcw, X, Filter } from 'lucide-react';
import { FilterState, Category } from '../types.ts';

interface FilterBarProps {
  filters: FilterState;
  onChangeFilter: (key: keyof FilterState, value: string) => void;
  onResetFilters: () => void;
  categories: Category[];
  totalResults: number;
  isOpen: boolean;
  onClose: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilter,
  onResetFilters,
  categories,
  totalResults,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const genres = ['All', 'Action', 'Drama', 'Sci-Fi', 'Thriller', 'Comedy', 'Animation', 'Crime', 'Adventure'];
  const languages = ['All', 'English', 'Hindi', 'Japanese', 'Korean', 'French', 'Spanish', 'Bengali'];
  const qualities = ['All', '4K', '1080p', '720p', '480p'];
  const years = ['All', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];

  const hasActiveFilters =
    filters.genre !== 'All' ||
    filters.language !== 'All' ||
    filters.quality !== 'All' ||
    filters.year !== 'All' ||
    filters.category !== 'All';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 animate-slide-drawer">
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 mb-5">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-red-500" />
            <h3 className="text-white font-bold text-base">Filter Movies & Series</h3>
            <span className="text-xs bg-red-600/20 text-red-400 font-semibold px-2 py-0.5 rounded-full border border-red-500/30">
              {totalResults} {totalResults === 1 ? 'Movie' : 'Movies'} found
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Genre */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Genre
            </label>
            <select
              value={filters.genre}
              onChange={e => onChangeFilter('genre', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {genres.map(g => (
                <option key={g} value={g}>
                  {g === 'All' ? 'All Genres' : g}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Audio Language
            </label>
            <select
              value={filters.language}
              onChange={e => onChangeFilter('language', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {languages.map(l => (
                <option key={l} value={l}>
                  {l === 'All' ? 'All Languages' : l}
                </option>
              ))}
            </select>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Video Quality
            </label>
            <select
              value={filters.quality}
              onChange={e => onChangeFilter('quality', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {qualities.map(q => (
                <option key={q} value={q}>
                  {q === 'All' ? 'All Qualities' : q}
                </option>
              ))}
            </select>
          </div>

          {/* Release Year */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Release Year
            </label>
            <select
              value={filters.year}
              onChange={e => onChangeFilter('year', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {y === 'All' ? 'All Years' : y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Genre Chips */}
        <div className="mt-4 pt-4 border-t border-neutral-800/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-neutral-400 font-medium shrink-0">Popular:</span>
          {['Action', 'Drama', 'Sci-Fi', 'Thriller', 'Animation'].map(chip => (
            <button
              key={chip}
              onClick={() => onChangeFilter('genre', filters.genre === chip ? 'All' : chip)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors shrink-0 cursor-pointer ${
                filters.genre === chip
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
