import React, { useEffect, useRef } from 'react'

export default function Toast({ message, visible, onClose, duration = 3200, type = 'info' }) {
  const timer = useRef(null)
  useEffect(() => {
    if (!visible) return
    timer.current = setTimeout(() => onClose && onClose(), duration)
    return () => clearTimeout(timer.current)
  }, [visible, duration, onClose])

  if (!visible) return null

  const Icon = () => {
    if (type === 'success') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    )
    if (type === 'error') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    )
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 16v6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.93 4.93l4.24 4.24" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    )
  }

  return (
    <div className={`acetra-toast acetra-toast-${type}`} role="status" aria-live="polite">
      <div className="toast-left">
        <div className="toast-icon"><Icon /></div>
        <div className="toast-text">{message}</div>
      </div>
      <div className="toast-progress" style={{ ['--toast-duration']: `${duration}ms` }} />
    </div>
  )
}
