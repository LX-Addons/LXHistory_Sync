import type { HistoryItem } from './types'

export async function getLocalHistory(): Promise<HistoryItem[]> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting to get local history...')

      if (!chrome.history) {
        console.error('chrome.history API is not available')
        reject(new Error('History API is not available'))
        return
      }

      chrome.history.search(
        {
          text: '',
          startTime: 0,
          maxResults: 1000,
        },
        items => {
          if (chrome.runtime.lastError) {
            console.error('Error searching history:', chrome.runtime.lastError)
            reject(new Error(`Failed to get history: ${chrome.runtime.lastError.message}`))
            return
          }

          console.log(`Found ${items.length} history items`)

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
    } catch (error) {
      console.error('Unexpected error in getLocalHistory:', error)
      reject(error)
    }
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
