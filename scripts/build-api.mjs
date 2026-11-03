import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist-api');
const outFile = path.join(outDir, 'handler.cjs');

fs.mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'scripts', 'vercel-api-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: outFile,
  // Keep node_modules external — Vercel installs them at deploy time.
  packages: 'external',
  // Force serverless mode so the bundle never calls app.listen().
  define: {
    'process.env.__CINESTREAM_SERVERLESS__': '"1"'
  },
  logLevel: 'info',
});

// Vercel Node expects `module.exports = (req, res) => {}`.
// esbuild CJS default-export interop is `{ default: handler }` — unwrap it.
const bundled = fs.readFileSync(outFile, 'utf8');
fs.writeFileSync(
  outFile,
  `${bundled}

;(() => {
  const mod = module.exports;
  const handler = mod && (typeof mod === 'function' ? mod : mod.default);
  if (typeof handler !== 'function') {
    throw new Error('Vercel API bundle did not export a function handler');
  }
  module.exports = handler;
})();
`
);

console.log(`Bundled Vercel API → ${path.relative(root, outFile)}`);
