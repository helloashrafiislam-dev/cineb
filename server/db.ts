import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ContentProviderRecord,
  CopyrightComplaint,
  SiteComplianceSettings,
  createDefaultComplianceSettings,
  createDefaultProviders,
  getEnvSiteCompliance,
  isProviderAuthorizedForPlayback,
  type ContentProviderKey,
  type ComplaintStatus,
  type ProviderAuthStatus
} from './compliance.ts';

export type {
  ContentProviderRecord,
  CopyrightComplaint,
  SiteComplianceSettings,
  ContentProviderKey,
  ComplaintStatus,
  ProviderAuthStatus
};
export { isProviderAuthorizedForPlayback, getEnvSiteCompliance };

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
  /** TMDB metadata (optional — existing seed movies may omit these) */
  tmdbId?: number;
  originalTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  runtime?: number;
  trailerUrl?: string;
  /**
   * When true, streamingUrl was set/edited by an admin and must not be
   * overwritten by automatic NexStream matching without confirmation.
   */
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

/** Canonical provider keys used for priority + storage. */
export type StreamingProviderKey = 'nexstream' | 'vidsrc';

export const PROVIDER_PRIORITY: StreamingProviderKey[] = ['nexstream', 'vidsrc'];

export function providerDisplayName(key: StreamingProviderKey | string | undefined): string {
  if (key === 'vidsrc' || key === 'Vidsrc') return 'Vidsrc';
  if (key === 'nexstream' || key === 'NexStream') return 'NexStream';
  return String(key || 'Unknown');
}

export function normalizeProviderKey(
  value?: string | null
): StreamingProviderKey {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'vidsrc') return 'vidsrc';
  return 'nexstream';
}

/**
 * Provider streaming association — kept separate from TMDB catalog metadata.
 * One movie (tmdbId) may have multiple provider records.
 */
export interface StreamAssociation {
  id: string;
  /** Optional local catalog movie id — never overwrites TMDB metadata */
  movieId?: string;
  tmdbId: number;
  imdbId?: string;
  /** Canonical provider key */
  providerName: StreamingProviderKey;
  /** Provider-side id (TMDB id for NexStream; IMDb/TMDB for Vidsrc) */
  providerMovieId: string;
  /** @deprecated Use providerMovieId — kept for older NexStream rows */
  nexstreamProviderId?: string;
  matchedTitle?: string;
  matchedReleaseYear?: number;
  /** Relative provider path only, e.g. /embed/movie/597 — never includes API key */
  playbackReference: string;
  playbackType: 'embed' | 'hls' | 'dash' | 'mp4' | 'unknown';
  /** Normalized availability (alias of streamStatus for common format) */
  availabilityStatus?: StreamStatus;
  streamStatus: StreamStatus;
  matchConfidence: MatchConfidence;
  matchSource: 'automatic' | 'manual';
  manualOverride: boolean;
  /** Admin chose this provider as the active source for the movie */
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

/** Per-movie admin preference across providers (does not store TMDB metadata). */
export interface MovieStreamPreference {
  tmdbId: number;
  preferredProvider?: StreamingProviderKey | null;
  manualOverride: boolean;
  updatedAt: string;
}

export interface StreamingSyncMeta {
  lastSyncAt?: string;
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
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

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
  dimensions: string; // e.g. "728x90", "300x250", "160x600", "300x600", "970x250", "320x50", "responsive", "native"
  codeSnippet: string; // HTML / script / creative markup
  targetUrl?: string; // Click redirection target
  imageUrl?: string; // Creative banner image
  titleText?: string; // Sponsored headline
  badgeLabel: 'Advertisement' | 'Sponsored';
  enabled: boolean;
  isSticky: boolean;
  targetDevice: AdDevice;
  cpmRate: number; // e.g. $1.80
  cpcRate: number; // e.g. $0.35
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

export interface AdEventRecord {
  id: string;
  adSlotId: string;
  position: AdPosition;
  network: AdNetwork;
  type: 'impression' | 'click';
  device: 'desktop' | 'mobile';
  earnings: number;
  timestamp: string;
}

export interface DatabaseSchema {
  users: Array<{ id: string; username: string; email: string; role: string; createdAt: string }>;
  admins: AdminUser[];
  categories: Category[];
  movies: Movie[];
  adSlots: AdSlot[];
  adSettings: AdSettings;
  adEvents: AdEventRecord[];
  streamAssociations: StreamAssociation[];
  movieStreamPreferences: MovieStreamPreference[];
  streamingSyncMeta: StreamingSyncMeta;
  contentProviders: ContentProviderRecord[];
  copyrightComplaints: CopyrightComplaint[];
  complianceSettings: SiteComplianceSettings;
  /** Titles disabled due to copyright disputes (by TMDB id) */
  disputedTmdbIds: number[];
  /** Local catalog movie ids disabled due to copyright disputes */
  disputedMovieIds: string[];
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
/** Bundled seed (read-only on Vercel); writable copy lives under /tmp when serverless. */
const SEED_DIR = path.resolve(process.cwd(), 'data');
const SEED_DB_FILE = path.join(SEED_DIR, 'movies_database.json');
const DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'cinestream-data') : SEED_DIR;
const DB_FILE = path.join(DATA_DIR, 'movies_database.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-action', name: 'Action', slug: 'action', description: 'High-octane thrilling adventures and combats', displayOrder: 1 },
  { id: 'cat-drama', name: 'Drama', slug: 'drama', description: 'Deep, emotional and character-driven stories', displayOrder: 2 },
  { id: 'cat-scifi', name: 'Sci-Fi', slug: 'sci-fi', description: 'Futuristic and mind-bending speculative journeys', displayOrder: 3 },
  { id: 'cat-thriller', name: 'Thriller', slug: 'thriller', description: 'Edge-of-your-seat suspense and mysteries', displayOrder: 4 },
  { id: 'cat-comedy', name: 'Comedy', slug: 'comedy', description: 'Laugh-out-loud humor and entertainment', displayOrder: 5 },
  { id: 'cat-animation', name: 'Animation', slug: 'animation', description: 'Stunning animated films for all audiences', displayOrder: 6 }
];

const INITIAL_MOVIES: Movie[] = [];

const INITIAL_AD_SETTINGS: AdSettings = {
  masterEnabled: true,
  // Popups / card-hijack clicks are high AdSense invalid-traffic risks — off by default
  popupEnabled: false,
  popupFrequencyMinutes: 30,
  popupNetwork: 'adsense',
  popupCode: '<!-- Prefer labeled display units; avoid forced popunders for AdSense -->',
  popupTargetUrl: '',
  cardClickAdEnabled: false,
  cardClickAdChancePercent: 0,
  homeAdsEnabled: true,
  detailsAdsEnabled: true,
  playerAdsEnabled: true,
  lazyLoadBelowFold: true,
  reserveContainerDimensions: true
};

const INITIAL_AD_SLOTS: AdSlot[] = [
  {
    id: 'ad-home-top-header',
    name: 'Top Header Leaderboard (728x90)',
    position: 'home_header',
    network: 'adsense',
    dimensions: '728x90',
    codeSnippet: '<!-- Google AdSense Responsive Leaderboard 728x90 -->',
    targetUrl: 'https://store.google.com/category/connected_home',
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Upgrade to Next-Gen 4K OLED Smart TV — Ultra Low Latency Cinema',
    badgeLabel: 'Sponsored',
    enabled: false,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 2.20,
    cpcRate: 0.45,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-home-below-nav',
    name: 'Below Navigation Ribbon (970x90)',
    position: 'home_below_nav',
    network: 'admanager',
    dimensions: '970x90',
    codeSnippet: '<!-- Google Ad Manager Premium Header 970x90 -->',
    targetUrl: 'https://www.starlink.com',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
    titleText: 'High-Speed Gigabit Fiber Internet — Buffer-Free 4K Cinema Streaming',
    badgeLabel: 'Advertisement',
    enabled: false,
    isSticky: false,
    targetDevice: 'desktop',
    cpmRate: 2.50,
    cpcRate: 0.50,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-sidebar-left',
    name: 'Left Desktop Skyscraper (160x600)',
    position: 'desktop_left_sidebar',
    network: 'adsense',
    dimensions: '160x600',
    codeSnippet: '<!-- Google AdSense Sticky Left Skyscraper 160x600 -->',
    targetUrl: 'https://nordvpn.com/stream-safely',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    titleText: 'Stream Privately & Block ISP Throttling',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: true,
    targetDevice: 'desktop',
    cpmRate: 1.95,
    cpcRate: 0.38,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-sidebar-right',
    name: 'Right Desktop Half-Page (300x600)',
    position: 'desktop_right_sidebar',
    network: 'monetag',
    dimensions: '300x600',
    codeSnippet: '<!-- Monetag Multi-Format Sticky Half-Page 300x600 -->',
    targetUrl: 'https://www.sony.com/electronics/headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    titleText: 'Immersive Dolby Atmos Wireless Spatial Headphones',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: true,
    targetDevice: 'desktop',
    cpmRate: 3.10,
    cpcRate: 0.65,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-home-between-sections',
    name: 'Between Movie Sections Billboard (970x250)',
    position: 'home_between_sections',
    network: 'adsterra',
    dimensions: '970x250',
    codeSnippet: '<!-- Adsterra High-CPM Responsive Billboard 970x250 -->',
    targetUrl: 'https://cloudgaming.nvidia.com',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80',
    titleText: 'Play RTX Cyberpunk Games in 4K — No Gaming PC Required',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 2.80,
    cpcRate: 0.55,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-02-01T14:00:00.000Z'
  },
  {
    id: 'ad-home-between-cards',
    name: 'In-Feed Native Movie Card Ad (300x450)',
    position: 'home_between_cards',
    network: 'custom',
    dimensions: 'native',
    codeSnippet: '<!-- Custom In-Feed Native Sponsorship Card -->',
    targetUrl: 'https://www.crunchyroll.com',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    titleText: 'Cyber Chronicles: Global Premiere Stream',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 3.50,
    cpcRate: 0.70,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-02-01T15:00:00.000Z'
  },
  {
    id: 'ad-home-footer-banner',
    name: 'Footer Large Rectangle (300x250)',
    position: 'home_footer',
    network: 'adsense',
    dimensions: '300x250',
    codeSnippet: '<!-- Google AdSense Footer Large Rectangle -->',
    targetUrl: 'https://www.netflix.com',
    imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Stream Unlimited 4K Cinema Anywhere On Any Device',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 1.60,
    cpcRate: 0.30,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-details-top',
    name: 'Details Page Top Banner (728x90) — unused (no top-of-page ads)',
    position: 'movie_details_top',
    network: 'adsense',
    dimensions: '728x90',
    codeSnippet: '<!-- Google AdSense Details Top Header 728x90 -->',
    targetUrl: 'https://www.bose.com/home-theater',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Cinematic Soundbars with Wireless Subwoofer — Crystal Clear Dialogue',
    badgeLabel: 'Sponsored',
    enabled: false,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 2.10,
    cpcRate: 0.42,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-details-below-poster',
    name: 'Below Poster Medium Rectangle (300x250)',
    position: 'movie_details_below_poster',
    network: 'custom',
    dimensions: '300x250',
    codeSnippet: '<!-- Custom Medium Rectangle 300x250 -->',
    targetUrl: 'https://www.expressvpn.com',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    titleText: 'Ultra-Fast VPN Servers Built for 4K Movie Streaming',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 2.40,
    cpcRate: 0.48,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-details-before-watch',
    name: 'Before Watch Now Banner (468x60)',
    position: 'movie_details_before_watch',
    network: 'monetag',
    dimensions: '468x60',
    codeSnippet: '<!-- Monetag Native Text Banner Before Player -->',
    targetUrl: 'https://www.anker.com/chargers',
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
    titleText: 'Ultra Fast GaN Cinema Charging Hub — Power All Your Devices',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 3.20,
    cpcRate: 0.60,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-details-below-related',
    name: 'Below Related Movies Large Rectangle (300x250)',
    position: 'movie_details_below_related',
    network: 'admanager',
    dimensions: '300x250',
    codeSnippet: '<!-- Google Ad Manager Large Footer Rectangle -->',
    targetUrl: 'https://www.disneyplus.com',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Explore Exclusive Originals, Blockbusters & Animated Epics',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 1.80,
    cpcRate: 0.35,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-player-above',
    name: 'Video Player Top Banner (728x90)',
    position: 'player_above',
    network: 'adsense',
    dimensions: '728x90',
    codeSnippet: '<!-- Google AdSense Video Companion Top 728x90 -->',
    targetUrl: 'https://www.logitech.com/remotes',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Smart Media Remote for Total Streaming Control',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 3.40,
    cpcRate: 0.68,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-16T10:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-player-below',
    name: 'Video Player Bottom Billboard (970x250)',
    position: 'player_below',
    network: 'monetag',
    dimensions: '970x250',
    codeSnippet: '<!-- Monetag Rich Media Below Player Billboard -->',
    targetUrl: 'https://www.govee.com/tv-backlight',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1400&auto=format&fit=crop&q=80',
    titleText: 'Sync Reactive RGB Ambient Backlights with Your TV Screen',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 3.80,
    cpcRate: 0.75,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-16T10:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-player-sidebar-left',
    name: 'Player Left Skyscraper (160x600)',
    position: 'player_sidebar_left',
    network: 'adsterra',
    dimensions: '160x600',
    codeSnippet: '<!-- Adsterra Video Left Skyscraper 160x600 -->',
    targetUrl: 'https://www.apple.com/apple-tv-4k',
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
    titleText: 'Experience High Frame Rate 4K HDR with Dolby Vision',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: false,
    targetDevice: 'desktop',
    cpmRate: 2.70,
    cpcRate: 0.52,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-16T10:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-player-sidebar-right',
    name: 'Player Right Skyscraper (160x600)',
    position: 'player_sidebar_right',
    network: 'custom',
    dimensions: '160x600',
    codeSnippet: '<!-- Custom Video Right Skyscraper 160x600 -->',
    targetUrl: 'https://www.razer.com/soundbars',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    titleText: 'THX Spatial Audio Multi-Driver PC & Cinema Soundbar',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'desktop',
    cpmRate: 2.70,
    cpcRate: 0.52,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-16T10:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-popup-under',
    name: 'Policy-Compliant Popunder (New Tab)',
    position: 'popup_under',
    network: 'monetag',
    dimensions: 'popup',
    codeSnippet: '<!-- Monetag Frequency-Capped Popunder Script -->',
    targetUrl: 'https://nordvpn.com/stream-safely',
    titleText: 'Premium Streaming Security & High Bandwidth VPN',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 5.50,
    cpcRate: 1.10,
    impressions: 0,
    clicks: 0,
    estimatedEarnings: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  }
];

/** Recalculate impressions / clicks / earnings from tracked adEvents only. */
function rebuildAdSlotMetricsFromEvents(
  slots: AdSlot[],
  events: AdEventRecord[]
): { slots: AdSlot[]; changed: boolean } {
  const totals = new Map<string, { impressions: number; clicks: number; earnings: number }>();
  for (const ev of events) {
    if (!ev?.adSlotId) continue;
    const cur = totals.get(ev.adSlotId) || { impressions: 0, clicks: 0, earnings: 0 };
    if (ev.type === 'impression') cur.impressions += 1;
    if (ev.type === 'click') cur.clicks += 1;
    cur.earnings += Number(ev.earnings) || 0;
    totals.set(ev.adSlotId, cur);
  }

  let changed = false;
  const next = slots.map(slot => {
    const t = totals.get(slot.id) || { impressions: 0, clicks: 0, earnings: 0 };
    const earnings = Number(t.earnings.toFixed(2));
    if (
      slot.impressions !== t.impressions ||
      slot.clicks !== t.clicks ||
      Number(slot.estimatedEarnings || 0) !== earnings
    ) {
      changed = true;
      return {
        ...slot,
        impressions: t.impressions,
        clicks: t.clicks,
        estimatedEarnings: earnings
      };
    }
    return slot;
  });

  return { slots: next, changed };
}

function migrateStreamAssociations(list: StreamAssociation[]): {
  list: StreamAssociation[];
  changed: boolean;
} {
  let changed = false;
  const migrated = list.map(raw => {
    const next: StreamAssociation = { ...raw };
    if (!next.providerName) {
      next.providerName = 'nexstream';
      changed = true;
    } else {
      const normalized = normalizeProviderKey(next.providerName);
      if (normalized !== next.providerName) {
        next.providerName = normalized;
        changed = true;
      }
    }
    if (!next.providerMovieId) {
      next.providerMovieId = String(next.nexstreamProviderId || next.tmdbId);
      changed = true;
    }
    if (!next.availabilityStatus) {
      next.availabilityStatus = next.streamStatus;
      changed = true;
    }
    if (next.providerName === 'nexstream' && !next.nexstreamProviderId) {
      next.nexstreamProviderId = next.providerMovieId;
      changed = true;
    }
    return next;
  });

  // Deduplicate by (tmdbId, providerName) — keep newest updatedAt
  const seen = new Map<string, StreamAssociation>();
  for (const assoc of migrated) {
    const key = `${assoc.tmdbId}:${normalizeProviderKey(assoc.providerName)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, assoc);
      continue;
    }
    changed = true;
    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const nextTime = new Date(assoc.updatedAt || 0).getTime();
    if (nextTime >= existingTime) seen.set(key, assoc);
  }

  return { list: Array.from(seen.values()), changed };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Cold start on Vercel: seed /tmp from the deployed data/ file when present.
    if (IS_SERVERLESS && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_DB_FILE)) {
      try {
        fs.copyFileSync(SEED_DB_FILE, DB_FILE);
      } catch (err) {
        console.warn('Could not seed serverless DB from data/:', err);
      }
    }
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;

        let needsSave = false;

        if (!Array.isArray(parsed.movies)) {
          parsed.movies = [];
          needsSave = true;
        }

        // Ensure ad slots and settings exist
        if (!parsed.adSlots || parsed.adSlots.length === 0) {
          parsed.adSlots = INITIAL_AD_SLOTS;
          needsSave = true;
        }
        if (!parsed.adSettings) {
          parsed.adSettings = INITIAL_AD_SETTINGS;
          needsSave = true;
        } else {
          // Backfill newer ad settings keys for existing databases
          const mergedSettings: AdSettings = {
            ...INITIAL_AD_SETTINGS,
            ...parsed.adSettings
          };
          if (
            parsed.adSettings.cardClickAdEnabled === undefined ||
            parsed.adSettings.cardClickAdChancePercent === undefined
          ) {
            parsed.adSettings = mergedSettings;
            needsSave = true;
          }
        }
        if (!parsed.adEvents) {
          parsed.adEvents = [];
          needsSave = true;
        }

        // Rebuild slot counters from real adEvents (drop seeded demo metrics)
        if (Array.isArray(parsed.adSlots) && parsed.adSlots.length > 0) {
          const rebuilt = rebuildAdSlotMetricsFromEvents(parsed.adSlots, parsed.adEvents || []);
          if (rebuilt.changed) {
            parsed.adSlots = rebuilt.slots;
            needsSave = true;
          }
        }

        if (!Array.isArray(parsed.streamAssociations)) {
          parsed.streamAssociations = [];
          needsSave = true;
        } else {
          const migrated = migrateStreamAssociations(parsed.streamAssociations);
          if (migrated.changed) {
            parsed.streamAssociations = migrated.list;
            needsSave = true;
          }
        }

        if (!Array.isArray(parsed.movieStreamPreferences)) {
          parsed.movieStreamPreferences = [];
          needsSave = true;
        }

        if (!parsed.streamingSyncMeta || typeof parsed.streamingSyncMeta !== 'object') {
          parsed.streamingSyncMeta = {};
          needsSave = true;
        }

        // Content compliance registry (providers default unverified — never auto-authorized)
        if (!Array.isArray(parsed.contentProviders) || parsed.contentProviders.length === 0) {
          parsed.contentProviders = createDefaultProviders();
          needsSave = true;
        } else {
          const keys = new Set(parsed.contentProviders.map(p => p.providerKey));
          for (const seed of createDefaultProviders()) {
            if (!keys.has(seed.providerKey)) {
              parsed.contentProviders.push(seed);
              needsSave = true;
            }
          }
        }

        if (!Array.isArray(parsed.copyrightComplaints)) {
          parsed.copyrightComplaints = [];
          needsSave = true;
        }

        if (!parsed.complianceSettings || typeof parsed.complianceSettings !== 'object') {
          parsed.complianceSettings = createDefaultComplianceSettings();
          needsSave = true;
        } else {
          const env = getEnvSiteCompliance();
          parsed.complianceSettings = {
            ...createDefaultComplianceSettings(),
            ...parsed.complianceSettings,
            // Env overrides empty placeholders so operators can configure contact without DB edit
            contactEmail:
              parsed.complianceSettings.contactEmail &&
              parsed.complianceSettings.contactEmail !== 'contact@example.com'
                ? parsed.complianceSettings.contactEmail
                : env.contactEmail,
            dmcaEmail:
              parsed.complianceSettings.dmcaEmail &&
              parsed.complianceSettings.dmcaEmail !== 'contact@example.com'
                ? parsed.complianceSettings.dmcaEmail
                : env.dmcaEmail,
            legalEntityName: parsed.complianceSettings.legalEntityName || env.legalEntityName,
            siteName: parsed.complianceSettings.siteName || env.siteName
          };
        }

        if (!Array.isArray(parsed.disputedTmdbIds)) {
          parsed.disputedTmdbIds = [];
          needsSave = true;
        }
        if (!Array.isArray(parsed.disputedMovieIds)) {
          parsed.disputedMovieIds = [];
          needsSave = true;
        }

        // AdSense-oriented safety: turn off deceptive click-hijack / popunder patterns
        if (
          parsed.adSettings?.cardClickAdEnabled === true ||
          parsed.adSettings?.popupEnabled === true
        ) {
          parsed.adSettings = {
            ...parsed.adSettings,
            cardClickAdEnabled: false,
            cardClickAdChancePercent: 0,
            popupEnabled: false
          };
          needsSave = true;
        }

        if (needsSave) {
          this.saveData(parsed);
        }
        return parsed;
      } catch (err) {
        console.error('Error reading database file, initializing default:', err);
      }
    }

    // Default admin setup
    const salt = crypto.randomBytes(16).toString('hex');
    const defaultAdmin: AdminUser = {
      id: 'admin-1',
      username: 'admin',
      email: 'admin@cinestream.io',
      passwordHash: hashPassword('admin123', salt),
      salt,
      createdAt: new Date().toISOString()
    };

    const initialData: DatabaseSchema = {
      users: [
        { id: 'usr-1', username: 'demo_user', email: 'user@cinestream.io', role: 'viewer', createdAt: new Date().toISOString() }
      ],
      admins: [defaultAdmin],
      categories: INITIAL_CATEGORIES,
      movies: INITIAL_MOVIES,
      adSlots: INITIAL_AD_SLOTS,
      adSettings: INITIAL_AD_SETTINGS,
      adEvents: [],
      streamAssociations: [],
      movieStreamPreferences: [],
      streamingSyncMeta: {},
      contentProviders: createDefaultProviders(),
      copyrightComplaints: [],
      complianceSettings: createDefaultComplianceSettings(),
      disputedTmdbIds: [],
      disputedMovieIds: []
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(dataToSave: DatabaseSchema): void {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
      this.data = dataToSave;
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // --- Admin User Methods ---
  public getAdminByUsername(username: string): AdminUser | undefined {
    return this.data.admins.find(a => a.username.toLowerCase() === username.toLowerCase() || a.email.toLowerCase() === username.toLowerCase());
  }

  public getAdminById(id: string): AdminUser | undefined {
    return this.data.admins.find(a => a.id === id);
  }

  public verifyAdminPassword(admin: AdminUser, passwordAttempt: string): boolean {
    const computed = hashPassword(passwordAttempt, admin.salt);
    return computed === admin.passwordHash;
  }

  // --- Movie CRUD Methods ---
  public getAllMovies(filterPublishedOnly = false): Movie[] {
    if (filterPublishedOnly) {
      return this.data.movies.filter(m => m.isPublished);
    }
    return [...this.data.movies];
  }

  public getMovieById(id: string): Movie | undefined {
    return this.data.movies.find(m => m.id === id);
  }

  public getMovieByTmdbId(tmdbId: number): Movie | undefined {
    if (!tmdbId) return undefined;
    return this.data.movies.find(m => m.tmdbId === tmdbId);
  }

  public createMovie(movieInput: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Movie {
    if (movieInput.tmdbId) {
      const existing = this.getMovieByTmdbId(movieInput.tmdbId);
      if (existing) {
        throw new Error(`A movie with TMDB id ${movieInput.tmdbId} already exists (${existing.title}).`);
      }
    }

    const newMovie: Movie = {
      ...movieInput,
      id: `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.movies.unshift(newMovie);
    this.saveData(this.data);
    return newMovie;
  }

  public updateMovie(id: string, updates: Partial<Omit<Movie, 'id' | 'createdAt'>>): Movie | null {
    const index = this.data.movies.findIndex(m => m.id === id);
    if (index === -1) return null;

    const existing = this.data.movies[index];

    // Prevent duplicate tmdbId when reassigning
    if (updates.tmdbId && updates.tmdbId !== existing.tmdbId) {
      const clash = this.getMovieByTmdbId(updates.tmdbId);
      if (clash && clash.id !== id) {
        throw new Error(`TMDB id ${updates.tmdbId} is already linked to "${clash.title}".`);
      }
    }

    // Explicit streamingUrl in the payload wins (including empty string to clear → provider fallback)
    const nextStreamingUrl =
      updates.streamingUrl !== undefined
        ? String(updates.streamingUrl || '').trim()
        : existing.streamingUrl;

    const nextManualOverride =
      updates.manualPlaybackOverride !== undefined
        ? Boolean(updates.manualPlaybackOverride)
        : updates.streamingUrl !== undefined
          ? Boolean(nextStreamingUrl)
          : existing.manualPlaybackOverride;

    const updated: Movie = {
      ...existing,
      ...updates,
      streamingUrl: nextStreamingUrl,
      manualPlaybackOverride: nextManualOverride,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.data.movies[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  public deleteMovie(id: string): boolean {
    const initialLen = this.data.movies.length;
    this.data.movies = this.data.movies.filter(m => m.id !== id);
    if (this.data.movies.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public incrementViews(id: string): void {
    const movie = this.data.movies.find(m => m.id === id);
    if (movie) {
      movie.views = (movie.views || 0) + 1;
      this.saveData(this.data);
    }
  }

  // --- Multi-provider streaming association methods ---
  public getAllStreamAssociations(): StreamAssociation[] {
    return [...(this.data.streamAssociations || [])];
  }

  public getStreamAssociationsByTmdbId(tmdbId: number): StreamAssociation[] {
    if (!tmdbId) return [];
    return (this.data.streamAssociations || []).filter(a => a.tmdbId === tmdbId);
  }

  public getStreamAssociation(
    tmdbId: number,
    providerName: StreamingProviderKey
  ): StreamAssociation | undefined {
    if (!tmdbId) return undefined;
    const key = normalizeProviderKey(providerName);
    return (this.data.streamAssociations || []).find(
      a => a.tmdbId === tmdbId && normalizeProviderKey(a.providerName) === key
    );
  }

  /**
   * Backward-compatible helper: returns the active/preferred association for a movie.
   * Priority: admin preference → NexStream available → Vidsrc available → first record.
   */
  public getStreamAssociationByTmdbId(tmdbId: number): StreamAssociation | undefined {
    const list = this.getStreamAssociationsByTmdbId(tmdbId);
    if (list.length === 0) return undefined;

    const pref = this.getMovieStreamPreference(tmdbId);
    if (pref?.preferredProvider && pref.manualOverride) {
      const selected = list.find(
        a =>
          normalizeProviderKey(a.providerName) === pref.preferredProvider &&
          !a.disabled &&
          a.streamStatus === 'available'
      );
      if (selected) return selected;
    }

    const adminSelected = list.find(a => a.selectedByAdmin && !a.disabled && a.streamStatus === 'available');
    if (adminSelected) return adminSelected;

    for (const key of PROVIDER_PRIORITY) {
      const hit = list.find(
        a =>
          normalizeProviderKey(a.providerName) === key &&
          !a.disabled &&
          a.streamStatus === 'available'
      );
      if (hit) return hit;
    }

    // Fallback: first by provider priority regardless of status
    for (const key of PROVIDER_PRIORITY) {
      const hit = list.find(a => normalizeProviderKey(a.providerName) === key);
      if (hit) return hit;
    }
    return list[0];
  }

  public upsertStreamAssociation(
    input: Omit<StreamAssociation, 'id' | 'createdAt' | 'updatedAt' | 'providerMovieId' | 'providerName'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
      providerName?: StreamingProviderKey | string;
      providerMovieId?: string;
    }
  ): StreamAssociation {
    if (!this.data.streamAssociations) this.data.streamAssociations = [];

    const providerKey = normalizeProviderKey(input.providerName || 'nexstream');
    const providerMovieId = String(
      input.providerMovieId || input.nexstreamProviderId || input.tmdbId
    );
    const streamStatus = input.streamStatus || input.availabilityStatus || 'unavailable';
    const now = new Date().toISOString();

    const existingIndex = this.data.streamAssociations.findIndex(
      a => a.tmdbId === input.tmdbId && normalizeProviderKey(a.providerName) === providerKey
    );

    if (existingIndex >= 0) {
      const existing = this.data.streamAssociations[existingIndex];
      const updated: StreamAssociation = {
        ...existing,
        ...input,
        id: existing.id,
        tmdbId: existing.tmdbId,
        providerName: providerKey,
        providerMovieId,
        nexstreamProviderId:
          providerKey === 'nexstream' ? providerMovieId : existing.nexstreamProviderId,
        streamStatus,
        availabilityStatus: streamStatus,
        createdAt: existing.createdAt,
        updatedAt: now,
        lastError: input.lastError === undefined ? undefined : input.lastError
      };
      this.data.streamAssociations[existingIndex] = updated;
      this.saveData(this.data);
      return updated;
    }

    const created: StreamAssociation = {
      ...input,
      providerName: providerKey,
      providerMovieId,
      nexstreamProviderId: providerKey === 'nexstream' ? providerMovieId : input.nexstreamProviderId,
      streamStatus,
      availabilityStatus: streamStatus,
      id:
        input.id ||
        `stream-${providerKey}-${input.tmdbId}-${Math.random().toString(36).substring(2, 7)}`,
      disabled: Boolean(input.disabled),
      manualOverride: Boolean(input.manualOverride),
      selectedByAdmin: Boolean(input.selectedByAdmin),
      createdAt: input.createdAt || now,
      updatedAt: now
    };

    this.data.streamAssociations.unshift(created);
    this.saveData(this.data);
    return created;
  }

  public updateStreamAssociation(
    tmdbId: number,
    updates: Partial<Omit<StreamAssociation, 'id' | 'tmdbId' | 'createdAt'>>,
    providerName?: StreamingProviderKey
  ): StreamAssociation | null {
    if (!this.data.streamAssociations) this.data.streamAssociations = [];
    const key = providerName
      ? normalizeProviderKey(providerName)
      : updates.providerName
        ? normalizeProviderKey(updates.providerName)
        : null;

    const index = this.data.streamAssociations.findIndex(a => {
      if (a.tmdbId !== tmdbId) return false;
      if (!key) return true;
      return normalizeProviderKey(a.providerName) === key;
    });
    if (index < 0) return null;

    const existing = this.data.streamAssociations[index];
    const nextStatus = updates.streamStatus || updates.availabilityStatus || existing.streamStatus;
    const updated: StreamAssociation = {
      ...existing,
      ...updates,
      id: existing.id,
      tmdbId: existing.tmdbId,
      providerName: key || normalizeProviderKey(existing.providerName),
      streamStatus: nextStatus,
      availabilityStatus: nextStatus,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    this.data.streamAssociations[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  public disableStreamAssociation(
    tmdbId: number,
    disabled = true,
    providerName?: StreamingProviderKey
  ): StreamAssociation | null {
    const target =
      providerName
        ? this.getStreamAssociation(tmdbId, providerName)
        : this.getStreamAssociationByTmdbId(tmdbId);
    if (!target) return null;
    return this.updateStreamAssociation(
      tmdbId,
      {
        disabled,
        streamStatus: disabled ? 'disabled' : target.streamStatus === 'disabled' ? 'available' : target.streamStatus,
        availabilityStatus: disabled ? 'disabled' : target.streamStatus === 'disabled' ? 'available' : target.streamStatus,
        manualOverride: true,
        matchSource: 'manual'
      },
      normalizeProviderKey(target.providerName)
    );
  }

  public approveUncertainStream(
    tmdbId: number,
    providerName?: StreamingProviderKey
  ): StreamAssociation | null {
    const existing = providerName
      ? this.getStreamAssociation(tmdbId, providerName)
      : this.getStreamAssociationsByTmdbId(tmdbId).find(a => a.streamStatus === 'uncertain') ||
        this.getStreamAssociationByTmdbId(tmdbId);
    if (!existing) return null;
    return this.updateStreamAssociation(
      tmdbId,
      {
        streamStatus: 'available',
        availabilityStatus: 'available',
        matchConfidence:
          existing.matchConfidence === 'uncertain' ? 'exact_tmdb_id' : existing.matchConfidence,
        manualOverride: true,
        matchSource: 'manual',
        disabled: false,
        lastError: undefined
      },
      normalizeProviderKey(existing.providerName)
    );
  }

  public selectStreamProvider(
    tmdbId: number,
    providerName: StreamingProviderKey,
    options: { confirmOverwriteManual?: boolean } = {}
  ): StreamAssociation | null {
    const target = this.getStreamAssociation(tmdbId, providerName);
    if (!target) return null;

    const pref = this.getMovieStreamPreference(tmdbId);
    if (pref?.manualOverride && !options.confirmOverwriteManual) {
      throw new Error(
        'Manual provider selection is locked. Pass confirmOverwriteManual to replace it.'
      );
    }

    // Clear selectedByAdmin on sibling providers
    for (const assoc of this.getStreamAssociationsByTmdbId(tmdbId)) {
      const key = normalizeProviderKey(assoc.providerName);
      this.updateStreamAssociation(
        tmdbId,
        {
          selectedByAdmin: key === providerName,
          manualOverride: key === providerName ? true : assoc.manualOverride
        },
        key
      );
    }

    this.setMovieStreamPreference({
      tmdbId,
      preferredProvider: providerName,
      manualOverride: true,
      updatedAt: new Date().toISOString()
    });

    return this.getStreamAssociation(tmdbId, providerName) || null;
  }

  public getMovieStreamPreference(tmdbId: number): MovieStreamPreference | undefined {
    if (!tmdbId) return undefined;
    return (this.data.movieStreamPreferences || []).find(p => p.tmdbId === tmdbId);
  }

  public setMovieStreamPreference(pref: MovieStreamPreference): MovieStreamPreference {
    if (!this.data.movieStreamPreferences) this.data.movieStreamPreferences = [];
    const index = this.data.movieStreamPreferences.findIndex(p => p.tmdbId === pref.tmdbId);
    if (index >= 0) {
      this.data.movieStreamPreferences[index] = { ...this.data.movieStreamPreferences[index], ...pref };
    } else {
      this.data.movieStreamPreferences.push(pref);
    }
    this.saveData(this.data);
    return pref;
  }

  public getStreamingSyncMeta(): StreamingSyncMeta {
    return { ...(this.data.streamingSyncMeta || {}) };
  }

  public setStreamingSyncMeta(meta: StreamingSyncMeta): StreamingSyncMeta {
    this.data.streamingSyncMeta = {
      ...(this.data.streamingSyncMeta || {}),
      ...meta
    };
    this.saveData(this.data);
    return this.data.streamingSyncMeta;
  }

  public getStreamingStats(tmdbCatalogSize?: number) {
    const associations = this.data.streamAssociations || [];
    const moviesWithTmdb = this.data.movies.filter(m => m.tmdbId);
    const tmdbIds = new Set<number>();
    for (const a of associations) tmdbIds.add(a.tmdbId);
    for (const m of moviesWithTmdb) {
      if (m.tmdbId) tmdbIds.add(m.tmdbId);
    }

    const byTmdb = new Map<number, StreamAssociation[]>();
    for (const a of associations) {
      const list = byTmdb.get(a.tmdbId) || [];
      list.push(a);
      byTmdb.set(a.tmdbId, list);
    }

    let nexstreamMatched = 0;
    let vidsrcMatched = 0;
    let bothProviders = 0;
    let withVerifiedStreams = 0;
    let withoutStreams = 0;
    let uncertainMatches = 0;
    let failedSearches = 0;
    let providerErrors = 0;

    for (const tmdbId of tmdbIds) {
      const list = byTmdb.get(tmdbId) || [];
      const nx = list.find(
        a => normalizeProviderKey(a.providerName) === 'nexstream' && a.streamStatus === 'available' && !a.disabled
      );
      const vs = list.find(
        a => normalizeProviderKey(a.providerName) === 'vidsrc' && a.streamStatus === 'available' && !a.disabled
      );
      if (nx) nexstreamMatched += 1;
      if (vs) vidsrcMatched += 1;
      if (nx && vs) bothProviders += 1;
      if (nx || vs) withVerifiedStreams += 1;
      else withoutStreams += 1;
      if (list.some(a => a.streamStatus === 'uncertain')) uncertainMatches += 1;
      if (list.some(a => a.streamStatus === 'failed')) {
        failedSearches += 1;
        providerErrors += 1;
      }
    }

    // Movies tracked only via associations with no available provider
    // already counted. Also count associations that failed independently.
    providerErrors = associations.filter(a => a.streamStatus === 'failed' || Boolean(a.lastError)).length;

    return {
      totalTmdbMovies: tmdbCatalogSize ?? Math.max(moviesWithTmdb.length, tmdbIds.size),
      totalAssociations: associations.length,
      withVerifiedStreams,
      withoutStreams,
      uncertainMatches,
      failedSearches,
      nexstreamMatched,
      vidsrcMatched,
      bothProviders,
      providerErrors,
      lastSyncAt: this.data.streamingSyncMeta?.lastSyncAt || null,
      lastSyncSummary: this.data.streamingSyncMeta?.lastSyncSummary || null
    };
  }

  // --- Category Methods ---
  public getCategories(): Category[] {
    return [...this.data.categories];
  }

  public createCategory(name: string, description = ''): Category {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      description,
      displayOrder: this.data.categories.length + 1
    };
    this.data.categories.push(newCat);
    this.saveData(this.data);
    return newCat;
  }

  // --- Advertising System Methods ---
  public getAdSettings(): AdSettings {
    return { ...INITIAL_AD_SETTINGS, ...this.data.adSettings };
  }

  public updateAdSettings(updates: Partial<AdSettings>): AdSettings {
    this.data.adSettings = {
      ...this.data.adSettings,
      ...updates
    };
    this.saveData(this.data);
    return this.data.adSettings;
  }

  public getAllAdSlots(): AdSlot[] {
    const rebuilt = rebuildAdSlotMetricsFromEvents(this.data.adSlots || [], this.data.adEvents || []);
    if (rebuilt.changed) {
      this.data.adSlots = rebuilt.slots;
      this.saveData(this.data);
    }
    return [...(this.data.adSlots || [])];
  }

  public getActiveAdSlots(context?: 'home' | 'details' | 'player'): AdSlot[] {
    if (!this.data.adSettings.masterEnabled) {
      return [];
    }

    if (context === 'home' && !this.data.adSettings.homeAdsEnabled) return [];
    if (context === 'details' && !this.data.adSettings.detailsAdsEnabled) return [];
    if (context === 'player' && !this.data.adSettings.playerAdsEnabled) return [];

    const now = new Date();
    return (this.data.adSlots || []).filter(slot => {
      if (!slot.enabled) return false;
      if (slot.startDate && new Date(slot.startDate) > now) return false;
      if (slot.endDate && new Date(slot.endDate) < now) return false;
      return true;
    });
  }

  public getAdSlotById(id: string): AdSlot | undefined {
    return (this.data.adSlots || []).find(s => s.id === id);
  }

  public createAdSlot(slotInput: Omit<AdSlot, 'id' | 'createdAt' | 'updatedAt' | 'impressions' | 'clicks' | 'estimatedEarnings'>): AdSlot {
    const newSlot: AdSlot = {
      ...slotInput,
      id: `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      impressions: 0,
      clicks: 0,
      estimatedEarnings: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.adSlots) this.data.adSlots = [];
    this.data.adSlots.push(newSlot);
    this.saveData(this.data);
    return newSlot;
  }

  public updateAdSlot(id: string, updates: Partial<Omit<AdSlot, 'id' | 'createdAt'>>): AdSlot | null {
    const index = (this.data.adSlots || []).findIndex(s => s.id === id);
    if (index === -1) return null;

    const existing = this.data.adSlots[index];
    const updated: AdSlot = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.data.adSlots[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  public deleteAdSlot(id: string): boolean {
    const initialLen = this.data.adSlots.length;
    this.data.adSlots = this.data.adSlots.filter(s => s.id !== id);
    if (this.data.adSlots.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Real Ad Tracking & Revenue Recording ---
  public recordAdImpression(slotId: string, device: 'desktop' | 'mobile' = 'desktop'): { slot?: AdSlot; earningsEarned: number } {
    const slot = (this.data.adSlots || []).find(s => s.id === slotId);
    if (!slot) return { earningsEarned: 0 };

    slot.impressions = (slot.impressions || 0) + 1;
    // CPM Earnings = (CPM Rate / 1000)
    const earned = slot.cpmRate > 0 ? Number((slot.cpmRate / 1000).toFixed(5)) : 0.001;
    slot.estimatedEarnings = Number(((slot.estimatedEarnings || 0) + earned).toFixed(2));

    const event: AdEventRecord = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adSlotId: slot.id,
      position: slot.position,
      network: slot.network,
      type: 'impression',
      device,
      earnings: earned,
      timestamp: new Date().toISOString()
    };

    if (!this.data.adEvents) this.data.adEvents = [];
    this.data.adEvents.push(event);
    if (this.data.adEvents.length > 5000) {
      this.data.adEvents = this.data.adEvents.slice(-4000);
    }

    this.saveData(this.data);
    return { slot, earningsEarned: earned };
  }

  public recordAdClick(slotId: string, device: 'desktop' | 'mobile' = 'desktop'): { slot?: AdSlot; earningsEarned: number } {
    const slot = (this.data.adSlots || []).find(s => s.id === slotId);
    if (!slot) return { earningsEarned: 0 };

    slot.clicks = (slot.clicks || 0) + 1;
    // CPC Earnings
    const earned = slot.cpcRate > 0 ? Number(slot.cpcRate.toFixed(2)) : 0.25;
    slot.estimatedEarnings = Number(((slot.estimatedEarnings || 0) + earned).toFixed(2));

    const event: AdEventRecord = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adSlotId: slot.id,
      position: slot.position,
      network: slot.network,
      type: 'click',
      device,
      earnings: earned,
      timestamp: new Date().toISOString()
    };

    if (!this.data.adEvents) this.data.adEvents = [];
    this.data.adEvents.push(event);
    if (this.data.adEvents.length > 5000) {
      this.data.adEvents = this.data.adEvents.slice(-4000);
    }

    this.saveData(this.data);
    return { slot, earningsEarned: earned };
  }

  // --- Revenue & Analytics Reporting (real tracked adEvents only) ---
  public getAdAnalytics() {
    // Keep slot counters aligned with event log before reporting
    const rebuilt = rebuildAdSlotMetricsFromEvents(this.data.adSlots || [], this.data.adEvents || []);
    if (rebuilt.changed) {
      this.data.adSlots = rebuilt.slots;
      this.saveData(this.data);
    }

    const slots = this.data.adSlots || [];
    const events = this.data.adEvents || [];

    const totalImpressions = events.filter(e => e.type === 'impression').length;
    const totalClicks = events.filter(e => e.type === 'click').length;
    const totalEarnings = events.reduce((acc, e) => acc + (Number(e.earnings) || 0), 0);
    const overallCtr =
      totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    const byPosition: Record<string, { impressions: number; clicks: number; earnings: number; ctr: number }> = {};
    const byNetwork: Record<string, { impressions: number; clicks: number; earnings: number; count: number }> = {};

    // Slot inventory for network counts (even if no events yet)
    slots.forEach(slot => {
      if (!byNetwork[slot.network]) {
        byNetwork[slot.network] = { impressions: 0, clicks: 0, earnings: 0, count: 0 };
      }
      byNetwork[slot.network].count += 1;
    });

    events.forEach(ev => {
      const position = ev.position || 'unknown';
      const network = ev.network || 'custom';

      if (!byPosition[position]) {
        byPosition[position] = { impressions: 0, clicks: 0, earnings: 0, ctr: 0 };
      }
      if (!byNetwork[network]) {
        byNetwork[network] = { impressions: 0, clicks: 0, earnings: 0, count: 0 };
      }

      const earned = Number(ev.earnings) || 0;
      if (ev.type === 'impression') {
        byPosition[position].impressions += 1;
        byNetwork[network].impressions += 1;
      }
      if (ev.type === 'click') {
        byPosition[position].clicks += 1;
        byNetwork[network].clicks += 1;
      }
      byPosition[position].earnings += earned;
      byNetwork[network].earnings += earned;
    });

    Object.keys(byPosition).forEach(pos => {
      const p = byPosition[pos];
      p.ctr = p.impressions > 0 ? Number(((p.clicks / p.impressions) * 100).toFixed(2)) : 0;
      p.earnings = Number(p.earnings.toFixed(2));
    });

    Object.keys(byNetwork).forEach(net => {
      const n = byNetwork[net];
      n.earnings = Number(n.earnings.toFixed(2));
    });

    const desktopEvents = events.filter(e => e.device === 'desktop');
    const mobileEvents = events.filter(e => e.device === 'mobile');

    const sumEarnings = (list: AdEventRecord[]) =>
      Number(list.reduce((acc, e) => acc + (Number(e.earnings) || 0), 0).toFixed(2));

    const desktopImpressions = desktopEvents.filter(e => e.type === 'impression').length;
    const mobileImpressions = mobileEvents.filter(e => e.type === 'impression').length;
    const desktopClicks = desktopEvents.filter(e => e.type === 'click').length;
    const mobileClicks = mobileEvents.filter(e => e.type === 'click').length;

    // Daily breakdown for past 7 days from real timestamps
    const dailyReports: Array<{ date: string; impressions: number; clicks: number; earnings: number }> = [];
    const today = new Date();
    const dayBuckets = new Map<string, { impressions: number; clicks: number; earnings: number }>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dayBuckets.set(dateStr, { impressions: 0, clicks: 0, earnings: 0 });
    }

    events.forEach(ev => {
      const dateStr = String(ev.timestamp || '').slice(0, 10);
      const bucket = dayBuckets.get(dateStr);
      if (!bucket) return;
      if (ev.type === 'impression') bucket.impressions += 1;
      if (ev.type === 'click') bucket.clicks += 1;
      bucket.earnings += Number(ev.earnings) || 0;
    });

    for (const [date, bucket] of dayBuckets) {
      dailyReports.push({
        date,
        impressions: bucket.impressions,
        clicks: bucket.clicks,
        earnings: Number(bucket.earnings.toFixed(2))
      });
    }

    return {
      summary: {
        totalImpressions,
        totalClicks,
        overallCtr,
        totalEstimatedEarnings: Number(totalEarnings.toFixed(2)),
        activeSlotsCount: slots.filter(s => s.enabled).length,
        totalSlotsCount: slots.length,
        masterEnabled: this.data.adSettings.masterEnabled
      },
      byPosition,
      byNetwork,
      byDevice: {
        desktop: {
          impressions: desktopImpressions,
          clicks: desktopClicks,
          earnings: sumEarnings(desktopEvents)
        },
        mobile: {
          impressions: mobileImpressions,
          clicks: mobileClicks,
          earnings: sumEarnings(mobileEvents)
        }
      },
      dailyReports
    };
  }

  // --- Content compliance ---
  public getComplianceSettings(): SiteComplianceSettings {
    const env = getEnvSiteCompliance();
    const stored = this.data.complianceSettings || createDefaultComplianceSettings();
    return {
      ...createDefaultComplianceSettings(),
      ...stored,
      contactEmail:
        stored.contactEmail && stored.contactEmail !== 'contact@example.com'
          ? stored.contactEmail
          : env.contactEmail,
      dmcaEmail:
        stored.dmcaEmail && stored.dmcaEmail !== 'contact@example.com'
          ? stored.dmcaEmail
          : env.dmcaEmail,
      legalEntityName: stored.legalEntityName || env.legalEntityName,
      siteName: stored.siteName || env.siteName
    };
  }

  public updateComplianceSettings(
    updates: Partial<SiteComplianceSettings>
  ): SiteComplianceSettings {
    this.data.complianceSettings = {
      ...this.getComplianceSettings(),
      ...updates
    };
    this.saveData(this.data);
    return this.getComplianceSettings();
  }

  public getContentProviders(): ContentProviderRecord[] {
    if (!Array.isArray(this.data.contentProviders) || this.data.contentProviders.length === 0) {
      this.data.contentProviders = createDefaultProviders();
      this.saveData(this.data);
    }
    return this.data.contentProviders.map(p => ({ ...p }));
  }

  public getContentProvider(key: ContentProviderKey | string): ContentProviderRecord | undefined {
    return this.getContentProviders().find(p => p.providerKey === key);
  }

  public isProviderPlaybackAllowed(key: ContentProviderKey | string): boolean {
    const provider = this.getContentProvider(key);
    return isProviderAuthorizedForPlayback(provider, this.getComplianceSettings());
  }

  public updateContentProvider(
    providerKey: ContentProviderKey | string,
    updates: Partial<
      Pick<
        ContentProviderRecord,
        | 'authorizationStatus'
        | 'authorizationEvidence'
        | 'restrictions'
        | 'notes'
        | 'sourceUrl'
        | 'displayName'
        | 'reviewedBy'
      >
    >
  ): ContentProviderRecord | null {
    const index = (this.data.contentProviders || []).findIndex(p => p.providerKey === providerKey);
    if (index === -1) return null;

    const existing = this.data.contentProviders[index];
    const nextStatus = updates.authorizationStatus ?? existing.authorizationStatus;
    // Never invent licensing — empty evidence cannot be Verified
    if (nextStatus === 'verified' && !(updates.authorizationEvidence ?? existing.authorizationEvidence)?.trim()) {
      throw new Error(
        'Cannot mark a provider as Verified without recording authorization or licensing evidence.'
      );
    }

    const updated: ContentProviderRecord = {
      ...existing,
      ...updates,
      providerKey: existing.providerKey,
      id: existing.id,
      createdAt: existing.createdAt,
      lastReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.contentProviders[index] = updated;
    this.saveData(this.data);
    return { ...updated };
  }

  public isTmdbDisputed(tmdbId: number): boolean {
    return (this.data.disputedTmdbIds || []).includes(tmdbId);
  }

  public isMovieDisputed(movieId: string): boolean {
    return (this.data.disputedMovieIds || []).includes(movieId);
  }

  public setTmdbDisputed(tmdbId: number, disputed: boolean): void {
    const set = new Set(this.data.disputedTmdbIds || []);
    if (disputed) set.add(tmdbId);
    else set.delete(tmdbId);
    this.data.disputedTmdbIds = Array.from(set);
    this.saveData(this.data);
  }

  public setMovieDisputed(movieId: string, disputed: boolean): void {
    const set = new Set(this.data.disputedMovieIds || []);
    if (disputed) set.add(movieId);
    else set.delete(movieId);
    this.data.disputedMovieIds = Array.from(set);
    this.saveData(this.data);
  }

  public getCopyrightComplaints(): CopyrightComplaint[] {
    return [...(this.data.copyrightComplaints || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getCopyrightComplaint(id: string): CopyrightComplaint | undefined {
    return (this.data.copyrightComplaints || []).find(c => c.id === id);
  }

  public createCopyrightComplaint(
    input: Omit<
      CopyrightComplaint,
      'id' | 'status' | 'adminNotes' | 'disabledTmdbIds' | 'disabledMovieIds' | 'createdAt' | 'updatedAt' | 'resolvedAt'
    >
  ): CopyrightComplaint {
    const complaint: CopyrightComplaint = {
      ...input,
      id: `dmca-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'received',
      adminNotes: '',
      disabledTmdbIds: [],
      disabledMovieIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!this.data.copyrightComplaints) this.data.copyrightComplaints = [];
    this.data.copyrightComplaints.unshift(complaint);
    this.saveData(this.data);
    return { ...complaint };
  }

  public updateCopyrightComplaint(
    id: string,
    updates: Partial<
      Pick<
        CopyrightComplaint,
        'status' | 'adminNotes' | 'disabledTmdbIds' | 'disabledMovieIds' | 'resolvedAt'
      >
    >
  ): CopyrightComplaint | null {
    const index = (this.data.copyrightComplaints || []).findIndex(c => c.id === id);
    if (index === -1) return null;
    const existing = this.data.copyrightComplaints[index];
    const updated: CopyrightComplaint = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    if (
      updates.status &&
      (updates.status === 'resolved' || updates.status === 'rejected' || updates.status === 'content_disabled') &&
      !updated.resolvedAt
    ) {
      updated.resolvedAt = new Date().toISOString();
    }
    this.data.copyrightComplaints[index] = updated;
    this.saveData(this.data);
    return { ...updated };
  }

  /**
   * Immediately disable playback for disputed titles (associations + dispute lists).
   */
  public disableDisputedContent(options: {
    tmdbIds?: number[];
    movieIds?: string[];
  }): { disabledAssociations: number } {
    let disabledAssociations = 0;
    for (const tmdbId of options.tmdbIds || []) {
      this.setTmdbDisputed(tmdbId, true);
      const assocs = this.getStreamAssociationsByTmdbId(tmdbId);
      for (const assoc of assocs) {
        if (!assoc.disabled) {
          this.updateStreamAssociation(
            assoc.tmdbId,
            {
              disabled: true,
              streamStatus: 'disabled',
              lastError: 'Disabled due to copyright complaint'
            },
            normalizeProviderKey(assoc.providerName)
          );
          disabledAssociations += 1;
        }
      }
    }
    for (const movieId of options.movieIds || []) {
      this.setMovieDisputed(movieId, true);
    }
    return { disabledAssociations };
  }

  // --- Reset catalog (no demo movies) & restore default ads/categories ---
  public resetToDefault(): void {
    this.data.movies = [];
    this.data.categories = [...INITIAL_CATEGORIES];
    this.data.adSlots = [...INITIAL_AD_SLOTS];
    this.data.adSettings = { ...INITIAL_AD_SETTINGS };
    this.data.contentProviders = createDefaultProviders();
    this.data.complianceSettings = createDefaultComplianceSettings();
    this.saveData(this.data);
  }

  public getStats() {
    const total = this.data.movies.length;
    const published = this.data.movies.filter(m => m.isPublished).length;
    const totalViews = this.data.movies.reduce((acc, m) => acc + (m.views || 0), 0);
    const categoriesCount = this.data.categories.length;
    const activeAdsCount = (this.data.adSlots || []).filter(s => s.enabled).length;

    return {
      totalMovies: total,
      publishedMovies: published,
      draftMovies: total - published,
      totalViews,
      categoriesCount,
      activeAdsCount
    };
  }
}

export const db = new Database();
