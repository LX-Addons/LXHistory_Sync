import { useState, useEffect } from "react";
import { getMasterKey, setMasterPassword, clearMasterPassword } from "~common/webdav";

export function useMasterPassword() {
  const [status, setStatus] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState("");
  const [masterPasswordError, setMasterPasswordError] = useState("");
  const [showMasterPasswordForm, setShowMasterPasswordForm] = useState(false);
  const [hasMasterPassword, setHasMasterPassword] = useState(false);

  useEffect(() => {
    checkMasterPasswordStatus();
  }, []);

  const checkMasterPasswordStatus = async () => {
    const masterKey = await getMasterKey();
    setHasMasterPassword(masterKey !== null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
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
      setStatus("主密码设置成功！");
      setHasMasterPassword(true);
      setShowMasterPasswordForm(false);
      setMasterPassword("");
      setMasterPasswordConfirm("");
      setTimeout(() => {
        setStatus("");
      }, 3000);
    } catch {
      setMasterPasswordError("设置主密码失败");
    }
  };
  
  const handleClear = async () => {
    try {
      await clearMasterPassword();
      setStatus("主密码已清除！");
      setHasMasterPassword(false);
      setTimeout(() => {
        setStatus("");
      }, 3000);
    } catch {
      setMasterPasswordError("清除主密码失败");
    }
  };
  
  const handleShowForm = () => {
    setShowMasterPasswordForm(true);
    setMasterPasswordError("");
  };
  
  const handleHideForm = () => {
    setShowMasterPasswordForm(false);
    setMasterPassword("");
    setMasterPasswordConfirm("");
    setMasterPasswordError("");
  };

  return {
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
    handleHideForm
  };
}