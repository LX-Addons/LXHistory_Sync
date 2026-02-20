import { describe, it, expect } from 'vitest'
import {
  validateUrl,
  validatePassword,
  validateEncryptionKey,
  validateConfig,
  getErrorRecovery,
} from '~/common/config-manager'
import { validateMasterPassword } from '~/hooks/useMasterPassword'
import type { WebDAVConfig } from '~/common/types'

describe('validateMasterPassword', () => {
  it('should return valid for strong password', () => {
    const result = validateMasterPassword('StrongPassword123')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should return invalid for short password', () => {
    const result = validateMasterPassword('Short1')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码长度至少为12个字符')
  })

  it('should return invalid for password without uppercase', () => {
    const result = validateMasterPassword('lowercasepassword123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码必须包含至少一个大写字母')
  })

  it('should return invalid for password without lowercase', () => {
    const result = validateMasterPassword('UPPERCASEPASSWORD123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码必须包含至少一个小写字母')
  })

  it('should return invalid for password without number', () => {
    const result = validateMasterPassword('NoNumbersPassword')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('主密码必须包含至少一个数字')
  })

  it('should return multiple errors for weak password', () => {
    const result = validateMasterPassword('weak')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('validateUrl', () => {
  it('should accept valid HTTPS URL', () => {
    const result = validateUrl('https://example.com/webdav')
    expect(result.isValid).toBe(true)
  })

  it('should reject HTTP URL', () => {
    const result = validateUrl('http://example.com/webdav')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('WebDAV 服务器必须使用 HTTPS 协议')
  })

  it('should reject invalid URL', () => {
    const result = validateUrl('not-a-url')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('无效的 URL 格式')
  })

  it('should reject empty URL', () => {
    const result = validateUrl('')
    expect(result.isValid).toBe(false)
  })
})

describe('validatePassword', () => {
  it('should accept valid password', () => {
    const result = validatePassword('password123')
    expect(result.isValid).toBe(true)
  })

  it('should reject short password', () => {
    const result = validatePassword('short')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('密码长度至少为 8 个字符')
  })

  it('should reject empty password', () => {
    const result = validatePassword('')
    expect(result.isValid).toBe(false)
  })
})

describe('validateEncryptionKey', () => {
  it('should accept strong key', () => {
    const result = validateEncryptionKey('StrongKey123!')
    expect(result.isValid).toBe(true)
    expect(result.strength).toBe('strong')
  })

  it('should reject short key', () => {
    const result = validateEncryptionKey('Short1')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('加密密钥长度至少为 12 个字符')
  })

  it('should reject key without uppercase', () => {
    const result = validateEncryptionKey('lowercasekey123')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('加密密钥必须包含至少一个大写字母')
  })

  it('should reject key without lowercase', () => {
    const result = validateEncryptionKey('UPPERCASEKEY123')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('加密密钥必须包含至少一个小写字母')
  })

  it('should reject key without number', () => {
    const result = validateEncryptionKey('NoNumbersKey')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('加密密钥必须包含至少一个数字')
  })

  it('should return medium strength for moderate key', () => {
    const result = validateEncryptionKey('MediumKey123')
    expect(result.isValid).toBe(true)
    expect(result.strength).toBe('medium')
  })
})

describe('validateConfig', () => {
  const createValidConfig = (): WebDAVConfig => ({
    url: 'https://example.com',
    username: 'user',
    password: 'password',
    encryption: {
      enabled: false,
      type: 'aes-256-gcm',
    },
  })

  it('should accept valid config', () => {
    const result = validateConfig(createValidConfig())
    expect(result).toBe(true)
  })

  it('should reject config without URL', () => {
    const config = createValidConfig()
    config.url = ''
    const result = validateConfig(config)
    expect(result).toBe(false)
  })

  it('should reject config without username', () => {
    const config = createValidConfig()
    config.username = ''
    const result = validateConfig(config)
    expect(result).toBe(false)
  })

  it('should reject null config', () => {
    const result = validateConfig(null as unknown as WebDAVConfig)
    expect(result).toBe(false)
  })
})

describe('getErrorRecovery', () => {
  it('should return auth error for authentication failure', () => {
    const recovery = getErrorRecovery(new Error('认证失败'))
    expect(recovery.message).toBe('认证失败')
    expect(recovery.actions).toContain('用户名')
  })

  it('should return network error for connection failure', () => {
    const recovery = getErrorRecovery(new Error('网络连接失败'))
    expect(recovery.message).toBe('网络连接失败')
    expect(recovery.actions).toContain('网络')
  })

  it('should return decrypt error for decryption failure', () => {
    const recovery = getErrorRecovery(new Error('解密失败'))
    expect(recovery.message).toBe('解密失败')
    expect(recovery.actions).toContain('主密码')
  })

  it('should return config error for config failure', () => {
    const recovery = getErrorRecovery(new Error('配置错误'))
    expect(recovery.message).toBe('配置错误')
    expect(recovery.actions).toContain('配置')
  })

  it('should return format error for format failure', () => {
    const recovery = getErrorRecovery(new Error('数据格式错误'))
    expect(recovery.message).toBe('数据格式错误')
    expect(recovery.actions).toContain('数据')
  })

  it('should return unknown error for other errors', () => {
    const recovery = getErrorRecovery(new Error('Some random error'))
    expect(recovery.message).toBe('未知错误')
  })
})
