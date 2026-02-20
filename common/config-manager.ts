import { Storage } from '@plasmohq/storage'

import {
  calculateKeyStrength,
  decryptData,
  deriveMasterKey,
  encryptData,
  hashPassword,
  verifyPasswordWithSalt,
} from './crypto'
import { Logger } from './logger'
import type { CloudSyncResult, KeyStrength, WebDAVConfig } from './types'

const storage = new Storage()
const sessionStorage = new Storage({ area: 'session' })

export interface MasterPasswordData {
  salt: string
  verificationData: string
}

export async function isMasterPasswordUnlocked(): Promise<boolean> {
  try {
    const rawKeyData = await sessionStorage.get<string>('master_key_raw')
    return !!rawKeyData
  } catch (error) {
    Logger.error('Failed to check unlocked state', error)
    return false
  }
}

export async function clearUnlockedState(): Promise<void> {
  try {
    await sessionStorage.remove('master_key_raw')
  } catch (error) {
    Logger.error('Failed to clear unlocked state', error)
  }
}

export async function hasMasterPasswordSet(): Promise<boolean> {
  try {
    const masterPasswordData = await storage.get<MasterPasswordData>('master_password_data')
    return !!(masterPasswordData && masterPasswordData.salt && masterPasswordData.verificationData)
  } catch (error) {
    Logger.error('Failed to check master password', error)
    return false
  }
}

export async function getSessionConfig(): Promise<WebDAVConfig | null> {
  try {
    const sessionConfig = await sessionStorage.get<WebDAVConfig>('webdav_config')
    if (sessionConfig) {
      return sessionConfig
    }
  } catch (error) {
    Logger.error('Failed to get session config', error)
  }
  return null
}

export async function setSessionConfig(config: WebDAVConfig): Promise<void> {
  try {
    await sessionStorage.set('webdav_config', config)
  } catch (error) {
    Logger.error('Failed to set session config', error)
  }
}

export async function clearSessionConfig(): Promise<void> {
  try {
    await sessionStorage.remove('webdav_config')
  } catch (error) {
    Logger.error('Failed to clear session config', error)
  }
}

interface ErrorRecovery {
  message: string
  actions: string
}

export function getErrorRecovery(error: Error): ErrorRecovery {
  const errorMessage = error.message.toLowerCase()
  if (errorMessage.includes('认证失败') || errorMessage.includes('authentication')) {
    return {
      message: '认证失败',
      actions:
        '检查WebDAV用户名和密码是否正确\n确保WebDAV服务器是否正常运行\n尝试重新登录WebDAV服务',
    }
  }
  if (errorMessage.includes('网络') || errorMessage.includes('connection')) {
    return {
      message: '网络连接失败',
      actions:
        '检查网络连接是否正常\n确保WebDAV服务器地址是否正确\n尝试使用其他网络连接\n检查防火墙设置',
    }
  }
  if (errorMessage.includes('解密') || errorMessage.includes('decrypt')) {
    return {
      message: '解密失败',
      actions:
        '检查主密码是否正确\n确保加密密钥是否正确\n尝试重新设置主密码\n清除加密数据并重新配置',
    }
  }
  if (errorMessage.includes('配置') || errorMessage.includes('config')) {
    return {
      message: '配置错误',
      actions:
        '检查WebDAV配置是否完整\n确保URL格式是否正确（必须使用HTTPS）\n验证用户名和密码是否已填写\n重新保存配置',
    }
  }
  if (errorMessage.includes('格式') || errorMessage.includes('format')) {
    return {
      message: '数据格式错误',
      actions:
        '确保云端数据是否完整\n尝试从云端重新同步\n清除本地历史记录并重新同步\n联系WebDAV服务提供商',
    }
  }
  return {
    message: '未知错误',
    actions: '刷新页面重试\n检查浏览器控制台获取详细信息\n清除浏览器缓存\n重启浏览器',
  }
}

export async function getSessionMasterKey(): Promise<CryptoKey | null> {
  try {
    const rawKeyData = await sessionStorage.get<string>('master_key_raw')
    if (!rawKeyData) {
      return null
    }

    const keyBytes = new Uint8Array(
      atob(rawKeyData)
        .split('')
        .map(c => c.charCodeAt(0))
    )

    return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
  } catch (error) {
    Logger.error('Failed to get session master key', error)
    return null
  }
}

export async function getMasterKey(): Promise<CryptoKey | null> {
  const sessionKey = await getSessionMasterKey()
  if (sessionKey) {
    return sessionKey
  }
  return null
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  const masterPasswordData = await storage.get<MasterPasswordData>('master_password_data')

  if (!masterPasswordData) {
    return false
  }

  if (!masterPasswordData.salt || !masterPasswordData.verificationData) {
    Logger.warn('检测到旧格式的主密码数据，需要重新设置主密码')
    await storage.remove('master_password_data')
    return false
  }

  const isValid = await verifyPasswordWithSalt(
    password,
    masterPasswordData.salt,
    masterPasswordData.verificationData
  )

  return isValid
}

export async function setMasterPassword(password: string): Promise<void> {
  const oldMasterKey = await getMasterKey()

  let configToReencrypt: WebDAVConfig | null = null
  if (oldMasterKey) {
    try {
      configToReencrypt = await loadAndDecryptConfig(oldMasterKey)
    } catch (error) {
      Logger.warn('Failed to decrypt config with old master key, will use current config', error)
    }
  }

  if (!configToReencrypt) {
    configToReencrypt = await getConfig()
  }

  const { salt, verificationData } = await hashPassword(password)
  await storage.set('master_password_data', { salt, verificationData })

  if (configToReencrypt && (configToReencrypt.password || configToReencrypt.encryption?.key)) {
    const newMasterKey = await deriveMasterKey(password, salt)
    const configToSave: WebDAVConfig = {
      ...configToReencrypt,
      password: configToReencrypt.password
        ? await encryptData(configToReencrypt.password, newMasterKey)
        : undefined,
      encryption: {
        ...configToReencrypt.encryption,
        key: configToReencrypt.encryption?.key
          ? await encryptData(configToReencrypt.encryption.key, newMasterKey)
          : undefined,
      },
    }
    await storage.set('webdav_config', configToSave)
  }

  await clearSessionConfig()
}

export async function setSessionMasterPassword(password: string): Promise<void> {
  const masterPasswordData = await storage.get<MasterPasswordData>('master_password_data')

  if (!masterPasswordData || !masterPasswordData.salt) {
    throw new Error('主密码尚未设置，请先设置主密码')
  }

  const isValid = await verifyMasterPassword(password)
  if (!isValid) {
    throw new Error('主密码验证失败')
  }

  const masterKey = await deriveMasterKey(password, masterPasswordData.salt)

  const rawKeyBuffer = await crypto.subtle.exportKey('raw', masterKey)
  const rawKeyBytes = new Uint8Array(rawKeyBuffer)
  const rawKeyBase64 = btoa(String.fromCharCode(...rawKeyBytes))

  await sessionStorage.set('master_key_raw', rawKeyBase64)
}

export async function clearMasterPassword(): Promise<void> {
  const masterKey = await getMasterKey()

  if (masterKey) {
    try {
      const decryptedConfig = await loadAndDecryptConfig(masterKey)
      if (decryptedConfig) {
        await storage.set('webdav_config', decryptedConfig)
      }
    } catch (error) {
      Logger.warn('Failed to decrypt config before clearing master password', error)
    }
  }

  await storage.remove('master_password_data')
  await clearUnlockedState()
  await clearSessionConfig()
}

export async function getConfig(): Promise<WebDAVConfig | null> {
  const config = await storage.get('webdav_config')
  if (typeof config === 'object' && config !== null) {
    return config as WebDAVConfig
  }
  return null
}

export function validateConfig(config: WebDAVConfig): boolean {
  return !!config && !!config.url && !!config.username
}

export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url)

    if (urlObj.protocol !== 'https:') {
      return { isValid: false, error: 'WebDAV 服务器必须使用 HTTPS 协议' }
    }

    if (!urlObj.hostname) {
      return { isValid: false, error: '无效的 WebDAV 服务器地址' }
    }

    return { isValid: true }
  } catch (error) {
    Logger.error('Failed to validate URL', error)
    return { isValid: false, error: '无效的 URL 格式' }
  }
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: '密码长度至少为 8 个字符' }
  }

  return { isValid: true }
}

export function validateEncryptionKey(key: string): {
  isValid: boolean
  strength: KeyStrength
  error?: string
} {
  if (!key || key.length < 12) {
    return { isValid: false, strength: 'weak', error: '加密密钥长度至少为 12 个字符' }
  }

  if (!/[A-Z]/.test(key)) {
    return { isValid: false, strength: 'weak', error: '加密密钥必须包含至少一个大写字母' }
  }

  if (!/[a-z]/.test(key)) {
    return { isValid: false, strength: 'weak', error: '加密密钥必须包含至少一个小写字母' }
  }

  if (!/[0-9]/.test(key)) {
    return { isValid: false, strength: 'weak', error: '加密密钥必须包含至少一个数字' }
  }

  const strength = calculateKeyStrength(key)

  if (strength === 'weak') {
    return { isValid: true, strength, error: '建议使用更强的加密密钥（添加特殊字符）' }
  }

  return { isValid: true, strength }
}

export async function loadAndDecryptConfig(masterKey: CryptoKey): Promise<WebDAVConfig | null> {
  const sessionConfig = await getSessionConfig()
  if (sessionConfig) {
    return sessionConfig
  }

  const storedConfig = await getConfig()
  if (!storedConfig) {
    return null
  }

  const encryptedPassword = storedConfig.password || ''
  const encryptedKey = storedConfig.encryption?.key || ''

  if (encryptedPassword) {
    storedConfig.password = await decryptData(encryptedPassword, masterKey)
  }

  if (encryptedKey) {
    storedConfig.encryption = {
      ...storedConfig.encryption,
      key: await decryptData(encryptedKey, masterKey),
      enabled: storedConfig.encryption.enabled,
      type: storedConfig.encryption.type,
    }
  }

  await setSessionConfig(storedConfig)
  return storedConfig
}

export function createValidationResult(errorMessage: string): CloudSyncResult {
  const recovery = getErrorRecovery(new Error(errorMessage))
  return {
    success: false,
    error: recovery.message,
    message: errorMessage || '验证失败',
    recovery: recovery.actions,
  }
}

export async function validateAllConfig(config: WebDAVConfig): Promise<CloudSyncResult | null> {
  if (!config || !validateConfig(config)) {
    return createValidationResult('配置未设置')
  }

  const urlValidation = validateUrl(config.url)
  if (!urlValidation.isValid) {
    return createValidationResult(urlValidation.error || '配置无效')
  }

  const passwordValidation = validatePassword(config.password || '')
  if (!passwordValidation.isValid) {
    return createValidationResult(passwordValidation.error || '配置无效')
  }

  if (config.encryption?.enabled && config.encryption?.key) {
    const keyValidation = validateEncryptionKey(config.encryption.key)
    if (!keyValidation.isValid) {
      return createValidationResult(keyValidation.error || '配置无效')
    }
  }

  return null
}

export function throwConfigError(errorMessage: string): never {
  const recovery = getErrorRecovery(new Error(errorMessage))
  const error = new Error(recovery.message) as Error & { recovery: string }
  error.recovery = recovery.actions
  throw error
}

export async function loadConfigForSync(masterKey: CryptoKey | null): Promise<WebDAVConfig | null> {
  if (!masterKey) {
    return null
  }
  try {
    const config = await loadAndDecryptConfig(masterKey)
    if (!config) {
      return null
    }

    const validationResult = await validateAllConfig(config)
    if (validationResult) {
      return null
    }

    return config
  } catch (error) {
    Logger.error('Failed to load config for sync', error)
    return null
  }
}

export async function getValidatedConfig(): Promise<WebDAVConfig> {
  const masterKey = await getMasterKey()

  if (masterKey) {
    const config = await loadConfigForSync(masterKey)
    if (config) {
      return config
    }
    throwConfigError('配置未设置或无效')
  }

  const storedConfig = await getConfig()
  if (!storedConfig) {
    throwConfigError('配置未设置')
  }

  if (!validateConfig(storedConfig)) {
    throwConfigError('配置无效')
  }

  const validationResult = await validateAllConfig(storedConfig)
  if (validationResult) {
    throwConfigError(validationResult.error || '配置无效')
  }

  return storedConfig
}
