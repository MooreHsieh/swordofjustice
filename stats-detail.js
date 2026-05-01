import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const detailVsLineEl = document.querySelector('#detailVsLine')
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
  if (!statusEl) return
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
    { icon: '🔥', label: '輸出王', key: 'damage_to_players' },
    { icon: '🏰', label: '塔傷王', key: 'damage_to_buildings' },
    { icon: '🛡', label: '承傷王', key: 'damage_taken' },
    { icon: '💚', label: '治療王', key: 'healing' },
    { icon: '💀', label: '重傷王', key: 'serious_injuries' },
    { icon: '🕊', label: '化羽王', key: 'feather_spring' },
    { icon: '🔥', label: '焚骨王', key: 'burning_bone' },
    { icon: '💎', label: '資源王', key: 'resources' },
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
            ${th('輸出', 'damage_to_players')}
            ${th('塔傷', 'damage_to_buildings')}
            ${th('治療', 'healing')}
            ${th('承傷', 'damage_taken')}
            ${th('重傷', 'serious_injuries')}
            ${th('化羽', 'feather_spring')}
            ${th('焚骨', 'burning_bone')}
            ${th('資源', 'resources')}
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
                  <td>${formatNum(r.damage_to_players)}</td>
                  <td>${formatNum(r.damage_to_buildings)}</td>
                  <td>${formatNum(r.healing)}</td>
                  <td>${formatNum(r.damage_taken)}</td>
                  <td>${formatNum(r.serious_injuries)}</td>
                  <td>${formatNum(r.feather_spring)}</td>
                  <td>${formatNum(r.burning_bone)}</td>
                  <td>${formatNum(r.resources)}</td>
                </tr>
              `
                  )
                  .join('')
              : '<tr><td colspan="13" class="detail-empty">無符合資料</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `
}

function tableHeader(label, key) {
  if (!key) return `<th>${label}</th>`
  const active = state.sortKey === key
  const arrow = active ? (state.sortAsc ? '↑' : '↓') : '↕'
  return `<th class="detail-sort" data-key="${key}">${label}<span>${arrow}</span></th>`
}

function buildTable(columns, rows) {
  const body = rows.length
    ? rows.map((row, idx) => `
      <tr>
        ${columns.map((col) => `<td>${col.render ? col.render(row, idx) : formatNum(row[col.key])}</td>`).join('')}
      </tr>
    `).join('')
    : `<tr><td colspan="${columns.length}" class="detail-empty">無符合資料</td></tr>`

  return `
    <div class="detail-table-wrap">
      <table class="detail-table">
        <thead><tr>${columns.map((col) => tableHeader(col.label, col.sortKey)).join('')}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}

function buildClassSummaryTable(rows) {
  const byClass = new Map()
  for (const r of rows) {
    const cls = r.class_name || '未知'
    if (!byClass.has(cls)) byClass.set(cls, { class_name: cls, players: 0, kills: 0, assists: 0, damage_to_players: 0, healing: 0 })
    const agg = byClass.get(cls)
    agg.players += 1
    agg.kills += Number(r.kills || 0)
    agg.assists += Number(r.assists || 0)
    agg.damage_to_players += Number(r.damage_to_players || 0)
    agg.healing += Number(r.healing || 0)
  }
  const classRows = [...byClass.values()].sort((a, b) => b.damage_to_players - a.damage_to_players)
  return `
    <div class="detail-summary-box" style="margin-bottom:10px">職業分佈：${classRows.map((r) => `${r.class_name} ${r.players}人`).join(' ・ ') || '—'}</div>
    ${buildTable([
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name },
      { label: '人數', sortKey: null, render: (r) => formatNum(r.players) },
      { label: '總擊敗', sortKey: null, render: (r) => formatNum(r.kills) },
      { label: '總助攻', sortKey: null, render: (r) => formatNum(r.assists) },
      { label: '總輸出', sortKey: null, render: (r) => formatNum(r.damage_to_players) },
      { label: '總治療', sortKey: null, render: (r) => formatNum(r.healing) }
    ], classRows)}
  `
}

function renderContent() {
  const rawRows = state.grouped[state.view]
  const filteredRows = rawRows.filter((r) =>
    String(r.player_name || '').toLowerCase().includes(state.search.toLowerCase())
  )
  const rows = sortRows(filteredRows)
  const summary = `
    <div class="detail-summary">
      <div class="detail-summary-box">玩家數：<strong>${rows.length}</strong></div>
      <div class="detail-summary-box">總擊敗：<strong>${formatNum(rows.reduce((s, r) => s + Number(r.kills || 0), 0))}</strong></div>
      <div class="detail-summary-box">總助攻：<strong>${formatNum(rows.reduce((s, r) => s + Number(r.assists || 0), 0))}</strong></div>
      <div class="detail-summary-box">總重傷：<strong>${formatNum(rows.reduce((s, r) => s + Number(r.serious_injuries || 0), 0))}</strong></div>
      <div class="detail-summary-box">總化羽：<strong>${formatNum(rows.reduce((s, r) => s + Number(r.feather_spring || 0), 0))}</strong></div>
      <div class="detail-summary-box">總焚骨：<strong>${formatNum(rows.reduce((s, r) => s + Number(r.burning_bone || 0), 0))}</strong></div>
    </div>
  `

  const tab = state.tab
  if (tab === 'overview') {
    detailContentEl.innerHTML = `${summary}${buildOverviewTable(rows)}`
    return
  }

  if (tab === 'job') {
    detailContentEl.innerHTML = `${summary}${buildClassSummaryTable(rows)}`
    return
  }

  if (tab === 'kill') {
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '擊敗', sortKey: 'kills', render: (r) => formatNum(r.kills) },
      { label: '助攻', sortKey: 'assists', render: (r) => formatNum(r.assists) },
      { label: 'K+A', sortKey: null, render: (r) => formatNum(Number(r.kills || 0) + Number(r.assists || 0)) },
      { label: '資源', sortKey: 'resources', render: (r) => formatNum(r.resources) }
    ], rows)}`
    return
  }

  if (tab === 'dmg') {
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '輸出', sortKey: 'damage_to_players', render: (r) => formatNum(r.damage_to_players) },
      { label: '塔傷', sortKey: 'damage_to_buildings', render: (r) => formatNum(r.damage_to_buildings) }
    ], rows)}`
    return
  }

  if (tab === 'eff') {
    const effRows = rows.map((r) => ({
      ...r,
      kill_eff: Number(r.kills || 0) > 0 ? Number(r.damage_to_players || 0) / Number(r.kills || 0) : 0
    }))
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '擊殺效率', sortKey: 'kill_eff', render: (r) => r.kill_eff ? formatNum(Math.round(r.kill_eff)) : '—' },
      { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) }
    ], sortRows(effRows))}`
    return
  }

  if (tab === 'heal') {
    const healRows = rows.map((r) => ({ ...r, net_heal: Number(r.healing || 0) - Number(r.damage_taken || 0) }))
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
      { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
      { label: '淨奶量', sortKey: 'net_heal', render: (r) => formatNum(r.net_heal) }
    ], sortRows(healRows))}`
    return
  }

  if (tab === 'heavy') {
    const heavyRows = rows.map((r) => ({ ...r, rescue_diff: Number(r.feather_spring || 0) - Number(r.serious_injuries || 0) }))
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) },
      { label: '救援差', sortKey: 'rescue_diff', render: (r) => formatNum(r.rescue_diff) }
    ], sortRows(heavyRows))}`
    return
  }

  if (tab === 'bone') {
    const boneRows = rows.filter((r) => Number(r.burning_bone || 0) > 0)
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '焚骨', sortKey: 'burning_bone', render: (r) => formatNum(r.burning_bone) }
    ], sortRows(boneRows))}`
    return
  }

  if (tab === 'suwen') {
    const suwenRows = rows
      .filter((r) => r.class_name === '素問')
      .map((r) => ({ ...r, rescue_diff: Number(r.feather_spring || 0) - Number(r.serious_injuries || 0) }))
    detailContentEl.innerHTML = `${summary}${buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '助攻', sortKey: 'assists', render: (r) => formatNum(r.assists) },
      { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
      { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
      { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) },
      { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      { label: '救援差', sortKey: 'rescue_diff', render: (r) => formatNum(r.rescue_diff) }
    ], sortRows(suwenRows))}`
    return
  }

  if (tab === 'radar' || tab === 'heatmap' || tab === 'quadrant' || tab === 'cquadrant') {
    detailContentEl.innerHTML = `${summary}${buildClassSummaryTable(rows)}`
    return
  }
}

function renderHeader() {
  const league = state.league
  const guildA = league.guild_a || '我方'
  const guildB = league.guild_b || '對方'
  detailVsLineEl.textContent = `${guildA} VS ${guildB}　${league.match_date} ・ 第 ${league.round_no} 場`
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
    .select('guild_name, player_name, class_name, kills, assists, resources, damage_to_players, damage_to_buildings, healing, damage_taken, serious_injuries, feather_spring, burning_bone')
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
