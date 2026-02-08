import { useState, useEffect } from "react";
import { Storage } from "@plasmohq/storage";
import type { WebDAVConfig } from "~common/types";
import { getMasterKey, encryptData, decryptData } from "~common/webdav";

const storage = new Storage();

export function useConfig() {
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

  useEffect(() => {
    loadConfig();
  }, []);

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

  return {
    config,
    setConfig,
    status,
    handleSave
  };
}