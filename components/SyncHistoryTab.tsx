import { useState, useEffect } from 'react'
import type { SyncHistoryEntry } from '~common/types'
import { getSyncHistory, clearSyncHistory } from '~common/syncHistory'
import StatusMessage from '~components/StatusMessage'

export default function SyncHistoryTab() {
  const [history, setHistory] = useState<SyncHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    const entries = await getSyncHistory()
    setHistory(entries)
    setLoading(false)
  }

  const handleClearHistory = async () => {
    await clearSyncHistory()
    setHistory([])
    setStatus('同步历史已清除')
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getDirectionText = (direction: string) => {
    return direction === 'to_cloud' ? '上传到云端' : '从云端下载'
  }

  const getDirectionIcon = (direction: string) => {
    return direction === 'to_cloud' ? '↑' : '↓'
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>同步历史</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
          查看历史记录同步的操作记录，最多保留 50 条。
        </p>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : history.length === 0 ? (
        <div className="no-history">
          <p>暂无同步历史记录</p>
          <p className="hint">执行同步操作后，记录将显示在这里</p>
        </div>
      ) : (
        <>
          <div className="sync-history-list">
            {history.map(entry => (
              <div key={entry.id} className="sync-history-item">
                <div className="sync-history-icon">
                  <span className={`sync-direction-icon ${entry.success ? 'success' : 'error'}`}>
                    {getDirectionIcon(entry.direction)}
                  </span>
                </div>
                <div className="sync-history-content">
                  <div className="sync-history-header">
                    <span className="sync-history-direction">
                      {getDirectionText(entry.direction)}
                    </span>
                    <span className={`sync-history-status ${entry.success ? 'success' : 'error'}`}>
                      {entry.success ? '成功' : '失败'}
                    </span>
                  </div>
                  <div className="sync-history-details">
                    <span className="sync-history-time">{formatTime(entry.timestamp)}</span>
                    {entry.itemCount !== undefined && (
                      <span className="sync-history-count">{entry.itemCount} 条记录</span>
                    )}
                  </div>
                  {entry.errorMessage && (
                    <div className="sync-history-error">{entry.errorMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-error" onClick={handleClearHistory}>
            清除历史记录
          </button>
        </>
      )}

      <StatusMessage message={status} onClear={() => setStatus('')} />
    </div>
  )
}
