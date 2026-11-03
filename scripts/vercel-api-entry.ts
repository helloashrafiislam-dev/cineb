/**
 * Vercel serverless entry — Express app as the default Node handler.
 * Built to api/index.js by `npm run build:api`.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { app } from '../server.ts';

/**
 * Vercel rewrites `/api/*` → `/api` to hit this function. Restore the
 * original path so Express route matching (`/api/tmdb/...`) still works.
 */
function restoreApiUrl(req: IncomingMessage): void {
  const headers = req.headers;
  const candidates = [
    headers['x-forwarded-uri'],
    headers['x-invoke-path'],
    headers['x-vercel-forwarded-path']
  ];

  let original = '';
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('/api')) {
      original = value;
      break;
    }
  }

  const current = req.url || '/';
  const currentPath = current.split('?')[0];
  const needsRestore =
    Boolean(original) &&
    (currentPath === '/api' || currentPath === '/' || currentPath === '/api/index');

  if (needsRestore && original) {
    const queryIndex = current.indexOf('?');
    const query = queryIndex >= 0 ? current.slice(queryIndex) : '';
    const originalHasQuery = original.includes('?');
    req.url = originalHasQuery ? original : `${original}${query}`;
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  restoreApiUrl(req);
  return app(req as any, res as any);
}
