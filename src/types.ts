export interface Movie {
  id: string;
  title: string;
  description: string;
  releaseYear: number;
  genre: string[];
  category: string;
  quality: '480p' | '720p' | '1080p' | '4K';
  language: string;
  streamingUrl: string;
  posterUrl: string;
  backdropUrl?: string;
  isFeatured: boolean;
  isTrending: boolean;
  isPopular: boolean;
  isPublished: boolean;
  views: number;
  rating: number;
  duration: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  movieCount?: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
}

export interface AdminStats {
  totalMovies: number;
  publishedMovies: number;
  draftMovies: number;
  totalViews: number;
  categoriesCount: number;
}

export interface FilterState {
  query: string;
  genre: string;
  language: string;
  quality: string;
  year: string;
  category: string;
}

// ----------------------------------------------------
// AD MONETIZATION SYSTEM TYPES
// ----------------------------------------------------

export type AdPosition =
  | 'home_header'
  | 'home_below_nav'
  | 'home_between_sections'
  | 'home_between_cards'
  | 'home_footer'
  | 'desktop_left_sidebar'
  | 'desktop_right_sidebar'
  | 'movie_details_top'
  | 'movie_details_below_poster'
  | 'movie_details_mid'
  | 'movie_details_before_watch'
  | 'movie_details_below_related'
  | 'player_above'
  | 'player_sidebar_left'
  | 'player_sidebar_right'
  | 'player_below'
  | 'popup_under';

export type AdNetwork = 'adsense' | 'admanager' | 'monetag' | 'adsterra' | 'custom';
export type AdDevice = 'all' | 'desktop' | 'mobile';

export interface AdSlot {
  id: string;
  name: string;
  position: AdPosition;
  network: AdNetwork;
  dimensions: string;
  codeSnippet: string;
  targetUrl?: string;
  imageUrl?: string;
  titleText?: string;
  badgeLabel: 'Advertisement' | 'Sponsored';
  enabled: boolean;
  isSticky: boolean;
  targetDevice: AdDevice;
  cpmRate: number;
  cpcRate: number;
  impressions: number;
  clicks: number;
  estimatedEarnings: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdSettings {
  masterEnabled: boolean;
  popupEnabled: boolean;
  popupFrequencyMinutes: number;
  popupNetwork: AdNetwork;
  popupCode: string;
  popupTargetUrl: string;
  homeAdsEnabled: boolean;
  detailsAdsEnabled: boolean;
  playerAdsEnabled: boolean;
  lazyLoadBelowFold: boolean;
  reserveContainerDimensions: boolean;
}

export interface AdAnalyticsReport {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    overallCtr: number;
    totalEstimatedEarnings: number;
    activeSlotsCount: number;
    totalSlotsCount: number;
    masterEnabled: boolean;
  };
  byPosition: Record<string, { impressions: number; clicks: number; earnings: number; ctr: number }>;
  byNetwork: Record<string, { impressions: number; clicks: number; earnings: number; count: number }>;
  byDevice: {
    desktop: { impressions: number; clicks: number; earnings: number };
    mobile: { impressions: number; clicks: number; earnings: number };
  };
  dailyReports: Array<{ date: string; impressions: number; clicks: number; earnings: number }>;
}
