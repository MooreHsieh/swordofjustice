import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const logoutBtn = document.querySelector('#logoutBtn')
const playerSearchEl = document.querySelector('#playerSearch')
const totalsBodyEl = document.querySelector('#totalsBody')
const totalsHeadEl = document.querySelector('.totals-table-wrap thead')

let allRows = []
let sortKey = 'avg_pvp'
let sortAsc = false

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString()
}

function safeDiv(a, b) {
  const n = Number(a || 0)
  const d = Number(b || 0)
  if (!d) return null
  return n / d
}

function fmtAvg(sum, matches) {
  const v = safeDiv(sum, matches)
  return v == null ? '—' : v.toFixed(1)
}

function fmtPct(n, d) {
  const v = safeDiv(n, d)
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`
}

function toRowModel(r) {
  const matches = Number(r.matches || 0)
  const wins = Number(r.wins || 0)
  const losses = Number(r.losses || 0)
  const kills = Number(r.kills_sum || 0)
  const heavy = Number(r.heavy_sum || 0)
  const pvp = Number(r.pvp_sum || 0)
  const avg = (v) => safeDiv(v, matches) ?? 0
  return {
    ...r,
    matches,
    wins,
    losses,
    win_rate: safeDiv(wins, matches) ?? 0,
    avg_kills: avg(r.kills_sum),
    avg_assists: avg(r.assists_sum),
    avg_resources: avg(r.resources_sum),
    avg_pvp: avg(r.pvp_sum),
    avg_bld: avg(r.bld_sum),
    avg_heal: avg(r.heal_sum),
    avg_tank: avg(r.tank_sum),
    avg_heavy: avg(r.heavy_sum),
    avg_feather: avg(r.feather_sum),
    avg_bone: avg(r.bone_sum),
    k_per_h: safeDiv(kills, heavy) ?? 0,
    dmg_per_kill: safeDiv(pvp, kills) ?? 0,
  }
}

function sortDisplayRows(rows) {
  const sorted = [...rows]
  sorted.sort((a, b) => {
    if (sortKey === 'player_name' || sortKey === 'class_name') {
      const av = String(a[sortKey] || '')
      const bv = String(b[sortKey] || '')
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    const av = Number(a[sortKey] || 0)
    const bv = Number(b[sortKey] || 0)
    return sortAsc ? av - bv : bv - av
  })
  return sorted
}

function buildHeatCell(value, maxValue) {
  const v = Number(value || 0)
  const m = Number(maxValue || 0)
  if (!m) return `<td>${v.toFixed(1)}</td>`
  if (!v) return `<td>0.0</td>`
  const ratio = Math.min(v / m, 1)
  const alpha = (0.04 + ratio * 0.1).toFixed(3)
  return `<td class="totals-avg-heat" style="--tot-heat-alpha:${alpha}">${v.toFixed(1)}</td>`
}

function updateSortHeader() {
  if (!totalsHeadEl) return
  totalsHeadEl.querySelectorAll('[data-sort]').forEach((th) => {
    const key = th.dataset.sort
    const base = th.textContent.replace(/[↑↓↕]$/, '')
    const arrow = key === sortKey ? (sortAsc ? '↑' : '↓') : '↕'
    th.innerHTML = `${base}<span style="${key === sortKey ? 'color:var(--gold-l)' : 'color:#555'}">${arrow}</span>`
  })
}

async function requireAuth() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    window.location.replace('./login.html')
    return null
  }
  return data.user
}

async function onLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    setStatus(error.message, true)
    return
  }
  window.location.replace('./login.html')
}

function renderRows(rows) {
  totalsBodyEl.innerHTML = ''
  if (!rows.length) {
    totalsBodyEl.innerHTML = '<tr><td colspan="28">尚無資料</td></tr>'
    return
  }

  const maxAvg = {
    avg_kills: Math.max(...rows.map((r) => Number(r.avg_kills || 0)), 0),
    avg_assists: Math.max(...rows.map((r) => Number(r.avg_assists || 0)), 0),
    avg_resources: Math.max(...rows.map((r) => Number(r.avg_resources || 0)), 0),
    avg_pvp: Math.max(...rows.map((r) => Number(r.avg_pvp || 0)), 0),
    avg_bld: Math.max(...rows.map((r) => Number(r.avg_bld || 0)), 0),
    avg_heal: Math.max(...rows.map((r) => Number(r.avg_heal || 0)), 0),
    avg_tank: Math.max(...rows.map((r) => Number(r.avg_tank || 0)), 0),
    avg_heavy: Math.max(...rows.map((r) => Number(r.avg_heavy || 0)), 0),
    avg_feather: Math.max(...rows.map((r) => Number(r.avg_feather || 0)), 0),
    avg_bone: Math.max(...rows.map((r) => Number(r.avg_bone || 0)), 0),
  }

  for (const r of rows) {
    const tr = document.createElement('tr')
    const name = String(r.player_name || '')
    const job = String(r.class_name || '')
    const detailHref = `./stats-player-detail.html?name=${encodeURIComponent(name)}&job=${encodeURIComponent(job)}`
    tr.innerHTML = `
      <td><a class="nav-btn" href="${detailHref}">${name || '—'}</a></td>
      <td>${job || '—'}</td>
      ${buildHeatCell(r.avg_kills, maxAvg.avg_kills)}
      ${buildHeatCell(r.avg_assists, maxAvg.avg_assists)}
      ${buildHeatCell(r.avg_resources, maxAvg.avg_resources)}
      ${buildHeatCell(r.avg_pvp, maxAvg.avg_pvp)}
      ${buildHeatCell(r.avg_bld, maxAvg.avg_bld)}
      ${buildHeatCell(r.avg_heal, maxAvg.avg_heal)}
      ${buildHeatCell(r.avg_tank, maxAvg.avg_tank)}
      ${buildHeatCell(r.avg_heavy, maxAvg.avg_heavy)}
      ${buildHeatCell(r.avg_feather, maxAvg.avg_feather)}
      ${buildHeatCell(r.avg_bone, maxAvg.avg_bone)}
      <td>${fmtNum(r.wins)}</td>
      <td>${fmtNum(r.losses)}</td>
      <td>${fmtNum(r.matches)}</td>
      <td>${fmtPct(r.wins, r.matches)}</td>
      <td>${fmtNum(r.kills_sum)}</td>
      <td>${fmtNum(r.assists_sum)}</td>
      <td>${fmtNum(r.resources_sum)}</td>
      <td>${fmtNum(r.pvp_sum)}</td>
      <td>${fmtNum(r.bld_sum)}</td>
      <td>${fmtNum(r.heal_sum)}</td>
      <td>${fmtNum(r.tank_sum)}</td>
      <td>${fmtNum(r.heavy_sum)}</td>
      <td>${fmtNum(r.feather_sum)}</td>
      <td>${fmtNum(r.bone_sum)}</td>
      <td>${r.k_per_h > 0 ? r.k_per_h.toFixed(2) : '—'}</td>
      <td>${r.dmg_per_kill > 0 ? fmtNum(Math.round(r.dmg_per_kill)) : '—'}</td>
    `
    totalsBodyEl.appendChild(tr)
  }
}

function renderFilteredRows() {
  const keyword = (playerSearchEl?.value || '').trim().toLowerCase()
  const filtered = keyword
    ? allRows.filter((r) =>
      String(r.player_name || '').toLowerCase().includes(keyword) ||
      String(r.class_name || '').toLowerCase().includes(keyword))
    : allRows

  const modeled = filtered.map(toRowModel)
  const sorted = sortDisplayRows(modeled)
  renderRows(sorted)
  updateSortHeader()
  setStatus(`人員總計已更新，共 ${sorted.length} 筆。`)
}

async function loadTotals() {
  setStatus('資料載入中...')
  totalsBodyEl.innerHTML = '<tr><td colspan="28">載入中...</td></tr>'

  const { data, error } = await supabase
    .from('guild_a_player_totals')
    .select('*')
    .order('matches', { ascending: false })
    .order('wins', { ascending: false })

  if (error) {
    totalsBodyEl.innerHTML = '<tr><td colspan="28">讀取失敗</td></tr>'
    setStatus(error.message, true)
    return
  }

  allRows = data || []
  renderFilteredRows()
}

async function bootstrap() {
  const user = await requireAuth()
  if (!user) return

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout)
  if (playerSearchEl) playerSearchEl.addEventListener('input', renderFilteredRows)
  if (totalsHeadEl) {
    totalsHeadEl.addEventListener('click', (e) => {
      const th = e.target.closest('[data-sort]')
      if (!th) return
      const key = th.dataset.sort
      if (sortKey === key) sortAsc = !sortAsc
      else {
        sortKey = key
        sortAsc = false
      }
      renderFilteredRows()
    })
  }

  await loadTotals()
}

bootstrap()
