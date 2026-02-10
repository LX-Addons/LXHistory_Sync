import { useState, useEffect } from 'react'
import { Storage } from '@plasmohq/storage'
import type { GeneralConfig, CheckboxStyleType, IconSourceType } from '~common/types'
import { STORAGE_KEYS, DEFAULT_GENERAL_CONFIG } from '~store'
import { getCheckboxClassName, STATUS_CLEAR_DELAY } from '~common/utils'
import { Logger } from '~common/logger'

const storage = new Storage()

export function useGeneralConfig() {
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>({
    ...DEFAULT_GENERAL_CONFIG,
    checkboxStyle: DEFAULT_GENERAL_CONFIG.checkboxStyle as CheckboxStyleType,
    iconSource: DEFAULT_GENERAL_CONFIG.iconSource as IconSourceType,
  })
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadGeneralConfig()
  }, [])

  const loadGeneralConfig = async () => {
    const savedGeneralConfig = await storage.get<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG)
    if (savedGeneralConfig) {
      setGeneralConfig(savedGeneralConfig)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('正在保存...')
    try {
      await storage.set(STORAGE_KEYS.GENERAL_CONFIG, generalConfig)
      setStatus('保存成功！')
      setTimeout(() => {
        setStatus('')
      }, STATUS_CLEAR_DELAY)
    } catch (error) {
      setStatus('保存失败')
      Logger.error('Failed to save general config', error)
      setTimeout(() => {
        setStatus('')
      }, STATUS_CLEAR_DELAY)
    }
  }

  return {
    generalConfig,
    setGeneralConfig,
    status,
    handleSave,
    getCheckboxClassName,
  }
}
