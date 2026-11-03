/** URL-friendly slug from a movie title */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 100) || 'movie'
  );
}

/** Public TMDB details: /movie/dune-part-two-438631 */
export function buildTmdbMoviePath(title: string, tmdbId: number): string {
  return `/movie/${slugify(title)}-${tmdbId}`;
}

/** Local library details (no TMDB id): /watch/my-film/{movieId} */
export function buildLocalMoviePath(title: string, movieId: string): string {
  return `/watch/${slugify(title)}/${encodeURIComponent(movieId)}`;
}

export type DetailsRoute =
  | { kind: 'tmdb'; tmdbId: number; slug: string }
  | { kind: 'local'; movieId: string; slug: string };

export function parseDetailsRoute(pathname: string): DetailsRoute | null {
  // /movie/{slug}-{tmdbId}
  const tmdbMatch = pathname.match(/^\/movie\/(.+)-(\d+)\/?$/);
  if (tmdbMatch) {
    return {
      kind: 'tmdb',
      slug: tmdbMatch[1],
      tmdbId: parseInt(tmdbMatch[2], 10)
    };
  }

  // /watch/{slug}/{movieId}
  const watchMatch = pathname.match(/^\/watch\/([^/]+)\/([^/]+)\/?$/);
  if (watchMatch) {
    return {
      kind: 'local',
      slug: watchMatch[1],
      movieId: decodeURIComponent(watchMatch[2])
    };
  }

  // Legacy /tmdb/123
  const legacyTmdb = pathname.match(/^\/tmdb\/(\d+)\/?$/);
  if (legacyTmdb) {
    return { kind: 'tmdb', slug: '', tmdbId: parseInt(legacyTmdb[1], 10) };
  }

  // Legacy /movie/{rawId} without trailing numeric id
  const legacyMovie = pathname.match(/^\/movie\/([^/]+)\/?$/);
  if (legacyMovie) {
    return {
      kind: 'local',
      slug: '',
      movieId: decodeURIComponent(legacyMovie[1])
    };
  }

  return null;
}
