import React, { useState, useEffect } from 'react'
import WebDAVTab from '~components/WebDAVTab'
import ThemeTab from '~components/ThemeTab'
import GeneralTab from '~components/GeneralTab'
import SecurityTab from '~components/SecurityTab'
import { useTheme } from '~hooks/useTheme'
import './style.css'

type TabType = 'webdav' | 'theme' | 'general' | 'security'

const Options: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('webdav')
  const { themeConfig } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    const isDarkMode =
      themeConfig.theme === 'dark' ||
      (themeConfig.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDarkMode) {
      root.classList.add('dark-theme')
      root.classList.remove('light-theme')
    } else {
      root.classList.add('light-theme')
      root.classList.remove('dark-theme')
    }
  }, [themeConfig])

  return (
    <div className="options-container">
      <div className="options-content">
        <div className="options-layout">
          <div className="tab-navigation">
            <div className="tab-header">
              <h1>历史记录同步设置</h1>
            </div>
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === 'webdav' ? 'active' : ''}`}
                onClick={() => setActiveTab('webdav')}
              >
                WebDAV 配置
              </button>
              <button
                className={`tab-button ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('theme')}
              >
                主题设置
              </button>
              <button
                className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                通用设置
              </button>
              <button
                className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                安全设置
              </button>
            </div>
          </div>

          <div className="tab-content">
            {activeTab === 'webdav' && <WebDAVTab />}
            {activeTab === 'theme' && <ThemeTab />}
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Options
