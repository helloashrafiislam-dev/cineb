import {
  Movie,
  Category,
  AdminUser,
  AdminStats,
  FilterState,
  AdSlot,
  AdSettings,
  AdAnalyticsReport,
  TmdbDiscoveryItem,
  TmdbMovieFullDetails,
  StreamAssociation,
  StreamingAdminStats,
  ContentProviderRecord,
  CopyrightComplaint,
  SiteComplianceSettings
} from '../types.ts';

const TOKEN_KEY = 'cinestream_admin_token';
const ADMIN_USER_KEY = 'cinestream_admin_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },
  getUser(): AdminUser | null {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: AdminUser) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  }
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Public Movies
  async getMovies(filters?: Partial<FilterState>): Promise<{ movies: Movie[]; count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.query) params.set('q', filters.query);
      if (filters.genre && filters.genre !== 'All') params.set('genre', filters.genre);
      if (filters.language && filters.language !== 'All') params.set('language', filters.language);
      if (filters.quality && filters.quality !== 'All') params.set('quality', filters.quality);
      if (filters.year && filters.year !== 'All') params.set('year', filters.year);
      if (filters.category && filters.category !== 'All') params.set('category', filters.category);
    }
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ movies: Movie[]; count: number }>(`/api/movies${queryStr}`);
  },

  async getFeatured(): Promise<{ hero: Movie | null; trending: Movie[]; popular: Movie[]; latest: Movie[] }> {
    return apiRequest<{ hero: Movie | null; trending: Movie[]; popular: Movie[]; latest: Movie[] }>('/api/featured');
  },

  async getMovieById(id: string): Promise<{
    movie: Movie;
    related: Movie[];
    tmdbExtras?: Partial<TmdbMovieFullDetails> & {
      similarTmdb?: TmdbDiscoveryItem[];
      recommendationsTmdb?: TmdbDiscoveryItem[];
      trailerKey?: string;
    } | null;
  }> {
    return apiRequest(`/api/movies/${id}`);
  },

  // TMDB discovery (proxied via backend — no secrets in browser)
  async getTmdbStatus(): Promise<{ configured: boolean; imageBaseUrl: string }> {
    return apiRequest('/api/tmdb/status');
  },

  async getTmdbDiscover(page = 1): Promise<{
    page: number;
    trending: TmdbDiscoveryItem[];
    hollywood: TmdbDiscoveryItem[];
    bollywood: TmdbDiscoveryItem[];
    southIndian: TmdbDiscoveryItem[];
    bengali: TmdbDiscoveryItem[];
    topRated: TmdbDiscoveryItem[];
    upcoming: TmdbDiscoveryItem[];
    popular: TmdbDiscoveryItem[];
    nowPlaying: TmdbDiscoveryItem[];
    popularTv: TmdbDiscoveryItem[];
    pages?: Record<string, number>;
    sectionErrors?: Record<string, string>;
  }> {
    return apiRequest(`/api/tmdb/discover?page=${page}`);
  },

  async getTmdbList(
    list:
      | 'trending'
      | 'popular'
      | 'top-rated'
      | 'now-playing'
      | 'upcoming'
      | 'tv-popular'
      | 'hollywood'
      | 'bollywood'
      | 'south-indian'
      | 'bengali',
    page = 1
  ): Promise<{ results: TmdbDiscoveryItem[]; page: number; totalPages: number; totalResults?: number }> {
    return apiRequest(`/api/tmdb/${list}?page=${page}`);
  },

  async getTmdbSection(
    section:
      | 'trending'
      | 'hollywood'
      | 'bollywood'
      | 'south-indian'
      | 'bengali'
      | 'top-rated'
      | 'upcoming'
      | 'popular'
      | 'now-playing'
      | 'tv-popular',
    page = 1
  ): Promise<{
    section: string;
    label: string;
    languages: string[] | null;
    results: TmdbDiscoveryItem[];
    page: number;
    totalPages: number;
    totalResults: number;
  }> {
    return apiRequest(`/api/tmdb/section/${section}?page=${page}`);
  },

  async getTmdbMovieDetails(tmdbId: number): Promise<{ details: TmdbMovieFullDetails }> {
    return apiRequest(`/api/tmdb/movie/${tmdbId}`);
  },

  async searchTmdbMovies(query: string, page = 1): Promise<{
    results: Array<TmdbDiscoveryItem & { alreadyImported?: boolean }>;
    page: number;
    totalPages: number;
    totalResults: number;
  }> {
    return apiRequest(`/api/admin/tmdb/search?q=${encodeURIComponent(query)}&page=${page}`);
  },

  async getTmdbMovieForImport(tmdbId: number): Promise<{
    metadata: TmdbMovieFullDetails;
    existingMovie: Movie | null;
  }> {
    return apiRequest(`/api/admin/tmdb/movie/${tmdbId}`);
  },

  async recordView(id: string): Promise<void> {
    try {
      await apiRequest(`/api/movies/${id}/view`, { method: 'POST' });
    } catch {
      // Non-blocking view count increment
    }
  },

  async getCategories(): Promise<{ categories: Category[] }> {
    return apiRequest<{ categories: Category[] }>('/api/categories');
  },

  async checkVideo(url: string): Promise<{ format: string; isBrowserPlayable: boolean; isHls: boolean; isMkv: boolean }> {
    return apiRequest(`/api/video-check?url=${encodeURIComponent(url)}`);
  },

  // Public Advertisements
  async getAds(context?: 'home' | 'details' | 'player'): Promise<{
    masterEnabled: boolean;
    settings: AdSettings;
    slots: AdSlot[];
    count: number;
  }> {
    const query = context ? `?context=${context}` : '';
    return apiRequest(`/api/ads${query}`);
  },

  async recordAdImpression(slotId: string, device: 'desktop' | 'mobile' = 'desktop'): Promise<void> {
    try {
      await apiRequest(`/api/ads/${slotId}/impression`, {
        method: 'POST',
        body: JSON.stringify({ device })
      });
    } catch {
      // Non-blocking impression logging
    }
  },

  async recordAdClick(slotId: string, device: 'desktop' | 'mobile' = 'desktop'): Promise<{ targetUrl?: string }> {
    try {
      return await apiRequest<{ targetUrl?: string }>(`/api/ads/${slotId}/click`, {
        method: 'POST',
        body: JSON.stringify({ device })
      });
    } catch {
      return {};
    }
  },

  // Admin Auth
  async adminLogin(username: string, password: string): Promise<{ token: string; admin: AdminUser }> {
    const res = await apiRequest<{ token: string; admin: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authStorage.setToken(res.token);
    authStorage.setUser(res.admin);
    return res;
  },

  async getAdminMe(): Promise<{ admin: AdminUser }> {
    return apiRequest<{ admin: AdminUser }>('/api/admin/me');
  },

  adminLogout() {
    authStorage.removeToken();
  },

  // Admin Movie CRUD
  async getAdminMovies(): Promise<{ movies: Movie[]; count: number }> {
    return apiRequest<{ movies: Movie[]; count: number }>('/api/admin/movies');
  },

  async getAdminStats(): Promise<{ stats: AdminStats }> {
    return apiRequest<{ stats: AdminStats }>('/api/admin/stats');
  },

  async createMovie(movieData: Partial<Movie>): Promise<{ movie: Movie }> {
    return apiRequest<{ movie: Movie }>('/api/admin/movies', {
      method: 'POST',
      body: JSON.stringify(movieData)
    });
  },

  async importTmdbMovie(
    tmdbId: number,
    options: Partial<Pick<Movie, 'isFeatured' | 'isTrending' | 'isPopular' | 'isPublished'>> = {}
  ): Promise<{ movie: Movie }> {
    return apiRequest<{ movie: Movie }>('/api/admin/movies/import-tmdb', {
      method: 'POST',
      body: JSON.stringify({ tmdbId, ...options })
    });
  },

  async updateMovie(id: string, updates: Partial<Movie>): Promise<{ movie: Movie }> {
    return apiRequest<{ movie: Movie }>(`/api/admin/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteMovie(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/admin/movies/${id}`, {
      method: 'DELETE'
    });
  },

  async resetSeedData(): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/admin/reset-seed', {
      method: 'POST'
    });
  },

  // AI Movie Auto-Fill from Google
  async fetchMovieAiDetails(query: string): Promise<{
    movieDetails: Partial<Movie>;
    sources?: Array<{ title: string; url: string }>;
  }> {
    return apiRequest<{
      movieDetails: Partial<Movie>;
      sources?: Array<{ title: string; url: string }>;
    }>('/api/admin/ai/fetch-movie-details', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  },

  // Admin Ad Management & Analytics
  async getAdminAdSlots(): Promise<{ slots: AdSlot[]; count: number }> {
    return apiRequest<{ slots: AdSlot[]; count: number }>('/api/admin/ads/slots');
  },

  async getAdminAdSettings(): Promise<{ settings: AdSettings }> {
    return apiRequest<{ settings: AdSettings }>('/api/admin/ads/settings');
  },

  async updateAdminAdSettings(settings: Partial<AdSettings>): Promise<{ settings: AdSettings }> {
    return apiRequest<{ settings: AdSettings }>('/api/admin/ads/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async createAdminAdSlot(slotData: Partial<AdSlot>): Promise<{ slot: AdSlot }> {
    return apiRequest<{ slot: AdSlot }>('/api/admin/ads/slots', {
      method: 'POST',
      body: JSON.stringify(slotData)
    });
  },

  async updateAdminAdSlot(id: string, updates: Partial<AdSlot>): Promise<{ slot: AdSlot }> {
    return apiRequest<{ slot: AdSlot }>(`/api/admin/ads/slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async toggleAdminAdSlot(id: string): Promise<{ slot: AdSlot }> {
    return apiRequest<{ slot: AdSlot }>(`/api/admin/ads/slots/${id}/toggle`, {
      method: 'POST'
    });
  },

  async deleteAdminAdSlot(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/admin/ads/slots/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminAdAnalytics(): Promise<{ analytics: AdAnalyticsReport }> {
    return apiRequest<{ analytics: AdAnalyticsReport }>('/api/admin/ads/analytics');
  },

  // Multi-provider streaming management (admin)
  async getNexStreamStatus(): Promise<{
    configured: boolean;
    baseUrl: string | null;
    matchingMode: string;
  }> {
    return apiRequest('/api/nexstream/status');
  },

  async getProvidersStatus(): Promise<{
    priority: string[];
    nexstream: { configured: boolean; baseUrl: string | null };
    vidsrc: { configured: boolean; baseUrl: string | null };
  }> {
    return apiRequest('/api/providers/status');
  },

  async getStreamingStats(): Promise<{
    configured: boolean;
    providers?: { nexstream: boolean; vidsrc: boolean };
    trackedMovies?: number;
    tmdbLive?: {
      configured: boolean;
      popularTotal: number;
      trendingTotal: number;
      fetchedAt: string;
    } | null;
    stats: StreamingAdminStats;
  }> {
    return apiRequest('/api/admin/streaming/stats');
  },

  async getStreamAssociations(
    status: string = 'all',
    provider: string = 'all'
  ): Promise<{
    associations: StreamAssociation[];
    count: number;
  }> {
    return apiRequest(
      `/api/admin/streaming/associations?status=${encodeURIComponent(status)}&provider=${encodeURIComponent(provider)}`
    );
  },

  async retryStreamMatch(
    tmdbId: number,
    options: { force?: boolean; confirmOverwriteManual?: boolean } = {}
  ): Promise<{ result: unknown }> {
    return apiRequest(`/api/admin/streaming/match/${tmdbId}`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  async syncStreaming(options: {
    force?: boolean;
    onlyUnavailable?: boolean;
    limit?: number;
  } = {}): Promise<{ summary: unknown }> {
    return apiRequest('/api/admin/streaming/sync', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  async syncStreamingFromTmdbList(options: {
    list?: string;
    page?: number;
    force?: boolean;
  } = {}): Promise<{ summary: unknown; importedCandidates: number }> {
    return apiRequest('/api/admin/streaming/sync-tmdb-list', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  async disableStream(
    tmdbId: number,
    disabled = true,
    provider?: string
  ): Promise<{ association: StreamAssociation }> {
    return apiRequest(`/api/admin/streaming/${tmdbId}/disable`, {
      method: 'POST',
      body: JSON.stringify({ disabled, provider })
    });
  },

  async approveUncertainStream(
    tmdbId: number,
    provider?: string
  ): Promise<{ association: StreamAssociation }> {
    return apiRequest(`/api/admin/streaming/${tmdbId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ provider })
    });
  },

  async selectStreamProvider(
    tmdbId: number,
    provider: string,
    options: { confirmOverwriteManual?: boolean } = {}
  ): Promise<{ association: StreamAssociation }> {
    return apiRequest(`/api/admin/streaming/${tmdbId}/select`, {
      method: 'POST',
      body: JSON.stringify({ provider, ...options })
    });
  },

  async refreshStreamStatus(
    tmdbId: number,
    options: { confirmOverwriteManual?: boolean } = {}
  ): Promise<{ result: unknown }> {
    return apiRequest(`/api/admin/streaming/${tmdbId}/refresh`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  // Site legal + DMCA + compliance
  async getSiteLegal(): Promise<{
    siteName: string;
    legalEntityName: string;
    contactEmail: string;
    dmcaEmail: string;
    requireVerifiedProvidersForPlayback: boolean;
  }> {
    const res = await apiRequest<{
      siteName: string;
      legalEntityName: string;
      contactEmail: string;
      dmcaEmail: string;
      requireVerifiedProvidersForPlayback: boolean;
    }>('/api/site/legal');
    return res;
  },

  async submitDmcaComplaint(payload: {
    complainantName: string;
    complainantEmail: string;
    complainantOrganization?: string;
    copyrightedWork: string;
    infringingUrl: string;
    tmdbId?: number;
    movieId?: string;
    description: string;
    goodFaithAffirmation: boolean;
    accuracyAffirmation: boolean;
  }): Promise<{ complaintId: string; message: string }> {
    return apiRequest('/api/dmca/complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getComplianceProviders(): Promise<{
    settings: SiteComplianceSettings;
    providers: ContentProviderRecord[];
  }> {
    return apiRequest('/api/admin/compliance/providers');
  },

  async updateComplianceSettings(
    updates: Partial<SiteComplianceSettings>
  ): Promise<{ settings: SiteComplianceSettings }> {
    return apiRequest('/api/admin/compliance/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async updateComplianceProvider(
    providerKey: string,
    updates: Partial<ContentProviderRecord>
  ): Promise<{ provider: ContentProviderRecord }> {
    return apiRequest(`/api/admin/compliance/providers/${encodeURIComponent(providerKey)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getComplianceComplaints(): Promise<{ complaints: CopyrightComplaint[] }> {
    return apiRequest('/api/admin/compliance/complaints');
  },

  async updateComplianceComplaint(
    id: string,
    body: Record<string, unknown>
  ): Promise<{ complaint: CopyrightComplaint }> {
    return apiRequest(`/api/admin/compliance/complaints/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }
};
