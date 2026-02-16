import type { HistoryItem, KeyStrength } from './types'
import { Logger } from './logger'
import { APP_NAME } from './utils'

export const PBKDF2_ITERATIONS = 300000
export const SALT_LENGTH = 16

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return btoa(String.fromCharCode(...salt))
}

export async function deriveMasterKey(masterPassword: string, salt: string): Promise<CryptoKey> {
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

export async function encryptData(data: string, key: CryptoKey): Promise<string> {
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

export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
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

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function calculateKeyStrength(key: string): KeyStrength {
  if (!key || key.length < 12) return 'weak'

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

export function getAlgorithmParams(algorithm: string): { name: string; length: number } {
  switch (algorithm) {
    case 'aes-256-gcm':
      return { name: 'AES-GCM', length: 256 }
    case 'aes-256-ctr':
      return { name: 'AES-CTR', length: 256 }
    case 'chacha20-poly1305':
      return { name: 'ChaCha20-Poly1305', length: 256 }
    case 'aes-256-cbc':
    default:
      return { name: 'AES-CBC', length: 256 }
  }
}

export async function deriveKey(
  keyMaterial: CryptoKey,
  salt: string,
  algorithm: string,
  usage: 'encrypt' | 'decrypt'
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const params = getAlgorithmParams(algorithm)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    params,
    false,
    [usage]
  )
}

export async function deriveEncryptionKey(
  keyMaterial: CryptoKey,
  salt: string,
  algorithm: string
): Promise<CryptoKey> {
  return deriveKey(keyMaterial, salt, algorithm, 'encrypt')
}

export function getIVLength(algorithm: string): number {
  switch (algorithm) {
    case 'aes-256-gcm':
    case 'chacha20-poly1305':
      return 12
    case 'aes-256-ctr':
    case 'aes-256-cbc':
    default:
      return 16
  }
}

export function createAlgorithm(
  type: string,
  iv: Uint8Array
): AlgorithmIdentifier | AesCtrParams | AesGcmParams {
  const encoder = new TextEncoder()

  switch (type) {
    case 'aes-256-gcm':
      return {
        name: 'AES-GCM',
        iv,
        additionalData: encoder.encode(APP_NAME),
      }
    case 'aes-256-ctr':
      return {
        name: 'AES-CTR',
        counter: iv,
        length: 128,
      }
    case 'chacha20-poly1305':
      return {
        name: 'ChaCha20-Poly1305',
        counter: iv,
        length: 96,
        additionalData: encoder.encode(APP_NAME),
      }
    case 'aes-256-cbc':
    default:
      return {
        name: 'AES-CBC',
        iv,
      }
  }
}

export async function encrypt(
  data: HistoryItem[],
  key: string,
  type: string,
  salt?: string
): Promise<string> {
  try {
    const jsonData = JSON.stringify(data)
    const encoder = new TextEncoder()
    const actualSalt = salt || generateSalt()

    const saltBinary = atob(actualSalt)
    const saltBytes = new Uint8Array(saltBinary.length)
    for (let i = 0; i < saltBinary.length; i++) {
      saltBytes[i] = saltBinary.charCodeAt(i)
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    const encryptionKey = await deriveEncryptionKey(keyMaterial, actualSalt, type)
    const ivLength = getIVLength(type)
    const iv = crypto.getRandomValues(new Uint8Array(ivLength))
    const algorithm = createAlgorithm(type, iv)

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

    const dataToSign = new Uint8Array(saltBytes.length + iv.length + encrypted.byteLength)
    dataToSign.set(saltBytes, 0)
    dataToSign.set(iv, saltBytes.length)
    dataToSign.set(new Uint8Array(encrypted), saltBytes.length + iv.length)

    const signature = await crypto.subtle.sign('HMAC', hmacKey, dataToSign)

    const combined = new Uint8Array(
      saltBytes.length + iv.length + encrypted.byteLength + signature.byteLength
    )
    combined.set(saltBytes, 0)
    combined.set(iv, saltBytes.length)
    combined.set(new Uint8Array(encrypted), saltBytes.length + iv.length)
    combined.set(new Uint8Array(signature), saltBytes.length + iv.length + encrypted.byteLength)

    const CHUNK_SIZE = 65536
    let binaryString = ''
    for (let i = 0; i < combined.length; i += CHUNK_SIZE) {
      const chunk = combined.slice(i, i + CHUNK_SIZE)
      binaryString += String.fromCharCode(...chunk)
    }
    return btoa(binaryString)
  } catch (error) {
    Logger.error('Encryption failed', error)
    throw new Error('加密失败', { cause: error })
  }
}

export async function deriveDecryptionKey(
  keyMaterial: CryptoKey,
  salt: string,
  algorithm: string
): Promise<CryptoKey> {
  return deriveKey(keyMaterial, salt, algorithm, 'decrypt')
}

export async function decrypt(
  encryptedData: string,
  key: string,
  type: string
): Promise<HistoryItem[]> {
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

    const ivLength = getIVLength(type)
    const signatureLength = 32

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

    const decryptionKey = await deriveDecryptionKey(keyMaterial, salt, type)
    const iv = combined.slice(saltLength, saltLength + ivLength)
    const encrypted = combined.slice(
      saltLength + ivLength,
      saltLength + ivLength + encryptedDataLength
    )
    const algorithm = createAlgorithm(type, iv)

    const decrypted = await crypto.subtle.decrypt(algorithm, decryptionKey, encrypted)

    const decoder = new TextDecoder()
    const jsonData = decoder.decode(decrypted)

    return JSON.parse(jsonData) as HistoryItem[]
  } catch (error) {
    Logger.error('Decryption failed', error)
    throw new Error('解密失败，请检查加密密钥是否正确', { cause: error })
  }
}
