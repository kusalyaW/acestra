import React, { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../firebase'
import { jsPDF } from 'jspdf'

function getEpc(item) {
  // prefer explicit EPC-like fields or the object key `id`; fall back to item name
  return item.epc || item.EPC || item.tag || item.epcId || item.id || item.serial || item.itemname || '—'
}

function getLastEvent(item) {
  // Look for common array fields containing event history
  const arrays = ['events', 'reads', 'history', 'scans']
  for (const k of arrays) {
    if (Array.isArray(item[k]) && item[k].length) {
      // assume last element is the latest; if timestamp exists sort by it
      const arr = item[k].slice()
      const hasTs = arr.every(a => a && (a.ts || a.timestamp || a.time))
      if (hasTs) {
        arr.sort((a, b) => (a.ts || a.timestamp || a.time) - (b.ts || b.timestamp || b.time))
      }
      return arr[arr.length - 1]
    }
  }

  // If item has a `timestamp` object keyed by human-readable datetime strings
  // e.g. timestamp: { "2025-12-03 14:34:43": { direction: "IN", location: "8th Floor" }, ... }
  if (item.timestamp && typeof item.timestamp === 'object' && !Array.isArray(item.timestamp)) {
    const entries = Object.entries(item.timestamp).map(([k, v]) => {
      // try to parse the key as a date, fallback to numeric ts inside value
      const parsed = Date.parse(k.replace(' ', 'T'))
      const t = !isNaN(parsed) ? parsed : Number(v.ts || v.timestamp || v.time || 0)
      return { key: k, value: v, t }
    }).filter(e => !isNaN(e.t))

    if (entries.length) {
      entries.sort((a, b) => a.t - b.t)
      const last = entries[entries.length - 1]
      return { ...(last.value || {}), _tsKey: last.key, _ts: last.t }
    }
  }

  // Or look for direct last* fields
  if (item.lastEvent) return item.lastEvent
  if (item.last) return item.last
  // If the item stores history as top-level timestamp-keyed children (e.g. "2025-12-07_18-49-15": { Location: ..., InOutState: ... })
  const hist = getHistory(item)
  if (hist && hist.length) {
    const last = hist[hist.length - 1]
    return { ...(last || {}), _tsKey: last.key, _ts: last.t }
  }

  return null
}

// Helper: check if a key looks like a timestamp (e.g. starts with 20xx- or parses to a Date)
function isTimestampKey(k) {
  if (!k || typeof k !== 'string') return false
  // common patterns like 2025-12-07_18-49-15 or 2025-12-07 18:49:15
  if (/^20\d{2}[-_ ]\d{2}[-_ ]\d{2}/.test(k)) return true
  // try parsing after replacing '_' with ' ' or 'T'
  const parsed = Date.parse(k.replace(/_/g, ' ').replace(/ /, 'T'))
  return !isNaN(parsed)
}

// Helper: case-insensitive property getter from an object; returns first match among candidates
function getPropCI(obj, candidates) {
  if (!obj || typeof obj !== 'object') return undefined
  const keys = Object.keys(obj)
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase() === c.toLowerCase())
    if (found) return obj[found]
  }
  return undefined
}

// Extract normalized history entries from item. Returns array sorted ascending by timestamp.
function getHistory(item) {
  const out = []

  if (!item || typeof item !== 'object') return out

  // If item has an explicit `timestamp` map, use it
  if (item.timestamp && typeof item.timestamp === 'object' && !Array.isArray(item.timestamp)) {
    for (const [k, v] of Object.entries(item.timestamp)) {
      const parsed = Date.parse(String(k).replace(/_/g, ' ').replace(' ', 'T'))
      const t = !isNaN(parsed) ? parsed : Number((v && (v.ts || v.timestamp || v.time)) || 0)
      out.push({ key: k, raw: v, loc: getPropCI(v, ['Location', 'location', 'Loc', 'loc', 'Site', 'site', 'Place', 'place']), dir: getPropCI(v, ['InOutState', 'InOut', 'inOutState', 'direction', 'dir']), name: getPropCI(v, ['ItemName', 'itemname', 'Item', 'item']), t })
    }
  } else {
    // look for top-level timestamp-like keys
    for (const [k, v] of Object.entries(item)) {
      if (k === 'id' || k === 'itemname' || k === 'ItemName' || k === 'EPC' || k === 'epc' || k === 'value') continue
      if (isTimestampKey(k) && v && typeof v === 'object') {
        const parsed = Date.parse(String(k).replace(/_/g, ' ').replace(' ', 'T'))
        const t = !isNaN(parsed) ? parsed : Number((v && (v.ts || v.timestamp || v.time || v.Timestamp)) || 0)
        out.push({ key: k, raw: v, loc: getPropCI(v, ['Location', 'location', 'Loc', 'loc', 'Site', 'site', 'Place', 'place']), dir: getPropCI(v, ['InOutState', 'InOut', 'inOutState', 'direction', 'dir']), name: getPropCI(v, ['ItemName', 'itemname', 'Item', 'item']), t })
      }
    }
  }

  // Also include any array-based histories (events/reads)
  const arrFields = ['events', 'reads', 'history', 'scans']
  for (const f of arrFields) {
    if (Array.isArray(item[f])) {
      for (const el of item[f]) {
        const t = el && (el.ts || el.timestamp || el.time) ? Number(el.ts || el.timestamp || el.time) : 0
        out.push({ key: el && el._id ? String(el._id) : '', raw: el, loc: getPropCI(el, ['Location', 'location', 'loc']), dir: getPropCI(el, ['direction', 'dir', 'InOutState']), name: getPropCI(el, ['ItemName', 'itemname']), t })
      }
    }
  }

  // sort ascending by timestamp
  out.sort((a, b) => (a.t || 0) - (b.t || 0))
  return out
}

function getLastLocation(item) {
  const last = getLastEvent(item)
  if (last) return last.location || last.loc || last.site || last.place || '—'
  return item.location || item.lastLocation || item.site || '—'
}

function getLastDirection(item) {
  const last = getLastEvent(item)
  if (last) return last.direction || last.dir || last.heading || '—'
  return item.direction || item.lastDirection || item.dir || '—'
}

function getLastSeen(item) {
  const last = getLastEvent(item)
  let t = null
  if (last && last._tsKey) {
    // use the original key (human readable) when present
    const key = last._tsKey
    // try to parse key into a Date
    const parsed = Date.parse(String(key).replace(/_/g, ' ').replace(/ /, 'T'))
    if (!isNaN(parsed)) t = new Date(parsed)
    else t = key
  } else {
    const raw = (last && (last.ts || last.timestamp || last.time)) || item.lastSeen || item.timestamp || item.ts
    if (!raw) return '—'
    const num = Number(raw)
    if (!isNaN(num) && num > 1000000000) t = new Date(num)
    else {
      const parsed = Date.parse(String(raw).replace(' ', 'T'))
      if (!isNaN(parsed)) t = new Date(parsed)
      else t = String(raw)
    }
  }

  if (t instanceof Date) return t.toLocaleString()
  return String(t)
}

export default function DataList({ query: externalQuery, setQuery: setExternalQuery, showToast }) {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [expandedHistory, setExpandedHistory] = useState({})
  const [lastUpdate, setLastUpdate] = useState(null)
  // support lifted search state (from App) or local fallback
  const [internalQuery, setInternalQuery] = useState('')
  const query = externalQuery !== undefined ? externalQuery : internalQuery
  const setQuery = setExternalQuery !== undefined ? setExternalQuery : setInternalQuery

  useEffect(() => {
    const path = import.meta.env.VITE_FIREBASE_DB_PATH || '/'

    const dbRef = ref(rtdb, path)
    setLoading(true)

    const unsubscribe = onValue(
      dbRef,
      snapshot => {
        const val = snapshot.val()
        let list = []
        if (val == null) {
          list = []
        } else if (Array.isArray(val)) {
          list = val.map((v, i) => ({ id: String(i), ...v }))
        } else if (typeof val === 'object') {
          list = Object.entries(val).map(([k, v]) => ({ id: k, ...v }))
        } else {
          list = [{ id: 'value', value: val }]
        }

        // sort by last seen timestamp descending (if available)
        list.sort((a, b) => {
          const ta = parseInt(a.lastSeen || (a.lastEvent && (a.lastEvent.ts || a.lastEvent.timestamp)) || a.ts || a.timestamp || 0)
          const tb = parseInt(b.lastSeen || (b.lastEvent && (b.lastEvent.ts || b.lastEvent.timestamp)) || b.ts || b.timestamp || 0)
          return (tb || 0) - (ta || 0)
        })

        // attach numeric timestamp for new-item detection
        const now = Date.now()
        list = list.map(it => {
          const last = getLastEvent(it)
          const t = last && (last._ts || last.ts || last.timestamp || last.time) ? Number(last._ts || last.ts || last.timestamp || last.time) : 0
          return { ...it, __lastTs: t }
        })

        setItems(list)
        setLoading(false)
        // update lastUpdate (most recent timestamp among items)
        if (list && list.length) {
          const mostRecent = list.reduce((best, it) => {
            const t = it.__lastTs || 0
            return t > (best.t || 0) ? { it, t } : best
          }, { t: 0 })
          if (mostRecent.t && mostRecent.t > 0) setLastUpdate(new Date(mostRecent.t).toLocaleString())
          else setLastUpdate(new Date().toLocaleString())
        } else {
          setLastUpdate(null)
        }
      },
      err => {
        setError(err.message || String(err))
        setLoading(false)
      }
    )

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [])

  if (loading) {
    // Skeleton table while loading
    return (
      <div className="acetra-table-wrap">
        <div className="acetra-card">
          <table className="acetra-table">
            <thead>
              <tr><th>EPC</th><th>Last Location</th><th>Last Direction</th><th>Last Seen</th><th></th></tr>
            </thead>
            <tbody>
              {Array.from({length:6}).map((_,i) => (
                <tr key={i} className="acetra-row skeleton">
                  <td><div className="skeleton-line" style={{ width: '60%' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '45%' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '30%' }} /></td>
                  <td><div className="skeleton-line" style={{ width: '40%' }} /></td>
                  <td><div className="skeleton-dot" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  if (error) return <div className="acetra-error">Error: {error}</div>
  if (!items || items.length === 0) return <div className="acetra-empty">No data at the path.</div>

  const filtered = items.filter(it => {
    if (!query) return true
    const epc = getEpc(it).toLowerCase()
    return epc.includes(query.toLowerCase())
  })

  return (
    <div>
      <div className="acetra-table-wrap">
        <div className="acetra-status-row" style={{ padding: '12px 0', marginBottom: 8 }}>
          <div className="acetra-status-left">
            <div className="acetra-status-pill">{items.length} tags</div>
            <div className="acetra-last-update">Last update: {lastUpdate}</div>
          </div>
        </div>

        <div className="acetra-card">
        <table className="acetra-table">
          <thead>
            <tr>
              <th style={{ width: 260 }}>EPC</th>
              <th style={{ width: 240 }}>Item Name</th>
              <th>Last Location</th>
              <th>Last Direction</th>
              <th>Last Seen</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
            const id = item.id
            const epc = getEpc(item)
            const lastEvt = getLastEvent(item)
            const itemName = item.itemname || (lastEvt && lastEvt.name) || ''
            const loc = getLastLocation(item)
            const dir = getLastDirection(item)
            const seen = getLastSeen(item)
            const isOpen = !!expanded[id]
            const isNew = item.__lastTs && (Date.now() - Number(item.__lastTs) < 2 * 60 * 1000) // 2 minutes

            return (
              <React.Fragment key={id}>
                <tr
                  className={`acetra-row ${isOpen ? 'open' : ''} ${isNew ? 'new' : ''}`}
                  onClick={() => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
                >
                    <td className="acetra-epc">{epc}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{itemName || '—'}</td>
                    <td>{loc}</td>
                    <td>
                      <span className={`direction-badge ${String(dir).toLowerCase() === 'in' ? 'in' : String(dir).toLowerCase() === 'out' ? 'out' : 'neutral'}`}>{dir}</span>
                    </td>
                    <td>{seen}</td>
                    <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                className="acetra-toggle"
                                onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }}
                                aria-expanded={isOpen}
                              >
                                {isOpen ? '▾' : '▸'}
                              </button>

                              <button className="icon-btn csv" title="Download CSV" aria-label="Download CSV" onClick={(e) => { e.stopPropagation(); downloadCSV(item); showToast && showToast('CSV download started', 'info') }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                              <button className="icon-btn pdf" title="Download PDF" aria-label="Download PDF" onClick={(e) => { e.stopPropagation(); downloadPDF(item); showToast && showToast('PDF download started', 'info') }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 2h10v6H7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 8v12h10V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                    </td>
                </tr>
                    {isOpen && (
                      <tr className="acetra-details-row">
                        <td colSpan={5}>
                          <div className={`acetra-details ${isOpen ? 'open' : ''}`}>
                            <div className="acetra-details-content">
                              <table className="acetra-details-table">
                                <tbody>
                                  <tr><th>ID</th><td>{item.id}</td></tr>
                                  <tr><th>Item Name</th><td>{item.itemname || (getHistory(item).length ? getHistory(item)[getHistory(item).length - 1].name : '—')}</td></tr>
                                  {(item.last_location || item.lastLocation) && <tr><th>Last Location</th><td>{item.last_location || item.lastLocation}</td></tr>}
                                  {(item.last_direction || item.lastDirection) && <tr><th>Last Direction</th><td>{item.last_direction || item.lastDirection}</td></tr>}
                                  <tr><th>Last Seen</th><td>{getLastSeen(item)}</td></tr>
                                </tbody>
                              </table>

                              {/* Show normalized history if present */}
                              {(() => {
                                const history = getHistory(item)
                                if (!history || !history.length) return null
                                // collect raw keys present across history entries
                                const seen = new Set()
                                history.forEach(h => {
                                  if (h.raw && typeof h.raw === 'object') {
                                    Object.keys(h.raw).forEach(k => seen.add(k))
                                  }
                                })

                                // decide summary columns (Timestamp, Location, Direction) for the compact rows
                                const allKeys = Array.from(seen)
                                const findKey = (cands) => allKeys.find(k => cands.some(c => k.toLowerCase() === c.toLowerCase()))
                                const locKey = findKey(['Location','location','Loc','loc','Site','site','Place','place'])
                                const dirKey = findKey(['InOutState','InOut','inOutState','direction','dir'])

                                const itemRowId = item.id || epc || Math.random()

                                function toggleHist(key) {
                                  const mapKey = `${itemRowId}||${key}`
                                  setExpandedHistory(prev => ({ ...prev, [mapKey]: !prev[mapKey] }))
                                }

                                return (
                                  <div style={{ marginTop: 10 }}>
                                    <strong>History</strong>
                                    <table className="acetra-history-table">
                                      <thead>
                                        <tr>
                                          <th style={{ width: 220 }}>Timestamp</th>
                                          <th>Location</th>
                                          <th>Direction</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {history.map((h, idx) => {
                                          const mapKey = `${itemRowId}||${h.key || h.t || idx}`
                                          const isOpenHist = !!expandedHistory[mapKey]
                                          const tsLabel = h.key || (h.t ? new Date(h.t).toLocaleString() : '—')
                                          const locVal = h.loc || (h.raw && (h.raw.Location || h.raw.location || h.raw.loc)) || '—'
                                          const dirVal = h.dir || (h.raw && (h.raw.InOutState || h.raw.InOut || h.raw.direction || h.raw.dir)) || '—'
                                          return (
                                            <React.Fragment key={mapKey}>
                                              <tr className="acetra-row" style={{ cursor: 'pointer' }} onClick={() => toggleHist(h.key || h.t || idx)}>
                                                <td style={{ fontFamily: 'monospace' }}>{isOpenHist ? '▾ ' : '▸ '}{tsLabel}</td>
                                                <td>{locVal}</td>
                                                <td>{dirVal}</td>
                                              </tr>
                                              {isOpenHist && (
                                                <tr className="acetra-details-row">
                                                  <td colSpan={3}>
                                                    <div className={`acetra-details open`}>
                                                      <div className="acetra-details-content">
                                                        <table className="acetra-details-table">
                                                          <tbody>
                                                            {/* show all raw fields as key/value rows */}
                                                            {h.raw && typeof h.raw === 'object' ? Object.entries(h.raw).map(([k,v]) => (
                                                              <tr key={k}><th style={{ width: 180 }}>{k}</th><td>{String(v)}</td></tr>
                                                            )) : (<tr><th>Value</th><td>{String(h.raw)}</td></tr>)}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
              </React.Fragment>
            )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

// Helper: flatten object to CSV rows (key,value)
function objectToCsvRows(obj) {
  const rows = []
  function walk(prefix, val) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const k of Object.keys(val)) walk(prefix ? `${prefix}.${k}` : k, val[k])
    } else if (Array.isArray(val)) {
      val.forEach((v, i) => walk(`${prefix}[${i}]`, v))
    } else {
      rows.push([prefix, String(val)])
    }
  }
  walk('', obj)
  return rows
}

function downloadCSV(item) {
  // Build metadata rows
  const epc = getEpc(item)
  const name = (item.itemname || item.id || epc || 'record')
  const exportedAt = new Date().toLocaleString()

  const metaRows = [
    ['Record', 'Acetra EPC Record'],
    ['Exported At', exportedAt],
    ['EPC', epc],
    ['ID', item.id || '—'],
    ['Item Name', item.itemname || (getHistory(item).length ? getHistory(item)[getHistory(item).length - 1].name : '—')],
    ['Last Location', item.last_location || item.lastLocation || getLastLocation(item) || '—'],
    ['Last Direction', item.last_direction || item.lastDirection || getLastDirection(item) || '—'],
    ['Last Seen', getLastSeen(item) || '—']
  ]

  // Build history entries using normalized `getHistory` to support timestamp-keyed children
  const history = []
  const seenKeys = new Set()
  try {
    const rawHist = getHistory(item) // returns entries sorted ascending
    for (const h of rawHist) {
      const entry = { Timestamp: h.key || (h.t ? new Date(h.t).toLocaleString() : '') }
      if (h.raw && typeof h.raw === 'object') {
        // copy all fields from the raw object so we can detect available keys
        for (const kk of Object.keys(h.raw)) { entry[kk] = h.raw[kk]; seenKeys.add(kk) }
      } else {
        entry.Value = h.raw
        seenKeys.add('Value')
      }
      // also include normalized aliases
      if (h.loc) { entry.Location = h.loc; seenKeys.add('Location') }
      if (h.dir) { entry.Direction = h.dir; seenKeys.add('Direction') }
      history.push(entry)
    }
  } catch (e) {
    // fallback to previous logic if normalization fails
  }

  // If no structured history found, attempt to include top-level simple array or object keys
  if (!history.length) {
    // fallback: flatten item for a single-row CSV
    const rows = objectToCsvRows(item)
    const header = ['Field', 'Value']
    const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return
  }

  // Determine columns for history table: prefer Timestamp, Location, Direction, then other seen keys
  const lowerPrefer = ['location', 'loc', 'site', 'place']
  const dirPrefer = ['direction', 'dir', 'heading']
  const otherKeys = Array.from(seenKeys).filter(k => !lowerPrefer.includes(k.toLowerCase()) && !dirPrefer.includes(k.toLowerCase()))

  const columns = ['Timestamp']
  // choose a preferred location key if present
  let locKey = null
  for (const k of seenKeys) if (lowerPrefer.includes(k.toLowerCase())) { locKey = k; break }
  if (locKey) columns.push(locKey)
  let dirKey = null
  for (const k of seenKeys) if (dirPrefer.includes(k.toLowerCase())) { dirKey = k; break }
  if (dirKey) columns.push(dirKey)
  for (const k of otherKeys) columns.push(k)

  // Prepare CSV content: metadata section, blank line, history header, history rows (most recent first)
  const lines = []
  // Metadata header
  for (const r of metaRows) lines.push(r.map(c => String(c)))
  lines.push([])

  // History header row
  lines.push(columns)

  // Sort history by Timestamp (try to parse), most recent first
  history.sort((a, b) => {
    const ta = Date.parse((a.Timestamp || '').toString().replace(' ', 'T')) || 0
    const tb = Date.parse((b.Timestamp || '').toString().replace(' ', 'T')) || 0
    return tb - ta
  })

  for (const h of history) {
    const row = columns.map(col => {
      const v = h[col] !== undefined ? h[col] : (h[col.toLowerCase()] !== undefined ? h[col.toLowerCase()] : '')
      return v === null || v === undefined ? '' : String(v)
    })
    lines.push(row)
  }

  // Serialize CSV with proper quoting
  const csv = lines.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadPDF(item) {
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const left = 40
    let y = 40

    // Header
    doc.setFontSize(20)
    doc.setTextColor(11,95,255)
    doc.text('Acetra EPC Record', left, y)
    y += 28

    // EPC line
    doc.setFontSize(12)
    doc.setTextColor(34,41,47)
    doc.text(`EPC: ${getEpc(item)}`, left, y)
    y += 18

    // Key/value summary
    const summary = [
      ['ID', item.id || '—'],
      ['Item Name', item.itemname || (getHistory(item).length ? getHistory(item)[getHistory(item).length - 1].name : '—')],
      ['Last Location', item.last_location || item.lastLocation || getLastLocation(item) || '—'],
      ['Last Direction', item.last_direction || item.lastDirection || getLastDirection(item) || '—'],
      ['Last Seen', getLastSeen(item)]
    ]

    y += 6
    for (const [k, v] of summary) {
      const keyX = left
      const valX = left + 160
      doc.setFontSize(11)
      doc.setTextColor(88,100,121)
      doc.text(`${k}`, keyX, y)
      const lines = doc.splitTextToSize(String(v), 380)
      doc.setFontSize(11)
      doc.setTextColor(20,28,36)
      doc.text(lines, valX, y)
      y += lines.length * 14 + 8
      if (y > 750) { doc.addPage(); y = 40 }
    }

    // History
    y += 6
    doc.setFontSize(13)
    doc.setTextColor(11,95,255)
    doc.text('History (most recent first)', left, y)
    y += 18

    const history = getHistory(item).map(h => ({ key: h.key || (h.t ? new Date(h.t).toLocaleString() : ''), loc: h.loc || (h.raw && (h.raw.location || h.raw.loc || h.raw.site)) || '—', dir: h.dir || (h.raw && (h.raw.direction || h.raw.dir || h.raw.InOutState)) || '—', t: h.t || 0 })).sort((a, b) => (b.t || 0) - (a.t || 0))

    // Table header (with background) and column positions
    const col1 = left
    const col2 = left + 240
    const col3 = left + 420
    const tableWidth = 520
    const headerHeight = 18
    doc.setFillColor(245, 247, 255)
    doc.rect(left - 6, y - 12, tableWidth, headerHeight, 'F')
    doc.setFontSize(11)
    doc.setTextColor(80,90,100)
    doc.text('Timestamp', col1, y)
    doc.text('Location', col2, y)
    doc.text('Direction', col3, y)
    y += headerHeight + 6

    const rowLineHeight = 16
    for (const h of history) {
      const tsLines = doc.splitTextToSize(h.key, 200)
      const locLines = doc.splitTextToSize(h.loc, 160)
      doc.setFontSize(11)
      doc.setTextColor(34,41,47)
      doc.text(tsLines, col1, y)
      doc.text(locLines, col2, y)
      doc.text(String(h.dir), col3, y)
      const maxLines = Math.max(tsLines.length, locLines.length)
      y += maxLines * rowLineHeight + 10
      if (y > 720) { doc.addPage(); y = 40 }
    }

    const name = (item.itemname || item.id || 'record')
    doc.save(`${name}.pdf`)
  } catch (e) {
    console.error('PDF generation failed', e)
    alert('PDF generation failed: ' + e.message)
  }
}
