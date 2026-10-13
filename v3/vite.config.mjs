import { defineConfig, transformWithEsbuild } from 'vite';
export default defineConfig({
  resolve: { dedupe: ['three'] },
  plugins: [{
    name: 'moonbit-release-js',
    async transform(code, id) {
      if (!id.endsWith('/_build/js/release/build/cmd/play/play.js')) return;
      const result = await transformWithEsbuild(code, id, { minify: true, sourcemap: false, target: 'esnext' });
      return { code: result.code, map: null };
    },
  }],
  server: { host: '127.0.0.1', port: 5175, strictPort: true, hmr: false, watch: { ignored: ['**/output/**', '**/.playwright-cli/**'] } },
  build: { target: 'esnext' },
});
