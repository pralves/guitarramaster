import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const copyIfExists = async (from, to) => {
  const source = path.join(root, from);
  if (!existsSync(source)) return;
  await cp(source, path.join(dist, to), { recursive: true });
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await copyIfExists('index.html', 'index.html');
await copyIfExists('landing.html', 'landing.html');
await copyIfExists('design-system.html', 'design-system.html');
await copyIfExists('assets', 'assets');
await copyIfExists('js', 'js');
await copyIfExists('robots.txt', 'robots.txt');

console.log(`Build pronto em ${path.relative(root, dist) || dist}`);
