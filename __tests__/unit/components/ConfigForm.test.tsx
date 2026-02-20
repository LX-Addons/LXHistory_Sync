import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfigForm from '~/components/ConfigForm'
import type { WebDAVConfig } from '~/common/types'

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: vi.fn(() => [null, vi.fn()]),
}))

vi.mock('~/common/webdav', () => ({
  validateUrl: vi.fn((url: string) => {
    if (!url) return { isValid: false, error: 'URL 不能为空' }
    if (!url.startsWith('https://')) return { isValid: false, error: '必须使用 HTTPS' }
    return { isValid: true }
  }),
  validatePassword: vi.fn((password: string) => {
    if (!password || password.length < 8)
      return { isValid: false, error: '密码长度至少为 8 个字符' }
    return { isValid: true }
  }),
  validateEncryptionKey: vi.fn((key: string) => {
    if (!key || key.length < 12)
      return { isValid: false, error: '密钥长度至少为 12 个字符', strength: 'weak' }
    if (key.length >= 16) return { isValid: true, strength: 'strong' }
    return { isValid: true, strength: 'medium' }
  }),
}))

vi.mock('~/common/utils', () => ({
  getCheckboxClassName: vi.fn((style: string) => `checkbox-${style}`),
}))

describe('ConfigForm', () => {
  const defaultConfig: WebDAVConfig = {
    url: '',
    username: '',
    password: '',
    encryption: {
      enabled: false,
      type: 'aes-256-gcm',
    },
  }

  const defaultProps = {
    config: defaultConfig,
    status: '',
    onConfigChange: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<ConfigForm {...defaultProps} />)

    expect(screen.getByLabelText('WebDAV 服务器地址:')).toBeInTheDocument()
    expect(screen.getByLabelText('用户名:')).toBeInTheDocument()
    expect(screen.getByLabelText('密码/应用令牌:')).toBeInTheDocument()
    expect(screen.getByLabelText('启用加密:')).toBeInTheDocument()
  })

  it('should show warning when no master password', () => {
    render(<ConfigForm {...defaultProps} />)

    expect(screen.getByText(/未设置主密码/)).toBeInTheDocument()
  })

  it('should call onConfigChange when URL changes', () => {
    const onConfigChange = vi.fn()
    render(<ConfigForm {...defaultProps} onConfigChange={onConfigChange} />)

    const urlInput = screen.getByLabelText('WebDAV 服务器地址:')
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } })

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com' })
    )
  })

  it('should call onConfigChange when username changes', () => {
    const onConfigChange = vi.fn()
    render(<ConfigForm {...defaultProps} onConfigChange={onConfigChange} />)

    const usernameInput = screen.getByLabelText('用户名:')
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ username: 'testuser' }))
  })

  it('should show encryption fields when enabled', () => {
    const configWithEncryption: WebDAVConfig = {
      ...defaultConfig,
      encryption: {
        enabled: true,
        type: 'aes-256-gcm',
      },
    }

    render(<ConfigForm {...defaultProps} config={configWithEncryption} />)

    expect(screen.getByLabelText('加密类型:')).toBeInTheDocument()
    expect(screen.getByLabelText('加密密钥:')).toBeInTheDocument()
  })

  it('should show status message', () => {
    render(<ConfigForm {...defaultProps} status="保存成功！" />)

    expect(screen.getByText('保存成功！')).toBeInTheDocument()
  })

  it('should submit form with valid data', async () => {
    const onSubmit = vi.fn()
    const validConfig: WebDAVConfig = {
      url: 'https://example.com',
      username: 'testuser',
      password: 'password123',
      encryption: {
        enabled: false,
        type: 'aes-256-gcm',
      },
    }

    render(<ConfigForm {...defaultProps} config={validConfig} onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: '保存配置' })
    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalled()
  })

  it('should toggle encryption checkbox', () => {
    const onConfigChange = vi.fn()
    render(<ConfigForm {...defaultProps} onConfigChange={onConfigChange} />)

    const checkbox = screen.getByLabelText('启用加密:')
    fireEvent.click(checkbox)

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: expect.objectContaining({ enabled: true }),
      })
    )
  })

  it('should change encryption type', () => {
    const onConfigChange = vi.fn()
    const configWithEncryption: WebDAVConfig = {
      ...defaultConfig,
      encryption: {
        enabled: true,
        type: 'aes-256-gcm',
      },
    }

    render(
      <ConfigForm {...defaultProps} config={configWithEncryption} onConfigChange={onConfigChange} />
    )

    const select = screen.getByLabelText('加密类型:')
    fireEvent.change(select, { target: { value: 'chacha20-poly1305' } })

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: expect.objectContaining({ type: 'chacha20-poly1305' }),
      })
    )
  })

  it('should input encryption key', () => {
    const onConfigChange = vi.fn()
    const configWithEncryption: WebDAVConfig = {
      ...defaultConfig,
      encryption: {
        enabled: true,
        type: 'aes-256-gcm',
      },
    }

    render(
      <ConfigForm {...defaultProps} config={configWithEncryption} onConfigChange={onConfigChange} />
    )

    const keyInput = screen.getByLabelText('加密密钥:')
    fireEvent.change(keyInput, { target: { value: 'MySecretKey123!' } })

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: expect.objectContaining({ key: 'MySecretKey123!' }),
      })
    )
  })

  it('should show password validation error', () => {
    const onConfigChange = vi.fn()
    render(<ConfigForm {...defaultProps} onConfigChange={onConfigChange} />)

    const passwordInput = screen.getByLabelText('密码/应用令牌:')
    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.blur(passwordInput)

    expect(screen.getByText('密码长度至少为 8 个字符')).toBeInTheDocument()
  })

  it('should show encryption key strength', () => {
    const configWithEncryption: WebDAVConfig = {
      ...defaultConfig,
      encryption: {
        enabled: true,
        type: 'aes-256-gcm',
        key: 'StrongEncryptionKey123!',
      },
    }

    render(<ConfigForm {...defaultProps} config={configWithEncryption} />)

    expect(screen.getByText(/强/)).toBeInTheDocument()
  })

  it('should show medium key strength', () => {
    const configWithEncryption: WebDAVConfig = {
      ...defaultConfig,
      encryption: {
        enabled: true,
        type: 'aes-256-gcm',
        key: 'MediumKey12',
      },
    }

    render(<ConfigForm {...defaultProps} config={configWithEncryption} />)

    expect(screen.getByText(/中/)).toBeInTheDocument()
  })

  it('should show weak key strength', () => {
    const configWithEncryption: WebDAVConfig = {
      ...defaultConfig,
      encryption: {
        enabled: true,
        type: 'aes-256-gcm',
        key: 'weak',
      },
    }

    render(<ConfigForm {...defaultProps} config={configWithEncryption} />)

    expect(screen.getByText(/弱/)).toBeInTheDocument()
  })
})
