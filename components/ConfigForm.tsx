import React from "react";
import type { WebDAVConfig, EncryptionType, CheckboxStyleType } from "~common/types";

interface ConfigFormProps {
  config: WebDAVConfig;
  status: string;
  onConfigChange: (config: WebDAVConfig) => void;
  onSubmit: (e: React.FormEvent) => void;
  checkboxStyle?: CheckboxStyleType;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ config, status, onConfigChange, onSubmit, checkboxStyle = "default" }) => {
  const getCheckboxClassName = (style: string) => {
    switch (style) {
      case "modern":
        return "checkbox-modern";
      case "minimal":
        return "checkbox-minimal";
      case "classic":
        return "checkbox-classic";
      case "rounded":
        return "checkbox-rounded";
      case "toggle":
        return "checkbox-toggle";
      default:
        return "custom-checkbox";
    }
  };
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="url">WebDAV 服务器地址:</label>
        <input
          id="url"
          type="url"
          value={config.url}
          onChange={(e) => onConfigChange({ ...config, url: e.target.value })}
          placeholder="https://dav.jianguoyun.com/dav/"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="username">用户名:</label>
        <input
          id="username"
          type="text"
          value={config.username}
          onChange={(e) => onConfigChange({ ...config, username: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">密码/应用令牌:</label>
        <input
          id="password"
          type="password"
          value={config.password || ""}
          onChange={(e) => onConfigChange({ ...config, password: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="encryption-enabled">启用加密:</label>
        <input
          id="encryption-enabled"
          type="checkbox"
          checked={config.encryption.enabled}
          onChange={(e) => onConfigChange({ 
            ...config, 
            encryption: { 
              ...config.encryption, 
              enabled: e.target.checked 
            } 
          })}
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
              onChange={(e) => onConfigChange({ 
                ...config, 
                encryption: { 
                  ...config.encryption, 
                  type: e.target.value as EncryptionType 
                } 
              })}
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
              value={config.encryption.key || ""}
              onChange={(e) => onConfigChange({ 
                ...config, 
                encryption: { 
                  ...config.encryption, 
                  key: e.target.value 
                } 
              })}
              placeholder="请输入加密密钥（建议使用强密码）"
              required
            />
          </div>
        </>
      )}
      
      <button type="submit" className="btn-primary">保存配置</button>
      {status && (
        <div className={`message ${status.includes("成功") ? "message-success" : "message-error"}`}>
          {status}
        </div>
      )}
    </form>
  );
};

export default ConfigForm;