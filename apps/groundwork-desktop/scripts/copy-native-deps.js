const fs = require('fs');
const path = require('path');

const stagingModules = path.resolve(__dirname, '../.staging/server/node_modules');
const pnpmStore = path.resolve(__dirname, '../../../node_modules/.pnpm');

// Native deps that need real files (not bundled by esbuild)
const nativeDeps = [
  { name: 'better-sqlite3', version: 'better-sqlite3@11.10.0' },
  { name: 'bindings', version: 'bindings@1.5.0' },
  { name: 'file-uri-to-path', version: 'file-uri-to-path@1.0.0' },
];

function copyRecursiveSync(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(src);
    const resolvedTarget = path.resolve(path.dirname(src), target);
    copyRecursiveSync(resolvedTarget, dest);
  } else if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.mkdirSync(stagingModules, { recursive: true });

for (const dep of nativeDeps) {
  const src = path.join(pnpmStore, dep.version, 'node_modules', dep.name);
  const dest = path.join(stagingModules, dep.name);
  if (fs.existsSync(src)) {
    console.log(`Copying ${dep.name} from pnpm store...`);
    copyRecursiveSync(src, dest);
  } else {
    console.error(`WARNING: ${src} not found`);
  }
}

console.log('Native dependencies copied successfully');
