import { Storage } from '@plasmohq/storage'
import { getLocalHistory } from '~common/history'
import { syncToCloud } from '~common/webdav'
import { Logger } from '~common/logger'
import type { GeneralConfig, WebDAVConfig } from '~common/types'

const storage = new Storage()
const DEFAULT_SYNC_INTERVAL = 60
const KEEPALIVE_ALARM_NAME = 'keepalive'
const SYNC_ALARM_NAME = 'sync'
let isSyncing = false

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

    const masterPasswordData = await storage.get<{ hash: string; salt: string }>(
      'master_password_data'
    )
    if (masterPasswordData?.hash) {
      Logger.warn('Auto sync is not available when master password is set')
      return
    }

    const webDavConfig = await storage.get<WebDAVConfig>('webdav_config')
    const { url, username, password } = webDavConfig || {}

    if (!url || !username || !password) {
      Logger.info('WebDAV settings not configured')
      return
    }

    const historyItems = await getLocalHistory()

    const result = await syncToCloud(historyItems)
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

export async function setupAlarms() {
  const settings = await storage.get<GeneralConfig>('general_config')
  const syncEnabled = settings?.autoSyncEnabled ?? false
  const intervalMinutes = settings?.syncInterval
    ? Math.floor(settings.syncInterval / 60000)
    : DEFAULT_SYNC_INTERVAL

  try {
    await chrome.alarms.clear(KEEPALIVE_ALARM_NAME)
    await chrome.alarms.clear(SYNC_ALARM_NAME)
  } catch (error) {
    Logger.warn('Failed to clear existing alarms', error)
  }

  chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
    periodInMinutes: 0.5,
  })

  if (syncEnabled) {
    Logger.info(`Setting up sync alarm with interval ${intervalMinutes} minutes`)
    chrome.alarms.create(SYNC_ALARM_NAME, {
      periodInMinutes: Math.max(1, intervalMinutes),
    })
  }
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === KEEPALIVE_ALARM_NAME) {
    Logger.debug('Keepalive alarm triggered')
  } else if (alarm.name === SYNC_ALARM_NAME) {
    await performScheduledSync()
  }
})

self.addEventListener('install', () => {
  Logger.info('Service Worker installed')
})

self.addEventListener('activate', () => {
  Logger.info('Service Worker activated')
  setupAlarms()
  performScheduledSync()
})

storage.watch({
  general_config: () => {
    Logger.info('Settings changed, restarting sync timer')
    setupAlarms()
  },
})
