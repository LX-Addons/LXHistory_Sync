import React, { useState } from 'react'
import type { ThemeType } from '~common/types'
import { useTheme } from '~hooks/useTheme'
import StatusMessage from '~components/StatusMessage'

export default function ThemeTab() {
  const { themeConfig, setThemeConfig, status, handleSave } = useTheme()
  const [localStatus, setLocalStatus] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    await handleSave(e)
    setLocalStatus(status)
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>主题设置</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>自定义界面的外观和主题风格。</p>
      </div>
      <form onSubmit={handleSubmit} className="theme-form">
        <div className="form-group">
          <label htmlFor="theme-select">主题模式:</label>
          <select
            id="theme-select"
            value={themeConfig.theme}
            onChange={e => setThemeConfig({ theme: e.target.value as ThemeType })}
            className="theme-select"
          >
            <option value="auto">自适应浏览器</option>
            <option value="light">亮色主题</option>
            <option value="dark">暗色主题</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          保存主题设置
        </button>
        <StatusMessage message={localStatus} onClear={() => setLocalStatus('')} />
      </form>
    </div>
  )
}
