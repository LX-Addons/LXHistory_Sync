import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSync } from '~/hooks/useSync'
import type { HistoryItem } from '~/common/types'

const mockStorage: Record<string, unknown> = {}

interface SyncResponse {
  success: boolean
  data?: HistoryItem[]
  error?: string
}

const mockEnsureHostPermission = vi.fn<() => Promise<boolean>>(async () => true)
const mockHasMasterPasswordSet = vi.fn<() => Promise<boolean>>(async () => false)
const mockIsMasterPasswordUnlocked = vi.fn<() => Promise<boolean>>(async () => true)
const mockSendToBackground = vi.fn<() => Promise<SyncResponse>>(async () => ({
  success: true,
  data: [
    {
      id: '1',
      url: 'https://example.com',
      title: 'Test',
      lastVisitTime: Date.now(),
      visitCount: 1,
    },
  ],
}))

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: vi.fn((key: string, defaultValue: unknown) => {
    const value = mockStorage[key] ?? defaultValue
    const setValue = async (newValue: unknown) => {
      mockStorage[key] = newValue
    }
    return [value, setValue]
  }),
}))

vi.mock('~/common/utils', () => ({
  ensureHostPermission: () => mockEnsureHostPermission(),
}))

vi.mock('~/common/config-manager', () => ({
  hasMasterPasswordSet: () => mockHasMasterPasswordSet(),
  isMasterPasswordUnlocked: () => mockIsMasterPasswordUnlocked(),
}))

vi.mock('~/common/messaging', () => ({
  sendToBackground: () => mockSendToBackground(),
}))

describe('useSync', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
    mockEnsureHostPermission.mockResolvedValue(true)
    mockHasMasterPasswordSet.mockResolvedValue(false)
    mockIsMasterPasswordUnlocked.mockResolvedValue(true)
    mockSendToBackground.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          url: 'https://example.com',
          title: 'Test',
          lastVisitTime: Date.now(),
          visitCount: 1,
        },
      ],
    })
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSync())

    expect(result.current.isSyncing).toBe(false)
    expect(result.current.syncStatus).toBeNull()
    expect(result.current.hasWebDAVConfig).toBe(false)
    expect(result.current.unlockRequired.required).toBe(false)
  })

  it('should detect WebDAV config when present', () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }

    const { result } = renderHook(() => useSync())

    expect(result.current.hasWebDAVConfig).toBe(true)
  })

  it('should sync to cloud successfully', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.syncToCloud()
    })

    expect(result.current.syncStatus?.type).toBe('success')
  })

  it('should sync from cloud successfully', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.syncFromCloud()
    })

    expect(result.current.syncStatus?.type).toBe('success')
  })

  it('should clear unlock required state', () => {
    const { result } = renderHook(() => useSync())

    act(() => {
      result.current.clearUnlockRequired()
    })

    expect(result.current.unlockRequired.required).toBe(false)
  })

  it('should handle sync to cloud failure', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }
    mockSendToBackground.mockResolvedValueOnce({
      success: false,
      error: 'Connection failed',
    })

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.syncToCloud()
    })

    expect(result.current.syncStatus?.type).toBe('error')
    expect(result.current.syncStatus?.message).toBe('Connection failed')
  })

  it('should handle sync from cloud failure', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }
    mockSendToBackground.mockResolvedValueOnce({
      success: false,
      error: 'Network error',
    })

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.syncFromCloud()
    })

    expect(result.current.syncStatus?.type).toBe('error')
  })

  it('should require unlock when master password set but not unlocked', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }
    mockHasMasterPasswordSet.mockResolvedValueOnce(true)
    mockIsMasterPasswordUnlocked.mockResolvedValueOnce(false)

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.syncToCloud()
    })

    expect(result.current.unlockRequired.required).toBe(true)
    expect(result.current.unlockRequired.action).toBe('syncToCloud')
  })

  it('should retry after unlock for syncToCloud', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }

    const { result } = renderHook(() => useSync())

    act(() => {
      result.current.clearUnlockRequired()
    })

    await act(async () => {
      await result.current.retryAfterUnlock()
    })

    expect(mockSendToBackground).not.toHaveBeenCalled()
  })

  it('should handle permission denied', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }
    mockEnsureHostPermission.mockResolvedValueOnce(false)

    const { result } = renderHook(() => useSync())

    await act(async () => {
      await result.current.syncToCloud()
    })

    expect(result.current.syncStatus?.type).toBe('error')
    expect(result.current.syncStatus?.message).toBe('需要授权访问 WebDAV 服务器')
  })

  it('should call onSyncComplete callback', async () => {
    mockStorage['webdav_config'] = {
      url: 'https://example.com',
      username: 'user',
      password: 'password',
    }
    const onSyncComplete = vi.fn()

    const { result } = renderHook(() => useSync(onSyncComplete))

    await act(async () => {
      await result.current.syncToCloud()
    })

    expect(onSyncComplete).toHaveBeenCalled()
  })
})
