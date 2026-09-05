import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: (id) => id.indexOf('/node_modules/three/') >= 0 ? 'three' : undefined,
      },
    },
  },
  test: { environment: 'node' },
});
