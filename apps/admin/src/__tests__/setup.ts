import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock 'server-only' package for jsdom test environment
vi.mock('server-only', () => ({}))

// Mock default authenticated session for server actions under test
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>().catch(() => ({}));
  return {
    ...actual,
    getSessionOrRedirect: vi.fn().mockResolvedValue({
      user: { id: 'test-admin-id', role: 'admin', name: 'Test Admin', email: 'admin@playhousemedia.co.za' },
      session: { id: 'test-session-id', userId: 'test-admin-id' },
    }),
    requireRole: vi.fn().mockReturnValue(true),
  };
})

// jsdom doesn't implement ResizeObserver, which Radix UI's Tooltip/Popover
// primitives call as soon as a trigger is focused or opened.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
