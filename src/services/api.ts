import { Movie, Category, AdminUser, AdminStats, FilterState, AdSlot, AdSettings, AdAnalyticsReport } from '../types.ts';

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

  async getMovieById(id: string): Promise<{ movie: Movie; related: Movie[] }> {
    return apiRequest<{ movie: Movie; related: Movie[] }>(`/api/movies/${id}`);
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
  }
};
