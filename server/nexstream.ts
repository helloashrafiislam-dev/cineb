/**
 * NexStream (api.codespecters.com) client.
 *
 * Documented usage from provider welcome email:
 *   https://api.codespecters.com/embed/movie/{tmdbId}?apikey=...
 *
 * The official embed player resolves sources via:
 *   GET /api/movie/{tmdbId}?apikey=...
 *   GET /api/tv/{tmdbId}/{season}/{episode}?apikey=...
 *
 * Matching is TMDB-ID based. There is no documented title-search endpoint.
 */

const DEFAULT_BASE_URL = 'https://api.codespecters.com';
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

export interface NexStreamSource {
  name: string;
  url: string;
}

export interface NexStreamMovieMeta {
  title?: string;
  poster?: string;
}

export interface NexStreamMovieResponse {
  success: boolean;
  type?: 'movie' | 'tv';
  tmdbId?: string | number;
  meta?: NexStreamMovieMeta | null;
  sources?: NexStreamSource[];
  error?: string;
}

function getBaseUrl(): string {
  const raw = (process.env.NEXSTREAM_API_BASE_URL || DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_BASE_URL;
}

function getApiKey(): string {
  return (process.env.NEXSTREAM_API_KEY || '').trim();
}

export const nexstream = {
  isConfigured(): boolean {
    return Boolean(getApiKey());
  },

  getBaseUrl,

  /** Relative playback reference stored in DB (never includes the API key). */
  buildEmbedPath(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie'): string {
    return `/embed/${mediaType}/${tmdbId}`;
  },

  /** Full provider embed URL — server-only; includes API key. */
  buildEmbedUrl(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie'): string {
    const key = getApiKey();
    if (!key) {
      throw new Error('NexStream API key is not configured');
    }
    return `${getBaseUrl()}${this.buildEmbedPath(tmdbId, mediaType)}?apikey=${encodeURIComponent(key)}`;
  },

  async fetchMovieSources(tmdbId: number): Promise<NexStreamMovieResponse> {
    if (!this.isConfigured()) {
      throw new Error('NexStream is not configured. Set NEXSTREAM_API_KEY in the environment.');
    }
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      throw new Error('Invalid TMDB id for NexStream lookup');
    }

    const url = `${getBaseUrl()}/api/movie/${tmdbId}?apikey=${encodeURIComponent(getApiKey())}`;
    return fetchJsonWithRetry<NexStreamMovieResponse>(url);
  },

  /**
   * Soft availability check used by the matching engine.
   * Provider returns sources even for unknown IDs; require resolved meta.title.
   */
  async probeMovieAvailability(tmdbId: number): Promise<{
    ok: boolean;
    response: NexStreamMovieResponse | null;
    reason?: string;
  }> {
    try {
      const response = await this.fetchMovieSources(tmdbId);
      if (!response.success) {
        return { ok: false, response, reason: response.error || 'Provider returned success=false' };
      }
      const sources = Array.isArray(response.sources) ? response.sources : [];
      if (sources.length === 0) {
        return { ok: false, response, reason: 'No sources returned' };
      }
      if (!response.meta || !String(response.meta.title || '').trim()) {
        return {
          ok: false,
          response,
          reason: 'Provider did not resolve title metadata for this TMDB id'
        };
      }
      return { ok: true, response };
    } catch (err: any) {
      return {
        ok: false,
        response: null,
        reason: err?.message || 'NexStream request failed'
      };
    }
  }
};

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
          'User-Agent': 'CineStream-NexStream-Client/1.0'
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

      if (res.status === 401 || res.status === 403) {
        throw new Error(body?.error || 'Invalid NexStream API key');
      }

      if (res.status === 429) {
        lastError = new Error('NexStream rate limit exceeded');
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        throw new Error(body?.error || `NexStream HTTP ${res.status}`);
      }

      if (!body || typeof body !== 'object') {
        throw new Error('NexStream returned a non-JSON response');
      }

      return body as T;
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? new Error('NexStream request timed out') : err;
      if (attempt < MAX_RETRIES && isRetryable(lastError)) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('NexStream request failed');
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
