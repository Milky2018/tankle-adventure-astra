import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';

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
const catalog = [
  ['tests/browser', ''],
  ['scripts/performance', 'performance/'],
].flatMap(([folder, prefix]) =>
  readdirSync(resolve(root, folder), { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({
      id: prefix + file.replace(/(?:-check)?\.js$/, ''),
      script: resolve(root, folder, file),
    })),
);
const checks = process.argv.slice(2);
if (checks.includes('--list')) {
  console.log(
    catalog
      .map((entry) => entry.id)
      .sort()
      .join('\n'),
  );
  process.exit(0);
}
if (!checks.length) checks.push(...smoke);
const output = resolve(root, 'output/playwright/regression');
mkdirSync(output, { recursive: true });

// Scripts contain fixture mutations; each gets a fresh browser profile.
// Run serially and close even after an assertion failure to release GPU memory.
for (const name of checks) {
  const exact = catalog.find((entry) => entry.id === name);
  const matches = exact ? [exact] : catalog.filter((entry) => basename(entry.id) === name);
  if (matches.length !== 1)
    throw new Error(`Unknown or ambiguous browser check: ${name}. Run with --list for paths.`);
  const { script } = matches[0];
  const label = name.replaceAll('/', '-');
  const session = `furnace-check-${process.pid}-${label}`;
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
    writeFileSync(resolve(output, `${label}.log`), result.text);
    // The CLI can return zero even when the page callback throws.
    if (result.status !== 0 || /^### Error/m.test(result.text) || !/^### Result/m.test(result.text))
      throw new Error(`Browser check failed; see ${output}/${label}.log`);
    console.log(`Passed ${name}.`);
  } finally {
    const result = run('close');
    if (result.status !== 0) console.error(`Could not close ${session}: ${result.text}`);
  }
}
