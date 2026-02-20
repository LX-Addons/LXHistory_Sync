import React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { DateGroupItem, DomainGroupItem } from './popup'
import HistoryItemComponent from './HistoryItem'
import type { GroupedHistoryItem } from '../hooks/useHistory'
import type { IconSourceType } from '../common/types'

interface VirtualHistoryListProps {
  items: GroupedHistoryItem[]
  expandedDomains: Set<string>
  onToggleDomain: (domainId: string) => void
  showUrls: boolean
  iconSource: IconSourceType
}

const VirtualHistoryList: React.FC<VirtualHistoryListProps> = ({
  items,
  expandedDomains,
  onToggleDomain,
  showUrls,
  iconSource,
}) => {
  const itemContent = (_index: number, item: GroupedHistoryItem): React.ReactNode => {
    if (item.type === 'date') {
      return <DateGroupItem date={item.data} />
    } else if (item.type === 'domain') {
      const domainData = item.data
      return (
        <DomainGroupItem
          domain={domainData.domain}
          count={domainData.count}
          isExpanded={expandedDomains.has(item.id)}
          iconSource={iconSource}
          onToggle={() => onToggleDomain(item.id)}
        />
      )
    } else if (item.type === 'item') {
      return <HistoryItemComponent item={item.data} showUrls={showUrls} iconSource={iconSource} />
    }
    return null
  }

  return (
    <Virtuoso
      style={{ height: '100%', width: '100%' }}
      data={items}
      itemContent={itemContent}
      overscan={15}
    />
  )
}

export default VirtualHistoryList
