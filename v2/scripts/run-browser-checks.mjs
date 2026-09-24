import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = process.env.PLAYWRIGHT_CLI || 'playwright-cli';
const smoke = [
  'friendly-fire',
  'laser-readability',
  'map-connections',
  'save-safety',
  'flower-reward',
  'circuit-visibility',
  'circuit-arrival',
  'occlusion-cone',
  'render-contract',
  'fog-boundary',
  'shadow',
  'automatic-lifts',
  'camera-settings',
  'mouse-scheduling',
];
const checks = process.argv.slice(2);
if (!checks.length) checks.push(...smoke);
const output = resolve(root, 'output/playwright/regression');
mkdirSync(output, { recursive: true });

// Scripts contain fixture mutations; each gets a fresh browser profile.
// Run serially and close even after an assertion failure to release GPU memory.
for (const name of checks) {
  const script = [
    resolve(root, `scripts/folded-${name}-check.js`),
    resolve(root, `scripts/folded-${name}.js`),
  ].find(existsSync);
  if (!script) throw new Error(`Unknown browser check: ${name}`);
  const session = `furnace-check-${process.pid}-${name}`;
  function run(...args) {
    const result = spawnSync(cli, ['--session', session, ...args], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    return { ...result, text: result.stdout + result.stderr };
  }
  try {
    console.log(`Checking ${name}...`);
    const opened = run('open', 'http://127.0.0.1:5174/?chapter=folded&test&manual');
    if (opened.status !== 0 || /^### Error/m.test(opened.text)) throw new Error(opened.text);
    const result = run('run-code', '--filename', script);
    writeFileSync(resolve(output, `${name}.log`), result.text);
    // The CLI can return zero even when the page callback throws.
    if (result.status !== 0 || /^### Error/m.test(result.text) || !/^### Result/m.test(result.text))
      throw new Error(`Browser check failed; see ${output}/${name}.log`);
    console.log(`Passed ${name}.`);
  } finally {
    const result = run('close');
    if (result.status !== 0) console.error(`Could not close ${session}: ${result.text}`);
  }
}
