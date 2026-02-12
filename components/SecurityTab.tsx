import React, { useState } from 'react'
import { useMasterPassword } from '~hooks/useMasterPassword'
import StatusMessage from '~components/StatusMessage'

export default function SecurityTab() {
  const {
    status,
    masterPassword,
    setMasterPassword,
    masterPasswordConfirm,
    setMasterPasswordConfirm,
    masterPasswordError,
    showMasterPasswordForm,
    hasMasterPassword,
    handleSubmit,
    handleClear,
    handleShowForm,
    handleHideForm,
  } = useMasterPassword()
  const [localStatus, setLocalStatus] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmitWithStatus = async (e: React.FormEvent) => {
    await handleSubmit(e)
    setLocalStatus(status)
  }

  const handleClearWithStatus = async () => {
    await handleClear()
    setLocalStatus(status)
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>安全设置</h2>
        <p className="section-description">
          管理主密码以保护您的敏感数据安全。
        </p>
      </div>

      {!showMasterPasswordForm ? (
        <div className="security-status">
          <div className="status-card">
            <div className="status-icon">
              {hasMasterPassword ? (
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : (
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.3" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div className="status-content">
              <h3>{hasMasterPassword ? '主密码已设置' : '主密码未设置'}</h3>
              <p className="status-description">
                {hasMasterPassword
                  ? '您的WebDAV凭证和加密密钥已受到主密码保护。'
                  : '设置主密码以加密您的WebDAV凭证和加密密钥，确保数据安全。'}
              </p>
            </div>
          </div>

          <div className="security-actions">
            {!hasMasterPassword ? (
              <button
                type="button"
                onClick={handleShowForm}
                className="btn-primary btn-full-width"
              >
                设置主密码
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleShowForm}
                  className="btn-secondary btn-full-width"
                >
                  修改主密码
                </button>
                <button
                  type="button"
                  onClick={handleClearWithStatus}
                  className="btn-error btn-full-width"
                >
                  清除主密码
                </button>
              </>
            )}
          </div>

          <StatusMessage message={localStatus} onClear={() => setLocalStatus('')} />
        </div>
      ) : (
        <form onSubmit={handleSubmitWithStatus} className="master-password-form">
          <div className="form-header">
            <h3>{hasMasterPassword ? '修改主密码' : '设置主密码'}</h3>
            <button
              type="button"
              onClick={handleHideForm}
              className="btn-close"
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          <div className="form-description">
            <p className="form-description-text">
              主密码用于加密您的WebDAV凭证和加密密钥，请妥善保管。
              <br />
              主密码长度至少为8个字符，建议使用强密码。
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="master-password">主密码:</label>
            <div className="password-input-wrapper">
              <input
                id="master-password"
                type={showPassword ? 'text' : 'password'}
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
                placeholder="请输入主密码（至少8个字符）"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="master-password-confirm">确认主密码:</label>
            <div className="password-input-wrapper">
              <input
                id="master-password-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                value={masterPasswordConfirm}
                onChange={e => setMasterPasswordConfirm(e.target.value)}
                placeholder="请再次输入主密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle-btn"
                aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
              >
                {showConfirmPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {masterPasswordError && (
            <div className="message-error error-hint">
              {masterPasswordError}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleHideForm}
              className="btn-secondary btn-flex-1"
            >
              取消
            </button>
            <button type="submit" className="btn-primary btn-flex-1">
              {hasMasterPassword ? '修改主密码' : '设置主密码'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
