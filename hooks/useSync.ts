import { useState } from 'react'
import { useStorage } from '@plasmohq/storage/hook'
import { ensureHostPermission } from '~common/utils'
import { Logger } from '~common/logger'
import { sendToBackground } from '~common/messaging'
import { hasMasterPasswordSet, isMasterPasswordUnlocked } from '~common/config-manager'
import type { WebDAVConfig, HistoryItem } from '~common/types'

export interface SyncStatusState {
  message: string
  type: 'info' | 'success' | 'error'
}

interface SyncResponse {
  success: boolean
  data?: HistoryItem[]
  error?: string
}

export interface UnlockRequiredState {
  required: boolean
  action?: 'syncToCloud' | 'syncFromCloud'
}

export function useSync(onSyncComplete?: () => void) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatusState | null>(null)
  const [webdavConfig] = useStorage<WebDAVConfig | null>('webdav_config', null)
  const [unlockRequired, setUnlockRequired] = useState<UnlockRequiredState>({ required: false })

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

  const checkUnlockStatus = async (): Promise<boolean> => {
    const hasPassword = await hasMasterPasswordSet()
    if (!hasPassword) {
      return true
    }

    const isUnlocked = await isMasterPasswordUnlocked()
    return isUnlocked
  }

  const syncToCloud = async () => {
    if (isSyncing || unlockRequired.required) return
    if (!(await checkPermission())) return

    const canProceed = await checkUnlockStatus()
    if (!canProceed) {
      setUnlockRequired({ required: true, action: 'syncToCloud' })
      return
    }

    setIsSyncing(true)
    setSyncStatus({ message: '正在同步到云端...', type: 'info' })

    try {
      const response = await sendToBackground<{ action: 'SYNC_TO_CLOUD' }, SyncResponse>({
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
    if (isSyncing || unlockRequired.required) return
    if (!(await checkPermission())) return

    const canProceed = await checkUnlockStatus()
    if (!canProceed) {
      setUnlockRequired({ required: true, action: 'syncFromCloud' })
      return
    }

    setIsSyncing(true)
    setSyncStatus({ message: '正在从云端同步...', type: 'info' })

    try {
      const response = await sendToBackground<{ action: 'SYNC_FROM_CLOUD' }, SyncResponse>({
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

  const clearUnlockRequired = () => {
    setUnlockRequired({ required: false })
  }

  const retryAfterUnlock = async () => {
    const action = unlockRequired.action
    clearUnlockRequired()

    if (action === 'syncToCloud') {
      await syncToCloud()
    } else if (action === 'syncFromCloud') {
      await syncFromCloud()
    }
  }

  return {
    isSyncing,
    syncStatus,
    syncToCloud,
    syncFromCloud,
    hasWebDAVConfig: !!webdavConfig?.url && !!webdavConfig?.username,
    unlockRequired,
    clearUnlockRequired,
    retryAfterUnlock,
  }
}
