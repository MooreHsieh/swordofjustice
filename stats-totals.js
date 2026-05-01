import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const logoutBtn = document.querySelector('#logoutBtn')
const playerSearchEl = document.querySelector('#playerSearch')
const totalsBodyEl = document.querySelector('#totalsBody')

let allRows = []

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

  for (const r of rows) {
    const tr = document.createElement('tr')
    const matches = Number(r.matches || 0)
    const wins = Number(r.wins || 0)
    const losses = Number(r.losses || 0)
    const kills = Number(r.kills_sum || 0)
    const heavy = Number(r.heavy_sum || 0)
    const pvp = Number(r.pvp_sum || 0)
    const kd = safeDiv(kills, heavy)
    const dmgPerKill = safeDiv(pvp, kills)

    const name = String(r.player_name || '')
    const job = String(r.class_name || '')
    const detailHref = `./stats-player-detail.html?name=${encodeURIComponent(name)}&job=${encodeURIComponent(job)}`
    tr.innerHTML = `
      <td><a class="nav-btn" href="${detailHref}">${name || '—'}</a></td>
      <td>${r.class_name || '—'}</td>
      <td>${fmtNum(wins)}</td>
      <td>${fmtNum(losses)}</td>
      <td>${fmtNum(matches)}</td>
      <td>${fmtPct(wins, matches)}</td>
      <td>${fmtAvg(r.kills_sum, matches)}</td>
      <td>${fmtAvg(r.assists_sum, matches)}</td>
      <td>${fmtAvg(r.resources_sum, matches)}</td>
      <td>${fmtAvg(r.pvp_sum, matches)}</td>
      <td>${fmtAvg(r.bld_sum, matches)}</td>
      <td>${fmtAvg(r.heal_sum, matches)}</td>
      <td>${fmtAvg(r.tank_sum, matches)}</td>
      <td>${fmtAvg(r.heavy_sum, matches)}</td>
      <td>${fmtAvg(r.feather_sum, matches)}</td>
      <td>${fmtAvg(r.bone_sum, matches)}</td>
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
      <td>${kd == null ? '—' : kd.toFixed(2)}</td>
      <td>${dmgPerKill == null ? '—' : fmtNum(Math.round(dmgPerKill))}</td>
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

  renderRows(filtered)
  setStatus(`人員總計已更新，共 ${filtered.length} 筆。`)
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

  await loadTotals()
}

bootstrap()
