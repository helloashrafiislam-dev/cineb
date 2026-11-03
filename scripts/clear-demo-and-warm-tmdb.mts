/**
 * Clears demo/seed movies from the JSON DB and warms TMDB discovery cache.
 * Does not invent playback URLs — catalog streaming entries stay empty until admin imports.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { tmdb } from '../server/tmdb.ts';

const DB_FILE = path.resolve(process.cwd(), 'data', 'movies_database.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Database file not found: ${DB_FILE}`);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(raw);
  const before = Array.isArray(db.movies) ? db.movies.length : 0;

  db.movies = [];
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Cleared demo movies: ${before} → 0`);

  if (!tmdb.isConfigured()) {
    console.log('TMDB not configured — skip warm fetch');
    return;
  }

  const [trending, popular, topRated, nowPlaying, upcoming, tv] = await Promise.all([
    tmdb.getTrending(1),
    tmdb.getPopular(1),
    tmdb.getTopRated(1),
    tmdb.getNowPlaying(1),
    tmdb.getUpcoming(1),
    tmdb.getPopularTv(1)
  ]);

  console.log(
    JSON.stringify({
      ok: true,
      counts: {
        trending: trending.results.length,
        popular: popular.results.length,
        topRated: topRated.results.length,
        nowPlaying: nowPlaying.results.length,
        upcoming: upcoming.results.length,
        popularTv: tv.results.length
      },
      samples: {
        trending: trending.results.slice(0, 3).map(m => m.title),
        popular: popular.results.slice(0, 3).map(m => m.title)
      }
    })
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
