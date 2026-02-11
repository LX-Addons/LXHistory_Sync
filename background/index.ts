import { Storage } from '@plasmohq/storage'
import { getLocalHistory } from '~common/history'
import { syncToCloud } from '~common/webdav'
import { Logger } from '~common/logger'
import type { GeneralConfig, WebDAVConfig } from '~common/types'

const storage = new Storage()
let syncInterval: number | null = null
const DEFAULT_SYNC_INTERVAL = 60 * 60 * 1000
let isSyncing = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export async function performScheduledSync() {
  if (isSyncing) {
    Logger.info('Scheduled sync already in progress, skipping')
    return
  }

  isSyncing = true

  try {
    Logger.info('Performing scheduled sync')
    const generalConfig = await storage.get<GeneralConfig>('general_config')
    const syncEnabled = generalConfig?.autoSyncEnabled ?? false

    if (!syncEnabled) {
      Logger.info('Auto sync is disabled')
      return
    }

    const webDavConfig = await storage.get<WebDAVConfig>('webdav_config')
    const { url, username, password } = webDavConfig || {}

    if (!url || !username || !password) {
      Logger.info('WebDAV settings not configured')
      return
    }

    const historyItems = await getLocalHistory()
    const rawHistoryItems = historyItems.map(item => item)

    const result = await syncToCloud(rawHistoryItems)
    Logger.info('Scheduled sync completed', result)

    if (result.success) {
      await storage.set('lastSyncTime', new Date().toISOString())
    }
  } catch (error) {
    Logger.error('Scheduled sync failed', error)
  } finally {
    isSyncing = false
  }
}

export function startSyncTimer() {
  clearSyncTimer()

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    const settings = await storage.get<GeneralConfig>('general_config')
    const interval = settings?.syncInterval ?? DEFAULT_SYNC_INTERVAL
    const syncEnabled = settings?.autoSyncEnabled ?? false

    if (syncEnabled) {
      Logger.info(`Starting sync timer with interval ${interval}ms`)
      syncInterval = self.setInterval(performScheduledSync, interval)
    }
  }, 500)
}

function clearSyncTimer() {
  if (syncInterval !== null) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

self.addEventListener('install', () => {
  Logger.info('Service Worker installed')
})

self.addEventListener('activate', () => {
  Logger.info('Service Worker activated')
  startSyncTimer()

  performScheduledSync()
})

storage.watch({
  callback: changes => {
    if (changes.newValue !== undefined || changes.oldValue !== undefined) {
      Logger.info('Settings changed, restarting sync timer')
      startSyncTimer()
    }
  },
})
