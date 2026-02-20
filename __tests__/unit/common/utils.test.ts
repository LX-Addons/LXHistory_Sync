import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractOrigin,
  extractDomain,
  getFaviconUrl,
  getLetterIcon,
  formatTime,
  getErrorMessage,
  getCheckboxClassName,
  ensureHostPermission,
  applyTheme,
  APP_NAME,
  STATUS_CLEAR_DELAY,
} from '~/common/utils'
import type { CheckboxStyleType } from '~/common/types'

const mockChromePermissions = {
  contains: vi.fn(),
  request: vi.fn(),
}

vi.stubGlobal('chrome', {
  permissions: mockChromePermissions,
})

describe('utils', () => {
  describe('constants', () => {
    it('APP_NAME 应该是 LXHistory_Sync', () => {
      expect(APP_NAME).toBe('LXHistory_Sync')
    })

    it('STATUS_CLEAR_DELAY 应该是 3000 毫秒', () => {
      expect(STATUS_CLEAR_DELAY).toBe(3000)
    })
  })

  describe('extractOrigin', () => {
    it('应该从 URL 中提取 origin', () => {
      expect(extractOrigin('https://example.com/path')).toBe('https://example.com/*')
    })

    it('应该处理带端口的 URL', () => {
      expect(extractOrigin('https://example.com:8080/path')).toBe('https://example.com:8080/*')
    })

    it('无效 URL 应该返回 null', () => {
      expect(extractOrigin('invalid-url')).toBeNull()
    })

    it('空字符串应该返回 null', () => {
      expect(extractOrigin('')).toBeNull()
    })
  })

  describe('extractDomain', () => {
    it('应该从 URL 中提取域名', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com')
    })

    it('应该处理带 www 的域名', () => {
      expect(extractDomain('https://www.example.com/path')).toBe('www.example.com')
    })

    it('无效 URL 应该返回处理后的字符串', () => {
      expect(extractDomain('example.com/path')).toBe('example.com')
    })

    it('空字符串应该返回未知域名', () => {
      expect(extractDomain('')).toBe('未知域名')
    })
  })

  describe('getFaviconUrl', () => {
    it('应该返回字节跳动的 favicon URL', () => {
      const url = getFaviconUrl('example.com', 'byteance')
      expect(url).toBe('https://f1.allesedv.com/example.com/favicon.ico')
    })

    it('应该返回 Google 的 favicon URL', () => {
      const url = getFaviconUrl('example.com', 'google')
      expect(url).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=16')
    })

    it('应该返回 DuckDuckGo 的 favicon URL', () => {
      const url = getFaviconUrl('example.com', 'duckduckgo')
      expect(url).toBe('https://icons.duckduckgo.com/ip3/example.com.ico')
    })

    it('letter 类型应该返回空字符串', () => {
      const url = getFaviconUrl('example.com', 'letter')
      expect(url).toBe('')
    })

    it('空域名应该返回空字符串', () => {
      const url = getFaviconUrl('', 'google')
      expect(url).toBe('')
    })
  })

  describe('getLetterIcon', () => {
    it('应该返回首字母大写', () => {
      expect(getLetterIcon('example.com')).toBe('E')
    })

    it('数字开头应该返回数字', () => {
      expect(getLetterIcon('123.com')).toBe('1')
    })

    it('中文开头应该返回地球图标', () => {
      expect(getLetterIcon('例子.com')).toBe('🌐')
    })

    it('空字符串应该返回地球图标', () => {
      expect(getLetterIcon('')).toBe('🌐')
    })
  })

  describe('formatTime', () => {
    it('应该格式化时间戳', () => {
      const timestamp = new Date('2024-01-01T12:30:00').getTime()
      const result = formatTime(timestamp)
      expect(result).toMatch(/\d{2}:\d{2}/)
    })
  })

  describe('getErrorMessage', () => {
    it('应该返回 Error 的 message', () => {
      const error = new Error('test error')
      expect(getErrorMessage(error)).toBe('test error')
    })

    it('应该返回字符串本身', () => {
      expect(getErrorMessage('string error')).toBe('string error')
    })

    it('其他类型应该返回 Unknown error', () => {
      expect(getErrorMessage(null)).toBe('Unknown error')
      expect(getErrorMessage(undefined)).toBe('Unknown error')
      expect(getErrorMessage(123)).toBe('Unknown error')
    })
  })

  describe('getCheckboxClassName', () => {
    it('应该返回正确的 checkbox 类名', () => {
      expect(getCheckboxClassName('modern')).toBe('checkbox-modern')
      expect(getCheckboxClassName('minimal')).toBe('checkbox-minimal')
      expect(getCheckboxClassName('classic')).toBe('checkbox-classic')
      expect(getCheckboxClassName('rounded')).toBe('checkbox-rounded')
      expect(getCheckboxClassName('toggle')).toBe('checkbox-toggle')
    })

    it('未知类型应该返回默认类名', () => {
      expect(getCheckboxClassName('unknown' as CheckboxStyleType)).toBe('custom-checkbox')
    })
  })

  describe('ensureHostPermission', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return false for invalid URL', async () => {
      const result = await ensureHostPermission('invalid-url')
      expect(result).toBe(false)
    })

    it('should return true when permission already granted', async () => {
      mockChromePermissions.contains.mockResolvedValue(true)
      const result = await ensureHostPermission('https://example.com/path')
      expect(result).toBe(true)
      expect(mockChromePermissions.request).not.toHaveBeenCalled()
    })

    it('should request permission when not granted', async () => {
      mockChromePermissions.contains.mockResolvedValue(false)
      mockChromePermissions.request.mockResolvedValue(true)
      const result = await ensureHostPermission('https://example.com/path')
      expect(result).toBe(true)
      expect(mockChromePermissions.request).toHaveBeenCalledWith({
        origins: ['https://example.com/*'],
      })
    })

    it('should return false when permission denied', async () => {
      mockChromePermissions.contains.mockResolvedValue(false)
      mockChromePermissions.request.mockResolvedValue(false)
      const result = await ensureHostPermission('https://example.com/path')
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockChromePermissions.contains.mockRejectedValue(new Error('Permission error'))
      const result = await ensureHostPermission('https://example.com/path')
      expect(result).toBe(false)
    })
  })

  describe('applyTheme', () => {
    let root: HTMLElement

    beforeEach(() => {
      root = document.documentElement
      root.classList.remove('dark-theme', 'light-theme')
    })

    it('should apply dark theme', () => {
      applyTheme('dark')
      expect(root.classList.contains('dark-theme')).toBe(true)
      expect(root.classList.contains('light-theme')).toBe(false)
    })

    it('should apply light theme', () => {
      applyTheme('light')
      expect(root.classList.contains('light-theme')).toBe(true)
      expect(root.classList.contains('dark-theme')).toBe(false)
    })

    it('should apply auto theme with dark mode preference', () => {
      const matchMediaMock = vi.fn().mockReturnValue({ matches: true })
      vi.stubGlobal('matchMedia', matchMediaMock)
      applyTheme('auto')
      expect(root.classList.contains('dark-theme')).toBe(true)
      vi.unstubAllGlobals()
    })

    it('should apply auto theme with light mode preference', () => {
      const matchMediaMock = vi.fn().mockReturnValue({ matches: false })
      vi.stubGlobal('matchMedia', matchMediaMock)
      applyTheme('auto')
      expect(root.classList.contains('light-theme')).toBe(true)
      vi.unstubAllGlobals()
    })
  })
})
