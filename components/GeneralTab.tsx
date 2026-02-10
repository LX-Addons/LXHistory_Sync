import React, { useState } from 'react'
import type { IconSourceType, CheckboxStyleType } from '~common/types'
import { useGeneralConfig } from '~hooks/useGeneralConfig'
import CheckboxField from '~components/CheckboxField'
import StatusMessage from '~components/StatusMessage'

export default function GeneralTab() {
  const { generalConfig, setGeneralConfig, status, handleSave, getCheckboxClassName } =
    useGeneralConfig()
  const [localStatus, setLocalStatus] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    await handleSave(e)
    setLocalStatus(status)
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
      </form>
    </div>
  )
}
