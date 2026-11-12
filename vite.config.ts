import { defineConfig } from 'vite';

// BASE_PATH is set to "/paradise-isle/" by CI when deploying to GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  // 允许通过临时公网隧道（trycloudflare 等）访问预览站点
  preview: {
    allowedHosts: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as never);
