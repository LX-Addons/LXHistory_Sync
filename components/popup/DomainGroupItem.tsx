import type { IconSourceType } from '~common/types'
import DomainIcon from './DomainIcon'

interface DomainGroupItemProps {
  domain: string
  count: number
  isExpanded: boolean
  iconSource: IconSourceType
  onToggle: () => void
}

export default function DomainGroupItem({
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
