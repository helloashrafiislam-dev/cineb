import { AdSettings, AdSlot } from '../types.ts';

/**
 * Card-click / play-click ad hijacking is disabled for AdSense compliance.
 * Intercepting navigation or Play actions to force sponsor tabs is deceptive
 * and creates invalid traffic risk. These helpers remain as safe no-ops.
 */

export function tryCardClickAd(
  _itemKey: string,
  _settings?: AdSettings | null,
  _slots: AdSlot[] = []
): boolean {
  return false;
}

export function openOwnerAdOnce(
  _itemKey: string,
  _settings?: AdSettings | null,
  _slots: AdSlot[] = []
): boolean {
  return false;
}

export function hasDirectStreamUrl(movie: { streamingUrl?: string | null } | null | undefined): boolean {
  return Boolean(movie?.streamingUrl && String(movie.streamingUrl).trim());
}
