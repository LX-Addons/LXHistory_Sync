import React, { useState, useEffect } from 'react'
import { Storage } from '@plasmohq/storage'
import { Virtuoso } from 'react-virtuoso'
import type {
  HistoryItem as HistoryItemType,
  ThemeType,
  GeneralConfig,
  CheckboxStyleType,
  IconSourceType,
  WebDAVConfig,
} from '~common/types'
import { getLocalHistory } from '~common/history'
import { syncToCloud, syncFromCloud } from '~common/webdav'
import HistoryItemComponent from '~components/HistoryItem'
import SyncStatus from '~components/SyncStatus'
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG, DEFAULT_GENERAL_CONFIG } from '~store'
import { extractDomain, applyTheme, getDomainFaviconUrl, getLetterIcon } from '~common/utils'
import { Logger } from '~common/logger'
import './style.css'

interface GroupedHistoryItem {
  id: string
  type: 'item' | 'date' | 'domain'
  data: HistoryItemType | string | { domain: string; count: number }
  isExpanded?: boolean
}

interface DomainGroupItemProps {
  domain: string
  count: number
  isExpanded: boolean
  iconSource: IconSourceType
  onToggle: () => void
}

interface DomainIconProps {
  domain: string
  iconSource: IconSourceType
}

const DomainIcon: React.FC<DomainIconProps> = ({ domain, iconSource }) => {
  const [hasError, setHasError] = useState(false)

  if (iconSource === 'letter') {
    return <span>{getLetterIcon(domain)}</span>
  }

  if (iconSource === 'none') {
    return null
  }

  if (hasError) {
    return <span>{getLetterIcon(domain)}</span>
  }

  return (
    <img
      src={getDomainFaviconUrl(domain, iconSource)}
      alt={domain}
      onError={() => setHasError(true)}
    />
  )
}

function DateGroupItem({ date }: { date: string }) {
  return <div className="date-group">{date}</div>
}

function DomainGroupItem({
  domain,
  count,
  isExpanded,
  iconSource,
  onToggle,
}: DomainGroupItemProps) {
  return (
    <button
      className={`domain-group ${isExpanded ? 'expanded' : 'collapsed'}`}
      onClick={onToggle}
      type="button"
      aria-label={`${isExpanded ? '折叠' : '展开'} ${domain} (${count} 条)`}
      aria-expanded={isExpanded}
    >
      <div className="domain-header">
        <div className="domain-icon">
          <DomainIcon domain={domain} iconSource={iconSource} />
        </div>
        <span className="domain-name">{domain}</span>
        <span className="domain-count">{count} 条</span>
        <span className="domain-toggle">{isExpanded ? '▼' : '▶'}</span>
      </div>
    </button>
  )
}

const storage = new Storage()

const Popup: React.FC = () => {
  const [allHistoryItems, setAllHistoryItems] = useState<GroupedHistoryItem[]>([])
  const [historyItems, setHistoryItems] = useState<GroupedHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<{
    message: string
    type: 'info' | 'success' | 'error'
  } | null>(null)
  const [hasWebDAVConfig, setHasWebDAVConfig] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [themeConfig, setThemeConfig] = useState<{ theme: ThemeType }>({
    theme: DEFAULT_THEME_CONFIG.theme as ThemeType,
  })
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>({
    ...DEFAULT_GENERAL_CONFIG,
    checkboxStyle: DEFAULT_GENERAL_CONFIG.checkboxStyle as CheckboxStyleType,
    iconSource: DEFAULT_GENERAL_CONFIG.iconSource as IconSourceType,
  })
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadHistory()
    checkWebDAVConfig()
    loadThemeConfig()
    loadGeneralConfig()
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

  const loadThemeConfig = async () => {
    try {
      const savedThemeConfig = await storage.get<{ theme: ThemeType }>(STORAGE_KEYS.THEME_CONFIG)
      if (savedThemeConfig) {
        setThemeConfig(savedThemeConfig)
      }
    } catch (error) {
      Logger.error('Failed to load theme config', error)
    }
  }

  const loadGeneralConfig = async () => {
    try {
      const savedGeneralConfig = await storage.get<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG)
      if (savedGeneralConfig) {
        setGeneralConfig(savedGeneralConfig)
      }
    } catch (error) {
      Logger.error('Failed to load general config', error)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setHistoryItems(allHistoryItems)
    } else {
      const filtered = allHistoryItems.filter(item => {
        if (item.type === 'item') {
          const historyItem = item.data as HistoryItemType
          return (
            (historyItem.title &&
              historyItem.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (historyItem.url && historyItem.url.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        } else if (item.type === 'domain') {
          const domainData = item.data as { domain: string; count: number }
          return domainData.domain.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return true
      })
      setHistoryItems(filtered)
    }
  }, [searchQuery, allHistoryItems])

  const checkWebDAVConfig = async () => {
    try {
      const config = await storage.get<WebDAVConfig>('webdav_config')
      setHasWebDAVConfig(!!config?.url && !!config?.username)
    } catch (error) {
      Logger.error('Failed to check WebDAV config', error)
      setHasWebDAVConfig(false)
    }
  }

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
      return date.toLocaleDateString([], {
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
      const items = await getLocalHistory()
      Logger.info(`Loaded ${items.length} history items`)
      const groupedItems = groupHistoryByDate(items)
      setAllHistoryItems(groupedItems)
      setHistoryItems(groupedItems)
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
    setSyncStatus({ message: '正在同步到云端...', type: 'info' })
    try {
      const rawHistoryItems = historyItems
        .filter(item => item.type === 'item')
        .map(item => item.data as HistoryItemType)

      const result = await syncToCloud(rawHistoryItems)
      if (result.success) {
        setSyncStatus({
          message: result.message || '同步到云端成功！已合并数据。',
          type: 'success',
        })
      } else {
        setSyncStatus({ message: result.error || '同步失败', type: 'error' })
      }
    } catch (error) {
      setSyncStatus({
        message: '同步失败',
        type: 'error',
      })
      Logger.error('Failed to sync to cloud', error)
    }
  }

  const handleSyncFromCloud = async () => {
    setSyncStatus({ message: '正在从云端同步...', type: 'info' })
    try {
      const remoteItems = await syncFromCloud()
      const groupedItems = groupHistoryByDate(remoteItems)
      setAllHistoryItems(groupedItems)
      setHistoryItems(groupedItems)
      setSyncStatus({
        message: `从云端同步成功！获取到 ${remoteItems.length} 条记录。`,
        type: 'success',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败'
      setSyncStatus({ message: errorMessage, type: 'error' })
      Logger.error('Failed to sync from cloud', error)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="title-bar">
          <h1>历史记录</h1>
          <div className="action-buttons">
            <button
              className="action-button"
              title="设置"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              ⚙️
            </button>
          </div>
        </div>

        {hasWebDAVConfig && (
          <div className="sync-buttons-container">
            <div className="button-group">
              <button className="btn-primary" onClick={handleSyncToCloud}>
                同步到云端
              </button>
              <button className="btn-secondary" onClick={handleSyncFromCloud}>
                从云端同步
              </button>
            </div>
            <SyncStatus status={syncStatus} />
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
            <div className="loading">加载历史记录中...</div>
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
                  return <DateGroupItem date={JSON.stringify(item.data)} />
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
  )
}

export default Popup
