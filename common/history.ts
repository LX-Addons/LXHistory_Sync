import { Storage } from '@plasmohq/storage'
import type { HistoryItem, GeneralConfig, MergeResult } from './types'
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

export function mergeHistory(local: HistoryItem[], remote: HistoryItem[]): MergeResult {
  const map = new Map<string, HistoryItem>()
  let localOnly = 0
  let remoteOnly = 0
  let updated = 0

  local.forEach(item => map.set(item.url, item))

  remote.forEach(item => {
    const existing = map.get(item.url)
    if (!existing) {
      map.set(item.url, item)
      remoteOnly++
    } else {
      const mergedItem: HistoryItem = {
        id: existing.id,
        url: existing.url,
        title: item.title || existing.title,
        lastVisitTime: Math.max(existing.lastVisitTime, item.lastVisitTime),
        visitCount: existing.visitCount + item.visitCount,
      }
      map.set(item.url, mergedItem)
      updated++
    }
  })

  localOnly = local.length - updated

  const items = Array.from(map.values()).sort((a, b) => b.lastVisitTime - a.lastVisitTime)

  return {
    totalItems: items.length,
    localOnly,
    remoteOnly,
    updated,
    items,
  }
}
