import { useState, useEffect } from 'react'
import { Storage } from '@plasmohq/storage'
import type { ThemeType } from '~common/types'
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG } from '~store'
import { applyTheme, STATUS_CLEAR_DELAY } from '~common/utils'
import { Logger } from '~common/logger'

const storage = new Storage()

export function useTheme() {
  const [themeConfig, setThemeConfig] = useState<{ theme: ThemeType }>({
    theme: DEFAULT_THEME_CONFIG.theme as ThemeType,
  })
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadThemeConfig()
  }, [])

  useEffect(() => {
    applyTheme(themeConfig.theme)
  }, [themeConfig])

  const loadThemeConfig = async () => {
    const savedThemeConfig = await storage.get<{ theme: ThemeType }>(STORAGE_KEYS.THEME_CONFIG)
    if (savedThemeConfig) {
      setThemeConfig(savedThemeConfig)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('正在保存...')
    try {
      await storage.set(STORAGE_KEYS.THEME_CONFIG, themeConfig)
      setStatus('保存成功！')
      setTimeout(() => {
        setStatus('')
      }, STATUS_CLEAR_DELAY)
    } catch (error) {
      setStatus('保存失败')
      Logger.error('Failed to save theme config', error)
      setTimeout(() => {
        setStatus('')
      }, STATUS_CLEAR_DELAY)
    }
  }

  return {
    themeConfig,
    setThemeConfig,
    status,
    handleSave,
  }
}
