// 統一數字顯示格式（千分位）
export function formatNum(value) {
  return Number(value || 0).toLocaleString()
}

// 統一百分比顯示格式
export function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

// 字串轉義，避免直接插入 HTML
export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 依指定欄位與方向排序
export function sortRows(rows, sortKey, sortAsc) {
  return [...rows].sort((a, b) => {
    if (sortKey === 'player_name' || sortKey === 'class_name') {
      return sortAsc
        ? String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''))
        : String(b[sortKey] || '').localeCompare(String(a[sortKey] || ''))
    }
    const av = Number(a[sortKey] || 0)
    const bv = Number(b[sortKey] || 0)
    return sortAsc ? av - bv : bv - av
  })
}
