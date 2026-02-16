import { useState } from 'react'
import { sendToBackground } from '@plasmohq/messaging'
import { useStorage } from '@plasmohq/storage/hook'
import { ensureHostPermission } from '~common/utils'
import { Logger } from '~common/logger'
import type { WebDAVConfig, HistoryItem } from '~common/types'

interface HistoryRequestBody {
  action: 'SYNC_TO_CLOUD' | 'SYNC_FROM_CLOUD'
}

interface HistoryResponse {
  success: boolean
  data?: HistoryItem[]
  error?: string
}

export interface SyncStatusState {
  message: string
  type: 'info' | 'success' | 'error'
}

export function useSync(onSyncComplete?: () => void) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatusState | null>(null)
  const [webdavConfig] = useStorage<WebDAVConfig | null>('webdav_config', null)

  const checkPermission = async () => {
    if (webdavConfig?.url) {
      const permissionGranted = await ensureHostPermission(webdavConfig.url)
      if (!permissionGranted) {
        setSyncStatus({
          message: '需要授权访问 WebDAV 服务器',
          type: 'error',
        })
        return false
      }
    }
    return true
  }

  const syncToCloud = async () => {
    if (isSyncing) return
    if (!(await checkPermission())) return

    setIsSyncing(true)
    setSyncStatus({ message: '正在同步到云端...', type: 'info' })

    try {
      const response = await sendToBackground<HistoryRequestBody, HistoryResponse>({
        name: 'history',
        body: { action: 'SYNC_TO_CLOUD' },
      })

      if (response.success) {
        setSyncStatus({
          message: '同步到云端成功！已合并数据。',
          type: 'success',
        })
        onSyncComplete?.()
      } else {
        setSyncStatus({
          message: response.error || '同步失败',
          type: 'error',
        })
      }
    } catch (error) {
      setSyncStatus({
        message: '同步失败',
        type: 'error',
      })
      Logger.error('Failed to sync to cloud', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const syncFromCloud = async () => {
    if (isSyncing) return
    if (!(await checkPermission())) return

    setIsSyncing(true)
    setSyncStatus({ message: '正在从云端同步...', type: 'info' })

    try {
      const response = await sendToBackground<HistoryRequestBody, HistoryResponse>({
        name: 'history',
        body: { action: 'SYNC_FROM_CLOUD' },
      })

      if (response.success && response.data) {
        setSyncStatus({
          message: `从云端同步成功！获取到 ${response.data.length} 条记录。`,
          type: 'success',
        })
        onSyncComplete?.()
      } else {
        throw new Error(response.error || '同步失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败'
      setSyncStatus({ message: errorMessage, type: 'error' })
      Logger.error('Failed to sync from cloud', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    isSyncing,
    syncStatus,
    syncToCloud,
    syncFromCloud,
    hasWebDAVConfig: !!webdavConfig?.url && !!webdavConfig?.username,
  }
}
