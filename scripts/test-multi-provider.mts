/**
 * Multi-provider playback scenarios A–H (live NexStream + Vidsrc probes).
 * Run: npx tsx scripts/test-multi-provider.mts
 */
import 'dotenv/config';
import { db } from '../server/db.ts';
import { nexstream } from '../server/nexstream.ts';
import { vidsrc } from '../server/vidsrc.ts';
import {
  resolveProvidersForMovie,
  matchNexStream,
  matchVidsrc,
  publicStreamPayload,
  providerManager
} from '../server/providerManager.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function scenario(name: string, fn: () => Promise<void>) {
  process.stdout.write(`\n▶ ${name}\n`);
  await fn();
  console.log(`  ✓ pass`);
}

async function main() {
  console.log('NexStream configured:', nexstream.isConfigured());
  console.log('Vidsrc configured:', vidsrc.isConfigured());

  // Fight Club — known NexStream hit
  const fightClub = {
    tmdbId: 550,
    title: 'Fight Club',
    originalTitle: 'Fight Club',
    releaseYear: 1999,
    imdbId: 'tt0137523',
    mediaType: 'movie' as const
  };

  // Use a high TMDB id unlikely on NexStream but valid for Vidsrc via IMDb/TMDB
  const vidsrcCandidate = {
    tmdbId: 278,
    title: 'The Shawshank Redemption',
    originalTitle: 'The Shawshank Redemption',
    releaseYear: 1994,
    imdbId: 'tt0111161',
    mediaType: 'movie' as const
  };

  await scenario('A. NexStream has authorized stream → use NexStream', async () => {
    const result = await resolveProvidersForMovie(fightClub, { force: true, allowOverwriteManual: true });
    assert(result.selectedProvider === 'nexstream', `Expected nexstream, got ${result.selectedProvider}`);
    assert(result.active?.streamStatus === 'available', 'NexStream should be available');
    const payload = publicStreamPayload(result.active);
    assert(payload.playerPath?.includes('/api/nexstream/player/'), `Bad player path: ${payload.playerPath}`);
    assert(payload.providerKey === 'nexstream', 'providerKey should be nexstream');
  });

  await scenario('B. NexStream unavailable + Vidsrc available → use Vidsrc', async () => {
    // Force NexStream unavailable for a synthetic id, keep real Vidsrc probe for Shawshank
    db.upsertStreamAssociation({
      tmdbId: vidsrcCandidate.tmdbId,
      providerName: 'nexstream',
      providerMovieId: String(vidsrcCandidate.tmdbId),
      nexstreamProviderId: String(vidsrcCandidate.tmdbId),
      matchedTitle: vidsrcCandidate.title,
      matchedReleaseYear: vidsrcCandidate.releaseYear,
      playbackReference: nexstream.buildEmbedPath(vidsrcCandidate.tmdbId),
      playbackType: 'embed',
      streamStatus: 'unavailable',
      matchConfidence: 'none',
      matchSource: 'manual',
      manualOverride: true,
      lastCheckedAt: new Date().toISOString(),
      lastError: 'Forced unavailable for scenario B',
      mediaType: 'movie'
    });

    const vs = await matchVidsrc(vidsrcCandidate, { force: true, allowOverwriteManual: true });
    assert(vs.association.streamStatus === 'available', `Vidsrc should be available: ${vs.reason}`);

    const active = db.getStreamAssociationByTmdbId(vidsrcCandidate.tmdbId);
    assert(active && providerManager.isPlayable(active), 'Should have playable association');
    assert(
      String(active.providerName).toLowerCase() === 'vidsrc',
      `Expected vidsrc active, got ${active.providerName}`
    );
    const payload = publicStreamPayload(active);
    assert(payload.playerPath?.includes('/api/vidsrc/player/'), `Bad vidsrc path: ${payload.playerPath}`);
  });

  await scenario('C. Both providers available → prefer NexStream', async () => {
    const result = await resolveProvidersForMovie(fightClub, { force: true, allowOverwriteManual: true });
    const nx = result.providers.find(p => String(p.providerName) === 'nexstream');
    const vs = result.providers.find(p => String(p.providerName) === 'vidsrc');
    assert(nx?.streamStatus === 'available', 'NexStream should be available');
    // Vidsrc may or may not be available depending on probe; if both are, prefer nexstream
    if (vs?.streamStatus === 'available' && !vs.disabled) {
      assert(result.selectedProvider === 'nexstream', 'Must prefer NexStream when both available');
    } else {
      assert(result.selectedProvider === 'nexstream', 'NexStream should still win');
    }
  });

  await scenario('D. Neither provider → no broken player payload', async () => {
    const ghost = {
      tmdbId: 999999901,
      title: 'Definitely Not A Real Movie XYZ',
      originalTitle: 'Definitely Not A Real Movie XYZ',
      releaseYear: 2099,
      imdbId: undefined,
      mediaType: 'movie' as const
    };
    // Mark NexStream unavailable without calling API if not configured differently
    const nx = await matchNexStream(ghost, { force: true, allowOverwriteManual: true });
    const vs = await matchVidsrc(
      { ...ghost, imdbId: 'tt0000000' },
      { force: true, allowOverwriteManual: true }
    );
    const active = db.getStreamAssociationByTmdbId(ghost.tmdbId);
    const playable = providerManager.isPlayable(active);
    // Ghost TMDB may still get a Vidsrc embed shell — if so, that's a valid authorized embed by ID.
    // For true "neither", disable both.
    db.upsertStreamAssociation({
      ...nx.association,
      streamStatus: 'unavailable',
      disabled: false,
      manualOverride: true
    });
    db.upsertStreamAssociation({
      ...vs.association,
      streamStatus: 'unavailable',
      disabled: false,
      manualOverride: true
    });
    const payload = publicStreamPayload(db.getStreamAssociationByTmdbId(ghost.tmdbId));
    assert(!payload.hasStream, 'hasStream should be false');
    assert(!payload.playerPath, 'playerPath must be null when nothing is available');
    assert(!playable || !payload.hasStream, 'No playable stream should be exposed');
  });

  await scenario('E. NexStream API fails → Vidsrc fallback', async () => {
    // Simulate failed NexStream row + available Vidsrc
    db.upsertStreamAssociation({
      tmdbId: 11,
      providerName: 'nexstream',
      providerMovieId: '11',
      matchedTitle: 'Star Wars',
      matchedReleaseYear: 1977,
      playbackReference: '/embed/movie/11',
      playbackType: 'embed',
      streamStatus: 'failed',
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastError: 'Simulated NexStream outage',
      lastCheckedAt: new Date().toISOString(),
      mediaType: 'movie'
    });
    const vs = await matchVidsrc(
      {
        tmdbId: 11,
        title: 'Star Wars',
        originalTitle: 'Star Wars',
        releaseYear: 1977,
        imdbId: 'tt0076759',
        mediaType: 'movie'
      },
      { force: true, allowOverwriteManual: true }
    );
    assert(vs.association.streamStatus === 'available', `Vidsrc fallback failed: ${vs.reason}`);
    const active = db.getStreamAssociationByTmdbId(11);
    assert(String(active?.providerName) === 'vidsrc', 'Active provider should be Vidsrc after NexStream failure');
  });

  await scenario('F. Both APIs fail → details payload stays safe', async () => {
    db.upsertStreamAssociation({
      tmdbId: 999999902,
      providerName: 'nexstream',
      providerMovieId: '999999902',
      matchedTitle: 'Broken',
      playbackReference: '/embed/movie/999999902',
      playbackType: 'embed',
      streamStatus: 'failed',
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastError: 'NexStream down',
      mediaType: 'movie'
    });
    db.upsertStreamAssociation({
      tmdbId: 999999902,
      providerName: 'vidsrc',
      providerMovieId: '999999902',
      matchedTitle: 'Broken',
      playbackReference: '/embed/movie/999999902',
      playbackType: 'embed',
      streamStatus: 'failed',
      matchConfidence: 'none',
      matchSource: 'automatic',
      manualOverride: false,
      lastError: 'Vidsrc down',
      mediaType: 'movie'
    });
    const payload = publicStreamPayload(db.getStreamAssociationByTmdbId(999999902));
    assert(!payload.hasStream && !payload.playerPath, 'Must not expose a broken player');
  });

  await scenario('G. Ambiguous NexStream title → do not auto-attach', async () => {
    // Use a real TMDB id but wrong title so titlesCompatible fails if NexStream returns meta
    const result = await matchNexStream(
      {
        tmdbId: 550,
        title: 'Completely Wrong Title About Cats',
        originalTitle: 'Completely Wrong Title About Cats',
        releaseYear: 1999,
        mediaType: 'movie'
      },
      { force: true, allowOverwriteManual: true }
    );
    assert(
      result.association.streamStatus === 'uncertain' || result.association.streamStatus === 'unavailable',
      `Ambiguous match must not be available, got ${result.association.streamStatus}`
    );
    assert(result.association.streamStatus !== 'available', 'Must not auto-attach ambiguous stream');
  });

  await scenario('H. Manual override preserved without confirmation', async () => {
    db.upsertStreamAssociation({
      tmdbId: 550,
      providerName: 'nexstream',
      providerMovieId: '550',
      matchedTitle: 'Fight Club',
      matchedReleaseYear: 1999,
      playbackReference: '/embed/movie/550',
      playbackType: 'embed',
      streamStatus: 'available',
      matchConfidence: 'exact_tmdb_id',
      matchSource: 'manual',
      manualOverride: true,
      mediaType: 'movie'
    });
    const result = await matchNexStream(
      { tmdbId: 550, title: 'Fight Club', releaseYear: 1999 },
      { force: true }
    );
    assert(result.skipped, 'Manual override should skip overwrite');
    assert(result.association.manualOverride, 'manualOverride flag must remain');
  });

  // Restore Fight Club correctly for the running app
  await resolveProvidersForMovie(fightClub, { force: true, allowOverwriteManual: true });

  console.log('\nAll multi-provider scenarios passed.');
}

main().catch(err => {
  console.error('\nFAILED:', err?.message || err);
  process.exit(1);
});
