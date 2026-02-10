import { getLocalHistory } from '~common/history'
import { syncToCloud } from '~common/webdav'
import { Logger } from '~common/logger'

let syncInterval: number | null = null
const DEFAULT_SYNC_INTERVAL = 60 * 60 * 1000
let isSyncing = false

async function performScheduledSync() {
  if (isSyncing) {
    Logger.info('Scheduled sync already in progress, skipping')
    return
  }

  isSyncing = true

  try {
    Logger.info('Performing scheduled sync')
    const settings = await chrome.storage.local.get('general_config')
    const syncEnabled = settings.general_config?.autoSyncEnabled ?? false

    if (!syncEnabled) {
      Logger.info('Auto sync is disabled')
      return
    }

    const webDavSettings = await chrome.storage.local.get('webdav_config')
    const { url, username, password } = webDavSettings.webdav_config || {}

    if (!url || !username || !password) {
      Logger.info('WebDAV settings not configured')
      return
    }

    const historyItems = await getLocalHistory()
    const rawHistoryItems = historyItems.map(item => item)

    const result = await syncToCloud(rawHistoryItems)
    Logger.info('Scheduled sync completed', result)

    if (result.success) {
      await chrome.storage.local.set({ lastSyncTime: new Date().toISOString() })
    }
  } catch (error) {
    Logger.error('Scheduled sync failed', error)
  } finally {
    isSyncing = false
  }
}

function startSyncTimer() {
  clearSyncTimer()

  chrome.storage.local.get('general_config', settings => {
    const interval = settings.general_config?.syncInterval ?? DEFAULT_SYNC_INTERVAL
    const syncEnabled = settings.general_config?.autoSyncEnabled ?? false

    if (syncEnabled) {
      Logger.info(`Starting sync timer with interval ${interval}ms`)
      syncInterval = self.setInterval(performScheduledSync, interval)
    }
  })
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

self.addEventListener('message', event => {
  if (event.data?.type === 'SYNC_DATA') {
    Logger.info('Sync requested from popup')
    performScheduledSync()
  } else if (event.data?.type === 'UPDATE_SYNC_SETTINGS') {
    Logger.info('Sync settings updated')
    startSyncTimer()
  }
})

self.addEventListener('storage', event => {
  if (event.key === 'general_config' || event.key === 'webdav_config') {
    Logger.info('Settings changed, restarting sync timer')
    startSyncTimer()
  }
})
