import { defineConfig, configDefaults } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Playwright specs live in e2e/ and run via `playwright test`, not vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    // Workspace packages (e.g. @pmg/emails) can resolve a separate physical
    // copy of "resend" than this app due to bun's isolated installs. Force a
    // single instance so vi.mock('resend', ...) intercepts both.
    dedupe: ['resend'],
  },
});
