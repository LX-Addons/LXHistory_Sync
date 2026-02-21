import { decrypt, encrypt, generateSalt } from './crypto'
import {
  clearSessionConfig,
  getErrorRecovery,
  getValidatedConfig,
  throwConfigError,
} from './config-manager'
import { mergeHistory } from './history'
import { WEBDAV_FILENAME } from '~store'
import { Logger } from './logger'
import type { CloudSyncResult, HistoryItem, WebDAVConfig } from './types'

export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'network',
    'connection',
    'timeout',
    'abort',
    'fetch',
    'failed to fetch',
    'networkerror',
    'err_connection',
    'err_internet',
  ]
  const errorMessage = error.message.toLowerCase()
  return retryableMessages.some(msg => errorMessage.includes(msg))
}

export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || (status >= 500 && status < 600)
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok || response.status === 404) {
        return response
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed')
      }

      if (isRetryableStatus(response.status)) {
        throw new Error(`HTTP error ${response.status}`)
      }

      const error = new Error(`HTTP error ${response.status}`)
      Object.assign(error, { shouldRetry: false })
      throw error
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (lastError.message === 'Authentication failed') {
        throw lastError
      }

      if ('shouldRetry' in lastError && lastError.shouldRetry === false) {
        throw lastError
      }

      const shouldRetry = isRetryableError(lastError) || lastError.message.includes('HTTP error')

      if (!shouldRetry && attempt > 0) {
        throw lastError
      }

      Logger.warn(`Attempt ${attempt + 1} failed`, lastError.message)

      if (attempt < maxRetries - 1) {
        const delay = retryDelay * (attempt + 1)
        Logger.info(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError ?? new Error('Unknown error occurred')
}

export async function prepareUploadContent(
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

export function handleHttpError(response: Response): CloudSyncResult {
  let errorMessage: string | undefined
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
    default:
      errorMessage = '同步失败'
      break
  }
  const recovery = getErrorRecovery(new Error(errorMessage))
  return {
    success: false,
    error: errorMessage,
    message: errorMessage,
    recovery: recovery.actions,
  }
}

export async function testWebDAVConnection(config: WebDAVConfig): Promise<CloudSyncResult> {
  if (!config || !config.url || !config.username || !config.password) {
    return {
      success: false,
      error: '请先填写完整的 WebDAV 配置',
      message: '配置不完整',
      recovery: '请填写 WebDAV 服务器地址、用户名和密码',
    }
  }

  try {
    const authString = btoa(`${config.username}:${config.password}`)
    const testUrl = config.url.replace(/\/$/, '') + '/'

    const response = await fetch(testUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: `Basic ${authString}`,
        Depth: '0',
      },
    })

    if (response.ok || response.status === 207) {
      return {
        success: true,
        message: 'WebDAV 连接测试成功',
      }
    }

    const errorResult = handleHttpError(response)
    return errorResult
  } catch (error) {
    Logger.error('WebDAV connection test failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '连接测试失败',
      message: '连接测试失败',
      recovery: '请检查网络连接、服务器地址和凭证是否正确',
    }
  }
}

export async function parseResponseData(
  response: Response,
  config: WebDAVConfig
): Promise<HistoryItem[]> {
  if (config.encryption?.enabled && config.encryption?.key) {
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const CHUNK_SIZE = 65536
    let binaryString = ''
    for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
      const chunk = uint8Array.slice(i, i + CHUNK_SIZE)
      binaryString += String.fromCharCode(...chunk)
    }
    const encryptedData = btoa(binaryString)
    return await decrypt(encryptedData, config.encryption.key, config.encryption.type)
  }

  return (await response.json()) as HistoryItem[]
}

export async function createWebDAVClient(
  config: WebDAVConfig
): Promise<{ fetch: (path: string, options?: RequestInit) => Promise<Response> }> {
  const auth = `Basic ${btoa(config.username + ':' + (config.password || ''))}`
  const baseUrl = config.url.replace(/\/$/, '')

  async function fetchWithConfig(path: string, options: RequestInit = {}): Promise<Response> {
    return await fetchWithRetry(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: auth,
      },
    })
  }

  return { fetch: fetchWithConfig }
}

export async function getSyncContext(): Promise<{
  config: WebDAVConfig
  client: { fetch: (path: string, options?: RequestInit) => Promise<Response> }
}> {
  const config = await getValidatedConfig()
  const client = await createWebDAVClient(config)
  return { config, client }
}

interface SyncOperation<T> {
  (context: {
    config: WebDAVConfig
    client: { fetch: (path: string, options?: RequestInit) => Promise<Response> }
  }): Promise<T>
  errorMessage?: string
}

export async function executeSync<T>(operation: SyncOperation<T>): Promise<T> {
  const context = await getSyncContext()
  try {
    return await operation(context)
  } catch (error) {
    if (error instanceof Error && 'recovery' in error) {
      throw error
    }
    Logger.error(operation.errorMessage || 'Sync operation failed', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const recovery = getErrorRecovery(new Error(errorMessage))
    throw Object.assign(new Error(recovery.message), { recovery: recovery.actions })
  } finally {
    await clearSessionConfig()
  }
}

export async function fetchRemoteHistory(
  client: { fetch: (path: string, options?: RequestInit) => Promise<Response> },
  config: WebDAVConfig
): Promise<HistoryItem[]> {
  const response = await client.fetch(`/${WEBDAV_FILENAME}`, { method: 'GET' })

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
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  operationName = 'operation'
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (lastError.message.includes('认证') || lastError.message.includes('Authentication')) {
        throw lastError
      }

      Logger.warn(`${operationName} attempt ${attempt + 1} failed`, lastError.message)

      if (attempt < maxRetries - 1) {
        const delay = 1000 * (attempt + 1)
        Logger.info(`Retrying ${operationName} in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError ?? new Error('Unknown error occurred')
}

export async function syncToCloud(localHistory: HistoryItem[]): Promise<CloudSyncResult> {
  return withRetry(
    () =>
      executeSync(async ({ config, client }) => {
        let remoteHistory: HistoryItem[] = []
        try {
          remoteHistory = await fetchRemoteHistory(client, config)
        } catch (error) {
          Logger.info('No remote history found or first sync', error)
        }

        const mergedResult = mergeHistory(localHistory, remoteHistory)
        const { content, contentType } = await prepareUploadContent(mergedResult.items, config)

        const response = await client.fetch(`/${WEBDAV_FILENAME}`, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: content,
        })

        if (!response.ok) {
          return handleHttpError(response)
        }

        return {
          success: true,
          items: mergedResult.items,
          message: `同步成功！合并 ${mergedResult.totalItems} 条记录（本地独有 ${mergedResult.localOnly}，远程独有 ${mergedResult.remoteOnly}，更新 ${mergedResult.updated}）`,
        }
      }),
    3,
    'syncToCloud'
  )
}

export async function syncFromCloud(): Promise<HistoryItem[]> {
  return withRetry(
    () =>
      executeSync(async ({ config, client }) => {
        const response = await client.fetch(`/${WEBDAV_FILENAME}`, { method: 'GET' })

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
      }),
    3,
    'syncFromCloud'
  )
}
