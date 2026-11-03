/**
 * Vidsrc (vidsrc.mov) client — documented public embed API only.
 *
 * Documented endpoints (https://vidsrc.mov/):
 *   Movie:        GET /embed/movie/{id}     — IMDb (tt…) or numeric TMDB id
 *   TV episode:   GET /embed/tv/{id}/{season}/{episode}
 *   Latest feed:  GET /vapi/movie/new[/{page}]
 *   Recently added: GET /vapi/movie/add[/{page}]
 *
 * No API key is required. Credentials are not used.
 * Do not proxy or redistribute media files — only embed the authorized player.
 */

const DEFAULT_BASE_URL = 'https://vidsrc.mov';
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

export type VidsrcMediaType = 'movie' | 'tv';

export interface VidsrcFeedItem {
  id?: string | number;
  tmdb_id?: string | number;
  tmdb?: string | number;
  imdb_id?: string;
  imdb?: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
}

function getBaseUrl(): string {
  const raw = (process.env.VIDSRC_BASE_URL || DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_BASE_URL;
}

function isEnabled(): boolean {
  const flag = (process.env.VIDSRC_ENABLED || 'true').trim().toLowerCase();
  return flag !== '0' && flag !== 'false' && flag !== 'no' && flag !== 'off';
}

function normalizeImdbId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^tt\d+$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^\d+$/.test(trimmed)) return `tt${trimmed}`;
  return null;
}

function pickProviderId(imdbId?: string | null, tmdbId?: number | null): string | null {
  const imdb = normalizeImdbId(imdbId);
  if (imdb) return imdb;
  if (tmdbId && Number.isFinite(tmdbId) && tmdbId > 0) return String(Math.trunc(tmdbId));
  return null;
}

export const vidsrc = {
  isConfigured(): boolean {
    return isEnabled();
  },

  getBaseUrl,

  normalizeImdbId,
  pickProviderId,

  /** Relative playback reference stored in DB (no secrets). */
  buildEmbedPath(
    providerId: string,
    mediaType: VidsrcMediaType = 'movie',
    season?: number,
    episode?: number
  ): string {
    const id = encodeURIComponent(String(providerId).trim());
    if (mediaType === 'tv') {
      const s = Math.max(1, Number(season) || 1);
      const e = Math.max(1, Number(episode) || 1);
      return `/embed/tv/${id}/${s}/${e}`;
    }
    return `/embed/movie/${id}`;
  },

  buildEmbedUrl(
    providerId: string,
    mediaType: VidsrcMediaType = 'movie',
    season?: number,
    episode?: number
  ): string {
    return `${getBaseUrl()}${this.buildEmbedPath(providerId, mediaType, season, episode)}`;
  },

  /**
   * Soft availability + embed permission check.
   * Never treats a bare HTTP 200 as proof of a playable stream without structure checks.
   */
  async probeMovieAvailability(input: {
    tmdbId: number;
    imdbId?: string | null;
  }): Promise<{
    ok: boolean;
    providerMovieId: string | null;
    playbackReference: string | null;
    embedUrl: string | null;
    reason?: string;
    feedHit?: boolean;
    frameAllowed?: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        providerMovieId: null,
        playbackReference: null,
        embedUrl: null,
        reason: 'Vidsrc is disabled (VIDSRC_ENABLED=false)'
      };
    }

    const providerMovieId = pickProviderId(input.imdbId, input.tmdbId);
    if (!providerMovieId) {
      return {
        ok: false,
        providerMovieId: null,
        playbackReference: null,
        embedUrl: null,
        reason: 'No IMDb or TMDB id available for Vidsrc lookup'
      };
    }

    // Prefer feed confirmation when the documented catalog API is reachable
    let feedHit: boolean | undefined;
    try {
      feedHit = await this.isIdListedInFeeds(providerMovieId, input.tmdbId, input.imdbId);
    } catch {
      feedHit = undefined;
    }

    const playbackReference = this.buildEmbedPath(providerMovieId, 'movie');
    const embedUrl = this.buildEmbedUrl(providerMovieId, 'movie');

    try {
      const probe = await fetchEmbedProbe(embedUrl);
      if (!probe.ok) {
        return {
          ok: false,
          providerMovieId,
          playbackReference,
          embedUrl,
          reason: probe.reason,
          feedHit,
          frameAllowed: probe.frameAllowed
        };
      }

      if (probe.frameAllowed === false) {
        return {
          ok: false,
          providerMovieId,
          playbackReference,
          embedUrl,
          reason: 'Provider response disallows embedding (X-Frame-Options)',
          feedHit,
          frameAllowed: probe.frameAllowed
        };
      }

      // Feed miss is informative but not fatal — documented catalog may be temporarily down.
      // Exact ID (IMDb preferred, else TMDB) + valid embed shell + embedding permission = authorized.
      return {
        ok: true,
        providerMovieId,
        playbackReference,
        embedUrl,
        feedHit,
        frameAllowed: true,
        reason:
          feedHit === true
            ? 'Verified via embed probe and catalog feed'
            : feedHit === false
              ? 'Embed probe ok; id not present in current catalog feed pages'
              : 'Embed probe ok; catalog feed unreachable'
      };
    } catch (err: any) {
      return {
        ok: false,
        providerMovieId,
        playbackReference,
        embedUrl,
        reason: err?.message || 'Vidsrc probe failed',
        feedHit
      };
    }
  },

  /** Fetch documented catalog feeds (best-effort; may 404 if provider feed is down). */
  async fetchMovieFeed(
    type: 'new' | 'add' = 'new',
    page?: number
  ): Promise<{ ok: boolean; items: VidsrcFeedItem[]; reason?: string }> {
    const pageSuffix = page && page > 0 ? `/${page}` : '';
    const url = `${getBaseUrl()}/vapi/movie/${type}${pageSuffix}`;
    try {
      const body = await fetchJsonWithRetry<unknown>(url);
      const items = normalizeFeedItems(body);
      return { ok: true, items };
    } catch (err: any) {
      return { ok: false, items: [], reason: err?.message || 'Vidsrc feed request failed' };
    }
  },

  async isIdListedInFeeds(
    providerMovieId: string,
    tmdbId?: number,
    imdbId?: string | null
  ): Promise<boolean | undefined> {
    const imdb = normalizeImdbId(imdbId) || (providerMovieId.startsWith('tt') ? providerMovieId : null);
    const numeric = /^\d+$/.test(providerMovieId) ? providerMovieId : tmdbId ? String(tmdbId) : null;

    const feeds = await Promise.all([
      this.fetchMovieFeed('new'),
      this.fetchMovieFeed('add'),
      this.fetchMovieFeed('new', 1),
      this.fetchMovieFeed('add', 1)
    ]);

    const anyReachable = feeds.some(f => f.ok);
    if (!anyReachable) return undefined;

    for (const feed of feeds) {
      if (!feed.ok) continue;
      for (const item of feed.items) {
        const itemImdb = normalizeImdbId(
          (item.imdb_id || item.imdb || item.id) as string | undefined
        );
        const itemTmdb = String(item.tmdb_id ?? item.tmdb ?? item.id ?? '');
        if (imdb && itemImdb && itemImdb === imdb) return true;
        if (numeric && itemTmdb === numeric) return true;
        if (numeric && String(item.id) === numeric) return true;
      }
    }
    return false;
  }
};

async function fetchEmbedProbe(url: string): Promise<{
  ok: boolean;
  reason?: string;
  frameAllowed?: boolean;
}> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'CineStream-Vidsrc-Client/1.0'
        },
        signal: controller.signal,
        redirect: 'follow'
      });

      const xfo = String(res.headers.get('x-frame-options') || '').toLowerCase();
      const frameAllowed = !(xfo.includes('deny') || xfo === 'sameorigin');

      if (res.status === 404 || res.status === 410) {
        return { ok: false, reason: `Embed returned HTTP ${res.status}`, frameAllowed };
      }

      if (res.status === 429) {
        lastError = new Error('Vidsrc rate limit exceeded');
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        return { ok: false, reason: lastError.message, frameAllowed };
      }

      if (!res.ok) {
        return { ok: false, reason: `Embed returned HTTP ${res.status}`, frameAllowed };
      }

      const text = await res.text();
      const html = String(text || '');
      if (!html.trim()) {
        return { ok: false, reason: 'Empty embed response', frameAllowed };
      }

      // Require a real player shell — documented embeds wrap an iframe player.
      const hasIframe = /<iframe[\s>]/i.test(html);
      const looksLikePlayer =
        hasIframe ||
        /vidsrc\.sh\/embed/i.test(html) ||
        /allowfullscreen/i.test(html);

      if (!looksLikePlayer) {
        // Provider 404 HTML pages explicitly mention invalid IDs
        if (/page not found|does not exist on vidsrc/i.test(html)) {
          return { ok: false, reason: 'Vidsrc reported page not found for this id', frameAllowed };
        }
        return { ok: false, reason: 'Embed response is not a valid player shell', frameAllowed };
      }

      if (/page not found|does not exist on vidsrc/i.test(html) && !hasIframe) {
        return { ok: false, reason: 'Vidsrc reported page not found for this id', frameAllowed };
      }

      return { ok: true, frameAllowed };
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? new Error('Vidsrc request timed out') : err;
      if (attempt < MAX_RETRIES && isRetryable(lastError)) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        continue;
      }
      return { ok: false, reason: lastError?.message || 'Vidsrc request failed' };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: lastError?.message || 'Vidsrc request failed' };
}

async function fetchJsonWithRetry<T>(url: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CineStream-Vidsrc-Client/1.0'
        },
        signal: controller.signal
      });

      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }

      if (res.status === 429) {
        lastError = new Error('Vidsrc rate limit exceeded');
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        throw new Error(body?.error || `Vidsrc HTTP ${res.status}`);
      }

      if (body === null) {
        throw new Error('Vidsrc returned a non-JSON response');
      }

      return body as T;
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? new Error('Vidsrc request timed out') : err;
      if (attempt < MAX_RETRIES && isRetryable(lastError)) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('Vidsrc request failed');
}

function normalizeFeedItems(body: unknown): VidsrcFeedItem[] {
  if (Array.isArray(body)) return body as VidsrcFeedItem[];
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['result', 'results', 'data', 'movies', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as VidsrcFeedItem[];
    }
  }
  return [];
}

function isRetryable(err: Error | null): boolean {
  if (!err) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('timed out') ||
    msg.includes('rate limit') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
