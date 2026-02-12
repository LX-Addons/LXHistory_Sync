import type { CheckboxStyleType, IconSourceType, ThemeType } from './types'
import { Logger } from './logger'

export const APP_NAME = 'LXHistory_Sync'
export const STATUS_CLEAR_DELAY = 3000

export function extractOrigin(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.origin + '/*'
  } catch {
    return null
  }
}

export async function ensureHostPermission(url: string): Promise<boolean> {
  const origin = extractOrigin(url)
  if (!origin) {
    return false
  }

  try {
    const hasPermission = await chrome.permissions.contains({
      origins: [origin],
    })

    if (hasPermission) {
      return true
    }

    const granted = await chrome.permissions.request({
      origins: [origin],
    })

    return granted
  } catch (error) {
    Logger.error('Failed to request host permission', error)
    return false
  }
}

export function getCheckboxClassName(style: CheckboxStyleType): string {
  switch (style) {
    case 'modern':
      return 'checkbox-modern'
    case 'minimal':
      return 'checkbox-minimal'
    case 'classic':
      return 'checkbox-classic'
    case 'rounded':
      return 'checkbox-rounded'
    case 'toggle':
      return 'checkbox-toggle'
    default:
      return 'custom-checkbox'
  }
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    let domain = url
    domain = domain.replace(/^https?:\/\//, '')
    domain = domain.split('/')[0]
    return domain || '未知域名'
  }
}

export function getFaviconUrl(domain: string, iconSource: IconSourceType): string {
  if (!domain) return ''

  switch (iconSource) {
    case 'byteance':
      return `https://f1.allesedv.com/${domain}/favicon.ico`
    case 'google':
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
    case 'duckduckgo':
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`
    default:
      return ''
  }
}

export function getDomainFaviconUrl(domain: string, iconSource: IconSourceType): string {
  return getFaviconUrl(domain, iconSource)
}

export function applyTheme(theme: ThemeType): void {
  const root = document.documentElement
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDarkMode) {
    root.classList.add('dark-theme')
    root.classList.remove('light-theme')
  } else {
    root.classList.add('light-theme')
    root.classList.remove('dark-theme')
  }
}

export function getLetterIcon(domain: string): string {
  if (domain) {
    const firstChar = domain.charAt(0).toUpperCase()
    return firstChar.match(/[a-zA-Z0-9]/) ? firstChar : '🌐'
  }
  return '🌐'
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}
