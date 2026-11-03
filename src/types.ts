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
  tmdbId?: number;
  originalTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  runtime?: number;
  trailerUrl?: string;
  manualPlaybackOverride?: boolean;
}

export type StreamStatus =
  | 'available'
  | 'unavailable'
  | 'uncertain'
  | 'failed'
  | 'disabled';

export type MatchConfidence =
  | 'exact_tmdb_id'
  | 'exact_imdb_id'
  | 'exact_original_title_year'
  | 'exact_localized_title_year'
  | 'normalized_title_year'
  | 'alternative_title_year'
  | 'uncertain'
  | 'none';

export type StreamingProviderKey = 'nexstream' | 'vidsrc';

export interface ProviderStreamSummary {
  providerName: string;
  providerKey: StreamingProviderKey;
  streamStatus: StreamStatus;
  availabilityStatus?: StreamStatus;
  matchConfidence: MatchConfidence;
  disabled?: boolean;
  selectedByAdmin?: boolean;
  lastCheckedAt?: string;
  lastError?: string;
  playerPath?: string | null;
}

export interface NexStreamPublicInfo {
  hasStream?: boolean;
  hasNexStream: boolean;
  streamStatus: StreamStatus;
  playerPath: string | null;
  matchedTitle: string | null;
  matchConfidence: MatchConfidence;
  lastCheckedAt?: string;
  providerName?: string | null;
  providerKey?: StreamingProviderKey | null;
  providers?: ProviderStreamSummary[];
}

/** Alias used by newer multi-provider responses */
export type StreamPublicInfo = NexStreamPublicInfo;

export interface StreamAssociation {
  id: string;
  movieId?: string;
  tmdbId: number;
  imdbId?: string;
  providerName: StreamingProviderKey | string;
  providerMovieId?: string;
  nexstreamProviderId?: string;
  matchedTitle?: string;
  matchedReleaseYear?: number;
  playbackReference: string;
  playbackType: 'embed' | 'hls' | 'dash' | 'mp4' | 'unknown';
  availabilityStatus?: StreamStatus;
  streamStatus: StreamStatus;
  matchConfidence: MatchConfidence;
  matchSource: 'automatic' | 'manual';
  manualOverride: boolean;
  selectedByAdmin?: boolean;
  disabled?: boolean;
  lastCheckedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
  providerMeta?: { title?: string; poster?: string } | null;
  mediaType?: 'movie' | 'tv';
  createdAt: string;
  updatedAt: string;
}

export interface StreamingAdminStats {
  totalTmdbMovies: number;
  totalAssociations: number;
  withVerifiedStreams: number;
  withoutStreams: number;
  uncertainMatches: number;
  failedSearches: number;
  nexstreamMatched?: number;
  vidsrcMatched?: number;
  bothProviders?: number;
  providerErrors?: number;
  lastSyncAt: string | null;
  lastSyncSummary?: {
    processed: number;
    available: number;
    unavailable: number;
    uncertain: number;
    failed: number;
    skipped: number;
    nexstreamMatched?: number;
    vidsrcMatched?: number;
    bothProviders?: number;
  } | null;
}

export interface TmdbDiscoveryItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  releaseYear?: number;
  rating: number;
  language: string;
  genreIds?: number[];
  /** Local catalog match (has playback) when imported */
  localMovieId?: string;
  hasPlayback?: boolean;
  nexStream?: NexStreamPublicInfo;
}

export interface TmdbPersonCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profileUrl?: string;
}

export interface TmdbCompanyInfo {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface TmdbMovieFullDetails {
  tmdbId: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  overview: string;
  description: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  releaseYear: number;
  rating: number;
  genres: string[];
  genre: string[];
  category: string;
  runtime?: number;
  duration: string;
  language: string;
  originalLanguage?: string;
  trailerUrl?: string;
  trailerKey?: string;
  cast: TmdbPersonCredit[];
  crew: TmdbPersonCredit[];
  productionCompanies: TmdbCompanyInfo[];
  similar: TmdbDiscoveryItem[];
  recommendations: TmdbDiscoveryItem[];
  localMovie?: Movie | null;
  hasPlayback?: boolean;
  nexStream?: NexStreamPublicInfo;
  stream?: StreamPublicInfo;
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
  /** Sometimes first movie-card click opens ad; next click goes to details */
  cardClickAdEnabled: boolean;
  /** Probability (0–100) that a first click opens an ad tab */
  cardClickAdChancePercent: number;
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
