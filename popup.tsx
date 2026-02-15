import React, { useState, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import { useStorage } from '@plasmohq/storage/hook'
import type { PlasmoMessaging } from '@plasmohq/messaging'
import { Virtuoso } from 'react-virtuoso'
import type {
  HistoryItem as HistoryItemType,
  ThemeType,
  GeneralConfig,
  CheckboxStyleType,
  IconSourceType,
  WebDAVConfig,
} from '~common/types'
import HistoryItemComponent from '~components/HistoryItem'
import SyncStatus from '~components/SyncStatus'
import SyncProgress from '~components/SyncProgress'
import { ErrorBoundary } from '~components/ErrorBoundary'
import SkeletonLoader from '~components/SkeletonLoader'
import { DateGroupItem, DomainGroupItem } from '~components/popup'
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG, DEFAULT_GENERAL_CONFIG } from '~store'
import { extractDomain, applyTheme, ensureHostPermission } from '~common/utils'
import { Logger } from '~common/logger'
import type { HistoryItem } from '~common/types'
import './style.css'

const SEARCH_DEBOUNCE_MS = 300

interface HistoryRequestBody {
  action: 'GET_HISTORY' | 'SYNC_TO_CLOUD' | 'SYNC_FROM_CLOUD'
}

interface HistoryResponse {
  success: boolean
  data?: HistoryItem[]
  error?: string
}

const sendToBackgroundMessage: PlasmoMessaging.SendFx<string> = async request => {
  const { sendToBackground } = await import('@plasmohq/messaging')
  return sendToBackground(request as Parameters<typeof sendToBackground>[0])
}

interface GroupedHistoryItem {
  id: string
  type: 'item' | 'date' | 'domain'
  data: HistoryItemType | string | { domain: string; count: number }
  isExpanded?: boolean
}

const Popup: React.FC = () => {
  const [allHistoryItems, setAllHistoryItems] = useState<GroupedHistoryItem[]>([])
  const [historyItems, setHistoryItems] = useState<GroupedHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{
    message: string
    type: 'info' | 'success' | 'error'
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)
  const [themeConfig] = useStorage<{ theme: ThemeType }>(STORAGE_KEYS.THEME_CONFIG, {
    theme: DEFAULT_THEME_CONFIG.theme as ThemeType,
  })
  const [generalConfig] = useStorage<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG, {
    ...DEFAULT_GENERAL_CONFIG,
    checkboxStyle: DEFAULT_GENERAL_CONFIG.checkboxStyle as CheckboxStyleType,
    iconSource: DEFAULT_GENERAL_CONFIG.iconSource as IconSourceType,
    maxHistoryItems: DEFAULT_GENERAL_CONFIG.maxHistoryItems,
  })
  const [webdavConfig] = useStorage<WebDAVConfig | null>('webdav_config', null)
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    loadHistory()
  }, [generalConfig.collapseDomainHistory])

  const handleDomainClick = (domainId: string) => {
    const newExpandedDomains = new Set(expandedDomains)
    if (newExpandedDomains.has(domainId)) {
      newExpandedDomains.delete(domainId)
    } else {
      newExpandedDomains.add(domainId)
    }
    setExpandedDomains(newExpandedDomains)
  }

  useEffect(() => {
    applyTheme(themeConfig.theme)
  }, [themeConfig])

  useEffect(() => {
    if (debouncedSearchQuery.trim() === '') {
      setHistoryItems(allHistoryItems)
    } else {
      const filtered = allHistoryItems.filter(item => {
        if (item.type === 'item') {
          const historyItem = item.data as HistoryItemType
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

  const hasWebDAVConfig = !!webdavConfig?.url && !!webdavConfig?.username

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

  const groupItemsByDomain = (items: HistoryItemType[]): GroupedHistoryItem[] => {
    const grouped: GroupedHistoryItem[] = []
    const itemsByDomain: Record<string, HistoryItemType[]> = {}

    items.forEach(item => {
      const domain = extractDomain(item.url)
      if (!itemsByDomain[domain]) {
        itemsByDomain[domain] = []
      }
      itemsByDomain[domain].push(item)
    })

    Object.entries(itemsByDomain).forEach(([domain, domainItems], domainIndex) => {
      grouped.push({
        id: `domain-${domainIndex}`,
        type: 'domain',
        data: { domain, count: domainItems.length },
        isExpanded: false,
      })

      domainItems.forEach(item => {
        grouped.push({
          id: item.id,
          type: 'item',
          data: item,
        })
      })
    })

    return grouped
  }

  const createDateGroup = (items: HistoryItemType[], dateIndex: number): GroupedHistoryItem => {
    return {
      id: `date-${dateIndex}`,
      type: 'date',
      data: formatDate(items[0].lastVisitTime),
    }
  }

  const groupHistoryByDate = (items: HistoryItemType[]): GroupedHistoryItem[] => {
    const grouped: GroupedHistoryItem[] = []
    const sortedItems = [...items].sort((a, b) => b.lastVisitTime - a.lastVisitTime)
    const itemsByDate: Record<string, HistoryItemType[]> = {}

    sortedItems.forEach(item => {
      const itemDate = new Date(item.lastVisitTime).toDateString()
      if (!itemsByDate[itemDate]) {
        itemsByDate[itemDate] = []
      }
      itemsByDate[itemDate].push(item)
    })

    Object.entries(itemsByDate).forEach(([, dateItems], dateIndex) => {
      grouped.push(createDateGroup(dateItems, dateIndex))

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
  }

  const shouldShowHistoryItem = (index: number, item: GroupedHistoryItem): boolean => {
    if (!generalConfig.collapseDomainHistory) return true
    if (item.type !== 'item') return true

    let parentDomainId: string | null = null
    for (let i = index - 1; i >= 0; i--) {
      const prevItem = historyItems[i]
      if (prevItem.type === 'domain') {
        parentDomainId = prevItem.id
        break
      } else if (prevItem.type === 'date') {
        break
      }
    }

    if (parentDomainId) {
      return expandedDomains.has(parentDomainId)
    }

    return true
  }

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      Logger.info('Loading history...')
      const response = await sendToBackgroundMessage<HistoryRequestBody, HistoryResponse>({
        name: 'history',
        body: { action: 'GET_HISTORY' },
      })
      if (response.success && response.data) {
        Logger.info(`Loaded ${response.data.length} history items`)
        const groupedItems = groupHistoryByDate(response.data)
        setAllHistoryItems(groupedItems)
        setHistoryItems(groupedItems)
      } else {
        throw new Error(response.error || 'Failed to load history')
      }
    } catch (error) {
      Logger.error('Failed to load history', error)
      setSyncStatus({
        message: `加载本地历史失败`,
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncToCloud = async () => {
    if (isSyncing) return

    if (webdavConfig?.url) {
      const permissionGranted = await ensureHostPermission(webdavConfig.url)
      if (!permissionGranted) {
        setSyncStatus({
          message: '需要授权访问 WebDAV 服务器',
          type: 'error',
        })
        return
      }
    }

    setIsSyncing(true)
    setSyncStatus({ message: '正在同步到云端...', type: 'info' })
    try {
      const response = await sendToBackgroundMessage<HistoryRequestBody, HistoryResponse>({
        name: 'history',
        body: { action: 'SYNC_TO_CLOUD' },
      })
      if (response.success) {
        setSyncStatus({
          message: '同步到云端成功！已合并数据。',
          type: 'success',
        })
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

  const handleSyncFromCloud = async () => {
    if (isSyncing) return

    if (webdavConfig?.url) {
      const permissionGranted = await ensureHostPermission(webdavConfig.url)
      if (!permissionGranted) {
        setSyncStatus({
          message: '需要授权访问 WebDAV 服务器',
          type: 'error',
        })
        return
      }
    }

    setIsSyncing(true)
    setSyncStatus({ message: '正在从云端同步...', type: 'info' })
    try {
      const response = await sendToBackgroundMessage<HistoryRequestBody, HistoryResponse>({
        name: 'history',
        body: { action: 'SYNC_FROM_CLOUD' },
      })
      if (response.success && response.data) {
        const groupedItems = groupHistoryByDate(response.data)
        setAllHistoryItems(groupedItems)
        setHistoryItems(groupedItems)
        setSyncStatus({
          message: `从云端同步成功！获取到 ${response.data.length} 条记录。`,
          type: 'success',
        })
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

  return (
    <ErrorBoundary>
      <div className="container">
        <div className="card">
          <div className="title-bar">
            <h1>历史记录</h1>
            <div className="action-buttons">
              <button
                className="action-button"
                title="设置"
                aria-label="打开设置页面"
                onClick={() => chrome.runtime.openOptionsPage()}
              >
                ⚙️
              </button>
            </div>
          </div>

          {hasWebDAVConfig && (
            <div className="sync-buttons-container">
              {isSyncing ? (
                <SyncProgress isSyncing={isSyncing} message={syncStatus?.message} />
              ) : (
                <>
                  <div className="button-group">
                    <button
                      className="btn-primary"
                      onClick={handleSyncToCloud}
                      disabled={isSyncing}
                    >
                      同步到云端
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleSyncFromCloud}
                      disabled={isSyncing}
                    >
                      从云端同步
                    </button>
                  </div>
                  <SyncStatus status={syncStatus} />
                </>
              )}
            </div>
          )}

          {generalConfig.searchEnabled && (
            <div className="search-container">
              <input
                type="text"
                className="search-box"
                placeholder="搜索历史记录..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          <div className="history-list-container">
            {isLoading ? (
              <SkeletonLoader count={10} />
            ) : historyItems.length === 0 ? (
              <div className="no-history">
                <p>暂无浏览记录</p>
                <p className="hint">浏览网页后，历史记录将显示在这里</p>
              </div>
            ) : (
              <Virtuoso
                data={historyItems}
                itemContent={(index, item) => {
                  if (item.type === 'date') {
                    return <DateGroupItem date={item.data as string} />
                  } else if (item.type === 'domain') {
                    const domainData = item.data as { domain: string; count: number }
                    return (
                      <DomainGroupItem
                        domain={domainData.domain}
                        count={domainData.count}
                        isExpanded={expandedDomains.has(item.id)}
                        iconSource={generalConfig.iconSource}
                        onToggle={() => handleDomainClick(item.id)}
                      />
                    )
                  } else {
                    if (!shouldShowHistoryItem(index, item)) {
                      return null
                    }
                    return (
                      <HistoryItemComponent
                        item={item.data as HistoryItemType}
                        showUrls={generalConfig.showUrls}
                        iconSource={generalConfig.iconSource}
                      />
                    )
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default Popup
