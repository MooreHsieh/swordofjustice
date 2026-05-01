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
  jobFilter: 'all',
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

function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
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
  const svg = {
    kills: '<svg viewBox="0 0 20 20" fill="none"><path d="m4 16 5.5-5.5"/><path d="m9.5 10.5 2-2"/><path d="m11.5 8.5 2-2"/><path d="m13.5 6.5 2-2"/><path d="M5 6l9 9"/></svg>',
    assists: '<svg viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5"/><circle cx="13" cy="13" r="2.5"/><path d="M8.8 8.8 11.2 11.2"/></svg>',
    damage_to_players: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3c1.2 2 .7 3.3-.1 4.4-.5.7-.8 1.4-.4 2.3.5 1.1 1.7 1.7 2.6 2.8.9 1.2 1.2 2.9.2 4.5"/><path d="M8.5 8.5c-1.6 1-3 2.3-3 4.5A4.5 4.5 0 0 0 10 17.5"/></svg>',
    damage_to_buildings: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 17h12"/><path d="M6 17V8l4-3 4 3v9"/><path d="M9 11h2M9 14h2"/></svg>',
    damage_taken: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3 5 5v4c0 3.8 2.2 6.2 5 8 2.8-1.8 5-4.2 5-8V5l-5-2Z"/></svg>',
    healing: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 16.8 4.6 11.6a3.6 3.6 0 0 1 5.1-5l.3.3.3-.3a3.6 3.6 0 1 1 5.1 5Z"/></svg>',
    serious_injuries: '<svg viewBox="0 0 20 20" fill="none"><path d="M6 16.5h8"/><path d="M7.2 14.5 10 12.2l2.8 2.3"/><path d="M8 8.5a2 2 0 1 1 4 0c0 1.3-.8 2-2 2s-2-.7-2-2Z"/></svg>',
    feather_spring: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 12c5.5 0 7.5-3 12-8-1 6-4 11-10 11-1.2 0-2-.9-2-3Z"/></svg>',
    burning_bone: '<svg viewBox="0 0 20 20" fill="none"><path d="M6.5 6.5a1.8 1.8 0 1 1 2.6-2.6l5.4 5.4a1.8 1.8 0 1 1-2.6 2.6Z"/><path d="M5 9.5a1.6 1.6 0 1 1-2.3-2.3M15 10.5a1.6 1.6 0 1 0 2.3 2.3"/></svg>',
    resources: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3 4 6l6 3 6-3-6-3Z"/><path d="m4 10 6 3 6-3"/><path d="m4 14 6 3 6-3"/></svg>'
  }
  return [
    { icon: svg.kills, label: '擊殺王', key: 'kills' },
    { icon: svg.assists, label: '助攻王', key: 'assists' },
    { icon: svg.damage_to_players, label: '輸出王', key: 'damage_to_players' },
    { icon: svg.damage_to_buildings, label: '塔傷王', key: 'damage_to_buildings' },
    { icon: svg.damage_taken, label: '承傷王', key: 'damage_taken' },
    { icon: svg.healing, label: '治療王', key: 'healing' },
    { icon: svg.serious_injuries, label: '重傷王', key: 'serious_injuries' },
    { icon: svg.feather_spring, label: '化羽王', key: 'feather_spring' },
    { icon: svg.burning_bone, label: '焚骨王', key: 'burning_bone' },
    { icon: svg.resources, label: '資源王', key: 'resources' },
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
          <span class="mvp-col mvp-col-label"><span class="mvp-ic">${m.icon}</span>${m.label}</span>
          <div class="mvp-row2">
            <span class="mvp-col mvp-col-name">${m.player.player_name}</span>
            <strong class="mvp-col mvp-col-val">${formatNum(m.player[m.key])}</strong>
          </div>
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

function buildJobTab(rows) {
  const classCount = new Map()
  for (const r of rows) {
    const cls = r.class_name || '未知'
    classCount.set(cls, (classCount.get(cls) || 0) + 1)
  }

  const classes = [...classCount.keys()].sort((a, b) => classCount.get(b) - classCount.get(a))
  const filter = state.jobFilter || 'all'
  const filteredRows = filter === 'all' ? rows : rows.filter((r) => (r.class_name || '未知') === filter)

  const metrics = ['kills', 'damage_to_players', 'damage_to_buildings', 'healing', 'damage_taken', 'serious_injuries']
  const labels = ['擊殺', '輸出', '塔傷', '治療', '承傷', '重傷']
  const classAgg = new Map()
  for (const cls of classes) {
    const group = rows.filter((r) => (r.class_name || '未知') === cls)
    const agg = { count: group.length }
    for (const m of metrics) agg[m] = group.reduce((s, r) => s + Number(r[m] || 0), 0) / Math.max(group.length, 1)
    classAgg.set(cls, agg)
  }
  const maxByMetric = Object.fromEntries(metrics.map((m) => [m, Math.max(...classes.map((c) => classAgg.get(c)[m]), 1)]))
  const buildRadar = (cls) => {
    const n = metrics.length
    const cx = 54
    const cy = 54
    const r = 34
    const pts = metrics.map((m, i) => {
      const v = classAgg.get(cls)[m] / maxByMetric[m]
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n
      return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]
    })
    const ring = [0.33, 0.66, 1].map((s) => {
      const gp = Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / n
        return `${cx + Math.cos(a) * r * s},${cy + Math.sin(a) * r * s}`
      }).join(' ')
      return `<polygon points="${gp}" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="0.8"/>`
    }).join('')
    const spokes = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n
      return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * r}" y2="${cy + Math.sin(a) * r}" stroke="rgba(255,255,255,0.08)" stroke-width="0.8"/>`
    }).join('')
    const poly = `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="rgba(201,168,76,0.2)" stroke="rgba(201,168,76,0.9)" stroke-width="1.2"/>`
    return `<svg viewBox="0 0 108 108" aria-hidden="true">${ring}${spokes}${poly}</svg>`
  }

  const radarBar = `
    <div class="job-radar-row">
      <button class="job-filter-btn ${filter === 'all' ? 'active' : ''}" data-job-filter="all">
        全部 <span class="job-filter-count">${rows.length}</span>
      </button>
      ${classes.map((cls) => `
        <button class="job-radar-card ${filter === cls ? 'active' : ''}" data-job-filter="${cls}" title="${cls}">
          <div class="job-radar-head">${cls} <span>${classCount.get(cls)}人</span></div>
          ${buildRadar(cls)}
        </button>
      `).join('')}
    </div>
    <div class="job-radar-legend">${labels.join(' / ')}（各職業相對值）</div>
  `

  const table = buildTable([
    { label: '#', sortKey: null, render: (_, i) => i + 1 },
    { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
    { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
    { label: '擊敗', sortKey: 'kills', render: (r) => formatNum(r.kills) },
    { label: '助攻', sortKey: 'assists', render: (r) => formatNum(r.assists) },
    { label: '輸出', sortKey: 'damage_to_players', render: (r) => formatNum(r.damage_to_players) },
    { label: '塔傷', sortKey: 'damage_to_buildings', render: (r) => formatNum(r.damage_to_buildings) },
    { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
    { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) }
  ], filteredRows)

  return `${radarBar}${table}`
}

function renderContent() {
  const rawRows = state.grouped[state.view]
  const filteredRows = rawRows.filter((r) =>
    String(r.player_name || '').toLowerCase().includes(state.search.toLowerCase())
  )
  const rows = sortRows(filteredRows)

  const tab = state.tab
  if (tab === 'overview') {
    detailContentEl.innerHTML = buildOverviewTable(rows)
    return
  }

  if (tab === 'job') {
    detailContentEl.innerHTML = buildJobTab(rows)
    return
  }

  if (tab === 'dmg') {
    const totalDmg = rows.reduce((s, r) => s + Number(r.damage_to_players || 0), 0) || 1
    const totalKills = rows.reduce((s, r) => s + Number(r.kills || 0), 0) || 1
    const dmgRows = rows.map((r) => ({
      ...r,
      dmg_pct: Number(r.damage_to_players || 0) / totalDmg,
      kill_pct: Number(r.kills || 0) / totalKills,
      kill_eff: Number(r.kills || 0) > 0 ? Number(r.damage_to_players || 0) / Number(r.kills || 0) : 0
    }))

    detailContentEl.innerHTML = buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '人傷', sortKey: 'damage_to_players', render: (r) => formatNum(r.damage_to_players) },
      { label: '人傷佔比', sortKey: 'dmg_pct', render: (r) => formatPct(r.dmg_pct) },
      { label: '擊殺', sortKey: 'kills', render: (r) => formatNum(r.kills) },
      { label: '擊殺佔比', sortKey: 'kill_pct', render: (r) => formatPct(r.kill_pct) },
      { label: '傷害/擊殺', sortKey: 'kill_eff', render: (r) => r.kill_eff ? formatNum(Math.round(r.kill_eff)) : '—' }
    ], sortRows(dmgRows))
    return
  }

  if (tab === 'eff') {
    const totalBld = rows.reduce((s, r) => s + Number(r.damage_to_buildings || 0), 0) || 1
    const effRows = rows.map((r) => ({ ...r, bld_pct: Number(r.damage_to_buildings || 0) / totalBld }))
    detailContentEl.innerHTML = buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '塔傷', sortKey: 'damage_to_buildings', render: (r) => formatNum(r.damage_to_buildings) },
      { label: '塔傷佔比', sortKey: 'bld_pct', render: (r) => formatPct(r.bld_pct) }
    ], sortRows(effRows))
    return
  }

  if (tab === 'heal') {
    const healRows = rows.map((r) => ({ ...r, net_heal: Number(r.healing || 0) - Number(r.damage_taken || 0) }))
    detailContentEl.innerHTML = buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
      { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
      { label: '淨奶量', sortKey: 'net_heal', render: (r) => formatNum(r.net_heal) }
    ], sortRows(healRows))
    return
  }

  if (tab === 'heavy') {
    const heavyRows = rows.map((r) => ({ ...r, rescue_diff: Number(r.feather_spring || 0) - Number(r.serious_injuries || 0) }))
    detailContentEl.innerHTML = buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) },
      { label: '救援差', sortKey: 'rescue_diff', render: (r) => formatNum(r.rescue_diff) }
    ], sortRows(heavyRows))
    return
  }

  if (tab === 'bone') {
    const boneRows = rows.filter((r) => Number(r.burning_bone || 0) > 0)
    detailContentEl.innerHTML = buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '焚骨', sortKey: 'burning_bone', render: (r) => formatNum(r.burning_bone) }
    ], sortRows(boneRows))
    return
  }

  if (tab === 'suwen') {
    const suwenRows = rows
      .filter((r) => r.class_name === '素問')
      .map((r) => ({ ...r, rescue_diff: Number(r.feather_spring || 0) - Number(r.serious_injuries || 0) }))
    detailContentEl.innerHTML = buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '助攻', sortKey: 'assists', render: (r) => formatNum(r.assists) },
      { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
      { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
      { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) },
      { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      { label: '救援差', sortKey: 'rescue_diff', render: (r) => formatNum(r.rescue_diff) }
    ], sortRows(suwenRows))
    return
  }

  if (tab === 'heatmap' || tab === 'quadrant' || tab === 'cquadrant') {
    detailContentEl.innerHTML = buildClassSummaryTable(rows)
    return
  }
}

function renderHeader() {
  const league = state.league
  const guildA = league.guild_a || '我方'
  const guildB = league.guild_b || '對方'
  const crownSvg = '<svg viewBox="0 0 20 20" fill="none"><path d="M3 15h14l-1.2-7-3.5 2.7L10 5.5 7.7 10.7 4.2 8 3 15Z"/><path d="M4 17h12"/></svg>'
  const aWin = league.result === 'our_win'
  const bWin = league.result === 'enemy_win'
  const aName = `${guildA}${aWin ? `<span class="vs-win-crown" title="勝利">${crownSvg}</span>` : ''}`
  const bName = `${guildB}${bWin ? `<span class="vs-win-crown" title="勝利">${crownSvg}</span>` : ''}`
  const aCount = Number(league.guild_a_players || state.grouped.a.length || 0)
  const bCount = Number(league.guild_b_players || state.grouped.b.length || 0)
  detailVsLineEl.innerHTML = `${aName} <span class="vs-divider">VS</span> ${bName}　<span class="vs-count">(${aCount} vs ${bCount})</span>　${league.match_date} ・ 第 ${league.round_no} 場`
  if (viewBtnA) viewBtnA.textContent = `🔵 ${guildA}`
  if (viewBtnB) viewBtnB.textContent = `🔴 ${guildB}`
}

function handleSortClick(event) {
  const jobBtn = event.target.closest('[data-job-filter]')
  if (jobBtn) {
    state.jobFilter = jobBtn.dataset.jobFilter || 'all'
    renderContent()
    return
  }

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
    .select('id, match_date, round_no, guild_a, guild_b, guild_a_players, guild_b_players, result')
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
