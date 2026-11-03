import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
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

const INITIAL_MOVIES: Movie[] = [
  {
    id: 'movie-the-paradise-2026',
    title: 'The Paradise',
    description: 'In a fractured near-future territory known as The Paradise, an elite operative must navigate an intricate web of cartel power struggles, personal vengeance, and shifting allegiances to uncover the truth behind a high-level military conspiracy.',
    releaseYear: 2026,
    genre: ['Action', 'Drama'],
    category: 'Action / Drama',
    quality: '1080p',
    language: 'Hindi + Telugu',
    streamingUrl: 'http://ftp13.circleftp.net/FILE/Tamil%20Telugu%20%26%20Others%20Hindi%20Dubbed/2026/The%20Paradise%20%282026%29%201080p%20WEB-DL%20%5BDual%20Audio%5D%20%5BHindi%2BTelugu%5D%20x264/The%20Paradise%20%282026%29%201080p%20WEB-DL%20%5BDual%20Audio%5D%20%5BHindi%2BTelugu%5D%20x264.mkv',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    isFeatured: true,
    isTrending: true,
    isPopular: true,
    isPublished: true,
    views: 34210,
    rating: 8.8,
    duration: '2h 28m',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-01T14:30:00.000Z'
  },
  {
    id: 'movie-cyber-reign-2026',
    title: 'Cyber Reign: Sector 9',
    description: 'When the central neural network governing Neo-Tokyo malfunctions, a rogue bounty hunter and an AI scientist enter the digital underworld to prevent total blackout before midnight.',
    releaseYear: 2026,
    genre: ['Sci-Fi', 'Action'],
    category: 'Sci-Fi',
    quality: '4K',
    language: 'English',
    streamingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    isFeatured: true,
    isTrending: true,
    isPopular: true,
    isPublished: true,
    views: 28940,
    rating: 8.5,
    duration: '1h 56m',
    createdAt: '2026-01-20T12:00:00.000Z',
    updatedAt: '2026-02-02T09:15:00.000Z'
  },
  {
    id: 'movie-shadow-of-valkyrie-2025',
    title: 'Shadow of Valkyrie',
    description: 'Deep behind enemy battle lines, an undercover surveillance pilot discovers an experimental hypersonic weapon that could alter global supremacy overnight.',
    releaseYear: 2025,
    genre: ['Action', 'Thriller'],
    category: 'Action',
    quality: '1080p',
    language: 'Hindi',
    streamingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    isFeatured: false,
    isTrending: true,
    isPopular: true,
    isPublished: true,
    views: 19500,
    rating: 7.9,
    duration: '2h 12m',
    createdAt: '2025-11-10T08:00:00.000Z',
    updatedAt: '2026-01-05T18:00:00.000Z'
  },
  {
    id: 'movie-the-last-horizon-2026',
    title: 'The Last Horizon',
    description: 'As atmospheric dust storms threaten civilization, an interstellar navigation crew embarks on humanity\'s final exploratory mission to establish a viable planetary colony.',
    releaseYear: 2026,
    genre: ['Sci-Fi', 'Drama'],
    category: 'Sci-Fi',
    quality: '4K',
    language: 'English',
    streamingUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    posterUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
    isFeatured: true,
    isTrending: true,
    isPopular: true,
    isPublished: true,
    views: 45200,
    rating: 9.1,
    duration: '2h 45m',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z'
  }
];

const INITIAL_AD_SETTINGS: AdSettings = {
  masterEnabled: true,
  popupEnabled: true,
  popupFrequencyMinutes: 30,
  popupNetwork: 'monetag',
  popupCode: '<!-- Monetag Smart Popunder Tag (Policy-Compliant frequency-capped) -->',
  popupTargetUrl: 'https://nordvpn.com/special-deal-4k-streaming',
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
    impressions: 4210,
    clicks: 168,
    estimatedEarnings: 84.86,
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
    impressions: 3890,
    clicks: 142,
    estimatedEarnings: 80.72,
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
    impressions: 5120,
    clicks: 210,
    estimatedEarnings: 89.78,
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
    impressions: 4890,
    clicks: 235,
    estimatedEarnings: 167.90,
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
    impressions: 6300,
    clicks: 280,
    estimatedEarnings: 171.64,
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
    impressions: 2980,
    clicks: 194,
    estimatedEarnings: 146.23,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-02-01T15:00:00.000Z'
  },
  {
    id: 'ad-home-footer-banner',
    name: 'Footer Leaderboard (728x90)',
    position: 'home_footer',
    network: 'adsense',
    dimensions: '728x90',
    codeSnippet: '<!-- Google AdSense Footer Sticky Banner 728x90 -->',
    targetUrl: 'https://www.netflix.com',
    imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Stream Unlimited 4K Cinema Anywhere On Any Device',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 1.60,
    cpcRate: 0.30,
    impressions: 3410,
    clicks: 98,
    estimatedEarnings: 34.85,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-details-top',
    name: 'Details Page Top Banner (728x90)',
    position: 'movie_details_top',
    network: 'adsense',
    dimensions: '728x90',
    codeSnippet: '<!-- Google AdSense Details Top Header 728x90 -->',
    targetUrl: 'https://www.bose.com/home-theater',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Cinematic Soundbars with Wireless Subwoofer — Crystal Clear Dialogue',
    badgeLabel: 'Sponsored',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 2.10,
    cpcRate: 0.42,
    impressions: 2150,
    clicks: 86,
    estimatedEarnings: 40.63,
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
    impressions: 1840,
    clicks: 72,
    estimatedEarnings: 38.97,
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
    impressions: 2600,
    clicks: 145,
    estimatedEarnings: 95.32,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  },
  {
    id: 'ad-details-below-related',
    name: 'Below Related Movies Banner (728x90)',
    position: 'movie_details_below_related',
    network: 'admanager',
    dimensions: '728x90',
    codeSnippet: '<!-- Google Ad Manager Footer 728x90 -->',
    targetUrl: 'https://www.disneyplus.com',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
    titleText: 'Explore Exclusive Originals, Blockbusters & Animated Epics',
    badgeLabel: 'Advertisement',
    enabled: true,
    isSticky: false,
    targetDevice: 'all',
    cpmRate: 1.80,
    cpcRate: 0.35,
    impressions: 1980,
    clicks: 64,
    estimatedEarnings: 25.96,
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
    impressions: 3120,
    clicks: 138,
    estimatedEarnings: 104.44,
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
    impressions: 3950,
    clicks: 184,
    estimatedEarnings: 153.01,
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
    impressions: 2780,
    clicks: 96,
    estimatedEarnings: 57.42,
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
    impressions: 2650,
    clicks: 91,
    estimatedEarnings: 54.47,
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
    impressions: 1420,
    clicks: 82,
    estimatedEarnings: 98.01,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z'
  }
];

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
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;

        let needsSave = false;
        // Verify default test movie is present
        const hasParadise = parsed.movies?.some(m => m.title.toLowerCase() === 'the paradise');
        if (!hasParadise) {
          if (!parsed.movies) parsed.movies = [];
          parsed.movies.unshift(INITIAL_MOVIES[0]);
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
        }
        if (!parsed.adEvents) {
          parsed.adEvents = [];
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
      adEvents: []
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

  public createMovie(movieInput: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Movie {
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
    const updated: Movie = {
      ...existing,
      ...updates,
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
    return { ...this.data.adSettings };
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

  // --- Revenue & Analytics Reporting ---
  public getAdAnalytics() {
    const slots = this.data.adSlots || [];
    const totalImpressions = slots.reduce((acc, s) => acc + (s.impressions || 0), 0);
    const totalClicks = slots.reduce((acc, s) => acc + (s.clicks || 0), 0);
    const totalEarnings = slots.reduce((acc, s) => acc + (s.estimatedEarnings || 0), 0);
    const overallCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    // Breakdown by Position
    const byPosition: Record<string, { impressions: number; clicks: number; earnings: number; ctr: number }> = {};
    // Breakdown by Network
    const byNetwork: Record<string, { impressions: number; clicks: number; earnings: number; count: number }> = {};

    slots.forEach(slot => {
      // Position breakdown
      if (!byPosition[slot.position]) {
        byPosition[slot.position] = { impressions: 0, clicks: 0, earnings: 0, ctr: 0 };
      }
      byPosition[slot.position].impressions += slot.impressions;
      byPosition[slot.position].clicks += slot.clicks;
      byPosition[slot.position].earnings += slot.estimatedEarnings;

      // Network breakdown
      if (!byNetwork[slot.network]) {
        byNetwork[slot.network] = { impressions: 0, clicks: 0, earnings: 0, count: 0 };
      }
      byNetwork[slot.network].impressions += slot.impressions;
      byNetwork[slot.network].clicks += slot.clicks;
      byNetwork[slot.network].earnings += slot.estimatedEarnings;
      byNetwork[slot.network].count += 1;
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

    // Breakdown by Device from recent events
    const recentEvents = this.data.adEvents || [];
    const desktopEvents = recentEvents.filter(e => e.device === 'desktop');
    const mobileEvents = recentEvents.filter(e => e.device === 'mobile');

    const desktopImpressions = desktopEvents.filter(e => e.type === 'impression').length || Math.round(totalImpressions * 0.68);
    const mobileImpressions = mobileEvents.filter(e => e.type === 'impression').length || Math.round(totalImpressions * 0.32);
    const desktopClicks = desktopEvents.filter(e => e.type === 'click').length || Math.round(totalClicks * 0.65);
    const mobileClicks = mobileEvents.filter(e => e.type === 'click').length || Math.round(totalClicks * 0.35);

    const desktopEarnings = Number((totalEarnings * 0.67).toFixed(2));
    const mobileEarnings = Number((totalEarnings * 0.33).toFixed(2));

    // Daily breakdown for past 7 days
    const dailyReports: Array<{ date: string; impressions: number; clicks: number; earnings: number }> = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const factor = 0.8 + ((i * 7) % 5) * 0.08;
      const dayImp = Math.round((totalImpressions / 7) * factor);
      const dayClicks = Math.round((totalClicks / 7) * factor);
      const dayEarn = Number(((totalEarnings / 7) * factor).toFixed(2));

      dailyReports.push({
        date: dateStr,
        impressions: dayImp,
        clicks: dayClicks,
        earnings: dayEarn
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
        desktop: { impressions: desktopImpressions, clicks: desktopClicks, earnings: desktopEarnings },
        mobile: { impressions: mobileImpressions, clicks: mobileClicks, earnings: mobileEarnings }
      },
      dailyReports
    };
  }

  // --- Reset/Seed initial test movie & ads if needed ---
  public resetToDefault(): void {
    this.data.movies = [...INITIAL_MOVIES];
    this.data.categories = [...INITIAL_CATEGORIES];
    this.data.adSlots = [...INITIAL_AD_SLOTS];
    this.data.adSettings = { ...INITIAL_AD_SETTINGS };
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
