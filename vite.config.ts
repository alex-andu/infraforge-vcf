import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import content from './scripts/vite-plugin-content.ts';

export default defineConfig({
  plugins: [react(), content()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 }, // local LAN app: content metadata and the search index are intentionally large,
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);
