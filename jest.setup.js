require('@testing-library/jest-dom')

const { toHaveNoViolations } = require('jest-axe')

expect.extend(toHaveNoViolations)

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegment: () => null,
  useSelectedLayoutSegments: () => [],
  notFound: jest.fn(),
  redirect: jest.fn(),
}))

jest.mock('next/link', () => {
  const React = require('react')
  return React.forwardRef(function MockLink({ children, href, ...props }, ref) {
    return React.createElement('a', { ...props, href, ref }, children)
  })
})

jest.mock('next/image', () => {
  const React = require('react')
  return React.forwardRef(function MockImage({ src, alt, width, height, ...props }, ref) {
    return React.createElement('img', { src, alt, width, height, ...props, ref })
  })
})

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

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    clone: () => global.fetch(),
  })
)

global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Headers(options.headers)
    this.body = options.body
  }
}

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Headers(options.headers)
  }
  json() {
    return Promise.resolve(this.body)
  }
  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
  }
}

global.Headers = class MockHeaders {
  constructor(init = {}) {
    this._headers = {}
    if (init instanceof MockHeaders) {
      init.forEach((value, key) => {
        this._headers[key.toLowerCase()] = value
      })
    } else if (typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => {
        this._headers[key.toLowerCase()] = String(value)
      })
    }
  }
  append(name, value) {
    this._headers[name.toLowerCase()] = String(value)
  }
  delete(name) {
    delete this._headers[name.toLowerCase()]
  }
  get(name) {
    return this._headers[name.toLowerCase()] || null
  }
  has(name) {
    return name.toLowerCase() in this._headers
  }
  set(name, value) {
    this._headers[name.toLowerCase()] = String(value)
  }
  forEach(callback) {
    Object.entries(this._headers).forEach(([key, value]) => {
      callback(value, key, this)
    })
  }
  entries() {
    return Object.entries(this._headers)
  }
  keys() {
    return Object.keys(this._headers)
  }
  values() {
    return Object.values(this._headers)
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})

const consoleError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    consoleError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = consoleError
})
