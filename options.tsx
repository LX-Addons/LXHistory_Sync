import React, { useState, useEffect } from "react";
import { Storage } from "@plasmohq/storage";
import type { WebDAVConfig, ThemeType, GeneralConfig } from "~common/types";
import ConfigForm from "~components/ConfigForm";
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG, DEFAULT_GENERAL_CONFIG } from "~store";
import "./style.css";

type TabType = "webdav" | "theme" | "general";

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
  const [themeConfig, setThemeConfig] = useState<{ theme: ThemeType }>(DEFAULT_THEME_CONFIG);
  const [themeStatus, setThemeStatus] = useState("");
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>(DEFAULT_GENERAL_CONFIG);
  const [generalStatus, setGeneralStatus] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("webdav");

  useEffect(() => {
    loadConfig();
    loadThemeConfig();
    loadGeneralConfig();
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
      setConfig(savedConfig);
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
      await storage.set("webdav_config", config);
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
            </div>
          </div>
          
          <div className="tab-content">
            {activeTab === "webdav" && (
              <div className="settings-section">
                <h2>WebDAV 配置</h2>
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
                <h2>主题设置</h2>
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
                <h2>通用设置</h2>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;