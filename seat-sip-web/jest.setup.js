import '@testing-library/jest-dom'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api/v1'


// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    query: {},
  }),
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} />,
}))

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(function (event, cb) {
      this._listeners = this._listeners || {}
      this._listeners[event] = cb
      if (event === 'connect') {
        setTimeout(() => cb(), 0)
      }
      return this
    }),
    off: jest.fn(function () {
      return this
    }),
    emit: jest.fn(function (event, data) {
      if (this._listeners && this._listeners[event]) {
        this._listeners[event](data)
      }
      return this
    }),
    disconnect: jest.fn(),
    connected: true,
  }
  return {
    io: jest.fn(() => mSocket),
  }
})

// Mock URL createObjectURL and revokeObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = jest.fn(() => 'mock-object-url')
  window.URL.revokeObjectURL = jest.fn()
}
if (typeof global !== 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'mock-object-url')
  global.URL.revokeObjectURL = jest.fn()
}
