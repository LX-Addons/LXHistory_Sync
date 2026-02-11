import ConfigForm from '~components/ConfigForm'
import { useConfig } from '~hooks/useConfig'
import { useGeneralConfig } from '~hooks/useGeneralConfig'

export default function WebDAVTab() {
  const { config, setConfig, status, handleSave } = useConfig()
  const { generalConfig } = useGeneralConfig()

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
    </div>
  )
}
