import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConfig } from '~/hooks/useConfig'

const mockStorage: Record<string, unknown> = {}

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: vi.fn((key: string, defaultValue: unknown) => {
    const value = mockStorage[key] ?? defaultValue
    const setValue = async (newValue: unknown) => {
      mockStorage[key] = newValue
    }
    return [value, setValue]
  }),
}))

vi.mock('~/common/webdav', () => ({
  getMasterKey: vi.fn(async () => null),
  encryptData: vi.fn(async (data: string) => 'encrypted-' + data),
  decryptData: vi.fn(async (data: string) => data.replace('encrypted-', '')),
}))

vi.mock('~/common/utils', () => ({
  ensureHostPermission: vi.fn(async () => true),
  STATUS_CLEAR_DELAY: 3000,
}))

describe('useConfig', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
  })

  it('should initialize with default config', () => {
    const { result } = renderHook(() => useConfig())

    expect(result.current.config).toBeDefined()
    expect(result.current.config.url).toBe('')
    expect(result.current.config.username).toBe('')
    expect(result.current.status).toBe('')
  })

  it('should update config', () => {
    const { result } = renderHook(() => useConfig())

    act(() => {
      result.current.setConfig({
        url: 'https://example.com',
        username: 'testuser',
        password: 'testpass',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      })
    })

    expect(result.current.config.url).toBe('https://example.com')
    expect(result.current.config.username).toBe('testuser')
  })

  it('should handle save successfully', async () => {
    const { result } = renderHook(() => useConfig())

    act(() => {
      result.current.setConfig({
        url: 'https://example.com',
        username: 'testuser',
        password: 'testpass',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      })
    })

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('保存成功！')
  })

  it('should handle save without URL', async () => {
    const { result } = renderHook(() => useConfig())

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('保存成功！')
  })
})
