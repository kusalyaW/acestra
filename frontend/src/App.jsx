import React, { useState } from 'react'
import DataList from './components/DataList'
import AddEPC from './components/AddEPC'
import Toast from './components/Toast'

export default function App() {
  const [page, setPage] = useState(() => {
    try {
      return localStorage.getItem('acetra-page') || 'tracker'
    } catch (e) { return 'tracker' }
  })
  const [query, setQuery] = useState(() => {
    try {
      return localStorage.getItem('acetra-search') || ''
    } catch (e) { return '' }
  })
  const [toast, setToast] = useState({ message: '', visible: false })
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('acetra-theme')
      if (stored) return stored
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (e) { return 'light' }
  })

  // apply theme class to <html>
  React.useEffect(() => {
    try {
      const root = document.documentElement
      if (theme === 'dark') root.classList.add('theme-dark')
      else root.classList.remove('theme-dark')
      localStorage.setItem('acetra-theme', theme)
    } catch (e) {}
  }, [theme])

  // persist page to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('acetra-page', page)
    } catch (e) {}
  }, [page])

  // persist search query to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('acetra-search', query)
    } catch (e) {}
  }, [query])

  function toggleTheme() {
    try {
      const root = document.documentElement
      // flash overlay to soften contrast change
      root.classList.add('theme-flash')
      // remove flash after transition (matches --theme-transition-duration)
      setTimeout(() => root.classList.remove('theme-flash'), 520)
    } catch (e) {}
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  function showToast(message, type = 'info', duration) {
    setToast({ message: String(message), visible: true, type: type || 'info' })
    if (duration) {
      setTimeout(() => setToast({ message: '', visible: false, type: 'info' }), duration)
    }
  }

  if (page === 'add') {
    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 24 }}>
        <div className="acetra-table-wrap" style={{ padding: 0 }}>
          <header style={{ marginBottom: 18 }}>
            <div className="acetra-header-top">
              <h1 className="acetra-title">Acetra Live EPC Tracker</h1>

              <button className="icon-btn theme-toggle" title="Toggle theme" aria-label="Toggle theme" onClick={() => toggleTheme() }>
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            </div>
          </header>
        </div>

        <main>
          <AddEPC showToast={showToast} onBack={() => setPage('tracker')} />
        </main>

        <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ message: '', visible: false, type: 'info' })} type={toast.type} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 24 }}>
      <div className="acetra-table-wrap" style={{ padding: 0 }}>
        <header style={{ marginBottom: 18 }}>
          <div className="acetra-header-top">
            <h1 className="acetra-title">Acetra Live EPC Tracker</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="acetra-search" style={{ marginLeft: 12 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search EPC..." />
                <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(query || ''); showToast('Search copied') }} aria-label="Copy search">Search</button>
              </div>

              <button 
                className="copy-btn" 
                onClick={() => setPage('add')}
                title="Add new EPC"
                style={{ marginLeft: 8 }}
              >
                + Add EPC
              </button>

              <button className="icon-btn theme-toggle" title="Toggle theme" aria-label="Toggle theme" onClick={() => toggleTheme() }>
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="acetra-header-bottom">
            <p className="acetra-subtitle">Real-time visibility — watch tags move through locations</p>
            <div style={{ marginTop: 8 }} className="acetra-caption2">Colors show direction: <span className="badge in">IN</span> <span className="badge out">OUT</span></div>
          </div>
        </header>
      </div>

      <main>
        <DataList query={query} setQuery={setQuery} showToast={showToast} />
      </main>

      <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ message: '', visible: false, type: 'info' })} type={toast.type} />
    </div>
  )
}
