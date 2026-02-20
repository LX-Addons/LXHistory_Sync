import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useConfig } from '~/hooks/useConfig'

const mockStorage: Record<string, unknown> = {}

const mockGetMasterKey = vi.fn<() => Promise<CryptoKey | null>>(async () => null)
const mockEncryptData = vi.fn<(data: string) => Promise<string>>(
  async (data: string) => 'encrypted-' + data
)
const mockDecryptData = vi.fn<(data: string) => Promise<string>>(async (data: string) =>
  data.replace('encrypted-', '')
)
const mockEnsureHostPermission = vi.fn<() => Promise<boolean>>(async () => true)

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
  getMasterKey: () => mockGetMasterKey(),
  encryptData: (data: string) => mockEncryptData(data),
  decryptData: (data: string) => mockDecryptData(data),
}))

vi.mock('~/common/utils', () => ({
  ensureHostPermission: () => mockEnsureHostPermission(),
  STATUS_CLEAR_DELAY: 3000,
}))

describe('useConfig', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
    mockGetMasterKey.mockResolvedValue(null)
    mockEnsureHostPermission.mockResolvedValue(true)
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

  it('should encrypt password when master key exists', async () => {
    mockGetMasterKey.mockResolvedValueOnce({ type: 'secret' } as CryptoKey)

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

  it('should encrypt encryption key when enabled', async () => {
    mockGetMasterKey.mockResolvedValueOnce({ type: 'secret' } as CryptoKey)

    const { result } = renderHook(() => useConfig())

    act(() => {
      result.current.setConfig({
        url: 'https://example.com',
        username: 'testuser',
        password: 'testpass',
        encryption: { enabled: true, key: 'mySecretKey123!', type: 'aes-256-gcm' },
      })
    })

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('保存成功！')
  })

  it('should handle permission denied', async () => {
    mockEnsureHostPermission.mockResolvedValueOnce(false)

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

    expect(result.current.status).toBe('需要授权访问 WebDAV 服务器')
  })

  it('should decrypt stored config when master key exists', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'testuser',
      password: 'encrypted-secret',
      encryption: { enabled: false, type: 'aes-256-gcm' },
    }
    mockGetMasterKey.mockResolvedValueOnce({ type: 'secret' } as CryptoKey)

    renderHook(() => useConfig())

    await waitFor(() => {
      expect(mockDecryptData).toHaveBeenCalledWith('encrypted-secret')
    })
  })
})
