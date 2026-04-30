import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const leagueTitleEl = document.querySelector('#leagueTitle')
const detailVsLineEl = document.querySelector('#detailVsLine')
const detailMetaLineEl = document.querySelector('#detailMetaLine')
const logoutBtn = document.querySelector('#logoutBtn')
const viewBtnA = document.querySelector('#viewBtnA')
const viewBtnB = document.querySelector('#viewBtnB')
const tabsEl = document.querySelector('#detailTabs')
const mvpListEl = document.querySelector('#mvpList')
const searchEl = document.querySelector('#playerSearch')
const detailContentEl = document.querySelector('#detailContent')

const state = {
  league: null,
  records: [],
  view: 'a',
  tab: 'overview',
  search: '',
  sortKey: 'kills',
  sortAsc: false,
  grouped: { a: [], b: [] },
}

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#ff8f89' : '#9aa8ba'
}

function formatNum(value) {
  return Number(value || 0).toLocaleString()
}

function sortRows(rows) {
  const key = state.sortKey
  const asc = state.sortAsc
  return [...rows].sort((a, b) => {
    if (key === 'player_name' || key === 'class_name') {
      return asc
        ? String(a[key] || '').localeCompare(String(b[key] || ''))
        : String(b[key] || '').localeCompare(String(a[key] || ''))
    }
    const av = Number(a[key] || 0)
    const bv = Number(b[key] || 0)
    return asc ? av - bv : bv - av
  })
}

function computeMvp(rows) {
  const topBy = (key) => sortRows(rows).sort((a, b) => (b[key] || 0) - (a[key] || 0))[0]
  return [
    { icon: '🏆', label: '擊殺王', key: 'kills' },
    { icon: '⚔', label: '助攻王', key: 'assists' },
    { icon: '🔥', label: '輸出王', key: 'pvp_damage' },
    { icon: '🛡', label: '承傷王', key: 'damage_taken' },
    { icon: '💚', label: '治療王', key: 'healing_done' },
  ].map((item) => {
    const p = topBy(item.key)
    return { ...item, player: p }
  })
}

function renderMvp() {
  const rows = state.grouped[state.view]
  const mvp = computeMvp(rows)
  mvpListEl.innerHTML = mvp
    .map((m) => {
      if (!m.player) return ''
      return `
        <div class="detail-mvp-item">
          <span>${m.icon} ${m.label}</span>
          <span>${m.player.player_name}</span>
          <strong>${formatNum(m.player[m.key])}</strong>
        </div>
      `
    })
    .join('')
}

function buildOverviewTable(rows) {
  const filtered = rows.filter((r) =>
    String(r.player_name || '').toLowerCase().includes(state.search.toLowerCase())
  )
  const sorted = sortRows(filtered)

  const th = (label, key) => {
    const active = state.sortKey === key
    const arrow = active ? (state.sortAsc ? '↑' : '↓') : '↕'
    return `<th class="detail-sort" data-key="${key}">${label}<span>${arrow}</span></th>`
  }

  return `
    <div class="detail-table-wrap">
      <table class="detail-table">
        <thead>
          <tr>
            <th>#</th>
            ${th('玩家', 'player_name')}
            ${th('職業', 'class_name')}
            ${th('擊敗', 'kills')}
            ${th('助攻', 'assists')}
            ${th('輸出', 'pvp_damage')}
            ${th('塔傷', 'tower_damage')}
            ${th('治療', 'healing_done')}
            ${th('承傷', 'damage_taken')}
          </tr>
        </thead>
        <tbody>
          ${
            sorted.length
              ? sorted
                  .map(
                    (r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${r.player_name || '—'}</td>
                  <td>${r.class_name || '—'}</td>
                  <td>${formatNum(r.kills)}</td>
                  <td>${formatNum(r.assists)}</td>
                  <td>${formatNum(r.pvp_damage)}</td>
                  <td>${formatNum(r.tower_damage)}</td>
                  <td>${formatNum(r.healing_done)}</td>
                  <td>${formatNum(r.damage_taken)}</td>
                </tr>
              `
                  )
                  .join('')
              : '<tr><td colspan="9" class="detail-empty">無符合資料</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `
}

function renderBarChart(items, unit = '') {
  if (!items.length) return '<div class="detail-empty">尚無資料</div>'
  const maxValue = Math.max(...items.map((i) => i.value), 1)
  return `
    <div class="detail-chart-list">
      ${items
        .map((item) => {
          const width = Math.max(4, Math.round((item.value / maxValue) * 100))
          return `
            <div class="detail-chart-row">
              <span>${item.label}</span>
              <div class="detail-chart-bar-wrap"><div class="detail-chart-bar" style="width:${width}%"></div></div>
              <span>${formatNum(item.value)}${unit}</span>
            </div>
          `
        })
        .join('')}
    </div>
  `
}

function buildCharts(rows) {
  const guildMap = new Map()
  const classMap = new Map()
  for (const r of rows) {
    guildMap.set(r.guild_name || '未知', (guildMap.get(r.guild_name || '未知') || 0) + (r.kills || 0) + (r.assists || 0))
    classMap.set(r.class_name || '未知', (classMap.get(r.class_name || '未知') || 0) + 1)
  }

  const guildItems = Array.from(guildMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
  const classItems = Array.from(classMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  return `
    <div class="detail-grid-2">
      <div class="detail-panel">
        <h3>幫會戰績排行（擊敗+助攻）</h3>
        ${renderBarChart(guildItems)}
      </div>
      <div class="detail-panel">
        <h3>職業分佈（參戰人次）</h3>
        ${renderBarChart(classItems, '人')}
      </div>
    </div>
  `
}

function renderContent() {
  const rows = state.grouped[state.view]
  const summary = `
    <div class="detail-summary">
      <div class="detail-summary-box">玩家數：<strong>${rows.length}</strong></div>
      <div class="detail-summary-box">總擊敗：<strong>${formatNum(rows.reduce((s, r) => s + (r.kills || 0), 0))}</strong></div>
      <div class="detail-summary-box">總助攻：<strong>${formatNum(rows.reduce((s, r) => s + (r.assists || 0), 0))}</strong></div>
    </div>
  `

  if (state.tab === 'charts') {
    detailContentEl.innerHTML = `${summary}${buildCharts(rows)}`
  } else {
    detailContentEl.innerHTML = `${summary}${buildOverviewTable(rows)}`
  }
}

function renderHeader() {
  const league = state.league
  const guildA = league.guild_a || '我方'
  const guildB = league.guild_b || '對方'
  detailVsLineEl.textContent = `${guildA} VS ${guildB}`
  detailMetaLineEl.textContent = `${league.match_date} ・ 第 ${league.round_no} 場`
  leagueTitleEl.textContent = `${guildA} vs ${guildB}`
}

function handleSortClick(event) {
  const th = event.target.closest('.detail-sort')
  if (!th) return
  const key = th.dataset.key
  if (!key) return
  if (state.sortKey === key) {
    state.sortAsc = !state.sortAsc
  } else {
    state.sortKey = key
    state.sortAsc = false
  }
  renderContent()
}

function wireEvents() {
  logoutBtn?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatus(error.message, true)
      return
    }
    window.location.replace('./login.html')
  })

  viewBtnA?.addEventListener('click', () => {
    state.view = 'a'
    viewBtnA.classList.add('active')
    viewBtnB.classList.remove('active')
    renderMvp()
    renderContent()
  })

  viewBtnB?.addEventListener('click', () => {
    state.view = 'b'
    viewBtnB.classList.add('active')
    viewBtnA.classList.remove('active')
    renderMvp()
    renderContent()
  })

  tabsEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('.detail-tab')
    if (!btn) return
    const tab = btn.dataset.tab
    if (!tab) return
    state.tab = tab
    tabsEl.querySelectorAll('.detail-tab').forEach((el) => el.classList.remove('active'))
    btn.classList.add('active')
    renderContent()
  })

  searchEl?.addEventListener('input', (event) => {
    state.search = event.target.value || ''
    renderContent()
  })

  detailContentEl?.addEventListener('click', handleSortClick)
}

async function requireAuth() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    window.location.replace('./login.html')
    return null
  }
  return data.user
}

function splitByGuild(records, league) {
  const a = records.filter((r) => r.guild_name === league.guild_a)
  const b = records.filter((r) => r.guild_name === league.guild_b)
  return { a, b }
}

async function loadDetail() {
  const params = new URLSearchParams(window.location.search)
  const leagueId = params.get('leagueId')
  if (!leagueId) {
    setStatus('缺少 leagueId 參數。', true)
    return
  }

  const { data: league, error: leagueError } = await supabase
    .from('guild_leagues')
    .select('id, match_date, round_no, guild_a, guild_b')
    .eq('id', leagueId)
    .single()

  if (leagueError || !league) {
    setStatus('讀取聯賽失敗。', true)
    return
  }

  const { data: records, error: recordError } = await supabase
    .from('personal_records')
    .select('guild_name, player_name, class_name, kills, assists, pvp_damage, tower_damage, healing_done, damage_taken')
    .eq('league_id', leagueId)

  if (recordError) {
    setStatus(recordError.message, true)
    return
  }

  state.league = league
  state.records = records || []
  state.grouped = splitByGuild(state.records, league)

  renderHeader()
  renderMvp()
  renderContent()
  setStatus('聯賽細節已更新。')
}

async function bootstrap() {
  const user = await requireAuth()
  if (!user) return
  wireEvents()
  await loadDetail()
}

bootstrap()
