/**
 * One-off NexStream matching / API verification script.
 * Run: npx tsx scripts/test-nexstream-match.mts
 */
import 'dotenv/config';
import { nexstream } from '../server/nexstream.ts';
import { matchTmdbMovieToNexStream } from '../server/streamMatching.ts';
import { db } from '../server/db.ts';

async function scenario(name: string, fn: () => Promise<void>) {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
    console.log('PASS');
  } catch (err: any) {
    console.error('FAIL:', err?.message || err);
  }
}

async function main() {
  console.log('NexStream configured:', nexstream.isConfigured());
  console.log('Base URL:', nexstream.getBaseUrl());

  await scenario('A. Titanic (597) exact TMDB match', async () => {
    const result = await matchTmdbMovieToNexStream(
      { tmdbId: 597, title: 'Titanic', originalTitle: 'Titanic', releaseYear: 1997 },
      { force: true }
    );
    console.log({
      status: result.association.streamStatus,
      confidence: result.association.matchConfidence,
      matchedTitle: result.association.matchedTitle,
      reason: result.reason
    });
    if (result.association.streamStatus !== 'available') {
      throw new Error('Expected available stream for Titanic');
    }
  });

  await scenario('B. Nonsense TMDB id — no attach', async () => {
    const result = await matchTmdbMovieToNexStream(
      { tmdbId: 999999999, title: 'Does Not Exist', releaseYear: 2099 },
      { force: true }
    );
    console.log({
      status: result.association.streamStatus,
      confidence: result.association.matchConfidence,
      reason: result.reason
    });
    if (result.association.streamStatus === 'available') {
      throw new Error('Must not attach stream for unresolved TMDB id');
    }
  });

  await scenario('C. Interstellar year mismatch title verification still uses TMDB id', async () => {
    // Provider has no year search — wrong year on our side must NOT attach a different movie.
    // Same TMDB id 157336 is Interstellar 2014; we verify provider meta title.
    const result = await matchTmdbMovieToNexStream(
      {
        tmdbId: 157336,
        title: 'Interstellar',
        originalTitle: 'Interstellar',
        releaseYear: 2010 // intentionally wrong year metadata on our side
      },
      { force: true }
    );
    console.log({
      status: result.association.streamStatus,
      matchedTitle: result.association.matchedTitle,
      yearStored: result.association.matchedReleaseYear
    });
    // Still exact TMDB id — title matches Interstellar, so available is correct.
    // A DIFFERENT movie id would be required for wrong-film attachment; that is prevented by id keying.
    if (result.association.nexstreamProviderId !== '157336' && result.association.nexstreamProviderId !== String(157336)) {
      throw new Error('Provider id must stay bound to the TMDB id');
    }
  });

  await scenario('D. Provider probe with bad key handling', async () => {
    const prev = process.env.NEXSTREAM_API_KEY;
    process.env.NEXSTREAM_API_KEY = 'invalid_key_for_test';
    // Module reads env at call time via getApiKey()
    const probe = await nexstream.probeMovieAvailability(597);
    process.env.NEXSTREAM_API_KEY = prev;
    console.log({ ok: probe.ok, reason: probe.reason });
    if (probe.ok) throw new Error('Invalid key should fail');
  });

  await scenario('E. Manual override preserved', async () => {
    db.upsertStreamAssociation({
      tmdbId: 550,
      nexstreamProviderId: '550',
      matchedTitle: 'Fight Club',
      matchedReleaseYear: 1999,
      playbackReference: '/embed/movie/550',
      playbackType: 'embed',
      streamStatus: 'available',
      matchConfidence: 'exact_tmdb_id',
      matchSource: 'manual',
      manualOverride: true,
      providerName: 'nexstream',
      mediaType: 'movie'
    });
    const result = await matchTmdbMovieToNexStream(
      { tmdbId: 550, title: 'Fight Club', releaseYear: 1999 },
      { force: true }
    );
    console.log({ skipped: result.skipped, reason: result.reason, manual: result.association.manualOverride });
    if (!result.skipped) throw new Error('Manual override should skip overwrite');
  });

  await scenario('F. Player embed URL builds without exposing in association', async () => {
    const assoc = db.getStreamAssociationByTmdbId(597);
    if (!assoc) throw new Error('Missing Titanic association');
    if (assoc.playbackReference.includes('apikey')) {
      throw new Error('API key leaked into stored playback reference');
    }
    const url = nexstream.buildEmbedUrl(597);
    if (!url.includes('apikey=')) throw new Error('Embed URL should include key server-side');
    console.log({ playbackReference: assoc.playbackReference, embedHasKey: true });
  });

  console.log('\nStreaming stats:', db.getStreamingStats());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
