import { useState, useEffect } from "react";
import { Storage } from "@plasmohq/storage";
import type { ThemeType } from "~common/types";
import { STORAGE_KEYS, DEFAULT_THEME_CONFIG } from "~store";

const storage = new Storage();

export function useTheme() {
  const [themeConfig, setThemeConfig] = useState<{ theme: ThemeType }>({
    theme: DEFAULT_THEME_CONFIG.theme as ThemeType
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadThemeConfig();
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

  const loadThemeConfig = async () => {
    const savedThemeConfig = await storage.get<{ theme: ThemeType }>(STORAGE_KEYS.THEME_CONFIG);
    if (savedThemeConfig) {
      setThemeConfig(savedThemeConfig);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("正在保存...");
    try {
      await storage.set(STORAGE_KEYS.THEME_CONFIG, themeConfig);
      setStatus("保存成功！");
      setTimeout(() => {
        setStatus("");
      }, 3000);
    } catch (error) {
      setStatus("保存失败");
      console.error("Failed to save theme config:", error);
      setTimeout(() => {
        setStatus("");
      }, 3000);
    }
  };

  return {
    themeConfig,
    setThemeConfig,
    status,
    handleSave,
    applyTheme
  };
}