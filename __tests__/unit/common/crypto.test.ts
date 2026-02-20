import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import {
  generateSalt,
  deriveMasterKey,
  encryptData,
  decryptData,
  hashPassword,
  verifyPasswordWithSalt,
  calculateKeyStrength,
  getAlgorithmParams,
  getIVLength,
  encrypt,
  decrypt,
  PBKDF2_ITERATIONS,
  SALT_LENGTH,
} from '~/common/crypto'
import type { HistoryItem } from '~/common/types'

describe('crypto', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      writable: true,
    })
  })

  describe('constants', () => {
    it('should have correct PBKDF2_ITERATIONS', () => {
      expect(PBKDF2_ITERATIONS).toBe(300000)
    })

    it('should have correct SALT_LENGTH', () => {
      expect(SALT_LENGTH).toBe(16)
    })
  })

  describe('generateSalt', () => {
    it('should generate a salt string', () => {
      const salt = generateSalt()
      expect(typeof salt).toBe('string')
      expect(salt.length).toBeGreaterThan(0)
    })

    it('should generate different salts', () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      expect(salt1).not.toBe(salt2)
    })
  })

  describe('calculateKeyStrength', () => {
    it('should return weak for short keys', () => {
      expect(calculateKeyStrength('short')).toBe('weak')
    })

    it('should return weak for simple keys', () => {
      expect(calculateKeyStrength('password123')).toBe('weak')
    })

    it('should return medium for better keys', () => {
      expect(calculateKeyStrength('Password123456')).toBe('medium')
    })

    it('should return strong for complex keys', () => {
      expect(calculateKeyStrength('Password123!@#')).toBe('strong')
    })
  })

  describe('hashPassword', () => {
    it('should hash password with salt and return salt + verificationData', async () => {
      const password = 'test-password'
      const result = await hashPassword(password)
      expect(result.salt).toBeDefined()
      expect(result.verificationData).toBeDefined()
      expect(result.salt.length).toBeGreaterThan(0)
      expect(result.verificationData.length).toBe(64)
    })

    it('should produce different salts for same password', async () => {
      const password = 'test-password'
      const result1 = await hashPassword(password)
      const result2 = await hashPassword(password)
      expect(result1.salt).not.toBe(result2.salt)
      expect(result1.verificationData).not.toBe(result2.verificationData)
    })

    it('should produce different verificationData for different passwords', async () => {
      const result1 = await hashPassword('password-1')
      const result2 = await hashPassword('password-2')
      expect(result1.verificationData).not.toBe(result2.verificationData)
    })
  })

  describe('verifyPasswordWithSalt', () => {
    it('should verify correct password', async () => {
      const password = 'test-password'
      const { salt, verificationData } = await hashPassword(password)
      const isValid = await verifyPasswordWithSalt(password, salt, verificationData)
      expect(isValid).toBe(true)
    })

    it('should reject wrong password', async () => {
      const password = 'test-password'
      const { salt, verificationData } = await hashPassword(password)
      const isValid = await verifyPasswordWithSalt('wrong-password', salt, verificationData)
      expect(isValid).toBe(false)
    })

    it('should reject with wrong salt', async () => {
      const password = 'test-password'
      const { verificationData } = await hashPassword(password)
      const wrongSalt = generateSalt()
      const isValid = await verifyPasswordWithSalt(password, wrongSalt, verificationData)
      expect(isValid).toBe(false)
    })
  })

  describe('encryption/decryption flow', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const masterPassword = 'test-master-password'
      const salt = generateSalt()
      const masterKey = await deriveMasterKey(masterPassword, salt)

      const originalData = 'secret-data'
      const encrypted = await encryptData(originalData, masterKey)

      expect(encrypted).not.toBe(originalData)

      const decrypted = await decryptData(encrypted, masterKey)
      expect(decrypted).toBe(originalData)
    })

    it('should fail to decrypt with wrong key', async () => {
      const masterPassword = 'test-master-password'
      const salt = generateSalt()
      const masterKey = await deriveMasterKey(masterPassword, salt)

      const wrongKey = await deriveMasterKey('wrong-password', salt)

      const originalData = 'secret-data'
      const encrypted = await encryptData(originalData, masterKey)

      await expect(decryptData(encrypted, wrongKey)).rejects.toThrow()
    })
  })

  describe('history encryption/decryption', () => {
    const mockHistory: HistoryItem[] = [
      {
        id: '1',
        url: 'https://example.com',
        title: 'Example',
        lastVisitTime: 1234567890,
        visitCount: 1,
      },
    ]

    it('should encrypt and decrypt history items', async () => {
      const key = 'encryption-key-123'
      const type = 'aes-256-gcm'

      const encrypted = await encrypt(mockHistory, key, type)
      expect(typeof encrypted).toBe('string')

      const decrypted = await decrypt(encrypted, key, type)
      expect(decrypted).toEqual(mockHistory)
    })

    it('should support different algorithms', async () => {
      const key = 'encryption-key-123'
      const algorithms = ['aes-256-gcm', 'aes-256-cbc', 'aes-256-ctr']

      for (const type of algorithms) {
        const encrypted = await encrypt(mockHistory, key, type)
        const decrypted = await decrypt(encrypted, key, type)
        expect(decrypted).toEqual(mockHistory)
      }
    })

    it('should fail integrity check if data is tampered', async () => {
      const key = 'encryption-key-123'
      const type = 'aes-256-gcm'

      const encrypted = await encrypt(mockHistory, key, type)

      const binaryString = atob(encrypted)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      bytes[bytes.length - 1] ^= 1

      let tampered = ''
      for (let i = 0; i < bytes.length; i++) {
        tampered += String.fromCharCode(bytes[i])
      }
      tampered = btoa(tampered)

      await expect(decrypt(tampered, key, type)).rejects.toThrow()
    })
  })

  describe('helper functions', () => {
    it('getAlgorithmParams should return correct params', () => {
      expect(getAlgorithmParams('aes-256-gcm')).toEqual({ name: 'AES-GCM', length: 256 })
      expect(getAlgorithmParams('aes-256-ctr')).toEqual({ name: 'AES-CTR', length: 256 })
      expect(getAlgorithmParams('chacha20-poly1305')).toEqual({
        name: 'ChaCha20-Poly1305',
        length: 256,
      })
      expect(getAlgorithmParams('unknown')).toEqual({ name: 'AES-CBC', length: 256 })
    })

    it('getIVLength should return correct length', () => {
      expect(getIVLength('aes-256-gcm')).toBe(12)
      expect(getIVLength('chacha20-poly1305')).toBe(12)
      expect(getIVLength('aes-256-cbc')).toBe(16)
    })
  })
})
