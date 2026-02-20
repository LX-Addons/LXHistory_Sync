import { useState, useEffect } from 'react'
import { useStorage } from '@plasmohq/storage/hook'
import type { ThemeType } from '~common/types'
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG } from '~store'
import { applyTheme, STATUS_CLEAR_DELAY } from '~common/utils'
import { Logger } from '~common/logger'

export function useTheme() {
  const [themeConfig, setThemeConfig] = useStorage<{ theme: ThemeType }>(
    STORAGE_KEYS.THEME_CONFIG,
    {
      theme: DEFAULT_THEME_CONFIG.theme as ThemeType,
    }
  )
  const [status, setStatus] = useState('')

  useEffect(() => {
    applyTheme(themeConfig.theme)
  }, [themeConfig])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('正在保存...')
    try {
      await setThemeConfig(themeConfig)
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
