import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import type { WebDAVConfig, EncryptionType, CheckboxStyleType, KeyStrength } from '~common/types'
import { validateUrl, validatePassword, validateEncryptionKey } from '~common/webdav'
import { getCheckboxClassName } from '~common/utils'
import { useStorage } from '@plasmohq/storage/hook'

interface ConfigFormProps {
  config: WebDAVConfig
  status: string
  onConfigChange: (config: WebDAVConfig) => void
  onSubmit: (e: FormEvent) => void
  checkboxStyle?: CheckboxStyleType
}

const ConfigForm: FC<ConfigFormProps> = ({
  config,
  status,
  onConfigChange,
  onSubmit,
  checkboxStyle = 'default',
}) => {
  const [keyStrength, setKeyStrength] = useState<KeyStrength>('weak')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [masterPasswordData] = useStorage<{ hash: string; salt: string } | null>(
    'master_password_data',
    null
  )

  const hasMasterPassword = !!masterPasswordData?.hash

  const getStrengthColor = (strength: KeyStrength): string => {
    switch (strength) {
      case 'weak':
        return '#f44336'
      case 'medium':
        return '#ff9800'
      case 'strong':
        return '#4CAF50'
      default:
        return '#9e9e9e'
    }
  }

  const getStrengthText = (strength: KeyStrength): string => {
    switch (strength) {
      case 'weak':
        return '弱'
      case 'medium':
        return '中'
      case 'strong':
        return '强'
      default:
        return '未知'
    }
  }

  const getStrengthWidth = (strength: KeyStrength): string => {
    switch (strength) {
      case 'weak':
        return '33%'
      case 'medium':
        return '66%'
      case 'strong':
        return '100%'
      default:
        return '0%'
    }
  }

  const handleUrlChange = (value: string) => {
    onConfigChange({ ...config, url: value })
    const validation = validateUrl(value)
    setValidationErrors(prev => ({
      ...prev,
      url: validation.isValid ? '' : validation.error || '',
    }))
  }

  const handlePasswordChange = (value: string) => {
    onConfigChange({ ...config, password: value })
    const validation = validatePassword(value)
    setValidationErrors(prev => ({
      ...prev,
      password: validation.isValid ? '' : validation.error || '',
    }))
  }

  const handleKeyChange = (value: string) => {
    onConfigChange({
      ...config,
      encryption: {
        ...config.encryption,
        key: value,
        keyStrength: validateEncryptionKey(value).strength,
      },
    })
    const validation = validateEncryptionKey(value)
    setKeyStrength(validation.strength)
    setValidationErrors(prev => ({
      ...prev,
      encryptionKey: validation.isValid ? '' : validation.error || '',
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const urlValidation = validateUrl(config.url)
    const passwordValidation = validatePassword(config.password || '')
    const keyValidation =
      config.encryption.enabled && config.encryption.key
        ? validateEncryptionKey(config.encryption.key)
        : { isValid: true, strength: 'weak' as KeyStrength }

    const newErrors: Record<string, string> = {}
    if (!urlValidation.isValid) {
      newErrors.url = urlValidation.error || ''
    }
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error || ''
    }
    if (config.encryption.enabled && !keyValidation.isValid) {
      newErrors.encryptionKey = keyValidation.error || ''
    }

    setValidationErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      onSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {!hasMasterPassword && (
        <div
          className="message message-warning"
          style={{
            marginBottom: 'var(--spacing-md)',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            color: '#856404',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          ⚠️ 未设置主密码，您的 WebDAV 凭证将以明文存储。建议在安全设置中设置主密码。
        </div>
      )}
      <div className="form-group">
        <label htmlFor="url">WebDAV 服务器地址:</label>
        <input
          id="url"
          type="url"
          value={config.url}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder="https://dav.jianguoyun.com/dav/"
          required
        />
        {validationErrors.url && (
          <div className="message-error error-hint">{validationErrors.url}</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="username">用户名:</label>
        <input
          id="username"
          type="text"
          value={config.username}
          onChange={e => onConfigChange({ ...config, username: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">密码/应用令牌:</label>
        <input
          id="password"
          type="password"
          value={config.password || ''}
          onChange={e => handlePasswordChange(e.target.value)}
          required
        />
        {validationErrors.password && (
          <div className="message-error error-hint">{validationErrors.password}</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="encryption-enabled">启用加密:</label>
        <input
          id="encryption-enabled"
          type="checkbox"
          checked={config.encryption.enabled}
          onChange={e =>
            onConfigChange({
              ...config,
              encryption: {
                ...config.encryption,
                enabled: e.target.checked,
              },
            })
          }
          className={getCheckboxClassName(checkboxStyle)}
        />
      </div>

      {config.encryption.enabled && (
        <>
          <div className="form-group">
            <label htmlFor="encryption-type">加密类型:</label>
            <select
              id="encryption-type"
              value={config.encryption.type}
              onChange={e =>
                onConfigChange({
                  ...config,
                  encryption: {
                    ...config.encryption,
                    type: e.target.value as EncryptionType,
                  },
                })
              }
            >
              <option value="aes-256-gcm">AES-256-GCM (推荐，带认证)</option>
              <option value="chacha20-poly1305">ChaCha20-Poly1305 (带认证，性能更好)</option>
              <option value="aes-256-ctr">AES-256-CTR (高效流加密)</option>
              <option value="aes-256-cbc">AES-256-CBC (传统块加密)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="encryption-key">加密密钥:</label>
            <input
              id="encryption-key"
              type="password"
              value={config.encryption.key || ''}
              onChange={e => handleKeyChange(e.target.value)}
              placeholder="请输入加密密钥（建议使用强密码）"
              required
            />
            {config.encryption.key && (
              <div className="key-strength-indicator">
                <span className="key-strength-label">密钥强度：</span>
                <span
                  className="key-strength-text"
                  style={{ color: getStrengthColor(keyStrength) }}
                >
                  {getStrengthText(keyStrength)}
                </span>
                <div className="key-strength-bar">
                  <div
                    className={`key-strength-fill key-strength-${keyStrength}`}
                    style={{ width: getStrengthWidth(keyStrength) }}
                  />
                </div>
              </div>
            )}
            {validationErrors.encryptionKey && (
              <div className="message-error error-hint">{validationErrors.encryptionKey}</div>
            )}
          </div>
        </>
      )}

      <button type="submit" className="btn-primary">
        保存配置
      </button>
      {status && (
        <div className={`message ${status.includes('成功') ? 'message-success' : 'message-error'}`}>
          {status}
        </div>
      )}
    </form>
  )
}

export default ConfigForm
