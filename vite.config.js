import { defineConfig } from 'vite';

export default defineConfig({
  base: '/psd-viewer/',
  test: {
    environment: 'jsdom',
  },
});
