import { useState, useEffect } from 'react'
import { Logger } from '~common/logger'
import {
  hasMasterPasswordSet,
  setMasterPassword as saveMasterPassword,
  setSessionMasterPassword,
  clearMasterPassword,
} from '~common/webdav'

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateMasterPassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 12) {
    errors.push('主密码长度至少为12个字符')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('主密码必须包含至少一个大写字母')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('主密码必须包含至少一个小写字母')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('主密码必须包含至少一个数字')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function useMasterPassword() {
  const [status, setStatus] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState('')
  const [masterPasswordError, setMasterPasswordError] = useState('')
  const [showMasterPasswordForm, setShowMasterPasswordForm] = useState(false)
  const [hasMasterPassword, setHasMasterPassword] = useState(false)

  useEffect(() => {
    checkMasterPasswordStatus()
  }, [])

  const checkMasterPasswordStatus = async () => {
    const isSet = await hasMasterPasswordSet()
    setHasMasterPassword(isSet)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (masterPassword !== masterPasswordConfirm) {
      setMasterPasswordError('两次输入的主密码不一致')
      return
    }

    const validation = validateMasterPassword(masterPassword)
    if (!validation.isValid) {
      setMasterPasswordError(validation.errors[0])
      return
    }

    try {
      await saveMasterPassword(masterPassword)
      await setSessionMasterPassword(masterPassword)
      setMasterPasswordError('')
      setStatus('主密码设置成功！')
      setHasMasterPassword(true)
      setShowMasterPasswordForm(false)
      setMasterPassword('')
      setMasterPasswordConfirm('')
      setTimeout(() => {
        setStatus('')
      }, 3000)
    } catch (error) {
      Logger.error('Failed to set master password', error)
      setMasterPasswordError('设置主密码失败')
    }
  }

  const handleClear = async () => {
    try {
      await clearMasterPassword()
      setStatus('主密码已清除！')
      setHasMasterPassword(false)
      setTimeout(() => {
        setStatus('')
      }, 3000)
    } catch (error) {
      Logger.error('Failed to clear master password', error)
      setMasterPasswordError('清除主密码失败')
    }
  }

  const handleShowForm = () => {
    setShowMasterPasswordForm(true)
    setMasterPasswordError('')
  }

  const handleHideForm = () => {
    setShowMasterPasswordForm(false)
    setMasterPassword('')
    setMasterPasswordConfirm('')
    setMasterPasswordError('')
  }

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
    handleHideForm,
  }
}
