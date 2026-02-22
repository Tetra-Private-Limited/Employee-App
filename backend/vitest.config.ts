import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: [
      // Rewrite .js imports to .ts for vitest (backend uses ESM-style .js extensions)
      { find: /^(\.{1,2}\/.*?)\.js$/, replacement: '$1.ts' },
    ],
  },
});
