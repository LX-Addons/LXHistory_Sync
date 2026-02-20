import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MasterPasswordModal from '~/components/MasterPasswordModal'

describe('MasterPasswordModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onVerify: vi.fn(async () => true),
    title: '解锁主密码',
    description: '请输入主密码以解锁加密数据',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<MasterPasswordModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('解锁主密码')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(<MasterPasswordModal {...defaultProps} />)
    expect(screen.getByText('解锁主密码')).toBeInTheDocument()
    expect(screen.getByText('请输入主密码以解锁加密数据')).toBeInTheDocument()
  })

  it('should show error when submitting empty password', async () => {
    render(<MasterPasswordModal {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: '解锁' })
    expect(submitButton).toBeDisabled()
  })

  it('should call onVerify with password', async () => {
    const onVerify = vi.fn(async () => true)
    render(<MasterPasswordModal {...defaultProps} onVerify={onVerify} />)

    const input = screen.getByPlaceholderText('请输入主密码')
    fireEvent.change(input, { target: { value: 'testpassword' } })

    const submitButton = screen.getByRole('button', { name: '解锁' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith('testpassword')
    })
  })

  it('should show error when verification fails', async () => {
    const onVerify = vi.fn(async () => false)
    render(<MasterPasswordModal {...defaultProps} onVerify={onVerify} />)

    const input = screen.getByPlaceholderText('请输入主密码')
    fireEvent.change(input, { target: { value: 'wrongpassword' } })

    const submitButton = screen.getByRole('button', { name: '解锁' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('主密码错误，请重试')).toBeInTheDocument()
    })
  })

  it('should close modal when clicking cancel', async () => {
    const onClose = vi.fn()
    render(<MasterPasswordModal {...defaultProps} onClose={onClose} />)

    const cancelButton = screen.getByRole('button', { name: '取消' })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should toggle password visibility', () => {
    render(<MasterPasswordModal {...defaultProps} />)

    const input = screen.getByPlaceholderText('请输入主密码')
    expect(input).toHaveAttribute('type', 'password')

    const toggleButton = screen.getByRole('button', { name: '显示密码' })
    fireEvent.click(toggleButton)

    expect(input).toHaveAttribute('type', 'text')
  })

  it('should disable buttons while loading', async () => {
    const onVerify = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return true
    })
    render(<MasterPasswordModal {...defaultProps} onVerify={onVerify} />)

    const input = screen.getByPlaceholderText('请输入主密码')
    fireEvent.change(input, { target: { value: 'testpassword' } })

    const submitButton = screen.getByRole('button', { name: '解锁' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('验证中...')).toBeInTheDocument()
    })
  })

  it('should show error when verification throws exception', async () => {
    const onVerify = vi.fn(async () => {
      throw new Error('Network error')
    })
    render(<MasterPasswordModal {...defaultProps} onVerify={onVerify} />)

    const input = screen.getByPlaceholderText('请输入主密码')
    fireEvent.change(input, { target: { value: 'testpassword' } })

    const submitButton = screen.getByRole('button', { name: '解锁' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should close on Escape key', async () => {
    const onClose = vi.fn()
    render(<MasterPasswordModal {...defaultProps} onClose={onClose} />)

    const overlay = document.querySelector('.modal-overlay')
    if (overlay) {
      fireEvent.keyDown(overlay, { key: 'Escape' })
    }

    expect(onClose).toHaveBeenCalled()
  })

  it('should show custom description', () => {
    render(<MasterPasswordModal {...defaultProps} description="自定义描述文本" />)

    expect(screen.getByText('自定义描述文本')).toBeInTheDocument()
  })

  it('should close when clicking overlay', async () => {
    const onClose = vi.fn()
    render(<MasterPasswordModal {...defaultProps} onClose={onClose} />)

    const overlay = document.querySelector('.modal-overlay')
    if (overlay) {
      fireEvent.click(overlay)
    }

    expect(onClose).toHaveBeenCalled()
  })
})
