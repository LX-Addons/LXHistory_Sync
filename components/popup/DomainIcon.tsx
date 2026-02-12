import { useState, useEffect } from 'react'
import type { IconSourceType } from '~common/types'
import { getDomainFaviconUrl, getLetterIcon } from '~common/utils'

interface DomainIconProps {
  domain: string
  iconSource: IconSourceType
}

const DomainIcon: React.FC<DomainIconProps> = ({ domain, iconSource }) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [domain, iconSource])

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

export default DomainIcon
