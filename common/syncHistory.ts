import { Storage } from '@plasmohq/storage'
import type { SyncHistoryEntry, SyncHistoryConfig } from './types'
import { Logger } from './logger'

const storage = new Storage()
const SYNC_HISTORY_KEY = 'sync_history'
const DEFAULT_MAX_ENTRIES = 50

async function getSyncHistoryConfig(): Promise<SyncHistoryConfig> {
  const config = await storage.get<SyncHistoryConfig>(SYNC_HISTORY_KEY)
  if (!config) {
    return {
      entries: [],
      maxEntries: DEFAULT_MAX_ENTRIES,
    }
  }
  return config
}

export async function recordSyncHistory(
  entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const config = await getSyncHistoryConfig()

    const newEntry: SyncHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    config.entries.unshift(newEntry)

    if (config.entries.length > config.maxEntries) {
      config.entries = config.entries.slice(0, config.maxEntries)
    }

    await storage.set(SYNC_HISTORY_KEY, config)
    Logger.info('Sync history recorded', newEntry)
  } catch (error) {
    Logger.error('Failed to record sync history', error)
  }
}

export async function getSyncHistory(): Promise<SyncHistoryEntry[]> {
  try {
    const config = await getSyncHistoryConfig()
    return config.entries
  } catch (error) {
    Logger.error('Failed to get sync history', error)
    return []
  }
}

export async function clearSyncHistory(): Promise<void> {
  try {
    await storage.set(SYNC_HISTORY_KEY, {
      entries: [],
      maxEntries: DEFAULT_MAX_ENTRIES,
    })
    Logger.info('Sync history cleared')
  } catch (error) {
    Logger.error('Failed to clear sync history', error)
  }
}
