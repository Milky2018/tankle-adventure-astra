import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
for (const folder of ['src', 'scripts']) {
  for (const name of readdirSync(join(root, folder))) {
    if (!/\.m?js$/.test(name)) continue;
    const result = spawnSync(process.execPath, ['--check', join(root, folder, name)], {
      stdio: 'inherit',
    });
    if (result.status !== 0) process.exit(result.status || 1);
    count++;
  }
}
console.log(`Syntax checked ${count} JavaScript files.`);
