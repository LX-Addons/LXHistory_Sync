import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { randomBytes } from 'crypto'

const mockChromeStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
  sync: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}

const mockChromeHistory = {
  search: vi.fn(),
  getVisits: vi.fn(),
  addUrl: vi.fn(),
  deleteUrl: vi.fn(),
  deleteRange: vi.fn(),
  deleteAll: vi.fn(),
}

const mockChromeRuntime = {
  openOptionsPage: vi.fn(),
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  lastError: null,
}

const mockChromeAction = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
  onClicked: {
    addListener: vi.fn(),
  },
}

global.chrome = {
  storage: mockChromeStorage,
  history: mockChromeHistory,
  runtime: mockChromeRuntime,
  action: mockChromeAction,
} as unknown as typeof chrome

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      const bytes = randomBytes(arr.length)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = bytes[i]
      }
      return arr
    },
    subtle: {
      importKey: vi.fn(),
      deriveKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
      digest: vi.fn(),
    },
  },
})

Object.defineProperty(global, 'btoa', {
  value: (str: string) => Buffer.from(str, 'binary').toString('base64'),
})

Object.defineProperty(global, 'atob', {
  value: (str: string) => Buffer.from(str, 'base64').toString('binary'),
})

Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  writable: true,
})

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(global, 'Blob', {
  value: class Blob {
    constructor(
      public parts: BlobPart[] = [],
      public options: BlobPropertyBag = {}
    ) {}
    get type() {
      return this.options.type || ''
    }
    get size() {
      return this.parts.reduce((acc: number, part) => {
        if (typeof part === 'string') return acc + part.length
        if (part instanceof ArrayBuffer) return acc + part.byteLength
        return acc
      }, 0)
    }
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0))
    }
    text() {
      return Promise.resolve('')
    }
  },
})

Object.defineProperty(global, 'File', {
  value: class File extends Blob {
    constructor(
      parts: BlobPart[],
      public name: string,
      options: BlobPropertyBag = {}
    ) {
      super(parts, options)
    }
  },
})

Object.defineProperty(global, 'FileReader', {
  value: class FileReader {
    result: string | ArrayBuffer | null = null
    error: DOMException | null = null
    onload: ((this: FileReader, ev: ProgressEvent) => void) | null = null
    onerror: ((this: FileReader, ev: ProgressEvent) => void) | null = null

    readAsText(_blob: Blob) {
      this.result = ''
      setTimeout(() => this.onload?.call(this, {} as ProgressEvent), 0)
    }

    readAsDataURL(_blob: Blob) {
      this.result = 'data:;base64,'
      setTimeout(() => this.onload?.call(this, {} as ProgressEvent), 0)
    }

    readAsArrayBuffer(_blob: Blob) {
      this.result = new ArrayBuffer(0)
      setTimeout(() => this.onload?.call(this, {} as ProgressEvent), 0)
    }
  },
})
