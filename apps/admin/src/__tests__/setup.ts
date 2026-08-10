import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver, which Radix UI's Tooltip/Popover
// primitives call as soon as a trigger is focused or opened.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
