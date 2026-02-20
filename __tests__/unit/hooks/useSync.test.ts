import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSync } from '~/hooks/useSync'

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

vi.mock('~/common/utils', () => ({
  ensureHostPermission: vi.fn(async () => true),
}))

vi.mock('~/common/config-manager', () => ({
  hasMasterPasswordSet: vi.fn(async () => false),
  isMasterPasswordUnlocked: vi.fn(async () => true),
}))

vi.mock('~/common/messaging', () => ({
  sendToBackground: vi.fn(async () => ({
    success: true,
    data: [{ id: '1', url: 'https://example.com', title: 'Test', lastVisitTime: Date.now() }],
  })),
}))

describe('useSync', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
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
})
