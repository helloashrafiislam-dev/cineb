/**
 * TMDB API service — backend only.
 * Credentials never leave the server.
 * https://developer.themoviedb.org/
 */

import dotenv from 'dotenv';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

export interface TmdbConfig {
  apiKey: string;
  accessToken: string;
  imageBaseUrl: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  original_language?: string;
  popularity?: number;
  adult?: boolean;
  media_type?: string;
}

export interface TmdbTvSummary {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  original_language?: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  order?: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job?: string;
  department?: string;
  profile_path: string | null;
}

export interface TmdbCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country?: string;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface TmdbExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  wikidata_id?: string | null;
}

export interface TmdbMovieDetails extends TmdbMovieSummary {
  runtime?: number | null;
  genres?: TmdbGenre[];
  status?: string;
  tagline?: string;
  budget?: number;
  revenue?: number;
  imdb_id?: string | null;
  external_ids?: TmdbExternalIds;
  production_companies?: TmdbCompany[];
  credits?: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
  videos?: { results: TmdbVideo[] };
  similar?: { results: TmdbMovieSummary[] };
  recommendations?: { results: TmdbMovieSummary[] };
}

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DETAILS_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeAccessToken(token: string): string {
  const trimmed = token.trim();
  // Allow pasting "Bearer eyJ..." from TMDB docs without double-prefixing
  return trimmed.replace(/^Bearer\s+/i, '').trim();
}

function getConfig(): TmdbConfig {
  // Vite middleware restarts do not re-run `import 'dotenv/config'`.
  // If credentials were empty at process start (e.g. .env was overwritten
  // then filled in later), re-read .env so TMDB becomes available without a
  // full process restart. Never override real platform env in production.
  let apiKey = (process.env.TMDB_API_KEY || '').trim();
  let accessToken = normalizeAccessToken(process.env.TMDB_ACCESS_TOKEN || '');
  if (!apiKey && !accessToken && process.env.NODE_ENV !== 'production') {
    dotenv.config({ override: true });
    apiKey = (process.env.TMDB_API_KEY || '').trim();
    accessToken = normalizeAccessToken(process.env.TMDB_ACCESS_TOKEN || '');
  }

  const imageBase = (process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/').trim();
  return {
    apiKey,
    accessToken,
    imageBaseUrl: imageBase
  };
}

export function isTmdbConfigured(): boolean {
  const { apiKey, accessToken } = getConfig();
  return Boolean(accessToken || apiKey);
}

export function getImageBaseUrl(): string {
  const base = getConfig().imageBaseUrl;
  return base.endsWith('/') ? base : `${base}/`;
}

export function buildImageUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getImageBaseUrl()}${size}${path.startsWith('/') ? path : `/${path}`}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function tmdbFetch<T>(endpoint: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
  if (!isTmdbConfigured()) {
    throw new Error(
      'TMDB is not configured. Set TMDB_ACCESS_TOKEN (preferred) or TMDB_API_KEY in your environment.'
    );
  }

  const { apiKey, accessToken } = getConfig();
  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  url.searchParams.set('language', 'en-US');

  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  // Prefer Bearer token; fall back to api_key query param
  if (!accessToken && apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url.toString(), { headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (data as { status_message?: string }).status_message ||
      `TMDB request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

type TmdbPagedMovies = {
  results: TmdbMovieSummary[];
  page: number;
  total_pages: number;
  total_results: number;
};

async function cachedList(
  cacheKey: string,
  endpoint: string,
  page = 1
): Promise<TmdbPagedMovies> {
  const key = `${cacheKey}:p${page}`;
  const hit = getCached<TmdbPagedMovies>(key);
  if (hit) return hit;

  const result = await tmdbFetch<TmdbPagedMovies>(endpoint, { page });

  setCache(key, result, DEFAULT_TTL_MS);
  return result;
}

/** Discover movies filtered by original language(s) — ISO 639-1 codes. */
async function discoverByOriginalLanguages(
  languages: string[],
  page = 1,
  sortBy = 'popularity.desc'
): Promise<TmdbPagedMovies> {
  const langs = languages.map(l => l.trim().toLowerCase()).filter(Boolean);
  if (langs.length === 0) {
    return { results: [], page, total_pages: 0, total_results: 0 };
  }

  // Single language — direct Discover API call
  if (langs.length === 1) {
    const lang = langs[0];
    const key = `discover:${lang}:${sortBy}:p${page}`;
    const hit = getCached<TmdbPagedMovies>(key);
    if (hit) return hit;

    const result = await tmdbFetch<TmdbPagedMovies>('/discover/movie', {
      page,
      sort_by: sortBy,
      with_original_language: lang,
      include_adult: 'false',
      'vote_count.gte': sortBy.includes('vote') ? 50 : undefined
    });

    setCache(key, result, DEFAULT_TTL_MS);
    return result;
  }

  // Multiple languages (e.g. South Indian): fetch each, merge, dedupe, sort by popularity
  const cacheKey = `discover:multi:${langs.slice().sort().join(',')}:${sortBy}:p${page}`;
  const cached = getCached<TmdbPagedMovies>(cacheKey);
  if (cached) return cached;

  const settled = await Promise.allSettled(
    langs.map(lang =>
      tmdbFetch<TmdbPagedMovies>('/discover/movie', {
        page,
        sort_by: sortBy,
        with_original_language: lang,
        include_adult: 'false'
      })
    )
  );

  const failures = settled
    .map((result, i) =>
      result.status === 'rejected'
        ? `${langs[i]}: ${result.reason instanceof Error ? result.reason.message : 'request failed'}`
        : null
    )
    .filter((msg): msg is string => Boolean(msg));

  const pages = settled
    .filter((result): result is PromiseFulfilledResult<TmdbPagedMovies> => result.status === 'fulfilled')
    .map(result => result.value);

  // Do not hide total failure as an empty catalog — callers/UI must see the error
  if (pages.length === 0) {
    throw new Error(
      `TMDB discover failed for languages [${langs.join(', ')}]: ${failures.join('; ')}`
    );
  }

  if (failures.length > 0) {
    console.warn('[TMDB] Partial discover failure:', failures.join('; '));
  }

  const byId = new Map<number, TmdbMovieSummary>();
  for (const batch of pages) {
    for (const movie of batch.results || []) {
      if (!byId.has(movie.id)) byId.set(movie.id, movie);
    }
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => (b.popularity || 0) - (a.popularity || 0)
  );

  const result: TmdbPagedMovies = {
    results: merged,
    page,
    total_pages: Math.max(1, ...pages.map(p => p.total_pages || 0)),
    total_results: pages.reduce((sum, p) => sum + (p.total_results || 0), 0)
  };

  // Only cache complete multi-language merges so partial failures can retry
  if (failures.length === 0) {
    setCache(cacheKey, result, DEFAULT_TTL_MS);
  }
  return result;
}

/** Named catalog sections used by the homepage / browse UI */
export type TmdbCatalogSection =
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

export const TMDB_CATALOG_SECTIONS: Record<
  TmdbCatalogSection,
  { label: string; languages?: string[]; list?: string }
> = {
  trending: { label: 'Trending Movies' },
  hollywood: { label: 'Popular Hollywood Movies', languages: ['en'] },
  bollywood: { label: 'Bollywood Movies', languages: ['hi'] },
  'south-indian': {
    label: 'South Indian Movies',
    languages: ['ta', 'te', 'ml', 'kn']
  },
  bengali: { label: 'Bengali Movies', languages: ['bn'] },
  'top-rated': { label: 'Top Rated Movies' },
  upcoming: { label: 'Upcoming Movies' },
  popular: { label: 'Popular Movies' },
  'now-playing': { label: 'Now Playing' },
  'tv-popular': { label: 'Popular TV Shows' }
};

export const tmdb = {
  isConfigured: isTmdbConfigured,
  buildImageUrl,
  getImageBaseUrl,

  async searchMovies(query: string, page = 1) {
    const q = query.trim();
    if (!q) {
      return { results: [] as TmdbMovieSummary[], page: 1, total_pages: 0, total_results: 0 };
    }
    const cacheKey = `search:${q.toLowerCase()}:p${page}`;
    const hit = getCached<Awaited<ReturnType<typeof tmdbFetch<{
      results: TmdbMovieSummary[];
      page: number;
      total_pages: number;
      total_results: number;
    }>>>>(cacheKey);
    if (hit) return hit;

    const result = await tmdbFetch<{
      results: TmdbMovieSummary[];
      page: number;
      total_pages: number;
      total_results: number;
    }>('/search/movie', { query: q, page, include_adult: 'false' });

    setCache(cacheKey, result, 5 * 60 * 1000);
    return result;
  },

  async getTrending(page = 1) {
    return cachedList('trending', '/trending/movie/week', page);
  },

  async getPopular(page = 1) {
    return cachedList('popular', '/movie/popular', page);
  },

  async getTopRated(page = 1) {
    return cachedList('top_rated', '/movie/top_rated', page);
  },

  async getNowPlaying(page = 1) {
    return cachedList('now_playing', '/movie/now_playing', page);
  },

  async getUpcoming(page = 1) {
    return cachedList('upcoming', '/movie/upcoming', page);
  },

  /** Discover by original language code(s), e.g. hi / ta,te,ml,kn */
  async discoverByLanguages(languages: string[], page = 1, sortBy = 'popularity.desc') {
    return discoverByOriginalLanguages(languages, page, sortBy);
  },

  async getHollywood(page = 1) {
    return discoverByOriginalLanguages(['en'], page, 'popularity.desc');
  },

  async getBollywood(page = 1) {
    return discoverByOriginalLanguages(['hi'], page, 'popularity.desc');
  },

  async getSouthIndian(page = 1) {
    return discoverByOriginalLanguages(['ta', 'te', 'ml', 'kn'], page, 'popularity.desc');
  },

  async getBengali(page = 1) {
    return discoverByOriginalLanguages(['bn'], page, 'popularity.desc');
  },

  async getCatalogSection(section: TmdbCatalogSection, page = 1): Promise<TmdbPagedMovies | {
    results: TmdbTvSummary[];
    page: number;
    total_pages: number;
    total_results: number;
  }> {
    switch (section) {
      case 'trending':
        return this.getTrending(page);
      case 'hollywood':
        return this.getHollywood(page);
      case 'bollywood':
        return this.getBollywood(page);
      case 'south-indian':
        return this.getSouthIndian(page);
      case 'bengali':
        return this.getBengali(page);
      case 'top-rated':
        return this.getTopRated(page);
      case 'upcoming':
        return this.getUpcoming(page);
      case 'popular':
        return this.getPopular(page);
      case 'now-playing':
        return this.getNowPlaying(page);
      case 'tv-popular':
        return this.getPopularTv(page);
      default:
        throw new Error(`Unknown TMDB catalog section: ${section}`);
    }
  },

  async getPopularTv(page = 1) {
    const key = `tv_popular:p${page}`;
    const hit = getCached<{
      results: TmdbTvSummary[];
      page: number;
      total_pages: number;
      total_results: number;
    }>(key);
    if (hit) return hit;

    const result = await tmdbFetch<{
      results: TmdbTvSummary[];
      page: number;
      total_pages: number;
      total_results: number;
    }>('/tv/popular', { page });

    setCache(key, result, DEFAULT_TTL_MS);
    return result;
  },

  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    const key = `movie:${tmdbId}`;
    const hit = getCached<TmdbMovieDetails>(key);
    if (hit) return hit;

    const result = await tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
      append_to_response: 'credits,videos,similar,recommendations,external_ids'
    });

    setCache(key, result, DETAILS_TTL_MS);
    return result;
  },

  /** Map TMDB details into CineStream movie metadata (no playback URL). */
  mapToMovieMetadata(details: TmdbMovieDetails) {
    const genres = (details.genres || []).map(g => g.name);
    const year = details.release_date
      ? parseInt(details.release_date.slice(0, 4), 10)
      : new Date().getFullYear();
    const runtime = details.runtime && details.runtime > 0 ? details.runtime : null;
    const hours = runtime ? Math.floor(runtime / 60) : 0;
    const mins = runtime ? runtime % 60 : 0;
    const duration = runtime ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`) : '2h 00m';

    const trailer = (details.videos?.results || []).find(
      v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser') && v.official
    ) || (details.videos?.results || []).find(
      v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );

    const imdbId =
      details.external_ids?.imdb_id ||
      details.imdb_id ||
      null;

    return {
      tmdbId: details.id,
      imdbId: imdbId || undefined,
      title: details.title,
      originalTitle: details.original_title || details.title,
      overview: details.overview || '',
      description: details.overview || '',
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      posterUrl: buildImageUrl(details.poster_path, 'w500') || '',
      backdropUrl: buildImageUrl(details.backdrop_path, 'w1280'),
      releaseDate: details.release_date || '',
      releaseYear: Number.isFinite(year) ? year : new Date().getFullYear(),
      rating: Number((details.vote_average || 0).toFixed(1)),
      genres,
      genre: genres,
      category: genres[0] || 'Drama',
      runtime: runtime || undefined,
      duration,
      language: (details.original_language || 'en').toUpperCase(),
      originalLanguage: details.original_language || 'en',
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined,
      trailerKey: trailer?.key,
      cast: (details.credits?.cast || []).slice(0, 12).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profileUrl: buildImageUrl(c.profile_path, 'w185')
      })),
      crew: (details.credits?.crew || [])
        .filter(c => ['Director', 'Writer', 'Screenplay', 'Producer'].includes(c.job || ''))
        .slice(0, 8)
        .map(c => ({
          id: c.id,
          name: c.name,
          job: c.job,
          profileUrl: buildImageUrl(c.profile_path, 'w185')
        })),
      productionCompanies: (details.production_companies || []).slice(0, 6).map(c => ({
        id: c.id,
        name: c.name,
        logoUrl: buildImageUrl(c.logo_path, 'w185')
      })),
      similar: (details.similar?.results || []).slice(0, 12),
      recommendations: (details.recommendations?.results || []).slice(0, 12)
    };
  },

  enrichSummary(movie: TmdbMovieSummary | TmdbTvSummary) {
    const isTv = 'name' in movie && !('title' in movie);
    const title = isTv ? (movie as TmdbTvSummary).name : (movie as TmdbMovieSummary).title;
    const date = isTv
      ? (movie as TmdbTvSummary).first_air_date
      : (movie as TmdbMovieSummary).release_date;

    return {
      tmdbId: movie.id,
      mediaType: isTv ? 'tv' as const : 'movie' as const,
      title,
      originalTitle: isTv
        ? (movie as TmdbTvSummary).original_name
        : (movie as TmdbMovieSummary).original_title,
      overview: movie.overview || '',
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      posterUrl: buildImageUrl(movie.poster_path, 'w342'),
      backdropUrl: buildImageUrl(movie.backdrop_path, 'w780'),
      releaseDate: date || '',
      releaseYear: date ? parseInt(date.slice(0, 4), 10) : undefined,
      rating: Number((movie.vote_average || 0).toFixed(1)),
      language: (movie.original_language || 'en').toUpperCase(),
      genreIds: movie.genre_ids || []
    };
  }
};
