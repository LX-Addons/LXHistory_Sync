import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMasterPassword, validateMasterPassword } from '~/hooks/useMasterPassword'

vi.mock('~/common/webdav', () => ({
  hasMasterPasswordSet: vi.fn(async () => false),
  setMasterPassword: vi.fn(async () => {}),
  setSessionMasterPassword: vi.fn(async () => {}),
  clearMasterPassword: vi.fn(async () => {}),
}))

describe('validateMasterPassword', () => {
  it('should reject short password', () => {
    const result = validateMasterPassword('Short1!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码长度至少为12个字符')
  })

  it('should reject password without uppercase', () => {
    const result = validateMasterPassword('lowercase123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码必须包含至少一个大写字母')
  })

  it('should reject password without lowercase', () => {
    const result = validateMasterPassword('UPPERCASE123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码必须包含至少一个小写字母')
  })

  it('should reject password without number', () => {
    const result = validateMasterPassword('NoNumbers!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码必须包含至少一个数字')
  })

  it('should accept valid password', () => {
    const result = validateMasterPassword('ValidPassword123!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('useMasterPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMasterPassword())

    expect(result.current.status).toBe('')
    expect(result.current.masterPassword).toBe('')
    expect(result.current.masterPasswordConfirm).toBe('')
    expect(result.current.masterPasswordError).toBe('')
    expect(result.current.showMasterPasswordForm).toBe(false)
  })

  it('should show form when handleShowForm is called', () => {
    const { result } = renderHook(() => useMasterPassword())

    act(() => {
      result.current.handleShowForm()
    })

    expect(result.current.showMasterPasswordForm).toBe(true)
  })

  it('should hide form when handleHideForm is called', () => {
    const { result } = renderHook(() => useMasterPassword())

    act(() => {
      result.current.handleShowForm()
    })
    expect(result.current.showMasterPasswordForm).toBe(true)

    act(() => {
      result.current.handleHideForm()
    })
    expect(result.current.showMasterPasswordForm).toBe(false)
  })

  it('should show error when passwords do not match', async () => {
    const { result } = renderHook(() => useMasterPassword())

    act(() => {
      result.current.setMasterPassword('Password123!')
      result.current.setMasterPasswordConfirm('Different123!')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.masterPasswordError).toBe('两次输入的主密码不一致')
  })

  it('should show error for weak password', async () => {
    const { result } = renderHook(() => useMasterPassword())

    act(() => {
      result.current.setMasterPassword('weak')
      result.current.setMasterPasswordConfirm('weak')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.masterPasswordError).toBeTruthy()
  })
})
