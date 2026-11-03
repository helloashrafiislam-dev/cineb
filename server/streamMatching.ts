/**
 * Backward-compatible exports for the multi-provider manager.
 * Prefer importing from ./providerManager.ts for new code.
 */

export type { MatchCandidateInput, ProviderMatchResult as MatchResult } from './providerManager.ts';

export {
  matchNexStream as matchTmdbMovieToNexStream,
  ensureProvidersCached as ensureStreamAssociationCached,
  syncProviderAssociations as syncStreamAssociations,
  resolveProvidersForMovie,
  publicStreamPayload,
  publicStreamPayloadForTmdb,
  providerManager
} from './providerManager.ts';
