import { AdSettings, AdSlot } from '../types.ts';
import { api } from '../services/api.ts';

const CLEARED_KEY = 'cinestream_card_ad_cleared';

type ClearedMap = Record<string, boolean>;

function readCleared(): ClearedMap {
  try {
    return JSON.parse(sessionStorage.getItem(CLEARED_KEY) || '{}') as ClearedMap;
  } catch {
    return {};
  }
}

function markCleared(itemKey: string) {
  const map = readCleared();
  map[itemKey] = true;
  sessionStorage.setItem(CLEARED_KEY, JSON.stringify(map));
}

function resolveOwnerAdTarget(
  settings: AdSettings | null | undefined,
  slots: AdSlot[] = []
): { targetUrl: string; slot?: AdSlot } | null {
  if (!settings?.masterEnabled) return null;

  const slot = slots.find(s => s.position === 'popup_under' && s.enabled);
  const targetUrl =
    (slot?.targetUrl && slot.targetUrl.trim()) ||
    (settings.popupTargetUrl && settings.popupTargetUrl.trim()) ||
    '';

  if (!targetUrl) return null;
  return { targetUrl, slot };
}

/**
 * Sometimes the first card click opens a sponsor tab instead of details.
 * After that (or when chance misses), the next click navigates to details.
 * Skipped for titles that use an owner direct-stream link (those use openOwnerAdOnce on Play).
 */
export function tryCardClickAd(
  itemKey: string,
  settings: AdSettings | null | undefined,
  slots: AdSlot[] = []
): boolean {
  // Default ON when setting is missing (older DBs before backfill)
  if (!settings?.masterEnabled || settings.cardClickAdEnabled === false) {
    return false;
  }

  const cleared = readCleared();
  if (cleared[itemKey]) {
    return false;
  }

  const chance = Math.min(100, Math.max(0, settings.cardClickAdChancePercent ?? 40));
  if (Math.random() * 100 > chance) {
    return false;
  }

  const resolved = resolveOwnerAdTarget(settings, slots);
  if (!resolved) return false;

  markCleared(itemKey);

  const device = window.innerWidth < 768 ? 'mobile' : 'desktop';
  if (resolved.slot?.id) {
    api.recordAdClick(resolved.slot.id, device).catch(() => undefined);
  }

  window.open(resolved.targetUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Direct-link movies: on Play, open the owner's ad landing page in a new tab once
 * (per movie / session), then continue to the direct stream player.
 */
export function openOwnerAdOnce(
  itemKey: string,
  settings: AdSettings | null | undefined,
  slots: AdSlot[] = []
): boolean {
  if (!settings?.masterEnabled) return false;

  const cleared = readCleared();
  if (cleared[itemKey]) return false;

  const resolved = resolveOwnerAdTarget(settings, slots);
  if (!resolved) return false;

  markCleared(itemKey);

  const device = window.innerWidth < 768 ? 'mobile' : 'desktop';
  if (resolved.slot?.id) {
    api.recordAdClick(resolved.slot.id, device).catch(() => undefined);
  }

  window.open(resolved.targetUrl, '_blank', 'noopener,noreferrer');
  return true;
}

export function hasDirectStreamUrl(movie: { streamingUrl?: string | null } | null | undefined): boolean {
  return Boolean(movie?.streamingUrl && String(movie.streamingUrl).trim());
}
