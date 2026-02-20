import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '~/hooks/useTheme'

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
  applyTheme: vi.fn(),
  STATUS_CLEAR_DELAY: 3000,
}))

describe('useTheme', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
  })

  it('should return default theme config', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.themeConfig).toBeDefined()
    expect(result.current.themeConfig.theme).toBe('auto')
  })

  it('should handle save', async () => {
    const { result } = renderHook(() => useTheme())

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('保存成功！')
  })

  it('should apply theme on mount', async () => {
    const { applyTheme } = await import('~/common/utils')

    renderHook(() => useTheme())

    expect(applyTheme).toHaveBeenCalled()
  })
})
