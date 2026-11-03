/**
 * Vercel Serverless Function entry (committed so `functions` can match it).
 * The Express app is bundled to dist-api/handler.cjs during `npm run build`.
 */
module.exports = require('../dist-api/handler.cjs');
