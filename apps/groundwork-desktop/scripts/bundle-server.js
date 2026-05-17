const { build } = require('esbuild');
const path = require('path');

build({
  entryPoints: [path.resolve(__dirname, '../../../server/src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.resolve(__dirname, '../.staging/server/index.js'),
  external: ['better-sqlite3'],
  format: 'cjs',
  sourcemap: false,
}).then(() => {
  console.log('Server bundled successfully');
}).catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
