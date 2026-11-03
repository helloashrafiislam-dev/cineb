/**
 * Centralized Streaming Provider Manager
 *
 * Priority (exact):
 *   1. NexStream
 *   2. Vidsrc
 *
 * Workflow:
 *   TMDB Movie → NexStream → (no authorized playable match) → Vidsrc → No Player
 *
 * Results are normalized into StreamAssociation rows (one per provider per movie).
 * Manual admin selections are never overwritten without confirmation.
 */

import {
  db,
  StreamAssociation,
  StreamStatus,
  MatchConfidence,
  StreamingProviderKey,
  PROVIDER_PRIORITY,
  normalizeProviderKey,
  providerDisplayName
} from './db.ts';
import { nexstream } from './nexstream.ts';
import { vidsrc } from './vidsrc.ts';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE_RETRY_MS = 6 * 60 * 60 * 1000; // retry unavailable sooner
const SYNC_BATCH_DELAY_MS = 350;

export interface MatchCandidateInput {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  releaseYear?: number;
  originalLanguage?: string;
  imdbId?: string;
  alternativeTitles?: string[];
  mediaType?: 'movie' | 'tv';
  movieId?: string;
}

export interface NormalizedProviderResult {
  provider_name: StreamingProviderKey;
  provider_movie_id: string;
  playback_type: StreamAssociation['playbackType'];
  playback_url_or_reference: string;
  availability_status: StreamStatus;
  last_checked_at: string;
  match_confidence: MatchConfidence;
  matched_title?: string;
  last_error?: string;
}

export interface ProviderMatchResult {
  association: StreamAssociation;
  created: boolean;
  skipped: boolean;
  reason?: string;
}

export interface ResolvePlaybackResult {
  active: StreamAssociation | null;
  providers: StreamAssociation[];
  selectedProvider: StreamingProviderKey | null;
  reason?: string;
}

function normalizeTitle(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titlesCompatible(
  providerTitle: string,
  input: MatchCandidateInput
): { ok: boolean; confidence: MatchConfidence; reason?: string } {
  const provider = normalizeTitle(providerTitle);
  if (!provider) {
    return { ok: false, confidence: 'none', reason: 'Empty provider title' };
  }

  const candidates: Array<{ value: string; confidence: MatchConfidence }> = [
    { value: normalizeTitle(input.title), confidence: 'exact_localized_title_year' as MatchConfidence },
    {
      value: normalizeTitle(input.originalTitle || ''),
      confidence: 'exact_original_title_year' as MatchConfidence
    },
    ...(input.alternativeTitles || []).map(
      (t): { value: string; confidence: MatchConfidence } => ({
        value: normalizeTitle(t),
        confidence: 'alternative_title_year'
      })
    )
  ].filter(c => c.value);

  for (const c of candidates) {
    if (c.value === provider) {
      return { ok: true, confidence: 'exact_tmdb_id' };
    }
  }

  for (const c of candidates) {
    if (c.value && (provider.includes(c.value) || c.value.includes(provider))) {
      const longer = Math.max(provider.length, c.value.length);
      const shorter = Math.min(provider.length, c.value.length);
      if (shorter / longer >= 0.85) {
        return { ok: true, confidence: 'normalized_title_year' };
      }
    }
  }

  return {
    ok: false,
    confidence: 'uncertain',
    reason: `Provider title "${providerTitle}" does not match TMDB titles`
  };
}

function isFresh(assoc: StreamAssociation, force: boolean): boolean {
  if (force) return false;
  if (!assoc.lastCheckedAt) return false;
  const age = Date.now() - new Date(assoc.lastCheckedAt).getTime();
  if (!Number.isFinite(age) || age < 0) return false;
  if (assoc.streamStatus === 'unavailable' || assoc.streamStatus === 'failed') {
    return age < UNAVAILABLE_RETRY_MS;
  }
  return age < CACHE_TTL_MS;
}

function isPlayable(assoc?: StreamAssociation | null): boolean {
  if (!assoc || assoc.streamStatus !== 'available' || assoc.disabled) return false;
  if (db.isTmdbDisputed(assoc.tmdbId)) return false;
  const key = normalizeProviderKey(assoc.providerName);
  // Commercial embedding only when admin has marked the provider Verified (with evidence)
  if (!db.isProviderPlaybackAllowed(key)) return false;
  return true;
}

function toNormalized(assoc: StreamAssociation): NormalizedProviderResult {
  return {
    provider_name: normalizeProviderKey(assoc.providerName),
    provider_movie_id: assoc.providerMovieId || assoc.nexstreamProviderId || String(assoc.tmdbId),
    playback_type: assoc.playbackType,
    playback_url_or_reference: assoc.playbackReference,
    availability_status: assoc.availabilityStatus || assoc.streamStatus,
    last_checked_at: assoc.lastCheckedAt || assoc.updatedAt,
    match_confidence: assoc.matchConfidence,
    matched_title: assoc.matchedTitle,
    last_error: assoc.lastError
  };
}

/** Match / probe NexStream for a TMDB movie (exact TMDB id). */
export async function matchNexStream(
  input: MatchCandidateInput,
  options: { force?: boolean; allowOverwriteManual?: boolean } = {}
): Promise<ProviderMatchResult> {
  const force = Boolean(options.force);
  const existing = db.getStreamAssociation(input.tmdbId, 'nexstream');

  if (existing?.manualOverride && !options.allowOverwriteManual) {
    return {
      association: existing,
      created: false,
      skipped: true,
      reason: 'Manual override preserved — confirmation required to overwrite'
    };
  }

  if (existing?.streamStatus === 'disabled' && !force) {
    return {
      association: existing,
      created: false,
      skipped: true,
      reason: 'NexStream disabled by admin for this movie'
    };
  }

  if (existing && isFresh(existing, force) && existing.streamStatus !== 'failed') {
    return {
      association: existing,
      created: false,
      skipped: true,
      reason: 'Using cached NexStream match result'
    };
  }

  const now = new Date().toISOString();

  if (!nexstream.isConfigured()) {
    const unavailable = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'nexstream',
      providerMovieId: String(input.tmdbId),
      nexstreamProviderId: String(input.tmdbId),
      matchedTitle: input.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference: nexstream.buildEmbedPath(input.tmdbId, 'movie'),
      playbackType: 'embed',
      streamStatus: 'unavailable',
      matchConfidence: 'none',
      matchSource: existing?.matchSource || 'automatic',
      manualOverride: existing?.manualOverride || false,
      lastError: 'NexStream API key not configured',
      mediaType: 'movie'
    });
    return {
      association: unavailable,
      created: !existing,
      skipped: false,
      reason: 'NexStream not configured'
    };
  }

  const probe = await nexstream.probeMovieAvailability(input.tmdbId);

  if (!probe.ok || !probe.response?.meta?.title) {
    const status: StreamStatus =
      probe.reason?.toLowerCase().includes('api key') ||
      probe.reason?.toLowerCase().includes('failed') ||
      probe.reason?.toLowerCase().includes('timed out')
        ? 'failed'
        : 'unavailable';

    const assoc = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'nexstream',
      providerMovieId: String(input.tmdbId),
      nexstreamProviderId: String(input.tmdbId),
      matchedTitle: input.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference: nexstream.buildEmbedPath(input.tmdbId, 'movie'),
      playbackType: 'embed',
      streamStatus: status,
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastCheckedAt: now,
      lastSyncedAt: now,
      lastError: probe.reason || 'No verified NexStream match',
      providerMeta: probe.response?.meta || null,
      mediaType: 'movie'
    });

    return {
      association: assoc,
      created: !existing,
      skipped: false,
      reason: probe.reason || 'No verified match'
    };
  }

  const titleCheck = titlesCompatible(probe.response.meta.title, input);
  if (!titleCheck.ok) {
    const assoc = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'nexstream',
      providerMovieId: String(input.tmdbId),
      nexstreamProviderId: String(input.tmdbId),
      matchedTitle: probe.response.meta.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference: nexstream.buildEmbedPath(input.tmdbId, 'movie'),
      playbackType: 'embed',
      streamStatus: 'uncertain',
      matchConfidence: 'uncertain',
      matchSource: 'automatic',
      manualOverride: false,
      lastCheckedAt: now,
      lastSyncedAt: now,
      lastError: titleCheck.reason,
      providerMeta: probe.response.meta,
      mediaType: 'movie'
    });

    return {
      association: assoc,
      created: !existing,
      skipped: false,
      reason: titleCheck.reason
    };
  }

  const assoc = db.upsertStreamAssociation({
    tmdbId: input.tmdbId,
    movieId: input.movieId,
    imdbId: input.imdbId,
    providerName: 'nexstream',
    providerMovieId: String(probe.response.tmdbId || input.tmdbId),
    nexstreamProviderId: String(probe.response.tmdbId || input.tmdbId),
    matchedTitle: probe.response.meta.title,
    matchedReleaseYear: input.releaseYear,
    playbackReference: nexstream.buildEmbedPath(input.tmdbId, 'movie'),
    playbackType: 'embed',
    streamStatus: 'available',
    matchConfidence: 'exact_tmdb_id',
    matchSource: 'automatic',
    manualOverride: false,
    lastCheckedAt: now,
    lastSyncedAt: now,
    lastError: undefined,
    providerMeta: probe.response.meta,
    mediaType: 'movie'
  });

  return {
    association: assoc,
    created: !existing,
    skipped: false,
    reason: 'Verified exact TMDB ID match on NexStream'
  };
}

/** Match / probe Vidsrc for a TMDB movie (IMDb preferred, else TMDB id). */
export async function matchVidsrc(
  input: MatchCandidateInput,
  options: { force?: boolean; allowOverwriteManual?: boolean } = {}
): Promise<ProviderMatchResult> {
  const force = Boolean(options.force);
  const existing = db.getStreamAssociation(input.tmdbId, 'vidsrc');

  if (existing?.manualOverride && !options.allowOverwriteManual) {
    return {
      association: existing,
      created: false,
      skipped: true,
      reason: 'Manual override preserved — confirmation required to overwrite'
    };
  }

  if (existing?.streamStatus === 'disabled' && !force) {
    return {
      association: existing,
      created: false,
      skipped: true,
      reason: 'Vidsrc disabled by admin for this movie'
    };
  }

  if (existing && isFresh(existing, force) && existing.streamStatus !== 'failed') {
    return {
      association: existing,
      created: false,
      skipped: true,
      reason: 'Using cached Vidsrc match result'
    };
  }

  const now = new Date().toISOString();

  if (!vidsrc.isConfigured()) {
    const unavailable = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'vidsrc',
      providerMovieId: vidsrc.pickProviderId(input.imdbId, input.tmdbId) || String(input.tmdbId),
      matchedTitle: input.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference: vidsrc.buildEmbedPath(
        vidsrc.pickProviderId(input.imdbId, input.tmdbId) || String(input.tmdbId),
        'movie'
      ),
      playbackType: 'embed',
      streamStatus: 'unavailable',
      matchConfidence: 'none',
      matchSource: existing?.matchSource || 'automatic',
      manualOverride: existing?.manualOverride || false,
      lastError: 'Vidsrc is disabled',
      mediaType: 'movie'
    });
    return {
      association: unavailable,
      created: !existing,
      skipped: false,
      reason: 'Vidsrc disabled'
    };
  }

  const probe = await vidsrc.probeMovieAvailability({
    tmdbId: input.tmdbId,
    imdbId: input.imdbId
  });

  if (!probe.ok || !probe.providerMovieId || !probe.playbackReference) {
    const status: StreamStatus =
      probe.reason?.toLowerCase().includes('timed out') ||
      probe.reason?.toLowerCase().includes('failed') ||
      probe.reason?.toLowerCase().includes('rate limit')
        ? 'failed'
        : 'unavailable';

    const assoc = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'vidsrc',
      providerMovieId: probe.providerMovieId || String(input.tmdbId),
      matchedTitle: input.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference:
        probe.playbackReference ||
        vidsrc.buildEmbedPath(String(input.tmdbId), 'movie'),
      playbackType: 'embed',
      streamStatus: status,
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastCheckedAt: now,
      lastSyncedAt: now,
      lastError: probe.reason || 'No verified Vidsrc embed',
      mediaType: 'movie'
    });

    return {
      association: assoc,
      created: !existing,
      skipped: false,
      reason: probe.reason || 'No verified Vidsrc embed'
    };
  }

  const confidence: MatchConfidence = vidsrc.normalizeImdbId(input.imdbId)
    ? 'exact_imdb_id'
    : 'exact_tmdb_id';

  const assoc = db.upsertStreamAssociation({
    tmdbId: input.tmdbId,
    movieId: input.movieId,
    imdbId: input.imdbId,
    providerName: 'vidsrc',
    providerMovieId: probe.providerMovieId,
    matchedTitle: input.title,
    matchedReleaseYear: input.releaseYear,
    playbackReference: probe.playbackReference,
    playbackType: 'embed',
    streamStatus: 'available',
    matchConfidence: confidence,
    matchSource: 'automatic',
    manualOverride: false,
    lastCheckedAt: now,
    lastSyncedAt: now,
    lastError: undefined,
    providerMeta: { title: input.title },
    mediaType: 'movie'
  });

  return {
    association: assoc,
    created: !existing,
    skipped: false,
    reason: probe.reason || 'Verified Vidsrc embed by exact ID'
  };
}

/**
 * Full provider waterfall for one movie.
 * Always keeps separate provider records. Active selection prefers NexStream.
 */
export async function resolveProvidersForMovie(
  input: MatchCandidateInput,
  options: { force?: boolean; allowOverwriteManual?: boolean } = {}
): Promise<ResolvePlaybackResult> {
  const providers: StreamAssociation[] = [];

  // 1. NexStream first
  let nexResult: ProviderMatchResult | null = null;
  try {
    nexResult = await matchNexStream(input, options);
    providers.push(nexResult.association);
  } catch (err: any) {
    const failed = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'nexstream',
      providerMovieId: String(input.tmdbId),
      nexstreamProviderId: String(input.tmdbId),
      matchedTitle: input.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference: nexstream.buildEmbedPath(input.tmdbId, 'movie'),
      playbackType: 'embed',
      streamStatus: 'failed',
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastCheckedAt: new Date().toISOString(),
      lastError: err?.message || 'NexStream error',
      mediaType: 'movie'
    });
    providers.push(failed);
  }

  // 2. Vidsrc (always maintain a separate provider record; cache-aware via matchVidsrc)
  // Playback selection still prefers NexStream when both are available.
  try {
    const vidsrcResult = await matchVidsrc(input, options);
    providers.push(vidsrcResult.association);
  } catch (err: any) {
    const failed = db.upsertStreamAssociation({
      tmdbId: input.tmdbId,
      movieId: input.movieId,
      imdbId: input.imdbId,
      providerName: 'vidsrc',
      providerMovieId: vidsrc.pickProviderId(input.imdbId, input.tmdbId) || String(input.tmdbId),
      matchedTitle: input.title,
      matchedReleaseYear: input.releaseYear,
      playbackReference: vidsrc.buildEmbedPath(
        vidsrc.pickProviderId(input.imdbId, input.tmdbId) || String(input.tmdbId),
        'movie'
      ),
      playbackType: 'embed',
      streamStatus: 'failed',
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastCheckedAt: new Date().toISOString(),
      lastError: err?.message || 'Vidsrc error',
      mediaType: 'movie'
    });
    providers.push(failed);
  }

  const all = db.getStreamAssociationsByTmdbId(input.tmdbId);
  const active = db.getStreamAssociationByTmdbId(input.tmdbId) || null;
  const selectedProvider = active && isPlayable(active)
    ? normalizeProviderKey(active.providerName)
    : null;

  return {
    active: selectedProvider ? active : null,
    providers: all.length ? all : providers,
    selectedProvider,
    reason: selectedProvider
      ? `Using ${providerDisplayName(selectedProvider)}`
      : 'No authorized playable source from NexStream or Vidsrc'
  };
}

/** Cache-first: return active association immediately; refresh in background when stale. */
export function ensureProvidersCached(
  input: MatchCandidateInput,
  options: { force?: boolean } = {}
): StreamAssociation | null {
  const existingList = db.getStreamAssociationsByTmdbId(input.tmdbId);
  const active = db.getStreamAssociationByTmdbId(input.tmdbId) || null;

  const needsRefresh =
    Boolean(options.force) ||
    existingList.length === 0 ||
    existingList.some(a => !isFresh(a, false)) ||
    !isPlayable(active);

  if (needsRefresh) {
    void resolveProvidersForMovie(input, { force: options.force }).catch(err => {
      console.warn('[providers] background match failed:', err?.message || err);
    });
  }

  return isPlayable(active) ? active : active;
}

export async function syncProviderAssociations(
  candidates: MatchCandidateInput[],
  options: {
    force?: boolean;
    onlyUnavailable?: boolean;
    limit?: number;
  } = {}
): Promise<{
  processed: number;
  available: number;
  unavailable: number;
  uncertain: number;
  failed: number;
  skipped: number;
  nexstreamMatched: number;
  vidsrcMatched: number;
  bothProviders: number;
  results: ResolvePlaybackResult[];
}> {
  const limit = options.limit && options.limit > 0 ? options.limit : candidates.length;
  const slice = candidates.slice(0, limit);
  const results: ResolvePlaybackResult[] = [];
  let available = 0;
  let unavailable = 0;
  let uncertain = 0;
  let failed = 0;
  let skipped = 0;
  let nexstreamMatched = 0;
  let vidsrcMatched = 0;
  let bothProviders = 0;

  for (let i = 0; i < slice.length; i++) {
    const candidate = slice[i];
    const existingActive = db.getStreamAssociationByTmdbId(candidate.tmdbId);

    if (options.onlyUnavailable) {
      if (existingActive && isPlayable(existingActive) && !options.force) {
        skipped += 1;
        results.push({
          active: existingActive,
          providers: db.getStreamAssociationsByTmdbId(candidate.tmdbId),
          selectedProvider: normalizeProviderKey(existingActive.providerName),
          reason: 'Already available'
        });
        continue;
      }
    }

    try {
      const result = await resolveProvidersForMovie(candidate, { force: options.force });
      results.push(result);

      const nx = result.providers.find(
        p => normalizeProviderKey(p.providerName) === 'nexstream' && isPlayable(p)
      );
      const vs = result.providers.find(
        p => normalizeProviderKey(p.providerName) === 'vidsrc' && isPlayable(p)
      );
      if (nx) nexstreamMatched += 1;
      if (vs) vidsrcMatched += 1;
      if (nx && vs) bothProviders += 1;

      if (result.selectedProvider) available += 1;
      else if (result.providers.some(p => p.streamStatus === 'uncertain')) uncertain += 1;
      else if (result.providers.some(p => p.streamStatus === 'failed')) failed += 1;
      else unavailable += 1;
    } catch (err: any) {
      failed += 1;
      results.push({
        active: null,
        providers: db.getStreamAssociationsByTmdbId(candidate.tmdbId),
        selectedProvider: null,
        reason: err?.message || 'Sync error'
      });
    }

    if (i < slice.length - 1) {
      await new Promise(resolve => setTimeout(resolve, SYNC_BATCH_DELAY_MS));
    }
  }

  db.setStreamingSyncMeta({
    lastSyncAt: new Date().toISOString(),
    lastSyncSummary: {
      processed: results.length,
      available,
      unavailable,
      uncertain,
      failed,
      skipped,
      nexstreamMatched,
      vidsrcMatched,
      bothProviders
    }
  });

  return {
    processed: results.length,
    available,
    unavailable,
    uncertain,
    failed,
    skipped,
    nexstreamMatched,
    vidsrcMatched,
    bothProviders,
    results
  };
}

export function playerPathForAssociation(assoc: StreamAssociation | null | undefined): string | null {
  if (!assoc || !isPlayable(assoc)) return null;
  const key = normalizeProviderKey(assoc.providerName);
  if (key === 'vidsrc') return `/api/vidsrc/player/${assoc.tmdbId}`;
  return `/api/nexstream/player/${assoc.tmdbId}`;
}

export function publicStreamPayload(assoc: StreamAssociation | null | undefined) {
  const tmdbId = assoc?.tmdbId;
  const all = tmdbId ? db.getStreamAssociationsByTmdbId(tmdbId) : [];
  // Always re-resolve active from DB so Vidsrc fallback wins when NexStream isn't playable
  const preferred = tmdbId ? db.getStreamAssociationByTmdbId(tmdbId) || null : null;
  const disputed = tmdbId ? db.isTmdbDisputed(tmdbId) : false;
  const active = !disputed && isPlayable(preferred) ? preferred : null;
  const key = active ? normalizeProviderKey(active.providerName) : null;
  const compliance = db.getComplianceSettings();
  const providerRecords = db.getContentProviders();

  let complianceBlockReason: string | null = null;
  if (disputed) {
    complianceBlockReason =
      'Playback is disabled while a copyright complaint for this title is under review.';
  } else if (preferred && preferred.streamStatus === 'available' && !preferred.disabled) {
    const prefKey = normalizeProviderKey(preferred.providerName);
    if (!db.isProviderPlaybackAllowed(prefKey)) {
      const rec = providerRecords.find(p => p.providerKey === prefKey);
      complianceBlockReason =
        rec?.authorizationStatus === 'disabled'
          ? `${providerDisplayName(prefKey)} is disabled in Content Compliance.`
          : `${providerDisplayName(prefKey)} is not marked Verified for commercial embedding. A public embed URL is not a license.`;
    }
  }

  return {
    hasStream: Boolean(active),
    hasNexStream: Boolean(
      active && normalizeProviderKey(active.providerName) === 'nexstream'
    ),
    streamStatus: disputed
      ? ('disabled' as StreamStatus)
      : ((active?.streamStatus || preferred?.streamStatus || assoc?.streamStatus || 'unavailable') as StreamStatus),
    playerPath: playerPathForAssociation(active),
    matchedTitle: active?.matchedTitle || preferred?.matchedTitle || assoc?.matchedTitle || null,
    matchConfidence: (active?.matchConfidence || preferred?.matchConfidence || assoc?.matchConfidence || 'none') as MatchConfidence,
    lastCheckedAt: active?.lastCheckedAt || preferred?.lastCheckedAt || assoc?.lastCheckedAt,
    providerName: active ? providerDisplayName(active.providerName) : null,
    providerKey: key,
    complianceBlockReason,
    requireVerifiedProviders: compliance.requireVerifiedProvidersForPlayback,
    providers: all.map(p => {
      const pKey = normalizeProviderKey(p.providerName);
      const auth = db.getContentProvider(pKey)?.authorizationStatus || 'unverified';
      const playable = !disputed && isPlayable(p);
      return {
        providerName: providerDisplayName(p.providerName),
        providerKey: pKey,
        streamStatus: p.streamStatus,
        availabilityStatus: p.availabilityStatus || p.streamStatus,
        matchConfidence: p.matchConfidence,
        disabled: Boolean(p.disabled) || disputed || auth === 'disabled',
        authorizationStatus: auth,
        selectedByAdmin: Boolean(p.selectedByAdmin),
        lastCheckedAt: p.lastCheckedAt,
        lastError: p.lastError,
        playerPath: playerPathForAssociation(playable ? p : null),
        normalized: toNormalized(p)
      };
    })
  };
}

export function publicStreamPayloadForTmdb(tmdbId: number) {
  const preferred = db.getStreamAssociationByTmdbId(tmdbId) || null;
  return publicStreamPayload(preferred);
}

/** Provider manager singleton-style API */
export const providerManager = {
  priority: PROVIDER_PRIORITY,
  resolve: resolveProvidersForMovie,
  ensureCached: ensureProvidersCached,
  sync: syncProviderAssociations,
  matchNexStream,
  matchVidsrc,
  publicPayload: publicStreamPayloadForTmdb,
  playerPathForAssociation,
  isPlayable
};
