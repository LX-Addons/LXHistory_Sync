import { useState } from 'react'
import { useStorage } from '@plasmohq/storage/hook'
import type { GeneralConfig, CheckboxStyleType, IconSourceType } from '~common/types'
import { STORAGE_KEYS, DEFAULT_GENERAL_CONFIG } from '~store'
import { getCheckboxClassName, STATUS_CLEAR_DELAY } from '~common/utils'
import { Logger } from '~common/logger'

export function useGeneralConfig() {
  const [generalConfig, setGeneralConfig] = useStorage<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG, {
    ...DEFAULT_GENERAL_CONFIG,
    checkboxStyle: DEFAULT_GENERAL_CONFIG.checkboxStyle as CheckboxStyleType,
    iconSource: DEFAULT_GENERAL_CONFIG.iconSource as IconSourceType,
    maxHistoryItems: DEFAULT_GENERAL_CONFIG.maxHistoryItems,
  })
  const [status, setStatus] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('正在保存...')
    try {
      await setGeneralConfig(generalConfig)
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
