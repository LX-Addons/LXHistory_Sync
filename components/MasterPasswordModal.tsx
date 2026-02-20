import { useState } from 'react'

interface MasterPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (password: string) => Promise<boolean>
  title?: string
  description?: string
}

export default function MasterPasswordModal({
  isOpen,
  onClose,
  onVerify,
  title = '解锁主密码',
  description = '请输入主密码以解锁加密数据',
}: MasterPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('请输入主密码')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const isValid = await onVerify(password)
      if (isValid) {
        setPassword('')
        setError('')
        onClose()
      } else {
        setError('主密码错误，请重试')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setPassword('')
    setError('')
    onClose()
  }

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="关闭模态框"
    >
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            onClick={handleClose}
            className="btn-close"
            aria-label="关闭"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-description">{description}</p>

            <div className="form-group">
              <label htmlFor="unlock-password">主密码:</label>
              <div className="password-input-wrapper">
                <input
                  id="unlock-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="请输入主密码"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <div className="message-error error-hint">{error}</div>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading || !password.trim()}>
              {isLoading ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  验证中...
                </span>
              ) : (
                '解锁'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
