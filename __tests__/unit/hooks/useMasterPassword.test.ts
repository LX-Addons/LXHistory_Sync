import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMasterPassword, validateMasterPassword } from '~/hooks/useMasterPassword'

const mockHasMasterPasswordSet = vi.fn(async () => false)
const mockSaveMasterPassword = vi.fn(async () => {})
const mockSetSessionMasterPassword = vi.fn(async () => {})
const mockClearMasterPassword = vi.fn(async () => {})

vi.mock('~/common/webdav', () => ({
  hasMasterPasswordSet: () => mockHasMasterPasswordSet(),
  setMasterPassword: () => mockSaveMasterPassword(),
  setSessionMasterPassword: () => mockSetSessionMasterPassword(),
  clearMasterPassword: () => mockClearMasterPassword(),
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
    mockHasMasterPasswordSet.mockResolvedValue(false)
    mockSaveMasterPassword.mockResolvedValue(undefined)
    mockSetSessionMasterPassword.mockResolvedValue(undefined)
    mockClearMasterPassword.mockResolvedValue(undefined)
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

  it('should successfully set master password', async () => {
    const { result } = renderHook(() => useMasterPassword())

    act(() => {
      result.current.handleShowForm()
      result.current.setMasterPassword('ValidPassword123!')
      result.current.setMasterPasswordConfirm('ValidPassword123!')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.status).toBe('主密码设置成功！')
    expect(result.current.hasMasterPassword).toBe(true)
    expect(result.current.showMasterPasswordForm).toBe(false)
  })

  it('should successfully clear master password', async () => {
    mockHasMasterPasswordSet.mockResolvedValueOnce(true)

    const { result } = renderHook(() => useMasterPassword())

    await act(async () => {
      await result.current.handleClear()
    })

    expect(mockClearMasterPassword).toHaveBeenCalled()
    expect(result.current.status).toBe('主密码已清除！')
    expect(result.current.hasMasterPassword).toBe(false)
  })

  it('should handle set password error', async () => {
    mockSaveMasterPassword.mockRejectedValueOnce(new Error('Set failed'))

    const { result } = renderHook(() => useMasterPassword())

    act(() => {
      result.current.handleShowForm()
      result.current.setMasterPassword('ValidPassword123!')
      result.current.setMasterPasswordConfirm('ValidPassword123!')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })

    expect(result.current.masterPasswordError).toBe('设置主密码失败')
  })

  it('should handle clear password error', async () => {
    mockHasMasterPasswordSet.mockResolvedValueOnce(true)
    mockClearMasterPassword.mockRejectedValueOnce(new Error('Clear failed'))

    const { result } = renderHook(() => useMasterPassword())

    await act(async () => {
      await result.current.handleClear()
    })

    expect(result.current.masterPasswordError).toBe('清除主密码失败')
  })
})
