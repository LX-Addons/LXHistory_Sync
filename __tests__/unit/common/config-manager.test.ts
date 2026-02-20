import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import type { WebDAVConfig } from '~/common/types'

Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
})

const mockStores = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  sessionStore: {} as Record<string, unknown>,
}))

vi.mock('@plasmohq/storage', () => {
  return {
    Storage: vi.fn().mockImplementation(function (this: object, options?: { area?: string }) {
      const store = options?.area === 'session' ? mockStores.sessionStore : mockStores.store
      Object.assign(this, {
        get: async (key: string) => store[key],
        set: async (key: string, value: unknown) => {
          store[key] = value
        },
        remove: async (key: string) => {
          delete store[key]
        },
      })
    }),
  }
})

vi.mock('~/common/crypto', async () => {
  const actual = await vi.importActual('~/common/crypto')
  const testKey = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  return {
    ...actual,
    hashPassword: vi.fn(async (password: string) => ({
      salt: 'mock-salt-' + password.slice(0, 4),
      verificationData: 'mock-verification-' + password.slice(0, 4),
    })),
    verifyPasswordWithSalt: vi.fn(
      async (password: string, salt: string, verificationData: string) => {
        return (
          verificationData === 'mock-verification-' + password.slice(0, 4) &&
          salt === 'mock-salt-' + password.slice(0, 4)
        )
      }
    ),
    deriveMasterKey: vi.fn(async () => testKey),
    encryptData: vi.fn(async (data: string) => 'encrypted-' + data),
    decryptData: vi.fn(async (data: string) => data.replace('encrypted-', '')),
    calculateKeyStrength: (actual as { calculateKeyStrength: (key: string) => string })
      .calculateKeyStrength,
  }
})

import {
  validateUrl,
  validatePassword,
  validateEncryptionKey,
  validateConfig,
  getErrorRecovery,
  createValidationResult,
  isMasterPasswordUnlocked,
  hasMasterPasswordSet,
  clearUnlockedState,
  getSessionConfig,
  setSessionConfig,
  clearSessionConfig,
  getConfig,
  verifyMasterPassword,
  setMasterPassword,
  setSessionMasterPassword,
  clearMasterPassword,
  getSessionMasterKey,
  getMasterKey,
  validateAllConfig,
  loadConfigForSync,
} from '~/common/config-manager'

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

  it('should accept HTTPS URL with path', () => {
    const result = validateUrl('https://example.com/webdav/path/to/dir')
    expect(result.isValid).toBe(true)
  })

  it('should accept HTTPS URL with port', () => {
    const result = validateUrl('https://example.com:8443/webdav')
    expect(result.isValid).toBe(true)
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

  it('should accept password with exactly 8 characters', () => {
    const result = validatePassword('12345678')
    expect(result.isValid).toBe(true)
  })

  it('should reject password with 7 characters', () => {
    const result = validatePassword('1234567')
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

  it('should accept key with exactly 12 characters', () => {
    const result = validateEncryptionKey('Key123456789')
    expect(result.isValid).toBe(true)
  })

  it('should reject empty key', () => {
    const result = validateEncryptionKey('')
    expect(result.isValid).toBe(false)
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

  it('should accept config without password', () => {
    const config = createValidConfig()
    config.password = ''
    const result = validateConfig(config)
    expect(result).toBe(true)
  })

  it('should accept config with encryption disabled', () => {
    const config: WebDAVConfig = {
      url: 'https://example.com',
      username: 'user',
      encryption: {
        enabled: false,
        type: 'aes-256-gcm',
      },
    }
    const result = validateConfig(config)
    expect(result).toBe(true)
  })
})

describe('getErrorRecovery', () => {
  it('should return auth error for authentication failure', () => {
    const recovery = getErrorRecovery(new Error('认证失败'))
    expect(recovery.message).toBe('认证失败')
    expect(recovery.actions).toContain('用户名')
  })

  it('should return auth error for authentication (English)', () => {
    const recovery = getErrorRecovery(new Error('authentication failed'))
    expect(recovery.message).toBe('认证失败')
  })

  it('should return network error for connection failure', () => {
    const recovery = getErrorRecovery(new Error('网络连接失败'))
    expect(recovery.message).toBe('网络连接失败')
    expect(recovery.actions).toContain('网络')
  })

  it('should return network error for connection (English)', () => {
    const recovery = getErrorRecovery(new Error('connection timeout'))
    expect(recovery.message).toBe('网络连接失败')
  })

  it('should return decrypt error for decryption failure', () => {
    const recovery = getErrorRecovery(new Error('解密失败'))
    expect(recovery.message).toBe('解密失败')
    expect(recovery.actions).toContain('主密码')
  })

  it('should return decrypt error for decrypt (English)', () => {
    const recovery = getErrorRecovery(new Error('decrypt error'))
    expect(recovery.message).toBe('解密失败')
  })

  it('should return config error for config failure', () => {
    const recovery = getErrorRecovery(new Error('配置错误'))
    expect(recovery.message).toBe('配置错误')
    expect(recovery.actions).toContain('配置')
  })

  it('should return config error for config (English)', () => {
    const recovery = getErrorRecovery(new Error('config error'))
    expect(recovery.message).toBe('配置错误')
  })

  it('should return format error for format failure', () => {
    const recovery = getErrorRecovery(new Error('数据格式错误'))
    expect(recovery.message).toBe('数据格式错误')
    expect(recovery.actions).toContain('数据')
  })

  it('should return format error for format (English)', () => {
    const recovery = getErrorRecovery(new Error('format error'))
    expect(recovery.message).toBe('数据格式错误')
  })

  it('should return unknown error for other errors', () => {
    const recovery = getErrorRecovery(new Error('Some random error'))
    expect(recovery.message).toBe('未知错误')
  })

  it('should return unknown error for empty error', () => {
    const recovery = getErrorRecovery(new Error(''))
    expect(recovery.message).toBe('未知错误')
  })
})

describe('createValidationResult', () => {
  it('should create validation result with error', () => {
    const result = createValidationResult('测试错误')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.message).toBe('测试错误')
    expect(result.recovery).toBeDefined()
  })

  it('should create validation result with empty message', () => {
    const result = createValidationResult('')
    expect(result.success).toBe(false)
    expect(result.message).toBe('验证失败')
  })

  it('should include recovery actions', () => {
    const result = createValidationResult('认证失败')
    expect(result.recovery).toContain('用户名')
  })
})

describe('Storage and Master Password Functions', () => {
  beforeEach(() => {
    Object.keys(mockStores.store).forEach(key => delete mockStores.store[key])
    Object.keys(mockStores.sessionStore).forEach(key => delete mockStores.sessionStore[key])
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isMasterPasswordUnlocked', () => {
    it('should return false when no master key in session', async () => {
      const result = await isMasterPasswordUnlocked()
      expect(result).toBe(false)
    })

    it('should return true when master key exists in session', async () => {
      mockStores.sessionStore['master_key_raw'] = 'dGVzdC1rZXktZGF0YQ=='
      const result = await isMasterPasswordUnlocked()
      expect(result).toBe(true)
    })
  })

  describe('clearUnlockedState', () => {
    it('should remove master key from session', async () => {
      mockStores.sessionStore['master_key_raw'] = 'dGVzdC1rZXktZGF0YQ=='
      await clearUnlockedState()
      expect(mockStores.sessionStore['master_key_raw']).toBeUndefined()
    })
  })

  describe('hasMasterPasswordSet', () => {
    it('should return false when no master password data', async () => {
      const result = await hasMasterPasswordSet()
      expect(result).toBe(false)
    })

    it('should return true when master password data exists', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'test-salt',
        verificationData: 'test-verification',
      }
      const result = await hasMasterPasswordSet()
      expect(result).toBe(true)
    })

    it('should return false when master password data is incomplete (missing salt)', async () => {
      mockStores.store['master_password_data'] = {
        salt: '',
        verificationData: 'test-verification',
      }
      const result = await hasMasterPasswordSet()
      expect(result).toBe(false)
    })

    it('should return false when master password data is incomplete (missing verificationData)', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'test-salt',
        verificationData: '',
      }
      const result = await hasMasterPasswordSet()
      expect(result).toBe(false)
    })
  })

  describe('getSessionConfig', () => {
    it('should return null when no session config', async () => {
      const result = await getSessionConfig()
      expect(result).toBeNull()
    })

    it('should return session config when exists', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'password',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      }
      mockStores.sessionStore['webdav_config'] = config
      const result = await getSessionConfig()
      expect(result).toEqual(config)
    })
  })

  describe('setSessionConfig', () => {
    it('should set session config', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'password',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      }
      await setSessionConfig(config)
      expect(mockStores.sessionStore['webdav_config']).toEqual(config)
    })
  })

  describe('clearSessionConfig', () => {
    it('should clear session config', async () => {
      mockStores.sessionStore['webdav_config'] = { url: 'https://example.com' }
      await clearSessionConfig()
      expect(mockStores.sessionStore['webdav_config']).toBeUndefined()
    })
  })

  describe('getConfig', () => {
    it('should return null when no config', async () => {
      const result = await getConfig()
      expect(result).toBeNull()
    })

    it('should return config when exists', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'password',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      }
      mockStores.store['webdav_config'] = config
      const result = await getConfig()
      expect(result).toEqual(config)
    })
  })

  describe('verifyMasterPassword', () => {
    it('should return false when no master password data', async () => {
      const result = await verifyMasterPassword('password')
      expect(result).toBe(false)
    })

    it('should return false when master password data is incomplete', async () => {
      mockStores.store['master_password_data'] = {
        salt: '',
        verificationData: '',
      }
      const result = await verifyMasterPassword('password')
      expect(result).toBe(false)
    })

    it('should return true for valid password', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'mock-salt-pass',
        verificationData: 'mock-verification-pass',
      }
      const result = await verifyMasterPassword('password123')
      expect(result).toBe(true)
    })

    it('should return false for invalid password', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'mock-salt-pass',
        verificationData: 'mock-verification-pass',
      }
      const result = await verifyMasterPassword('wrong-password')
      expect(result).toBe(false)
    })
  })

  describe('setMasterPassword', () => {
    it('should set master password data', async () => {
      await setMasterPassword('TestPassword123')
      const data = mockStores.store['master_password_data'] as {
        salt: string
        verificationData: string
      }
      expect(data).toBeDefined()
      expect(data.salt).toBeDefined()
      expect(data.verificationData).toBeDefined()
    })

    it('should clear session config after setting', async () => {
      mockStores.sessionStore['webdav_config'] = { url: 'https://example.com' }
      await setMasterPassword('TestPassword123')
      expect(mockStores.sessionStore['webdav_config']).toBeUndefined()
    })
  })

  describe('setSessionMasterPassword', () => {
    it('should throw error when master password not set', async () => {
      await expect(setSessionMasterPassword('password')).rejects.toThrow('主密码尚未设置')
    })

    it('should throw error when password is invalid', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'mock-salt-corr',
        verificationData: 'mock-verification-corr',
      }
      await expect(setSessionMasterPassword('wrong-password')).rejects.toThrow('主密码验证失败')
    })

    it('should set session master key for valid password', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'mock-salt-pass',
        verificationData: 'mock-verification-pass',
      }
      await setSessionMasterPassword('password123')
      expect(mockStores.sessionStore['master_key_raw']).toBeDefined()
    })
  })

  describe('getSessionMasterKey', () => {
    it('should return null when no master key in session', async () => {
      const result = await getSessionMasterKey()
      expect(result).toBeNull()
    })

    it('should return CryptoKey when master key exists', async () => {
      const validBase64Key = Buffer.from(new Uint8Array(32).fill(1)).toString('base64')
      mockStores.sessionStore['master_key_raw'] = validBase64Key
      const result = await getSessionMasterKey()
      expect(result).not.toBeNull()
    })
  })

  describe('getMasterKey', () => {
    it('should return null when no session master key', async () => {
      const result = await getMasterKey()
      expect(result).toBeNull()
    })

    it('should return key when session master key exists', async () => {
      const validBase64Key = Buffer.from(new Uint8Array(32).fill(1)).toString('base64')
      mockStores.sessionStore['master_key_raw'] = validBase64Key
      const result = await getMasterKey()
      expect(result).not.toBeNull()
    })
  })

  describe('clearMasterPassword', () => {
    it('should clear master password data', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'test-salt',
        verificationData: 'test-verification',
      }
      mockStores.sessionStore['master_key_raw'] = 'dGVzdC1rZXktZGF0YQ=='
      await clearMasterPassword()
      expect(mockStores.store['master_password_data']).toBeUndefined()
      expect(mockStores.sessionStore['master_key_raw']).toBeUndefined()
    })

    it('should clear session config', async () => {
      mockStores.store['master_password_data'] = {
        salt: 'test-salt',
        verificationData: 'test-verification',
      }
      mockStores.sessionStore['webdav_config'] = { url: 'https://example.com' }
      await clearMasterPassword()
      expect(mockStores.sessionStore['webdav_config']).toBeUndefined()
    })
  })

  describe('validateAllConfig', () => {
    it('should return error for null config', async () => {
      const result = await validateAllConfig(null as unknown as WebDAVConfig)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(false)
    })

    it('should return error for invalid URL', async () => {
      const config: WebDAVConfig = {
        url: 'http://example.com',
        username: 'user',
        password: 'password',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      }
      const result = await validateAllConfig(config)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(false)
    })

    it('should return error for short password', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'short',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      }
      const result = await validateAllConfig(config)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(false)
    })

    it('should return null for valid config', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'password123',
        encryption: { enabled: false, type: 'aes-256-gcm' },
      }
      const result = await validateAllConfig(config)
      expect(result).toBeNull()
    })

    it('should validate encryption key when enabled', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'password123',
        encryption: {
          enabled: true,
          key: 'weak',
          type: 'aes-256-gcm',
        },
      }
      const result = await validateAllConfig(config)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(false)
    })

    it('should accept valid encryption key when enabled', async () => {
      const config: WebDAVConfig = {
        url: 'https://example.com',
        username: 'user',
        password: 'password123',
        encryption: {
          enabled: true,
          key: 'StrongKey123!',
          type: 'aes-256-gcm',
        },
      }
      const result = await validateAllConfig(config)
      expect(result).toBeNull()
    })
  })

  describe('loadConfigForSync', () => {
    it('should return null when no master key', async () => {
      const result = await loadConfigForSync(null)
      expect(result).toBeNull()
    })
  })
})
