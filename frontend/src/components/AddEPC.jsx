import React, { useState, useEffect } from 'react'
import { ref, set } from 'firebase/database'
import { rtdb } from '../firebase'

export default function AddEPC({ showToast, onBack }) {
  const [epcNumber, setEpcNumber] = useState(() => {
    try {
      return localStorage.getItem('acetra-add-epc') || ''
    } catch (e) { return '' }
  })
  const [itemName, setItemName] = useState(() => {
    try {
      return localStorage.getItem('acetra-add-itemname') || ''
    } catch (e) { return '' }
  })
  const [location, setLocation] = useState(() => {
    try {
      return localStorage.getItem('acetra-add-location') || ''
    } catch (e) { return '' }
  })
  const [submitting, setSubmitting] = useState(false)

  // persist epcNumber to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('acetra-add-epc', epcNumber)
    } catch (e) {}
  }, [epcNumber])

  // persist itemName to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('acetra-add-itemname', itemName)
    } catch (e) {}
  }, [itemName])

  // persist location to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('acetra-add-location', location)
    } catch (e) {}
  }, [location])

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!epcNumber.trim() || !itemName.trim() || !location.trim()) {
      showToast('Please enter EPC number, item name, and location', 'error', 3000)
      return
    }

    setSubmitting(true)
    
    try {
      // Create path: /allowed_epcs/<EPC_NUMBER>
      const epcPath = `allowed_epcs/${epcNumber.trim()}`
      const epcRef = ref(rtdb, epcPath)
      
      // Set item_name and location at that path
      await set(epcRef, {
        item_name: itemName.trim(),
        location: location.trim()
      })
      
      showToast(`EPC ${epcNumber} added successfully!`, 'success', 3000)
      
      // Clear form and localStorage after short delay so user sees the success message
      setTimeout(() => {
        setEpcNumber('')
        setItemName('')
        setLocation('')
        try {
          localStorage.removeItem('acetra-add-epc')
          localStorage.removeItem('acetra-add-itemname')
          localStorage.removeItem('acetra-add-location')
        } catch (e) {}
      }, 500)
    } catch (error) {
      console.error('Error adding EPC:', error)
      showToast(`Failed to add EPC: ${error.message}`, 'error', 4000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="acetra-table-wrap" style={{ paddingTop: 0 }}>
      <div className="acetra-card" style={{ maxWidth: 680, margin: '0 auto', padding: '32px 40px' }}>
        {/* Back Button */}
        <button 
          className="copy-btn" 
          onClick={onBack}
          style={{ 
            marginBottom: 32,
            padding: '10px 18px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Tracker
        </button>

        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            margin: '0 auto 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(11,95,255,0.2)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="acetra-title" style={{ fontSize: 28, marginBottom: 12, letterSpacing: '-0.5px' }}>
            Register New item
          </h2>
          <p className="acetra-subtitle" style={{ margin: 0, fontSize: 15 }}>
            Add a new item to the allowed list with its associated RFID
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 28 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 10, 
              fontWeight: 600, 
              fontSize: 14,
              color: 'var(--text-strong)',
              letterSpacing: '0.2px'
            }}>
              EPC Number
              <span style={{ color: 'var(--brand)', marginLeft: 4 }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={epcNumber}
                onChange={(e) => setEpcNumber(e.target.value)}
                placeholder="e.g., E2000017570D016024201F57"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: 12,
                  border: '2px solid var(--soft-border)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                  fontSize: 14,
                  fontWeight: 500,
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand)'
                  e.target.style.boxShadow = '0 0 0 4px rgba(11,95,255,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--soft-border)'
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
              />
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                  pointerEvents: 'none'
                }}
              >
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 6V4a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Enter the unique EPC identifier from the RFID tag
            </p>
          </div>

          <div style={{ marginBottom: 36 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 10, 
              fontWeight: 600, 
              fontSize: 14,
              color: 'var(--text-strong)',
              letterSpacing: '0.2px'
            }}>
              Item Name
              <span style={{ color: 'var(--brand)', marginLeft: 4 }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Employee 01, Laptop, Tablet"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: 12,
                  border: '2px solid var(--soft-border)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontSize: 14,
                  fontWeight: 500,
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand)'
                  e.target.style.boxShadow = '0 0 0 4px rgba(11,95,255,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--soft-border)'
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
              />
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                  pointerEvents: 'none'
                }}
              >
                <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a1 1 0 000 2h1v11a2 2 0 002 2h10a2 2 0 002-2V9h1a1 1 0 100-2zM10 5h4v2h-4V5z" fill="currentColor"/>
              </svg>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Provide a descriptive name for the item or person associated with this tag
            </p>
          </div>

          <div style={{ marginBottom: 36 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 10, 
              fontWeight: 600, 
              fontSize: 14,
              color: 'var(--text-strong)',
              letterSpacing: '0.2px'
            }}>
              Location
              <span style={{ color: 'var(--brand)', marginLeft: 4 }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Gate, Warehouse A, Building 3"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: 12,
                  border: '2px solid var(--soft-border)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontSize: 14,
                  fontWeight: 500,
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand)'
                  e.target.style.boxShadow = '0 0 0 4px rgba(11,95,255,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--soft-border)'
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
              />
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                  pointerEvents: 'none'
                }}
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
              </svg>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Specify the physical location where this tag will be tracked
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              border: 'none',
              background: submitting 
                ? 'var(--muted)' 
                : 'linear-gradient(135deg, var(--brand), var(--brand-2))',
              color: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: submitting 
                ? 'none' 
                : '0 4px 14px rgba(11,95,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(11,95,255,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 14px rgba(11,95,255,0.3)'
              }
            }}
          >
            {submitting ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4"/>
                </svg>
                Adding EPC...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add EPC to Registry
              </>
            )}
          </button>
        </form>

        
          
        
      </div>
    </div>
  )
}
