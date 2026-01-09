import { vi } from 'vitest'

// Fix for localStorage.getItem is not a function in jsdom + msw
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as unknown as Storage;

if (!global.localStorage || typeof global.localStorage.getItem !== 'function') {
  global.localStorage = localStorageMock;
}
