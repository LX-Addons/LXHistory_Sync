import React, { useState, useEffect } from "react";
import { Storage } from "@plasmohq/storage";
import type { WebDAVConfig, ThemeType, GeneralConfig, CheckboxStyleType, IconSourceType } from "~common/types";
import ConfigForm from "~components/ConfigForm";
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG, DEFAULT_GENERAL_CONFIG } from "~store";
import { getMasterKey, setMasterPassword, clearMasterPassword, encryptData, decryptData } from "~common/webdav";
import "./style.css";

type TabType = "webdav" | "theme" | "general" | "security";

const storage = new Storage();

const Options: React.FC = () => {
  const [config, setConfig] = useState<WebDAVConfig>({
    url: "",
    username: "",
    password: "",
    encryption: {
      enabled: false,
      type: "none"
    }
  });
  const [status, setStatus] = useState("");
  const [themeConfig, setThemeConfig] = useState<{ theme: ThemeType }>({
    theme: DEFAULT_THEME_CONFIG.theme as ThemeType
  });
  const [themeStatus, setThemeStatus] = useState("");
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>({
    ...DEFAULT_GENERAL_CONFIG,
    checkboxStyle: DEFAULT_GENERAL_CONFIG.checkboxStyle as CheckboxStyleType,
    iconSource: DEFAULT_GENERAL_CONFIG.iconSource as IconSourceType
  });
  const [generalStatus, setGeneralStatus] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("webdav");
  const [masterPasswordStatus, setMasterPasswordStatus] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState("");
  const [masterPasswordError, setMasterPasswordError] = useState("");
  const [showMasterPasswordForm, setShowMasterPasswordForm] = useState(false);
  const [hasMasterPassword, setHasMasterPassword] = useState(false);

  useEffect(() => {
    loadConfig();
    loadThemeConfig();
    loadGeneralConfig();
    checkMasterPasswordStatus();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [themeConfig]);

  const applyTheme = () => {
    const root = document.documentElement;
    const isDarkMode = themeConfig.theme === "dark" || 
                      (themeConfig.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDarkMode) {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
    } else {
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
    }
  };

  const loadConfig = async () => {
    const savedConfig = await storage.get<WebDAVConfig>("webdav_config");
    if (savedConfig) {
      const masterKey = await getMasterKey();
      
      if (masterKey) {
        try {
          const decryptedPassword = savedConfig.password ? await decryptData(savedConfig.password, masterKey) : undefined;
          const decryptedKey = savedConfig.encryption?.key ? await decryptData(savedConfig.encryption.key, masterKey) : undefined;
          
          setConfig({
            ...savedConfig,
            password: decryptedPassword,
            encryption: {
              ...savedConfig.encryption,
              key: decryptedKey
            }
          });
        } catch {
          setConfig(savedConfig);
        }
      } else {
        setConfig(savedConfig);
      }
    }
  };

  const loadThemeConfig = async () => {
    const savedThemeConfig = await storage.get<{ theme: ThemeType }>(STORAGE_KEYS.THEME_CONFIG);
    if (savedThemeConfig) {
      setThemeConfig(savedThemeConfig);
    }
  };

  const loadGeneralConfig = async () => {
    const savedGeneralConfig = await storage.get<GeneralConfig>(STORAGE_KEYS.GENERAL_CONFIG);
    if (savedGeneralConfig) {
      setGeneralConfig(savedGeneralConfig);
    }
  };

  const checkMasterPasswordStatus = async () => {
    const masterKey = await getMasterKey();
    setHasMasterPassword(masterKey !== null);
  };
  
  const handleMasterPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (masterPassword !== masterPasswordConfirm) {
      setMasterPasswordError("两次输入的主密码不一致");
      return;
    }
    
    if (masterPassword.length < 8) {
      setMasterPasswordError("主密码长度至少为8个字符");
      return;
    }
    
    try {
      await setMasterPassword(masterPassword);
      setMasterPasswordError("");
      setMasterPasswordStatus("主密码设置成功！");
      setHasMasterPassword(true);
      setShowMasterPasswordForm(false);
      setMasterPassword("");
      setMasterPasswordConfirm("");
      setTimeout(() => {
        setMasterPasswordStatus("");
      }, 3000);
    } catch {
      setMasterPasswordError("设置主密码失败");
    }
  };
  
  const handleClearMasterPassword = async () => {
    try {
      await clearMasterPassword();
      setMasterPasswordStatus("主密码已清除！");
      setHasMasterPassword(false);
      setTimeout(() => {
        setMasterPasswordStatus("");
      }, 3000);
    } catch {
      setMasterPasswordError("清除主密码失败");
    }
  };
  
  const handleShowMasterPasswordForm = () => {
    setShowMasterPasswordForm(true);
    setMasterPasswordError("");
  };
  
  const handleHideMasterPasswordForm = () => {
    setShowMasterPasswordForm(false);
    setMasterPassword("");
    setMasterPasswordConfirm("");
    setMasterPasswordError("");
  };

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

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeStatus("正在保存...");
    try {
      await storage.set(STORAGE_KEYS.THEME_CONFIG, themeConfig);
      setThemeStatus("保存成功！");
      setTimeout(() => {
        setThemeStatus("");
      }, 3000);
    } catch (error) {
      setThemeStatus("保存失败");
      console.error("Failed to save theme config:", error);
      setTimeout(() => {
        setThemeStatus("");
      }, 3000);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralStatus("正在保存...");
    try {
      await storage.set(STORAGE_KEYS.GENERAL_CONFIG, generalConfig);
      setGeneralStatus("保存成功！");
      setTimeout(() => {
        setGeneralStatus("");
      }, 3000);
    } catch (error) {
      setGeneralStatus("保存失败");
      console.error("Failed to save general config:", error);
      setTimeout(() => {
        setGeneralStatus("");
      }, 3000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("正在保存...");
    try {
      const masterKey = await getMasterKey();
      
      if (masterKey) {
        const configToSave: WebDAVConfig = {
          ...config,
          password: config.password ? await encryptData(config.password, masterKey) : undefined,
          encryption: {
            ...config.encryption,
            key: config.encryption.key ? await encryptData(config.encryption.key, masterKey) : undefined
          }
        };
        await storage.set("webdav_config", configToSave);
      } else {
        await storage.set("webdav_config", config);
      }
      
      setStatus("保存成功！");
      setTimeout(() => {
        setStatus("");
      }, 3000);
    } catch (error) {
      setStatus("保存失败");
      console.error("Failed to save config:", error);
      setTimeout(() => {
        setStatus("");
      }, 3000);
    }
  };

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
                className={`tab-button ${activeTab === "webdav" ? "active" : ""}`}
                onClick={() => setActiveTab("webdav")}
              >
                WebDAV 配置
              </button>
              <button 
                className={`tab-button ${activeTab === "theme" ? "active" : ""}`}
                onClick={() => setActiveTab("theme")}
              >
                主题设置
              </button>
              <button 
                className={`tab-button ${activeTab === "general" ? "active" : ""}`}
                onClick={() => setActiveTab("general")}
              >
                通用设置
              </button>
              <button 
                className={`tab-button ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                安全设置
              </button>
            </div>
          </div>
          
          <div className="tab-content">
            {activeTab === "webdav" && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>WebDAV 配置</h2>
                  <p style={{ fontSize: "14px", color: "var(--text-light)" }}>
                    配置您的WebDAV服务器以启用历史记录同步功能。
                  </p>
                </div>
                <ConfigForm
                  config={config}
                  status={status}
                  onConfigChange={setConfig}
                  onSubmit={handleSave}
                  checkboxStyle={generalConfig.checkboxStyle}
                />
              </div>
            )}
            
            {activeTab === "theme" && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>主题设置</h2>
                  <p style={{ fontSize: "14px", color: "var(--text-light)" }}>
                    自定义界面的外观和主题风格。
                  </p>
                </div>
                <form onSubmit={handleSaveTheme} className="theme-form">
                  <div className="form-group">
                    <label htmlFor="theme-select">主题模式:</label>
                    <select
                      id="theme-select"
                      value={themeConfig.theme}
                      onChange={(e) => setThemeConfig({ theme: e.target.value as ThemeType })}
                      className="theme-select"
                    >
                      <option value="auto">自适应浏览器</option>
                      <option value="light">亮色主题</option>
                      <option value="dark">暗色主题</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary">保存主题设置</button>
                  {themeStatus && (
                    <div className={`message ${themeStatus.includes("成功") ? "message-success" : "message-error"}`}>
                      {themeStatus}
                    </div>
                  )}
                </form>
              </div>
            )}
            
            {activeTab === "general" && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>通用设置</h2>
                  <p style={{ fontSize: "14px", color: "var(--text-light)" }}>
                    配置应用的各种通用选项和偏好设置。
                  </p>
                </div>
                <form onSubmit={handleSaveGeneral} className="general-form">
                  <div className="form-group">
                    <label htmlFor="search-enabled">启用搜索框:</label>
                    <input
                      id="search-enabled"
                      type="checkbox"
                      checked={generalConfig.searchEnabled}
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        searchEnabled: e.target.checked 
                      })}
                      className={getCheckboxClassName(generalConfig.checkboxStyle)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="collapse-domain-history">按域名折叠历史记录:</label>
                    <input
                      id="collapse-domain-history"
                      type="checkbox"
                      checked={generalConfig.collapseDomainHistory}
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        collapseDomainHistory: e.target.checked 
                      })}
                      className={getCheckboxClassName(generalConfig.checkboxStyle)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="show-urls">显示历史记录URL:</label>
                    <input
                      id="show-urls"
                      type="checkbox"
                      checked={generalConfig.showUrls}
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        showUrls: e.target.checked 
                      })}
                      className={getCheckboxClassName(generalConfig.checkboxStyle)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="icon-source">图标获取方式:</label>
                    <select
                      id="icon-source"
                      value={generalConfig.iconSource}
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        iconSource: e.target.value as any 
                      })}
                    >
                      <option value="byteance">字节跳动 (国内推荐)</option>
                      <option value="google">Google (全球通用)</option>
                      <option value="duckduckgo">DuckDuckGo (全球通用)</option>
                      <option value="letter">域名首字母 (无网络依赖)</option>
                      <option value="none">不显示图标</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="auto-sync-enabled">启用自动同步:</label>
                    <input
                      id="auto-sync-enabled"
                      type="checkbox"
                      checked={generalConfig.autoSyncEnabled}
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        autoSyncEnabled: e.target.checked 
                      })}
                      className={getCheckboxClassName(generalConfig.checkboxStyle)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="sync-interval">同步间隔 (分钟):</label>
                    <select
                      id="sync-interval"
                      value={generalConfig.syncInterval / 60000}
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        syncInterval: parseInt(e.target.value) * 60000 
                      })}
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
                      onChange={(e) => setGeneralConfig({ 
                        ...generalConfig, 
                        checkboxStyle: e.target.value as any 
                      })}
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
                    <label>样式预览:</label>
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
                  
                  <button type="submit" className="btn-primary">保存通用设置</button>
                  {generalStatus && (
                    <div className={`message ${generalStatus.includes("成功") ? "message-success" : "message-error"}`}>
                      {generalStatus}
                    </div>
                  )}
                </form>
              </div>
            )}
            
            {activeTab === "security" && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>安全设置</h2>
                  <p style={{ fontSize: "14px", color: "var(--text-light)" }}>
                    管理主密码以保护您的敏感数据安全。
                  </p>
                </div>
                
                {!showMasterPasswordForm ? (
                  <div className="security-status">
                    <div className="status-card">
                      <div className="status-icon">
                        {hasMasterPassword ? (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        ) : (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.3" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        )}
                      </div>
                      <div className="status-content">
                        <h3>{hasMasterPassword ? "主密码已设置" : "主密码未设置"}</h3>
                        <p style={{ fontSize: "14px", color: "var(--text-light)", marginTop: "8px" }}>
                          {hasMasterPassword 
                            ? "您的WebDAV凭证和加密密钥已受到主密码保护。"
                            : "设置主密码以加密您的WebDAV凭证和加密密钥，确保数据安全。"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="security-actions">
                      {!hasMasterPassword ? (
                        <button
                          type="button"
                          onClick={handleShowMasterPasswordForm}
                          className="btn-primary"
                          style={{ width: "100%" }}
                        >
                          设置主密码
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleShowMasterPasswordForm}
                            className="btn-secondary"
                            style={{ width: "100%", marginBottom: "var(--spacing-sm)" }}
                          >
                            修改主密码
                          </button>
                          <button
                            type="button"
                            onClick={handleClearMasterPassword}
                            className="btn-error"
                            style={{ width: "100%" }}
                          >
                            清除主密码
                          </button>
                        </>
                      )}
                    </div>
                    
                    {masterPasswordStatus && (
                      <div className={`message ${masterPasswordStatus.includes("成功") ? "message-success" : "message-error"}`}>
                        {masterPasswordStatus}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleMasterPasswordSubmit} className="master-password-form">
                    <div className="form-header">
                      <h3>{hasMasterPassword ? "修改主密码" : "设置主密码"}</h3>
                      <button
                        type="button"
                        onClick={handleHideMasterPasswordForm}
                        className="btn-close"
                        style={{ 
                          background: "transparent",
                          border: "none",
                          color: "var(--text-light)",
                          fontSize: "20px",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="form-description">
                      <p style={{ fontSize: "14px", color: "var(--text-light)" }}>
                        主密码用于加密您的WebDAV凭证和加密密钥，请妥善保管。
                        <br />
                        主密码长度至少为8个字符，建议使用强密码。
                      </p>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="master-password">主密码:</label>
                      <input
                        id="master-password"
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        placeholder="请输入主密码（至少8个字符）"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="master-password-confirm">确认主密码:</label>
                      <input
                        id="master-password-confirm"
                        type="password"
                        value={masterPasswordConfirm}
                        onChange={(e) => setMasterPasswordConfirm(e.target.value)}
                        placeholder="请再次输入主密码"
                        required
                      />
                    </div>
                    
                    {masterPasswordError && (
                      <div className="message-error" style={{ fontSize: "12px", marginTop: "4px" }}>
                        {masterPasswordError}
                      </div>
                    )}
                    
                    <div className="form-actions">
                      <button
                        type="button"
                        onClick={handleHideMasterPasswordForm}
                        className="btn-secondary"
                        style={{ flex: 1 }}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ flex: 1 }}
                      >
                        {hasMasterPassword ? "修改主密码" : "设置主密码"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;