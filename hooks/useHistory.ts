import { useState, useEffect, useMemo, useCallback } from 'react'
import { useStorage } from '@plasmohq/storage/hook'
import { useDebounce } from 'use-debounce'
import { getLocalHistory } from '~common/history'
import { extractDomain } from '~common/utils'
import { Logger } from '~common/logger'
import { STORAGE_KEYS, DEFAULT_GENERAL_CONFIG } from '~store'
import type { HistoryItem, GeneralConfig } from '~common/types'

const SEARCH_DEBOUNCE_MS = 300

export type GroupedHistoryItem =
  | { type: 'date'; id: string; data: string; isExpanded?: boolean; parentDomainId?: string }
  | {
      type: 'domain'
      id: string
      data: { domain: string; count: number }
      isExpanded?: boolean
      parentDomainId?: string
    }
  | { type: 'item'; id: string; data: HistoryItem; isExpanded?: boolean; parentDomainId?: string }

export function useHistory() {
  const [allHistoryItems, setAllHistoryItems] = useState<GroupedHistoryItem[]>([])
  const [historyItems, setHistoryItems] = useState<GroupedHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const [generalConfig] = useStorage<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG, {
    ...DEFAULT_GENERAL_CONFIG,
  } as GeneralConfig)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    }
  }

  const groupItemsByDomain = useCallback((items: HistoryItem[]): GroupedHistoryItem[] => {
    const grouped: GroupedHistoryItem[] = []
    const itemsByDomain: Record<string, HistoryItem[]> = {}

    items.forEach(item => {
      const domain = extractDomain(item.url)
      if (!itemsByDomain[domain]) {
        itemsByDomain[domain] = []
      }
      itemsByDomain[domain].push(item)
    })

    Object.entries(itemsByDomain).forEach(([domain, domainItems], domainIndex) => {
      // Use a unique ID for the domain group
      const domainId = `domain-${domain}-${domainIndex}-${Math.random().toString(36).substr(2, 9)}`
      grouped.push({
        id: domainId,
        type: 'domain',
        data: { domain, count: domainItems.length },
        isExpanded: false,
      })

      domainItems.forEach(item => {
        grouped.push({
          id: item.id,
          type: 'item',
          data: item,
          parentDomainId: domainId,
        })
      })
    })

    return grouped
  }, [])

  const groupHistoryByDate = useCallback(
    (items: HistoryItem[]): GroupedHistoryItem[] => {
      const grouped: GroupedHistoryItem[] = []
      const sortedItems = [...items].sort((a, b) => b.lastVisitTime - a.lastVisitTime)
      const itemsByDate: Record<string, HistoryItem[]> = {}

      sortedItems.forEach(item => {
        const itemDate = new Date(item.lastVisitTime).toDateString()
        if (!itemsByDate[itemDate]) {
          itemsByDate[itemDate] = []
        }
        itemsByDate[itemDate].push(item)
      })

      Object.entries(itemsByDate).forEach(([, dateItems], dateIndex) => {
        grouped.push({
          id: `date-${dateIndex}`,
          type: 'date',
          data: formatDate(dateItems[0].lastVisitTime),
        })

        if (generalConfig.collapseDomainHistory) {
          grouped.push(...groupItemsByDomain(dateItems))
        } else {
          dateItems.forEach(item => {
            grouped.push({
              id: item.id,
              type: 'item',
              data: item,
            })
          })
        }
      })

      return grouped
    },
    [generalConfig.collapseDomainHistory, groupItemsByDomain]
  )

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      Logger.info('Loading history...')
      const items = await getLocalHistory()
      Logger.info(`Loaded ${items.length} history items`)
      const groupedItems = groupHistoryByDate(items)
      setAllHistoryItems(groupedItems)
      setHistoryItems(groupedItems)
    } catch (err) {
      Logger.error('Failed to load history', err)
      setError('加载本地历史失败')
    } finally {
      setIsLoading(false)
    }
  }, [groupHistoryByDate])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (debouncedSearchQuery.trim() === '') {
      setHistoryItems(allHistoryItems)
    } else {
      const filtered = allHistoryItems.filter(item => {
        if (item.type === 'item') {
          const historyItem = item.data as HistoryItem
          return (
            (historyItem.title &&
              historyItem.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
            (historyItem.url &&
              historyItem.url.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
          )
        } else if (item.type === 'domain') {
          const domainData = item.data as { domain: string; count: number }
          return domainData.domain.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        }
        return true
      })
      setHistoryItems(filtered)
    }
  }, [debouncedSearchQuery, allHistoryItems])

  const toggleDomain = useCallback((domainId: string) => {
    setExpandedDomains(prev => {
      const newSet = new Set(prev)
      if (newSet.has(domainId)) {
        newSet.delete(domainId)
      } else {
        newSet.add(domainId)
      }
      return newSet
    })
  }, [])

  const visibleHistoryItems = useMemo(() => {
    if (!generalConfig.collapseDomainHistory) return historyItems

    return historyItems.filter(item => {
      if (item.type === 'item' && item.parentDomainId) {
        return expandedDomains.has(item.parentDomainId)
      }
      return true
    })
  }, [historyItems, generalConfig.collapseDomainHistory, expandedDomains])

  return {
    historyItems: visibleHistoryItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    expandedDomains,
    toggleDomain,
    refreshHistory: loadHistory,
    generalConfig,
  }
}
