import { Storage } from '@plasmohq/storage'
import type { HistoryItem, GeneralConfig } from './types'
import { STORAGE_KEYS, DEFAULT_GENERAL_CONFIG } from '~store'
import { Logger } from './logger'

const storage = new Storage()

export async function getLocalHistory(): Promise<HistoryItem[]> {
  Logger.info('Starting to get local history...')

  if (!chrome.history) {
    Logger.error('chrome.history API is not available')
    throw new Error('History API is not available')
  }

  const generalConfig = await storage.get<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG)
  const maxResults = generalConfig?.maxHistoryItems ?? DEFAULT_GENERAL_CONFIG.maxHistoryItems

  return new Promise((resolve, reject) => {
    chrome.history.search(
      {
        text: '',
        startTime: 0,
        maxResults,
      },
      items => {
        if (chrome.runtime.lastError) {
          Logger.error('Error searching history', chrome.runtime.lastError)
          reject(new Error(`Failed to get history: ${chrome.runtime.lastError.message}`))
          return
        }

        Logger.info(`Found ${items.length} history items`)

        const formattedItems = items.map(item => ({
          id: item.id,
          url: item.url || '',
          title: item.title,
          lastVisitTime: item.lastVisitTime || 0,
          visitCount: item.visitCount || 0,
        }))

        resolve(formattedItems)
      }
    )
  })
}

export function mergeHistory(local: HistoryItem[], remote: HistoryItem[]): HistoryItem[] {
  const map = new Map<string, HistoryItem>()
  local.forEach(item => map.set(item.url, item))
  remote.forEach(item => {
    const existing = map.get(item.url)
    if (!existing || item.lastVisitTime > existing.lastVisitTime) {
      map.set(item.url, item)
    }
  })
  return Array.from(map.values()).sort((a, b) => b.lastVisitTime - a.lastVisitTime)
}
