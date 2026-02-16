import { useState } from 'react'
import ConfigForm from '~components/ConfigForm'
import { useConfig } from '~hooks/useConfig'
import { useGeneralConfig } from '~hooks/useGeneralConfig'
import { testWebDAVConnection } from '~common/webdav'
import StatusMessage from '~components/StatusMessage'
import { ensureHostPermission } from '~common/utils'
import { useStorage } from '@plasmohq/storage/hook'

export default function WebDAVTab() {
  const { config, setConfig, status, handleSave } = useConfig()
  const { generalConfig } = useGeneralConfig()
  const [testStatus, setTestStatus] = useState<{
    message: string
    type: 'info' | 'success' | 'error'
  } | null>(null)
  const [showMasterPasswordPrompt, setShowMasterPasswordPrompt] = useState(false)
  const [masterPasswordData] = useStorage<{ hash: string; salt: string } | null>(
    'master_password_data',
    null
  )

  const hasMasterPassword = !!masterPasswordData?.hash

  const handleSaveWithPrompt = async (e: React.FormEvent) => {
    await handleSave(e)
    if (!hasMasterPassword) {
      setShowMasterPasswordPrompt(true)
    }
  }

  const handleGoToSecurity = () => {
    const securityTab = document.querySelector('[data-tab="security"]') as HTMLButtonElement
    if (securityTab) {
      securityTab.click()
    }
    setShowMasterPasswordPrompt(false)
  }

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
        onSubmit={handleSaveWithPrompt}
        checkboxStyle={generalConfig.checkboxStyle}
      />
      {showMasterPasswordPrompt && (
        <div
          className="message message-warning"
          style={{
            marginTop: 'var(--spacing-md)',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            color: '#856404',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
          }}
        >
          <span>💡 建议设置主密码以保护您的 WebDAV 凭证</span>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              type="button"
              onClick={handleGoToSecurity}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              前往安全设置
            </button>
            <button
              type="button"
              onClick={() => setShowMasterPasswordPrompt(false)}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              稍后再说
            </button>
          </div>
        </div>
      )}
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
