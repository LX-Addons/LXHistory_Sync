import { describe, it, expect } from 'vitest'
import {
  STORAGE_KEYS,
  DEFAULT_GENERAL_CONFIG,
  DEFAULT_THEME_CONFIG,
  WEBDAV_FILENAME,
} from '~/store'

describe('STORAGE_KEYS', () => {
  it('应该包含所有存储键', () => {
    expect(STORAGE_KEYS.WEBDAV_CONFIG).toBe('webdav_config')
    expect(STORAGE_KEYS.SYNC_STATUS).toBe('sync_status')
    expect(STORAGE_KEYS.THEME_CONFIG).toBe('theme_config')
    expect(STORAGE_KEYS.GENERAL_CONFIG).toBe('general_config')
  })
})

describe('DEFAULT_GENERAL_CONFIG', () => {
  it('应该有正确的默认值', () => {
    expect(DEFAULT_GENERAL_CONFIG.searchEnabled).toBe(true)
    expect(DEFAULT_GENERAL_CONFIG.checkboxStyle).toBe('toggle')
    expect(DEFAULT_GENERAL_CONFIG.collapseDomainHistory).toBe(false)
    expect(DEFAULT_GENERAL_CONFIG.showUrls).toBe(false)
    expect(DEFAULT_GENERAL_CONFIG.iconSource).toBe('letter')
    expect(DEFAULT_GENERAL_CONFIG.autoSyncEnabled).toBe(false)
    expect(DEFAULT_GENERAL_CONFIG.syncInterval).toBe(3600000)
    expect(DEFAULT_GENERAL_CONFIG.maxHistoryItems).toBe(1000)
  })

  it('syncInterval 应该是一小时（毫秒）', () => {
    expect(DEFAULT_GENERAL_CONFIG.syncInterval).toBe(60 * 60 * 1000)
  })

  it('maxHistoryItems 默认应该是 1000', () => {
    expect(DEFAULT_GENERAL_CONFIG.maxHistoryItems).toBe(1000)
  })
})

describe('DEFAULT_THEME_CONFIG', () => {
  it('默认主题应该是 auto', () => {
    expect(DEFAULT_THEME_CONFIG.theme).toBe('auto')
  })
})

describe('WEBDAV_FILENAME', () => {
  it('文件名应该是 history.json', () => {
    expect(WEBDAV_FILENAME).toBe('history.json')
  })
})
