import { Storage } from '@plasmohq/storage'
import type { HistoryItem, WebDAVConfig, CloudSyncResult, KeyStrength } from './types'
import { mergeHistory } from './history'
import { WEBDAV_FILENAME } from '~store'

const storage = new Storage()
const PBKDF2_ITERATIONS = 300000
const SALT_LENGTH = 16

async function getSessionConfig(): Promise<WebDAVConfig | null> {
  try {
    const sessionConfig = await chrome.storage.session.get('webdav_config')
    if (sessionConfig?.webdav_config) {
      return sessionConfig.webdav_config as WebDAVConfig
    }
  } catch {}
  return null
}

async function setSessionConfig(config: WebDAVConfig): Promise<void> {
  try {
    await chrome.storage.session.set({ webdav_config: config })
  } catch {}
}

async function clearSessionConfig(): Promise<void> {
  try {
    await chrome.storage.session.remove('webdav_config')
  } catch {}
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const currentLogLevel = LogLevel.INFO

function log(level: LogLevel, message: string, data?: any): void {
  if (level >= currentLogLevel) {
    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]
    const logMessage = `[${timestamp}] [${levelName}] ${message}`

    if (level === LogLevel.ERROR) {
      console.error(logMessage, data)
    } else if (level === LogLevel.WARN) {
      console.warn(logMessage, data)
    } else if (level === LogLevel.INFO) {
      console.log(logMessage, data)
    } else {
      console.log(logMessage, data)
    }
  }
}

interface ErrorRecovery {
  message: string
  actions: string[]
}

function getErrorRecovery(error: Error): ErrorRecovery {
  const errorMessage = error.message.toLowerCase()

  if (errorMessage.includes('认证失败') || errorMessage.includes('authentication')) {
    return {
      message: '认证失败',
      actions: [
        '检查WebDAV用户名和密码是否正确',
        '确认WebDAV服务器是否正常运行',
        '尝试重新登录WebDAV服务',
      ],
    }
  }

  if (errorMessage.includes('网络') || errorMessage.includes('connection')) {
    return {
      message: '网络连接失败',
      actions: [
        '检查网络连接是否正常',
        '确认WebDAV服务器地址是否正确',
        '尝试使用其他网络连接',
        '检查防火墙设置',
      ],
    }
  }

  if (errorMessage.includes('解密') || errorMessage.includes('decrypt')) {
    return {
      message: '解密失败',
      actions: [
        '检查主密码是否正确',
        '确认加密密钥是否正确',
        '尝试重新设置主密码',
        '清除加密数据并重新配置',
      ],
    }
  }

  if (errorMessage.includes('配置') || errorMessage.includes('config')) {
    return {
      message: '配置错误',
      actions: [
        '检查WebDAV配置是否完整',
        '确认URL格式是否正确（必须使用HTTPS）',
        '验证用户名和密码是否已填写',
        '重新保存配置',
      ],
    }
  }

  if (errorMessage.includes('格式') || errorMessage.includes('format')) {
    return {
      message: '数据格式错误',
      actions: [
        '确认云端数据是否完整',
        '尝试从云端重新同步',
        '清除本地历史记录并重新同步',
        '联系WebDAV服务提供商',
      ],
    }
  }

  return {
    message: '未知错误',
    actions: ['刷新页面重试', '检查浏览器控制台获取详细信息', '清除浏览器缓存', '重启浏览器'],
  }
}

function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return btoa(String.fromCharCode(...salt))
}

async function deriveMasterKey(masterPassword: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(data)
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  const binaryData = atob(encryptedData)
  const combined = new Uint8Array(binaryData.length)
  for (let i = 0; i < binaryData.length; i++) {
    combined[i] = binaryData.charCodeAt(i)
  }

  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  const decoder = new TextDecoder()
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encrypted
  )

  return decoder.decode(decrypted)
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getMasterKey(): Promise<CryptoKey | null> {
  const masterPasswordData = await storage.get<{ hash: string; salt: string }>(
    'master_password_data'
  )
  if (!masterPasswordData || !masterPasswordData.salt) {
    return null
  }

  const inputPassword = await storage.get<string>('master_password_input')
  if (!inputPassword) {
    return null
  }

  return await deriveMasterKey(inputPassword, masterPasswordData.salt)
}

async function verifyMasterPassword(password: string): Promise<boolean> {
  const masterPasswordData = await storage.get<{ hash: string; salt: string }>(
    'master_password_data'
  )
  if (!masterPasswordData || !masterPasswordData.hash) {
    return false
  }

  const inputHash = await hashPassword(password)
  return inputHash === masterPasswordData.hash
}

async function setMasterPassword(password: string): Promise<void> {
  const hash = await hashPassword(password)
  const salt = generateSalt()
  await storage.set('master_password_data', { hash, salt })
  await storage.set('master_password_input', password)
}

async function clearMasterPassword(): Promise<void> {
  await storage.remove('master_password_data')
  await storage.remove('master_password_input')
}

function calculateKeyStrength(key: string): KeyStrength {
  if (!key || key.length < 8) return 'weak'

  let strength = 0
  if (key.length >= 12) strength++
  if (key.length >= 16) strength++
  if (/[A-Z]/.test(key)) strength++
  if (/[a-z]/.test(key)) strength++
  if (/[0-9]/.test(key)) strength++
  if (/[^A-Za-z0-9]/.test(key)) strength++

  if (strength >= 5) return 'strong'
  if (strength >= 3) return 'medium'
  return 'weak'
}

async function encrypt(data: any, key: string, type: string, salt?: string): Promise<string> {
  try {
    const jsonData = JSON.stringify(data)
    const encoder = new TextEncoder()
    const actualSalt = salt || generateSalt()

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    let encryptionKey: CryptoKey
    let algorithm: AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams
    let iv: Uint8Array
    let additionalData: Uint8Array

    switch (type) {
      case 'aes-256-gcm':
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(actualSalt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        )
        iv = crypto.getRandomValues(new Uint8Array(12))
        additionalData = encoder.encode('LXHistory_Sync')
        algorithm = {
          name: 'AES-GCM',
          iv,
          additionalData,
        }
        break
      case 'aes-256-ctr':
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(actualSalt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-CTR', length: 256 },
          false,
          ['encrypt']
        )
        iv = crypto.getRandomValues(new Uint8Array(16))
        algorithm = {
          name: 'AES-CTR',
          counter: iv,
          length: 128,
        }
        break
      case 'chacha20-poly1305':
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(actualSalt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'ChaCha20-Poly1305', length: 256 },
          false,
          ['encrypt']
        )
        iv = crypto.getRandomValues(new Uint8Array(12))
        additionalData = encoder.encode('LXHistory_Sync')
        algorithm = {
          name: 'ChaCha20-Poly1305',
          counter: iv,
          length: 96,
          additionalData,
        }
        break
      case 'aes-256-cbc':
      default:
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(actualSalt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-CBC', length: 256 },
          false,
          ['encrypt']
        )
        iv = crypto.getRandomValues(new Uint8Array(16))
        algorithm = {
          name: 'AES-CBC',
          iv,
        }
        break
    }

    const encrypted = await crypto.subtle.encrypt(
      algorithm,
      encryptionKey,
      encoder.encode(jsonData)
    )

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const dataToSign = new Uint8Array(iv.length + encrypted.byteLength)
    dataToSign.set(iv, 0)
    dataToSign.set(new Uint8Array(encrypted), iv.length)

    const signature = await crypto.subtle.sign('HMAC', hmacKey, dataToSign)

    const combined = new Uint8Array(
      actualSalt.length + iv.length + encrypted.byteLength + signature.byteLength
    )
    combined.set(encoder.encode(actualSalt), 0)
    combined.set(iv, actualSalt.length)
    combined.set(new Uint8Array(encrypted), actualSalt.length + iv.length)
    combined.set(new Uint8Array(signature), actualSalt.length + iv.length + encrypted.byteLength)

    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('加密失败', { cause: error })
  }
}

async function decrypt(encryptedData: string, key: string, type: string): Promise<any> {
  try {
    const binaryData = atob(encryptedData)
    const combined = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      combined[i] = binaryData.charCodeAt(i)
    }

    const encoder = new TextEncoder()
    const saltLength = SALT_LENGTH
    const saltBytes = combined.slice(0, saltLength)
    const salt = btoa(String.fromCharCode(...saltBytes))

    let ivLength: number
    const signatureLength = 32

    switch (type) {
      case 'aes-256-gcm':
      case 'chacha20-poly1305':
        ivLength = 12
        break
      case 'aes-256-ctr':
      case 'aes-256-cbc':
      default:
        ivLength = 16
        break
    }

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const encryptedDataLength = combined.length - saltLength - ivLength - signatureLength
    const dataToVerify = new Uint8Array(saltLength + ivLength + encryptedDataLength)
    dataToVerify.set(combined.slice(0, saltLength + ivLength + encryptedDataLength), 0)

    const storedSignature = combined.slice(saltLength + ivLength + encryptedDataLength)
    const isValid = await crypto.subtle.verify('HMAC', hmacKey, storedSignature, dataToVerify)

    if (!isValid) {
      throw new Error('数据完整性验证失败')
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    let decryptionKey: CryptoKey
    let algorithm: AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams
    let iv: Uint8Array
    let encrypted: Uint8Array
    let additionalData: Uint8Array

    switch (type) {
      case 'aes-256-gcm':
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        )
        iv = combined.slice(saltLength, saltLength + ivLength)
        encrypted = combined.slice(
          saltLength + ivLength,
          saltLength + ivLength + encryptedDataLength
        )
        additionalData = encoder.encode('LXHistory_Sync')
        algorithm = {
          name: 'AES-GCM',
          iv,
          additionalData,
        }
        break
      case 'aes-256-ctr':
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-CTR', length: 256 },
          false,
          ['decrypt']
        )
        iv = combined.slice(saltLength, saltLength + ivLength)
        encrypted = combined.slice(
          saltLength + ivLength,
          saltLength + ivLength + encryptedDataLength
        )
        algorithm = {
          name: 'AES-CTR',
          counter: iv,
          length: 128,
        }
        break
      case 'chacha20-poly1305':
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'ChaCha20-Poly1305', length: 256 },
          false,
          ['decrypt']
        )
        iv = combined.slice(saltLength, saltLength + ivLength)
        encrypted = combined.slice(
          saltLength + ivLength,
          saltLength + ivLength + encryptedDataLength
        )
        additionalData = encoder.encode('LXHistory_Sync')
        algorithm = {
          name: 'ChaCha20-Poly1305',
          counter: iv,
          length: 96,
          additionalData,
        }
        break
      case 'aes-256-cbc':
      default:
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-CBC', length: 256 },
          false,
          ['decrypt']
        )
        iv = combined.slice(saltLength, saltLength + ivLength)
        encrypted = combined.slice(
          saltLength + ivLength,
          saltLength + ivLength + encryptedDataLength
        )
        algorithm = {
          name: 'AES-CBC',
          iv,
        }
        break
    }

    const decrypted = await crypto.subtle.decrypt(algorithm, decryptionKey, encrypted)

    const decoder = new TextDecoder()
    const jsonData = decoder.decode(decrypted)

    return JSON.parse(jsonData)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('解密失败，请检查加密密钥是否正确', { cause: error })
  }
}

async function getConfig(): Promise<WebDAVConfig | null> {
  const config = await storage.get('webdav_config')
  if (typeof config === 'object' && config !== null) {
    return config as WebDAVConfig
  }
  return null
}

function validateConfig(config: WebDAVConfig): boolean {
  return !!config && !!config.url && !!config.username
}

function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url)

    if (urlObj.protocol !== 'https:') {
      return { isValid: false, error: 'WebDAV 服务器必须使用 HTTPS 协议' }
    }

    if (!urlObj.hostname) {
      return { isValid: false, error: '无效的 WebDAV 服务器地址' }
    }

    return { isValid: true }
  } catch {
    return { isValid: false, error: '无效的 URL 格式' }
  }
}

function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: '密码长度至少为 8 个字符' }
  }

  return { isValid: true }
}

function validateEncryptionKey(key: string): {
  isValid: boolean
  strength: KeyStrength
  error?: string
} {
  if (!key || key.length < 8) {
    return { isValid: false, strength: 'weak', error: '加密密钥长度至少为 8 个字符' }
  }

  const strength = calculateKeyStrength(key)

  if (strength === 'weak') {
    return { isValid: true, strength, error: '建议使用更强的加密密钥' }
  }

  return { isValid: true, strength }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok || response.status === 404) {
        return response
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed')
      }

      throw new Error(`HTTP error ${response.status}`)
    } catch (error: any) {
      lastError = error

      if (error.message === 'Authentication failed') {
        throw error
      }

      console.warn(`Attempt ${attempt + 1} failed: ${error.message}`)

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError
}

async function loadAndDecryptConfig(masterKey: CryptoKey): Promise<WebDAVConfig | null> {
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

function createValidationResult(errorMessage: string): CloudSyncResult {
  const recovery = getErrorRecovery(new Error(errorMessage))
  return {
    success: false,
    error: recovery.message,
    message: recovery.message,
    recovery: recovery.actions,
  }
}

function validateAllConfig(config: WebDAVConfig): CloudSyncResult | null {
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

async function prepareUploadContent(
  merged: HistoryItem[],
  config: WebDAVConfig
): Promise<{ content: string; contentType: string }> {
  if (config.encryption?.enabled && config.encryption?.key) {
    const salt = config.encryption.salt || generateSalt()
    const content = await encrypt(merged, config.encryption.key, config.encryption.type, salt)
    return { content, contentType: 'application/octet-stream' }
  }

  return {
    content: JSON.stringify(merged),
    contentType: 'application/json',
  }
}

function handleHttpError(response: Response): CloudSyncResult {
  let errorMessage = '同步失败'

  switch (response.status) {
    case 401:
      errorMessage = '认证失败，请检查用户名和密码'
      break
    case 404:
      errorMessage = 'WebDAV 服务器路径不存在'
      break
    case 403:
      errorMessage = '没有权限访问 WebDAV 服务器'
      break
    case 500:
      errorMessage = 'WebDAV 服务器内部错误'
      break
    case 0:
      errorMessage = '无法连接到 WebDAV 服务器，请检查网络连接'
      break
  }

  return createValidationResult(errorMessage)
}

async function parseResponseData(response: Response, config: WebDAVConfig): Promise<any> {
  if (config.encryption?.enabled && config.encryption?.key) {
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const encryptedData = btoa(String.fromCharCode(...uint8Array))
    return await decrypt(encryptedData, config.encryption.key, config.encryption.type)
  }

  return await response.json()
}

function throwConfigError(errorMessage: string): never {
  const recovery = getErrorRecovery(new Error(errorMessage))
  const error = new Error(recovery.message) as Error & { recovery: string[] }
  error.recovery = recovery.actions
  throw error
}

export async function syncToCloud(localHistory: HistoryItem[]): Promise<CloudSyncResult> {
  try {
    const masterKey = await getMasterKey()
    if (!masterKey) {
      return {
        success: false,
        error: '请先设置主密码以保护您的数据',
        message: '请先设置主密码以保护您的数据',
      }
    }

    let config: WebDAVConfig | null = null
    try {
      config = await loadAndDecryptConfig(masterKey)
    } catch {
      return createValidationResult('无法解密配置，请检查主密码')
    }

    if (!config) {
      return createValidationResult('配置未设置')
    }

    const validationResult = validateAllConfig(config)
    if (validationResult) {
      return validationResult
    }

    let remoteHistory: HistoryItem[] = []
    try {
      remoteHistory = await syncFromCloud()
    } catch {
      console.log('No remote history found or first sync')
    }

    const merged = await mergeHistory(localHistory, remoteHistory)
    const { content, contentType } = await prepareUploadContent(merged, config)

    const response = await fetchWithRetry(`${config.url.replace(/\/$/, '')}/${WEBDAV_FILENAME}`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${btoa(config.username + ':' + (config.password || ''))}`,
        'Content-Type': contentType,
      },
      body: content,
    })

    if (!response.ok) {
      return handleHttpError(response)
    }

    return {
      success: true,
      items: merged,
      message: '同步到云端成功！已合并数据。',
    }
  } catch (error: unknown) {
    const recovery = getErrorRecovery(error as Error)
    return {
      success: false,
      error: recovery.message,
      message: recovery.message,
      recovery: recovery.actions,
    }
  } finally {
    await clearSessionConfig()
  }
}

export async function syncFromCloud(): Promise<HistoryItem[]> {
  let config: WebDAVConfig | null = null

  try {
    const masterKey = await getMasterKey()
    if (!masterKey) {
      throwConfigError('请先设置主密码以保护您的数据')
    }

    try {
      config = await loadAndDecryptConfig(masterKey)
    } catch {
      throwConfigError('无法解密配置，请检查主密码')
    }

    if (!config) {
      throwConfigError('配置未设置')
    }

    const validationResult = validateAllConfig(config)
    if (validationResult) {
      throwConfigError(validationResult.error || '配置无效')
    }

    const response = await fetchWithRetry(`${config.url.replace(/\/$/, '')}/${WEBDAV_FILENAME}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(config.username + ':' + (config.password || ''))}`,
      },
    })

    if (response.status === 404) return []

    if (!response.ok) {
      const httpError = handleHttpError(response)
      throwConfigError(httpError.error || '同步失败')
    }

    const data = await parseResponseData(response, config)

    if (!Array.isArray(data)) {
      throwConfigError('云端数据格式错误')
    }

    return data
  } catch (error: any) {
    console.error('Sync from cloud failed:', error.message)
    throw error
  } finally {
    await clearSessionConfig()
  }
}

export {
  calculateKeyStrength,
  validateUrl,
  validatePassword,
  validateEncryptionKey,
  getMasterKey,
  setMasterPassword,
  clearMasterPassword,
  verifyMasterPassword,
  log,
  encryptData,
  decryptData,
}
