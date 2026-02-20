import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeneralConfig } from '~/hooks/useGeneralConfig'

const mockStorage: Record<string, unknown> = {}
const mockSetGeneralConfig = vi.fn(async () => {})

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: vi.fn((key: string, defaultValue: unknown) => {
    const value = mockStorage[key] ?? defaultValue
    const setValue = mockSetGeneralConfig
    return [value, setValue]
  }),
}))

describe('useGeneralConfig', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    vi.clearAllMocks()
    mockSetGeneralConfig.mockResolvedValue(undefined)
  })

  it('should return default config', () => {
    const { result } = renderHook(() => useGeneralConfig())

    expect(result.current.generalConfig).toBeDefined()
    expect(result.current.status).toBe('')
  })

  it('should handle save', async () => {
    const { result } = renderHook(() => useGeneralConfig())

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('保存成功！')
  })

  it('should provide getCheckboxClassName', () => {
    const { result } = renderHook(() => useGeneralConfig())

    expect(result.current.getCheckboxClassName('modern')).toBe('checkbox-modern')
  })

  it('should handle save error', async () => {
    mockSetGeneralConfig.mockRejectedValueOnce(new Error('Save failed'))

    const { result } = renderHook(() => useGeneralConfig())

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('保存失败')
  })
})
