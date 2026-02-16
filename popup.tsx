import { useState, useEffect } from 'react'
import { useStorage } from '@plasmohq/storage/hook'
import { ErrorBoundary } from '~components/ErrorBoundary'
import SkeletonLoader from '~components/SkeletonLoader'
import SyncProgress from '~components/SyncProgress'
import SyncStatus from '~components/SyncStatus'
import VirtualHistoryList from '~components/VirtualHistoryList'
import WebDAVTab from '~components/WebDAVTab'
import ThemeTab from '~components/ThemeTab'
import GeneralTab from '~components/GeneralTab'
import SecurityTab from '~components/SecurityTab'
import SyncHistoryTab from '~components/SyncHistoryTab'
import { useHistory } from '~hooks/useHistory'
import { useSync } from '~hooks/useSync'
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG } from '~store'
import { applyTheme } from '~common/utils'
import type { ThemeType } from '~common/types'
import './style.css'

type ViewType = 'history' | 'settings'
type SettingsTabType = 'webdav' | 'theme' | 'general' | 'security' | 'sync_history'

const Popup = () => {
  const [currentView, setCurrentView] = useState<ViewType>('history')
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabType>('webdav')

  const {
    historyItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    expandedDomains,
    toggleDomain,
    refreshHistory,
    generalConfig,
  } = useHistory()

  const { isSyncing, syncStatus, syncToCloud, syncFromCloud, hasWebDAVConfig } =
    useSync(refreshHistory)

  const [themeConfig] = useStorage<{ theme: ThemeType }>(STORAGE_KEYS.THEME_CONFIG, {
    theme: DEFAULT_THEME_CONFIG.theme as ThemeType,
  })

  useEffect(() => {
    applyTheme(themeConfig.theme)
  }, [themeConfig])

  return (
    <ErrorBoundary>
      <div className="container">
        <div className="card">
          {currentView === 'history' ? (
            <>
              <div className="title-bar">
                <h1>历史记录</h1>
                <div className="action-buttons">
                  <button
                    className="action-button"
                    title="设置"
                    aria-label="打开设置"
                    onClick={() => setCurrentView('settings')}
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {hasWebDAVConfig && (
                <div className="sync-buttons-container">
                  {isSyncing ? (
                    <SyncProgress isSyncing={isSyncing} message={syncStatus?.message} />
                  ) : (
                    <>
                      <div className="button-group">
                        <button className="btn-primary" onClick={syncToCloud} disabled={isSyncing}>
                          同步到云端
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={syncFromCloud}
                          disabled={isSyncing}
                        >
                          从云端同步
                        </button>
                      </div>
                      <SyncStatus status={syncStatus} />
                    </>
                  )}
                </div>
              )}

              {generalConfig.searchEnabled && (
                <div className="search-container">
                  <input
                    type="text"
                    className="search-box"
                    placeholder="搜索历史记录..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              <div className="history-list-container">
                {isLoading ? (
                  <SkeletonLoader count={10} />
                ) : error ? (
                  <div className="no-history">
                    <p className="message-error">{error}</p>
                    <button onClick={refreshHistory} className="btn-primary">
                      重试
                    </button>
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="no-history">
                    <p>暂无浏览记录</p>
                    <p className="hint">浏览网页后，历史记录将显示在这里</p>
                  </div>
                ) : (
                  <VirtualHistoryList
                    items={historyItems}
                    expandedDomains={expandedDomains}
                    onToggleDomain={toggleDomain}
                    showUrls={generalConfig.showUrls}
                    iconSource={generalConfig.iconSource}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="title-bar">
                <button
                  className="action-button back-button"
                  title="返回"
                  aria-label="返回历史记录"
                  onClick={() => setCurrentView('history')}
                >
                  ←
                </button>
                <h1>设置</h1>
              </div>

              <div className="popup-settings-tabs">
                <div className="tab-buttons">
                  <button
                    className={`tab-button ${activeSettingsTab === 'webdav' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab('webdav')}
                  >
                    WebDAV
                  </button>
                  <button
                    className={`tab-button ${activeSettingsTab === 'theme' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab('theme')}
                  >
                    主题
                  </button>
                  <button
                    className={`tab-button ${activeSettingsTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab('general')}
                  >
                    通用
                  </button>
                  <button
                    className={`tab-button ${activeSettingsTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab('security')}
                  >
                    安全
                  </button>
                  <button
                    className={`tab-button ${activeSettingsTab === 'sync_history' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab('sync_history')}
                  >
                    同步
                  </button>
                </div>
              </div>

              <div className="popup-settings-content">
                {activeSettingsTab === 'webdav' && <WebDAVTab />}
                {activeSettingsTab === 'theme' && <ThemeTab />}
                {activeSettingsTab === 'general' && <GeneralTab />}
                {activeSettingsTab === 'security' && <SecurityTab />}
                {activeSettingsTab === 'sync_history' && <SyncHistoryTab />}
              </div>
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default Popup
