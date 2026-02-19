import { useState, memo } from 'react'
import type { FC } from 'react'
import type { HistoryItem as HistoryItemType, IconSourceType } from '~common/types'
import { extractDomain, getFaviconUrl, getLetterIcon, formatTime } from '~common/utils'

interface HistoryItemProps {
  item: HistoryItemType
  showUrls?: boolean
  iconSource?: IconSourceType
}

interface FaviconProps {
  url: string
  iconSource: IconSourceType
}

const Favicon: FC<FaviconProps> = memo(({ url, iconSource }) => {
  const [hasError, setHasError] = useState(false)
  const domain = extractDomain(url)

  if (iconSource === 'letter' || hasError) {
    return <div className="history-item-icon">{getLetterIcon(domain)}</div>
  }

  if (iconSource === 'none') {
    return null
  }

  return (
    <img
      className="history-item-icon"
      src={getFaviconUrl(domain, iconSource)}
      alt=""
      onError={() => setHasError(true)}
    />
  )
})

Favicon.displayName = 'Favicon'

const HistoryItem: FC<HistoryItemProps> = memo(
  ({ item, showUrls = false, iconSource = 'byteance' }) => {
    const handleClick = () => {
      if (item.url) {
        window.open(item.url, '_blank')
      }
    }

    return (
      <button
        className="history-item"
        onClick={handleClick}
        type="button"
        aria-label={`打开 ${item.title || '无标题'}`}
      >
        {item.url && iconSource !== 'none' && (
          <div className="history-item-icon-container">
            <Favicon url={item.url} iconSource={iconSource} />
          </div>
        )}
        <div className="history-item-content">
          <div className="history-item-title">{item.title || '无标题'}</div>
          {showUrls && item.url && <div className="history-item-url">{item.url}</div>}
        </div>
        <div className="history-item-time">{formatTime(item.lastVisitTime)}</div>
      </button>
    )
  }
)

HistoryItem.displayName = 'HistoryItem'

export default HistoryItem
