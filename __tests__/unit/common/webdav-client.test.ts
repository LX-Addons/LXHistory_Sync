import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import {
  isRetryableError,
  isRetryableStatus,
  fetchWithRetry,
  prepareUploadContent,
  handleHttpError,
  testWebDAVConnection,
  parseResponseData,
  createWebDAVClient,
  executeSync,
  fetchRemoteHistory,
  syncToCloud,
  syncFromCloud,
} from '~/common/webdav-client'
import * as crypto from '~/common/crypto'
import * as configManager from '~/common/config-manager'
import * as history from '~/common/history'
import type { WebDAVConfig } from '~/common/types'

vi.mock('~/common/crypto')
vi.mock('~/common/config-manager')
vi.mock('~/common/history')
vi.mock('~/common/logger')
vi.mock('~store', () => ({
  WEBDAV_FILENAME: 'history.json',
}))

describe('WebDAV Client', () => {
  const mockConfig: WebDAVConfig = {
    url: 'https://example.com/webdav',
    username: 'user',
    password: 'password',
    encryption: {
      enabled: false,
      key: '',
      type: 'aes-256-gcm',
    },
  }

  const mockHistoryItems = [
    {
      id: '1',
      url: 'https://example.com',
      title: 'Example',
      lastVisitTime: 1234567890,
      visitCount: 1,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    vi.mocked(configManager.getErrorRecovery).mockImplementation(error => ({
      message: error.message,
      actions: 'Recovery actions',
    }))
    vi.mocked(configManager.throwConfigError).mockImplementation(message => {
      throw new Error(message)
    })
  })

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true)
      expect(isRetryableError(new Error('Connection timed out'))).toBe(true)
      expect(isRetryableError(new Error('Failed to fetch'))).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isRetryableError(new Error('Invalid JSON'))).toBe(false)
      expect(isRetryableError(new Error('Authentication failed'))).toBe(false)
    })
  })

  describe('isRetryableStatus', () => {
    it('should return true for retryable status codes', () => {
      expect(isRetryableStatus(0)).toBe(true)
      expect(isRetryableStatus(408)).toBe(true)
      expect(isRetryableStatus(429)).toBe(true)
      expect(isRetryableStatus(500)).toBe(true)
      expect(isRetryableStatus(503)).toBe(true)
    })

    it('should return false for non-retryable status codes', () => {
      expect(isRetryableStatus(200)).toBe(false)
      expect(isRetryableStatus(404)).toBe(false)
      expect(isRetryableStatus(401)).toBe(false)
      expect(isRetryableStatus(403)).toBe(false)
    })
  })

  describe('fetchWithRetry', () => {
    it('should return response on success', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: true, status: 200 })
      const response = await fetchWithRetry('https://example.com', {})
      expect(response.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable error', async () => {
      ;(global.fetch as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 })

      const response = await fetchWithRetry('https://example.com', {}, 3, 10)
      expect(response.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw after max retries', async () => {
      ;(global.fetch as Mock).mockRejectedValue(new Error('Network error'))

      await expect(fetchWithRetry('https://example.com', {}, 3, 10)).rejects.toThrow(
        'Network error'
      )
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should throw on 403 Forbidden', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 403 })
      await expect(fetchWithRetry('https://example.com', {})).rejects.toThrow(
        'Authentication failed'
      )
    })

    it('should retry on 500 Server Error', async () => {
      ;(global.fetch as Mock)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 })

      const response = await fetchWithRetry('https://example.com', {}, 3, 10)
      expect(response.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw immediately for non-retryable error', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 400 })
      await expect(fetchWithRetry('https://example.com', {})).rejects.toThrow('HTTP error 400')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should wait between retries', async () => {
      vi.useFakeTimers()
      ;(global.fetch as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 })

      const promise = fetchWithRetry('https://example.com', {}, 3, 1000)

      await vi.advanceTimersByTimeAsync(1000)

      const response = await promise
      expect(response.ok).toBe(true)
      vi.useRealTimers()
    })

    it('should return 404 response without retry', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 404 })
      const response = await fetchWithRetry('https://example.com', {})
      expect(response.status).toBe(404)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw on 401 Unauthorized', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 401 })
      await expect(fetchWithRetry('https://example.com', {})).rejects.toThrow(
        'Authentication failed'
      )
    })

    it('should throw non-retryable error after retry', async () => {
      ;(global.fetch as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: false, status: 400 })

      await expect(fetchWithRetry('https://example.com', {}, 3, 10)).rejects.toThrow()
    })

    it('should throw unknown error when maxRetries is 0', async () => {
      await expect(fetchWithRetry('https://example.com', {}, 0, 10)).rejects.toThrow(
        'Unknown error occurred'
      )
    })
  })

  describe('prepareUploadContent', () => {
    it('should return JSON content when encryption is disabled', async () => {
      const result = await prepareUploadContent(mockHistoryItems, mockConfig)
      expect(result.contentType).toBe('application/json')
      expect(JSON.parse(result.content)).toEqual(mockHistoryItems)
    })

    it('should return encrypted content when encryption is enabled', async () => {
      const encryptedConfig: WebDAVConfig = {
        ...mockConfig,
        encryption: { enabled: true, key: 'secret', type: 'aes-256-gcm' },
      }
      vi.mocked(crypto.generateSalt).mockReturnValue('salt')
      vi.mocked(crypto.encrypt).mockResolvedValue('encrypted-data')

      const result = await prepareUploadContent(mockHistoryItems, encryptedConfig)
      expect(result.contentType).toBe('application/octet-stream')
      expect(result.content).toBe('encrypted-data')
    })
  })

  describe('handleHttpError', () => {
    it('should return correct error message for 401', () => {
      const result = handleHttpError({ status: 401 } as Response)
      expect(result.error).toBe('认证失败，请检查用户名和密码')
    })

    it('should return correct error message for 403', () => {
      const result = handleHttpError({ status: 403 } as Response)
      expect(result.error).toBe('没有权限访问 WebDAV 服务器')
    })

    it('should return correct error message for 404', () => {
      const result = handleHttpError({ status: 404 } as Response)
      expect(result.error).toBe('WebDAV 服务器路径不存在')
    })

    it('should return correct error message for 500', () => {
      const result = handleHttpError({ status: 500 } as Response)
      expect(result.error).toBe('WebDAV 服务器内部错误')
    })

    it('should return correct error message for 0', () => {
      const result = handleHttpError({ status: 0 } as Response)
      expect(result.error).toBe('无法连接到 WebDAV 服务器，请检查网络连接')
    })

    it('should return default error message for unknown status', () => {
      const result = handleHttpError({ status: 418 } as Response)
      expect(result.error).toBe('同步失败')
    })
  })

  describe('testWebDAVConnection', () => {
    it('should return success when connection works', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: true, status: 200 })
      const result = await testWebDAVConnection(mockConfig)
      expect(result.success).toBe(true)
    })

    it('should return failure when config is incomplete', async () => {
      const result = await testWebDAVConnection({ ...mockConfig, url: '' })
      expect(result.success).toBe(false)
    })

    it('should return success for 207 Multi-Status', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 207 })
      const result = await testWebDAVConnection(mockConfig)
      expect(result.success).toBe(true)
    })

    it('should return failure with error message from handleHttpError', async () => {
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 404 })
      const result = await testWebDAVConnection(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toBe('WebDAV 服务器路径不存在')
    })

    it('should return failure when connection fails', async () => {
      ;(global.fetch as Mock).mockRejectedValue(new Error('Network error'))
      const result = await testWebDAVConnection(mockConfig)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('parseResponseData', () => {
    it('should parse JSON response when encryption is disabled', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue(mockHistoryItems),
      } as unknown as Response
      const result = await parseResponseData(mockResponse, mockConfig)
      expect(result).toEqual(mockHistoryItems)
    })

    it('should decrypt response when encryption is enabled', async () => {
      const encryptedConfig: WebDAVConfig = {
        ...mockConfig,
        encryption: { enabled: true, key: 'secret', type: 'aes-256-gcm' },
      }
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
      }
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(mockBlob),
      } as unknown as Response

      vi.mocked(crypto.decrypt).mockResolvedValue(mockHistoryItems)

      const result = await parseResponseData(mockResponse, encryptedConfig)
      expect(result).toEqual(mockHistoryItems)
      expect(crypto.decrypt).toHaveBeenCalled()
    })
    it('should handle large encrypted data in chunks', async () => {
      const encryptedConfig: WebDAVConfig = {
        ...mockConfig,
        encryption: { enabled: true, key: 'secret', type: 'aes-256-gcm' },
      }
      // Create a large buffer > 65536
      const largeBuffer = new Uint8Array(70000)
      const mockBlob = {
        arrayBuffer: vi.fn().mockResolvedValue(largeBuffer.buffer),
      }
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(mockBlob),
      } as unknown as Response

      vi.mocked(crypto.decrypt).mockResolvedValue(mockHistoryItems)

      await parseResponseData(mockResponse, encryptedConfig)
      expect(crypto.decrypt).toHaveBeenCalled()
    })
  })

  describe('createWebDAVClient', () => {
    it('should create a client with fetch method', async () => {
      const client = await createWebDAVClient(mockConfig)
      expect(client.fetch).toBeDefined()
      ;(global.fetch as Mock).mockResolvedValue({ ok: true })
      await client.fetch('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(mockConfig.url),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      )
    })
  })

  describe('executeSync', () => {
    it('should execute operation with context', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      const operation = vi.fn().mockResolvedValue('success')

      const result = await executeSync(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledWith(
        expect.objectContaining({
          config: mockConfig,
          client: expect.any(Object),
        })
      )
      expect(configManager.clearSessionConfig).toHaveBeenCalled()
    })

    it('should handle errors and clear session', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      const error = new Error('Sync failed')
      const operation = vi.fn().mockRejectedValue(error)
      vi.mocked(configManager.getErrorRecovery).mockReturnValue({
        message: 'Error',
        actions: 'Retry',
      })

      await expect(executeSync(operation)).rejects.toThrow()
      expect(configManager.clearSessionConfig).toHaveBeenCalled()
    })

    it('should re-throw error with recovery property', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      const errorWithRecovery = Object.assign(new Error('Auth error'), { recovery: 'Retry' })
      const operation = vi.fn().mockRejectedValue(errorWithRecovery)

      await expect(executeSync(operation)).rejects.toThrow('Auth error')
      expect(configManager.clearSessionConfig).toHaveBeenCalled()
    })
  })

  describe('fetchRemoteHistory', () => {
    it('should return empty array on 404', async () => {
      const mockClient = { fetch: vi.fn().mockResolvedValue({ status: 404 }) }
      const result = await fetchRemoteHistory(mockClient, mockConfig)
      expect(result).toEqual([])
    })

    it('should return parsed data on success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockHistoryItems),
      }
      const mockClient = { fetch: vi.fn().mockResolvedValue(mockResponse) }

      const result = await fetchRemoteHistory(mockClient, mockConfig)
      expect(result).toEqual(mockHistoryItems)
    })
    it('should throw config error on failure', async () => {
      const mockResponse = { ok: false, status: 500 }
      const mockClient = { fetch: vi.fn().mockResolvedValue(mockResponse) }

      await expect(fetchRemoteHistory(mockClient, mockConfig)).rejects.toThrow()
    })

    it('should throw config error on invalid data format', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ not: 'an array' }),
      }
      const mockClient = { fetch: vi.fn().mockResolvedValue(mockResponse) }

      await expect(fetchRemoteHistory(mockClient, mockConfig)).rejects.toThrow('云端数据格式错误')
    })
  })

  describe('syncToCloud', () => {
    it('should sync local history to cloud', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      const mockResponse = { ok: true, status: 200 }
      ;(global.fetch as Mock).mockResolvedValue(mockResponse)
      vi.mocked(history.mergeHistory).mockReturnValue({
        items: mockHistoryItems,
        totalItems: 1,
        localOnly: 0,
        remoteOnly: 0,
        updated: 0,
      })

      const result = await syncToCloud(mockHistoryItems)

      expect(result.success).toBe(true)
      expect(result.items).toEqual(mockHistoryItems)
    })
    it('should handle first sync (no remote history)', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      const mockResponse = { ok: true, status: 200 }
      // First call fails (404), second call succeeds (PUT)
      ;(global.fetch as Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce(mockResponse)

      vi.mocked(history.mergeHistory).mockReturnValue({
        items: mockHistoryItems,
        totalItems: 1,
        localOnly: 1,
        remoteOnly: 0,
        updated: 0,
      })

      const result = await syncToCloud(mockHistoryItems)
      expect(result.success).toBe(true)
    })

    it('should throw on upload failure', async () => {
      vi.useFakeTimers()
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock)
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => [] }) // GET success
        .mockResolvedValue({ ok: false, status: 500 }) // PUT fail (all retries)

      vi.mocked(history.mergeHistory).mockReturnValue({
        items: [],
        totalItems: 0,
        localOnly: 0,
        remoteOnly: 0,
        updated: 0,
      })

      const promise = syncToCloud(mockHistoryItems)

      // Prevent unhandled rejection
      promise.catch(() => {})

      // Fast-forward through all retries
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })

    it('should return error result on 404 upload response', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock)
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => [] }) // GET success
        .mockResolvedValueOnce({ ok: false, status: 404 }) // PUT fail (404 is not retried by fetchWithRetry but handled by syncToCloud)

      vi.mocked(history.mergeHistory).mockReturnValue({
        items: [],
        totalItems: 0,
        localOnly: 0,
        remoteOnly: 0,
        updated: 0,
      })

      const result = await syncToCloud(mockHistoryItems)
      expect(result.success).toBe(false)
    })
  })

  describe('syncFromCloud', () => {
    it('should sync history from cloud', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockHistoryItems),
      }
      ;(global.fetch as Mock).mockResolvedValue(mockResponse)

      const result = await syncFromCloud()

      expect(result).toEqual(mockHistoryItems)
    })
    it('should return empty array on 404', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 404 })

      const result = await syncFromCloud()
      expect(result).toEqual([])
    })

    it('should throw on server error', async () => {
      vi.useFakeTimers()
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 500 })

      const promise = syncFromCloud()
      promise.catch(() => {})

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })

    it('should throw on non-404 error', async () => {
      vi.useFakeTimers()
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 403 })

      const promise = syncFromCloud()
      promise.catch(() => {})

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })

    it('should throw on fetch error', async () => {
      vi.useFakeTimers()
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 500 })

      const promise = syncFromCloud()

      // Prevent unhandled rejection
      promise.catch(() => {})

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })

    it('should throw on invalid data format', async () => {
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ not: 'an array' }),
      })

      await expect(syncFromCloud()).rejects.toThrow('云端数据格式错误')
    })

    it('should throw immediately on authentication error', async () => {
      vi.useFakeTimers()
      vi.mocked(configManager.getValidatedConfig).mockResolvedValue(mockConfig)
      ;(global.fetch as Mock).mockResolvedValue({ ok: false, status: 401 })

      const promise = syncFromCloud()
      promise.catch(() => {})

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })
  })
})
