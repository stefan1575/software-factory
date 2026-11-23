import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: fileURLToPath(new URL('../dist/window', import.meta.url)), emptyOutDir: true },
  test: { environment: 'jsdom', include: ['test/*.test.tsx'] },
});
