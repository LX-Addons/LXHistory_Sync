import { useState, useEffect } from 'react'
import { useStorage } from '@plasmohq/storage/hook'
import type { WebDAVConfig } from '~common/types'
import { getMasterKey, encryptData, decryptData } from '~common/webdav'
import { STATUS_CLEAR_DELAY, ensureHostPermission } from '~common/utils'
import { Logger } from '~common/logger'

const DEFAULT_CONFIG: WebDAVConfig = {
  url: '',
  username: '',
  password: '',
  encryption: {
    enabled: false,
    type: 'aes-256-gcm',
  },
}

export function useConfig() {
  const [storedConfig, setStoredConfig] = useStorage<WebDAVConfig>('webdav_config', DEFAULT_CONFIG)
  const [config, setConfig] = useState<WebDAVConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!storedConfig) {
      setConfig(DEFAULT_CONFIG)
      return
    }

    const decryptConfig = async () => {
      const masterKey = await getMasterKey()

      if (masterKey) {
        try {
          const decryptedPassword = storedConfig.password
            ? await decryptData(storedConfig.password, masterKey)
            : undefined
          const decryptedKey = storedConfig.encryption?.key
            ? await decryptData(storedConfig.encryption.key, masterKey)
            : undefined

          setConfig({
            ...storedConfig,
            password: decryptedPassword,
            encryption: {
              ...storedConfig.encryption,
              key: decryptedKey,
            },
          })
        } catch (error) {
          Logger.error('Failed to decrypt config', error)
          setConfig(storedConfig)
        }
      } else {
        setConfig(storedConfig)
      }
    }

    decryptConfig()
  }, [storedConfig])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('正在保存...')
    try {
      if (config.url) {
        const permissionGranted = await ensureHostPermission(config.url)
        if (!permissionGranted) {
          setStatus('需要授权访问 WebDAV 服务器')
          setTimeout(() => {
            setStatus('')
          }, STATUS_CLEAR_DELAY)
          return
        }
      }

      const masterKey = await getMasterKey()

      if (masterKey) {
        const configToSave: WebDAVConfig = {
          ...config,
          password: config.password ? await encryptData(config.password, masterKey) : undefined,
          encryption: {
            ...config.encryption,
            key: config.encryption.key
              ? await encryptData(config.encryption.key, masterKey)
              : undefined,
          },
        }
        await setStoredConfig(configToSave)
      } else {
        await setStoredConfig(config)
      }

      setStatus('保存成功！')
      setTimeout(() => {
        setStatus('')
      }, STATUS_CLEAR_DELAY)
    } catch (error) {
      setStatus('保存失败')
      Logger.error('Failed to save config', error)
      setTimeout(() => {
        setStatus('')
      }, STATUS_CLEAR_DELAY)
    }
  }

  return {
    config,
    setConfig,
    status,
    handleSave,
  }
}
