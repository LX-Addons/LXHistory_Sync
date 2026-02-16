import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Storage } from '@plasmohq/storage'
import { sendToBackground } from '@plasmohq/messaging'
import type { IconSourceType, CheckboxStyleType, ExportResult } from '~common/types'
import { useGeneralConfig } from '~hooks/useGeneralConfig'
import CheckboxField from '~components/CheckboxField'
import StatusMessage from '~components/StatusMessage'

const storage = new Storage()

export default function GeneralTab() {
  const { generalConfig, setGeneralConfig, status, handleSave, getCheckboxClassName } =
    useGeneralConfig()
  const [localStatus, setLocalStatus] = useState('')
  const [hasMasterPassword, setHasMasterPassword] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const checkMasterPassword = async () => {
      const masterPasswordData = await storage.get<{ hash: string; salt: string }>(
        'master_password_data'
      )
      setHasMasterPassword(!!masterPasswordData?.hash)
    }
    checkMasterPassword()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    await handleSave(e)
    setLocalStatus(status)
  }

  const handleExport = async (format: 'EXPORT_JSON' | 'EXPORT_CSV') => {
    setExporting(true)
    try {
      const result = (await sendToBackground({
        name: 'export',
        body: { action: format },
      })) as ExportResult

      if (result.success && result.data && result.filename) {
        const mimeType = format === 'EXPORT_JSON' ? 'application/json' : 'text/csv'
        const dataUrl = `data:${mimeType};base64,${result.data}`
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setLocalStatus('✅ 导出成功')
      } else {
        setLocalStatus(`❌ 导出失败: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      setLocalStatus(`❌ 导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>通用设置</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
          配置应用的各种通用选项和偏好设置。
        </p>
      </div>
      <form onSubmit={handleSubmit} className="general-form">
        <CheckboxField
          id="search-enabled"
          label="启用搜索框"
          checked={generalConfig.searchEnabled}
          onChange={checked =>
            setGeneralConfig({
              ...generalConfig,
              searchEnabled: checked,
            })
          }
          className={getCheckboxClassName(generalConfig.checkboxStyle)}
        />

        <CheckboxField
          id="collapse-domain-history"
          label="按域名折叠历史记录"
          checked={generalConfig.collapseDomainHistory}
          onChange={checked =>
            setGeneralConfig({
              ...generalConfig,
              collapseDomainHistory: checked,
            })
          }
          className={getCheckboxClassName(generalConfig.checkboxStyle)}
        />

        <CheckboxField
          id="show-urls"
          label="显示历史记录URL"
          checked={generalConfig.showUrls}
          onChange={checked =>
            setGeneralConfig({
              ...generalConfig,
              showUrls: checked,
            })
          }
          className={getCheckboxClassName(generalConfig.checkboxStyle)}
        />

        <div className="form-group">
          <label htmlFor="icon-source">图标获取方式:</label>
          <select
            id="icon-source"
            value={generalConfig.iconSource}
            onChange={e =>
              setGeneralConfig({
                ...generalConfig,
                iconSource: e.target.value as IconSourceType,
              })
            }
          >
            <option value="byteance">字节跳动 (国内推荐)</option>
            <option value="google">Google (全球通用)</option>
            <option value="duckduckgo">DuckDuckGo (全球通用)</option>
            <option value="letter">域名首字母 (无网络依赖)</option>
            <option value="none">不显示图标</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="max-history-items">历史记录获取数量:</label>
          <select
            id="max-history-items"
            value={generalConfig.maxHistoryItems}
            onChange={e =>
              setGeneralConfig({
                ...generalConfig,
                maxHistoryItems: Number.parseInt(e.target.value),
              })
            }
          >
            <option value="500">500 条</option>
            <option value="1000">1000 条 (默认)</option>
            <option value="2000">2000 条</option>
            <option value="5000">5000 条</option>
            <option value="10000">10000 条</option>
          </select>
        </div>

        <CheckboxField
          id="auto-sync-enabled"
          label="启用自动同步"
          checked={generalConfig.autoSyncEnabled}
          onChange={checked =>
            setGeneralConfig({
              ...generalConfig,
              autoSyncEnabled: checked,
            })
          }
          className={getCheckboxClassName(generalConfig.checkboxStyle)}
        />

        {hasMasterPassword && (
          <div
            className="message message-info"
            style={{ fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }}
          >
            ⚠️ 已设置主密码时，自动同步功能不可用。请使用手动同步。
          </div>
        )}

        <div className="form-group">
          <label htmlFor="sync-interval">同步间隔 (分钟):</label>
          <select
            id="sync-interval"
            value={generalConfig.syncInterval / 60000}
            onChange={e =>
              setGeneralConfig({
                ...generalConfig,
                syncInterval: Number.parseInt(e.target.value) * 60000,
              })
            }
            disabled={!generalConfig.autoSyncEnabled}
          >
            <option value="15">15分钟</option>
            <option value="30">30分钟</option>
            <option value="60">1小时</option>
            <option value="120">2小时</option>
            <option value="240">4小时</option>
            <option value="360">6小时</option>
            <option value="720">12小时</option>
            <option value="1440">24小时</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="checkbox-style">复选框样式:</label>
          <select
            id="checkbox-style"
            value={generalConfig.checkboxStyle}
            onChange={e =>
              setGeneralConfig({
                ...generalConfig,
                checkboxStyle: e.target.value as CheckboxStyleType,
              })
            }
          >
            <option value="default">默认样式</option>
            <option value="modern">现代样式</option>
            <option value="minimal">极简样式</option>
            <option value="classic">经典样式</option>
            <option value="rounded">圆角样式</option>
            <option value="toggle">开关样式</option>
          </select>
        </div>

        <div className="form-group">
          <span className="label-text">样式预览:</span>
          <div className="checkbox-preview">
            <div className="preview-item">
              <input
                type="checkbox"
                checked={true}
                disabled
                className={getCheckboxClassName(generalConfig.checkboxStyle)}
              />
              <span>已选中</span>
            </div>
            <div className="preview-item">
              <input
                type="checkbox"
                checked={false}
                disabled
                className={getCheckboxClassName(generalConfig.checkboxStyle)}
              />
              <span>未选中</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary">
          保存通用设置
        </button>
        <StatusMessage message={localStatus} onClear={() => setLocalStatus('')} />

        <div
          className="export-section"
          style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>导出数据</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '16px' }}>
            将历史记录导出为 JSON 或 CSV 格式文件。
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExport('EXPORT_JSON')}
              disabled={exporting}
            >
              {exporting ? '导出中...' : '导出为 JSON'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExport('EXPORT_CSV')}
              disabled={exporting}
            >
              {exporting ? '导出中...' : '导出为 CSV'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
