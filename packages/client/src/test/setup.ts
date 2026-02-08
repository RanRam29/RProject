import '@testing-library/jest-dom/vitest';

// jsdom provides localStorage, document, window, etc.
// We only need to mock APIs that jsdom doesn't support.

// Mock matchMedia (not provided by jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
