import { useState } from 'react'
import ConfigForm from '~components/ConfigForm'
import { useConfig } from '~hooks/useConfig'
import { useGeneralConfig } from '~hooks/useGeneralConfig'
import { testWebDAVConnection } from '~common/webdav'
import StatusMessage from '~components/StatusMessage'
import { Logger } from '~common/logger'

function extractOrigin(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.origin + '/*'
  } catch {
    return null
  }
}

async function ensureHostPermission(url: string): Promise<boolean> {
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

export default function WebDAVTab() {
  const { config, setConfig, status, handleSave } = useConfig()
  const { generalConfig } = useGeneralConfig()
  const [testStatus, setTestStatus] = useState<{
    message: string
    type: 'info' | 'success' | 'error'
  } | null>(null)

  const handleTestConnection = async () => {
    if (!config.url || !config.username || !config.password) {
      setTestStatus({
        message: '请先填写完整的 WebDAV 配置',
        type: 'error',
      })
      return
    }

    const permissionGranted = await ensureHostPermission(config.url)
    if (!permissionGranted) {
      setTestStatus({
        message: '需要授权访问 WebDAV 服务器',
        type: 'error',
      })
      return
    }

    setTestStatus({ message: '正在测试连接...', type: 'info' })
    const result = await testWebDAVConnection(config)
    setTestStatus({
      message: result.message || (result.success ? '连接测试成功' : '连接测试失败'),
      type: result.success ? 'success' : 'error',
    })
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>WebDAV 配置</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
          配置您的WebDAV服务器以启用历史记录同步功能。
        </p>
      </div>
      <ConfigForm
        config={config}
        status={status}
        onConfigChange={setConfig}
        onSubmit={handleSave}
        checkboxStyle={generalConfig.checkboxStyle}
      />
      <div style={{ marginTop: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={handleTestConnection}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          测试连接
        </button>
        <StatusMessage message={testStatus} onClear={() => setTestStatus(null)} />
      </div>
    </div>
  )
}
