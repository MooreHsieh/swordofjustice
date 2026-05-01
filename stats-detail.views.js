import { JOB_ORDER, JOB_CLR, CQ_AXES } from './stats-detail.const.js'
import { formatNum, formatPct, escapeHtml, sortRows } from './stats-detail.utils.js'

export function buildSidebarCompareHtml(grouped, league) {
  const aRows = grouped.a || []
  const bRows = grouped.b || []
  const guildA = league?.guild_a || '我方'
  const guildB = league?.guild_b || '對方'
  const metrics = [
    { key: 'kills', label: '擊殺' },
    { key: 'damage_to_players', label: '人傷' },
    { key: 'damage_to_buildings', label: '塔傷' },
    { key: 'serious_injuries', label: '重傷' },
    { key: 'damage_taken', label: '承傷' },
    { key: 'healing', label: '治療' },
    { key: 'feather_spring', label: '化羽' },
    { key: 'burning_bone', label: '焚骨' },
  ]
  const sumBy = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0)
  const aVals = metrics.map((m) => sumBy(aRows, m.key))
  const bVals = metrics.map((m) => sumBy(bRows, m.key))
  const maxVals = metrics.map((_, i) => Math.max(aVals[i], bVals[i], 1))

  const n = metrics.length
  const cx = 165
  const cy = 152
  const r = 108
  const toPoint = (idx, scale) => {
    const a = -Math.PI / 2 + (idx * Math.PI * 2) / n
    return [cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale]
  }
  const ring = [0.25, 0.5, 0.75, 1].map((s) => {
    const pts = Array.from({ length: n }, (_, i) => toPoint(i, s)).map((p) => p.join(',')).join(' ')
    return `<polygon points="${pts}" fill="none" stroke="rgba(201,168,76,0.12)" stroke-width="1"/>`
  }).join('')
  const spokes = Array.from({ length: n }, (_, i) => {
    const p = toPoint(i, 1)
    return `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="rgba(201,168,76,0.18)" stroke-width="1"/>`
  }).join('')

  const mkPoly = (vals, stroke, fill) => {
    const pts = vals.map((v, i) => toPoint(i, v / maxVals[i])).map((p) => p.join(',')).join(' ')
    const dots = vals.map((v, i) => toPoint(i, v / maxVals[i])).map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${stroke}"/>`).join('')
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>${dots}`
  }
  const labels = metrics.map((m, i) => {
    const p = toPoint(i, 1.17)
    return `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="middle" fill="#9fb1c6" font-size="10">${m.label}</text>`
  }).join('')
  const radarSvg = `
    <svg width="330" height="310" viewBox="0 0 330 310" class="sb-compare-radar">
      ${ring}${spokes}
      ${mkPoly(aVals, '#4fc3f7', 'rgba(79,195,247,0.16)')}
      ${mkPoly(bVals, '#ef5350', 'rgba(239,83,80,0.14)')}
      ${labels}
    </svg>
  `

  const classA = new Map()
  const classB = new Map()
  for (const r of aRows) classA.set(r.class_name || '未知', (classA.get(r.class_name || '未知') || 0) + 1)
  for (const r of bRows) classB.set(r.class_name || '未知', (classB.get(r.class_name || '未知') || 0) + 1)
  const classes = JOB_ORDER.filter((j) => classA.has(j) || classB.has(j))
  const maxCount = Math.max(...classes.map((j) => Math.max(classA.get(j) || 0, classB.get(j) || 0)), 1)
  const lineupRows = classes.map((job) => {
    const a = classA.get(job) || 0
    const b = classB.get(job) || 0
    const aW = Math.round((a / maxCount) * 42)
    const bW = Math.round((b / maxCount) * 42)
    const c = JOB_CLR[job] || '#c9a84c'
    return `
      <div class="sb-lineup-row">
        <span class="sb-lineup-num a">${a || ''}</span>
        <span class="sb-lineup-bar a" style="width:${aW}px;background:${c}"></span>
        <span class="sb-lineup-job" style="color:${c}">${job}</span>
        <span class="sb-lineup-bar b" style="width:${bW}px;background:${c}"></span>
        <span class="sb-lineup-num b">${b || ''}</span>
      </div>
    `
  }).join('')

  return `
    <div class="detail-compare-box">
      <div class="detail-compare-title">⚖ 比較</div>
      <div class="sb-compare-legend">
        <span class="a">🔵 ${escapeHtml(guildA)}</span>
        <span class="b">🔴 ${escapeHtml(guildB)}</span>
      </div>
      <div class="sb-compare-block">
        <div class="sb-compare-subtitle">數據雷達圖</div>
        ${radarSvg}
      </div>
      <div class="sb-compare-block">
        <div class="sb-compare-subtitle">陣容對比</div>
        <div class="sb-lineup-wrap">${lineupRows || '<div class="detail-empty">無陣容資料</div>'}</div>
      </div>
    </div>
  `
}

// 計算左側 MVP（各指標取最大值）
export function computeMvp(rows, sortKey = 'kills', sortAsc = false) {
  const topBy = (key) => sortRows(rows, sortKey, sortAsc).sort((a, b) => (b[key] || 0) - (a[key] || 0))[0]
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
    { icon: svg.damage_to_players, label: '人傷王', key: 'damage_to_players' },
    { icon: svg.damage_to_buildings, label: '塔傷王', key: 'damage_to_buildings' },
    { icon: svg.damage_taken, label: '承傷王', key: 'damage_taken' },
    { icon: svg.healing, label: '治療王', key: 'healing' },
    { icon: svg.serious_injuries, label: '重傷王', key: 'serious_injuries' },
    { icon: svg.feather_spring, label: '化羽王', key: 'feather_spring' },
    { icon: svg.burning_bone, label: '焚骨王', key: 'burning_bone' },
    { icon: svg.resources, label: '資源王', key: 'resources' },
  ].map((item) => ({ ...item, player: topBy(item.key) }))
}

export function renderMvpHtml(mvp, league, enemyGuild) {
  return mvp
    .map((m) => {
      if (!m.player) return ''
      const isEnemy = m.player.guild_name && league && m.player.guild_name === enemyGuild
      return `
        <div class="detail-mvp-item ${isEnemy ? 'enemy' : ''}">
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

function tableHeader(label, key, state) {
  if (!key) return `<th>${label}</th>`
  const active = state.sortKey === key
  const arrow = active ? (state.sortAsc ? '↑' : '↓') : '↕'
  return `<th class="detail-sort" data-key="${key}">${label}<span>${arrow}</span></th>`
}

function buildTable(columns, rows, state) {
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
        <thead><tr>${columns.map((col) => tableHeader(col.label, col.sortKey, state)).join('')}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}

function buildSuwenQuadrant(rows) {
  if (!rows.length) return ''
  const W = 560, H = 360, PL = 64, PR = 24, PT = 24, PB = 54
  const pw = W - PL - PR, ph = H - PT - PB
  const maxX = Math.max(...rows.map((r) => Number(r.damage_taken || 0)), 1)
  const maxY = Math.max(...rows.map((r) => Number(r.healing || 0)), 1)
  const sx = (v) => PL + (Number(v || 0) / maxX) * pw
  const sy = (v) => PT + ph - (Number(v || 0) / maxY) * ph
  const midX = PL + pw / 2, midY = PT + ph / 2
  const dots = rows.map((r) => {
    const x = sx(r.damage_taken), y = sy(r.healing)
    const name = String(r.player_name || '').slice(0, 6)
    return `<g><circle cx="${x}" cy="${y}" r="5" fill="rgba(244,143,177,0.88)" stroke="rgba(244,143,177,1)" stroke-width="1"/><text x="${x}" y="${y - 9}" text-anchor="middle" fill="#dce6f2" font-size="10">${name}</text></g>`
  }).join('')
  return `
    <div class="detail-panel" style="margin-bottom:10px;overflow:auto">
      <h3>素問象限</h3>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;min-width:${W}px">
        <rect x="${PL}" y="${PT}" width="${pw / 2}" height="${ph / 2}" fill="rgba(102,187,106,0.05)"/>
        <rect x="${midX}" y="${PT}" width="${pw / 2}" height="${ph / 2}" fill="rgba(255,183,77,0.05)"/>
        <rect x="${PL}" y="${midY}" width="${pw / 2}" height="${ph / 2}" fill="rgba(255,183,77,0.05)"/>
        <rect x="${midX}" y="${midY}" width="${pw / 2}" height="${ph / 2}" fill="rgba(239,83,80,0.05)"/>
        <line x1="${midX}" y1="${PT}" x2="${midX}" y2="${PT + ph}" stroke="rgba(201,168,76,0.2)" stroke-dasharray="4,3"/>
        <line x1="${PL}" y1="${midY}" x2="${PL + pw}" y2="${midY}" stroke="rgba(201,168,76,0.2)" stroke-dasharray="4,3"/>
        <line x1="${PL}" y1="${PT + ph}" x2="${PL + pw}" y2="${PT + ph}" stroke="rgba(201,168,76,0.3)" stroke-width="1"/>
        <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + ph}" stroke="rgba(201,168,76,0.3)" stroke-width="1"/>
        <text x="${PL + pw / 2}" y="${H - 10}" text-anchor="middle" fill="#9fb1c6" font-size="11">承傷（右側較高）</text>
        <text x="14" y="${PT + ph / 2}" text-anchor="middle" fill="#9fb1c6" font-size="11" transform="rotate(-90,14,${PT + ph / 2})">治療（上方較高）</text>
        <text x="${PL + 8}" y="${PT + 16}" fill="rgba(102,187,106,0.7)" font-size="10">高治療低承傷</text>
        <text x="${midX + 8}" y="${PT + 16}" fill="rgba(255,183,77,0.7)" font-size="10">高治療高承傷</text>
        <text x="${PL + 8}" y="${PT + ph - 6}" fill="rgba(255,183,77,0.7)" font-size="10">低治療低承傷</text>
        <text x="${midX + 8}" y="${PT + ph - 6}" fill="rgba(239,83,80,0.7)" font-size="10">低治療高承傷</text>
        ${dots}
      </svg>
    </div>
  `
}

function buildCustomQuadrant(rows, state) {
  const all = rows.map((r) => {
    const kills = Number(r.kills || 0), pvp = Number(r.damage_to_players || 0), heal = Number(r.healing || 0)
    const tank = Number(r.damage_taken || 0), heavy = Number(r.serious_injuries || 0), feather = Number(r.feather_spring || 0)
    return { ...r, kill_eff: kills > 0 ? pvp / kills : 0, net_heal: heal - tank, rescue_diff: feather - heavy }
  })

  const jobsPresent = [...new Set(all.map((r) => r.class_name || '未知'))].sort((a, b) => {
    const ia = JOB_ORDER.indexOf(a), ib = JOB_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  if (!state.cqSettings) {
    state.cqSettings = { xKey: 'damage_to_players', yKey: 'kills', jobs: new Set(jobsPresent), seenJobs: new Set(jobsPresent) }
  } else {
    jobsPresent.forEach((j) => {
      if (!state.cqSettings.seenJobs.has(j)) {
        state.cqSettings.seenJobs.add(j)
        state.cqSettings.jobs.add(j)
      }
    })
  }

  const cq = state.cqSettings
  const hidden = state.cqHiddenByView[state.view] || new Set()
  const xAxis = CQ_AXES.find((a) => a.key === cq.xKey) || CQ_AXES[0]
  const yAxis = CQ_AXES.find((a) => a.key === cq.yKey) || CQ_AXES[7]
  const pts = all.filter((r) => cq.jobs.has(r.class_name || '未知') && !hidden.has(r.player_name || ''))

  const W = 520, H = 380, PL = 64, PR = 24, PT = 24, PB = 54
  const pw = W - PL - PR, ph = H - PT - PB
  const maxX = Math.max(...pts.map((p) => Number(p[cq.xKey] || 0)), 1)
  const maxY = Math.max(...pts.map((p) => Number(p[cq.yKey] || 0)), 1)
  const sx = (v) => PL + (Number(v || 0) / maxX) * pw
  const sy = (v) => PT + ph - (Number(v || 0) / maxY) * ph
  const midX = PL + pw / 2, midY = PT + ph / 2

  const dots = pts.map((p) => {
    const job = p.class_name || '未知', c = JOB_CLR[job] || '#c9a84c'
    const x = sx(p[cq.xKey]), y = sy(p[cq.yKey])
    return `<g><circle cx="${x}" cy="${y}" r="5" fill="${c}" fill-opacity="0.85" stroke="${c}" stroke-width="1"/><text x="${x}" y="${y - 8}" text-anchor="middle" fill="#dce6f2" font-size="9">${escapeHtml(String(p.player_name || '').slice(0, 6))}</text></g>`
  }).join('')

  const xOpts = CQ_AXES.map((a) => `<option value="${a.key}"${a.key === cq.xKey ? ' selected' : ''}>${a.label}</option>`).join('')
  const yOpts = CQ_AXES.map((a) => `<option value="${a.key}"${a.key === cq.yKey ? ' selected' : ''}>${a.label}</option>`).join('')
  const jobBtns = jobsPresent.map((j) => {
    const on = cq.jobs.has(j), c = JOB_CLR[j] || '#c9a84c'
    return `<button class="cq-chip ${on ? 'on' : ''}" data-cq-action="toggle-job" data-cq-job="${escapeHtml(j)}" style="${on ? `--cq-job:${c};` : ''}">${escapeHtml(j)}</button>`
  }).join('')
  const visiblePlayers = all
    .filter((p) => cq.jobs.has(p.class_name || '未知'))
    .sort((a, b) => {
      const aj = a.class_name || '未知'
      const bj = b.class_name || '未知'
      const ai = JOB_ORDER.indexOf(aj)
      const bi = JOB_ORDER.indexOf(bj)
      const jCmp = ((ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi))
      if (jCmp !== 0) return jCmp
      return String(a.player_name || '').localeCompare(String(b.player_name || ''))
    })
  const plBtns = visiblePlayers.map((p) => {
    const key = p.player_name || '', on = !hidden.has(key), c = JOB_CLR[p.class_name || '未知'] || '#c9a84c'
    return `<button class="cq-chip ${on ? 'on' : ''}" data-cq-action="toggle-player" data-cq-player="${encodeURIComponent(key)}" style="${on ? `--cq-job:${c};` : ''}">${escapeHtml(String(key).slice(0, 6))}</button>`
  }).join('')

  return `
    <div class="cq-root">
      <div class="cq-controls">
        <div class="cq-row cq-row-axes">
          <span class="cq-label">↔ X軸</span>
          <select class="cq-select" data-cq-action="set-x">${xOpts}</select>
          <span class="cq-label">↕ Y軸</span>
          <select class="cq-select" data-cq-action="set-y">${yOpts}</select>
        </div>
        <div class="cq-row">
          <span class="cq-label">職業</span>
          <button class="cq-mini-btn" data-cq-action="select-all-jobs">全部選擇</button>
          <button class="cq-mini-btn ghost" data-cq-action="clear-all-jobs">取消選擇</button>
          <div class="cq-chip-wrap">${jobBtns}</div>
        </div>
      </div>
      <div class="cq-wrap">
        <div class="cq-svg">
          <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;min-width:${W}px;background:#111b2a;border:1px solid #253246;border-radius:${visiblePlayers.length ? '4px 0 0 4px' : '4px'}">
            <rect x="${PL}" y="${PT}" width="${pw / 2}" height="${ph / 2}" fill="rgba(102,187,106,0.05)"/>
            <rect x="${midX}" y="${PT}" width="${pw / 2}" height="${ph / 2}" fill="rgba(255,183,77,0.05)"/>
            <rect x="${PL}" y="${midY}" width="${pw / 2}" height="${ph / 2}" fill="rgba(255,183,77,0.05)"/>
            <rect x="${midX}" y="${midY}" width="${pw / 2}" height="${ph / 2}" fill="rgba(239,83,80,0.05)"/>
            <line x1="${midX}" y1="${PT}" x2="${midX}" y2="${PT + ph}" stroke="rgba(201,168,76,0.2)" stroke-dasharray="4,3"/>
            <line x1="${PL}" y1="${midY}" x2="${PL + pw}" y2="${midY}" stroke="rgba(201,168,76,0.2)" stroke-dasharray="4,3"/>
            <line x1="${PL}" y1="${PT + ph}" x2="${PL + pw}" y2="${PT + ph}" stroke="rgba(201,168,76,0.3)" stroke-width="1"/>
            <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + ph}" stroke="rgba(201,168,76,0.3)" stroke-width="1"/>
            <text x="${PL + pw / 2}" y="${H - 8}" text-anchor="middle" fill="#9fb1c6" font-size="11">${xAxis.label}</text>
            <text x="13" y="${PT + ph / 2}" text-anchor="middle" fill="#9fb1c6" font-size="11" transform="rotate(-90,13,${PT + ph / 2})">${yAxis.label}</text>
            <text x="${PL + pw}" y="${PT + ph + 18}" text-anchor="end" fill="rgba(201,168,76,0.45)" font-size="9">max ${formatNum(maxX)}</text>
            <text x="${PL - 4}" y="${PT + 4}" text-anchor="end" fill="rgba(201,168,76,0.45)" font-size="9">max ${formatNum(maxY)}</text>
            <text x="${PL + 6}" y="${PT + 14}" fill="rgba(102,187,106,0.6)" font-size="10">${yAxis.label}高/${xAxis.label}低</text>
            <text x="${PL + pw - 6}" y="${PT + 14}" text-anchor="end" fill="rgba(255,183,77,0.6)" font-size="10">${yAxis.label}高/${xAxis.label}高</text>
            <text x="${PL + 6}" y="${PT + ph - 5}" fill="rgba(255,183,77,0.6)" font-size="10">${yAxis.label}低/${xAxis.label}低</text>
            <text x="${PL + pw - 6}" y="${PT + ph - 5}" text-anchor="end" fill="rgba(239,83,80,0.6)" font-size="10">${yAxis.label}低/${xAxis.label}高</text>
            ${dots}
          </svg>
        </div>
        ${visiblePlayers.length ? `
          <div class="cq-players">
            <div class="cq-row">
              <span class="cq-label">玩家</span>
              <button class="cq-mini-btn" data-cq-action="select-all-players">全部選擇</button>
              <button class="cq-mini-btn ghost" data-cq-action="clear-all-players">取消選擇</button>
            </div>
            <div class="cq-players-list">${plBtns}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

function buildJobTab(rows, state) {
  const classCount = new Map()
  for (const r of rows) {
    const cls = r.class_name || '未知'
    classCount.set(cls, (classCount.get(cls) || 0) + 1)
  }
  const classes = [...classCount.keys()].sort((a, b) => classCount.get(b) - classCount.get(a))
  if (!classes.length) return '<div class="detail-empty">目前沒有職業資料</div>'
  if (!state.jobFilter || !classes.includes(state.jobFilter)) state.jobFilter = classes[0]
  const filter = state.jobFilter
  const filteredRows = rows.filter((r) => (r.class_name || '未知') === filter)

  const metrics = ['kills', 'damage_to_players', 'damage_to_buildings', 'serious_injuries', 'damage_taken', 'healing', 'feather_spring', 'burning_bone']
  const labels = ['擊殺', '人傷', '塔傷', '重傷', '承傷', '治療', '化羽', '焚骨']
  const classAgg = new Map()
  for (const cls of classes) {
    const group = rows.filter((r) => (r.class_name || '未知') === cls)
    const agg = { count: group.length }
    for (const m of metrics) agg[m] = group.reduce((s, r) => s + Number(r[m] || 0), 0) / Math.max(group.length, 1)
    classAgg.set(cls, agg)
  }
  const maxByMetric = Object.fromEntries(metrics.map((m) => [m, Math.max(...classes.map((c) => classAgg.get(c)[m]), 1)]))
  const buildRadar = (cls) => {
    const n = metrics.length, cx = 110, cy = 100, r = 70
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
      return `<polygon points="${gp}" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>`
    }).join('')
    const spokes = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n
      return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * r}" y2="${cy + Math.sin(a) * r}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`
    }).join('')
    const labelsSvg = labels.map((label, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n
      const x = cx + Math.cos(a) * (r + 18), y = cy + Math.sin(a) * (r + 18)
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#93a4b7" font-size="10">${label}</text>`
    }).join('')
    const poly = `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="rgba(201,168,76,0.2)" stroke="rgba(201,168,76,0.9)" stroke-width="1.6"/>`
    const dots = pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.8" fill="rgba(201,168,76,0.95)"/>`).join('')
    return `<svg viewBox="0 0 220 200" aria-hidden="true">${ring}${spokes}${poly}${dots}${labelsSvg}</svg>`
  }

  const radarBar = `
    <div class="job-radar-row">
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
    { label: '擊殺', sortKey: 'kills', render: (r) => formatNum(r.kills) },
    { label: '人傷', sortKey: 'damage_to_players', render: (r) => formatNum(r.damage_to_players) },
    { label: '塔傷', sortKey: 'damage_to_buildings', render: (r) => formatNum(r.damage_to_buildings) },
    { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
    { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
    { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
    { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) },
    { label: '焚骨', sortKey: 'burning_bone', render: (r) => formatNum(r.burning_bone) },
  ], filteredRows, state)

  return `${radarBar}${table}`
}

// 總覽頁：依各欄位相對最大值套用柔和熱力底色（提升可讀性，不做強烈對比）
function buildOverviewHeatCell(value, maxValue) {
  const num = Number(value || 0)
  const max = Number(maxValue || 0)
  if (!num || !max) return `<td>${formatNum(num)}</td>`
  const ratio = Math.min(num / max, 1)
  // 透明度壓低，避免像強熱力圖那樣刺眼
  const alpha = (0.04 + ratio * 0.1).toFixed(3)
  return `<td class="overview-heat-cell" style="--ov-heat-alpha:${alpha}">${formatNum(num)}</td>`
}

export function renderTabContent(tab, rows, state, grouped) {
  const sortedRows = sortRows(rows, state.sortKey, state.sortAsc)

  if (tab === 'overview') {
    const maxMap = {
      kills: Math.max(...rows.map((r) => Number(r.kills || 0)), 0),
      assists: Math.max(...rows.map((r) => Number(r.assists || 0)), 0),
      damage_to_players: Math.max(...rows.map((r) => Number(r.damage_to_players || 0)), 0),
      damage_to_buildings: Math.max(...rows.map((r) => Number(r.damage_to_buildings || 0)), 0),
      healing: Math.max(...rows.map((r) => Number(r.healing || 0)), 0),
      damage_taken: Math.max(...rows.map((r) => Number(r.damage_taken || 0)), 0),
      serious_injuries: Math.max(...rows.map((r) => Number(r.serious_injuries || 0)), 0),
      feather_spring: Math.max(...rows.map((r) => Number(r.feather_spring || 0)), 0),
      burning_bone: Math.max(...rows.map((r) => Number(r.burning_bone || 0)), 0),
      resources: Math.max(...rows.map((r) => Number(r.resources || 0)), 0),
    }

    const th = (label, key) => {
      const active = state.sortKey === key
      const arrow = active ? (state.sortAsc ? '↑' : '↓') : '↕'
      return `<th class="detail-sort" data-key="${key}">${label}<span>${arrow}</span></th>`
    }
    return `
      <div class="detail-table-wrap"><table class="detail-table"><thead><tr>
      <th>#</th>${th('玩家', 'player_name')}${th('職業', 'class_name')}${th('擊敗', 'kills')}${th('助攻', 'assists')}${th('人傷', 'damage_to_players')}${th('塔傷', 'damage_to_buildings')}${th('治療', 'healing')}${th('承傷', 'damage_taken')}${th('重傷', 'serious_injuries')}${th('化羽', 'feather_spring')}${th('焚骨', 'burning_bone')}${th('資源', 'resources')}
      </tr></thead><tbody>
      ${sortedRows.length ? sortedRows.map((r, idx) => `<tr><td>${idx + 1}</td><td>${r.player_name || '—'}</td><td>${r.class_name || '—'}</td>${buildOverviewHeatCell(r.kills, maxMap.kills)}${buildOverviewHeatCell(r.assists, maxMap.assists)}${buildOverviewHeatCell(r.damage_to_players, maxMap.damage_to_players)}${buildOverviewHeatCell(r.damage_to_buildings, maxMap.damage_to_buildings)}${buildOverviewHeatCell(r.healing, maxMap.healing)}${buildOverviewHeatCell(r.damage_taken, maxMap.damage_taken)}${buildOverviewHeatCell(r.serious_injuries, maxMap.serious_injuries)}${buildOverviewHeatCell(r.feather_spring, maxMap.feather_spring)}${buildOverviewHeatCell(r.burning_bone, maxMap.burning_bone)}${buildOverviewHeatCell(r.resources, maxMap.resources)}</tr>`).join('') : '<tr><td colspan="13" class="detail-empty">無符合資料</td></tr>'}
      </tbody></table></div>`
  }

  if (tab === 'job') return buildJobTab(rows, state)

  if (tab === 'dmg') {
    const totalDmg = rows.reduce((s, r) => s + Number(r.damage_to_players || 0), 0) || 1
    const totalKills = rows.reduce((s, r) => s + Number(r.kills || 0), 0) || 1
    const dmgRows = rows.map((r) => ({ ...r, dmg_pct: Number(r.damage_to_players || 0) / totalDmg, kill_pct: Number(r.kills || 0) / totalKills, kill_eff: Number(r.kills || 0) > 0 ? Number(r.damage_to_players || 0) / Number(r.kills || 0) : 0 }))
    return buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '人傷', sortKey: 'damage_to_players', render: (r) => formatNum(r.damage_to_players) },
      { label: '人傷佔比', sortKey: 'dmg_pct', render: (r) => formatPct(r.dmg_pct) },
      { label: '擊殺', sortKey: 'kills', render: (r) => formatNum(r.kills) },
      { label: '擊殺佔比', sortKey: 'kill_pct', render: (r) => formatPct(r.kill_pct) },
      { label: '傷害/擊殺', sortKey: 'kill_eff', render: (r) => r.kill_eff ? formatNum(Math.round(r.kill_eff)) : '—' },
    ], sortRows(dmgRows, state.sortKey, state.sortAsc), state)
  }

  if (tab === 'eff') {
    const totalBld = rows.reduce((s, r) => s + Number(r.damage_to_buildings || 0), 0) || 1
    const effRows = rows.map((r) => {
      const bld = Number(r.damage_to_buildings || 0), taken = Number(r.damage_taken || 0), heavy = Number(r.serious_injuries || 0)
      return { ...r, bld_pct: bld / totalBld, bld_per_taken: taken > 0 ? bld / taken : 0, bld_per_heavy: heavy > 0 ? bld / heavy : 0 }
    })
    return buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '塔傷', sortKey: 'damage_to_buildings', render: (r) => formatNum(r.damage_to_buildings) },
      { label: '塔傷佔比', sortKey: 'bld_pct', render: (r) => formatPct(r.bld_pct) },
      { label: '承受傷害', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
      { label: '塔傷/承傷', sortKey: 'bld_per_taken', render: (r) => (r.damage_taken > 0 ? r.bld_per_taken.toFixed(2) : '—') },
      { label: '塔傷/重傷', sortKey: 'bld_per_heavy', render: (r) => (r.serious_injuries > 0 ? r.bld_per_heavy.toFixed(2) : '—') },
    ], sortRows(effRows, state.sortKey, state.sortAsc), state)
  }

  if (tab === 'heavy') {
    const totalTaken = rows.reduce((s, r) => s + Number(r.damage_taken || 0), 0) || 1
    const heavyRows = rows.map((r) => {
      const taken = Number(r.damage_taken || 0), heavy = Number(r.serious_injuries || 0)
      return { ...r, taken_pct: taken / totalTaken, taken_per_heavy: heavy > 0 ? taken / heavy : 0 }
    })
    return buildTable([
      { label: '#', sortKey: null, render: (_, i) => i + 1 },
      { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
      { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
      { label: '承受傷害', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
      { label: '承傷佔比', sortKey: 'taken_pct', render: (r) => formatPct(r.taken_pct) },
      { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      { label: '承傷/重傷', sortKey: 'taken_per_heavy', render: (r) => (r.serious_injuries > 0 ? r.taken_per_heavy.toFixed(2) : '—') },
      { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
    ], sortRows(heavyRows, state.sortKey, state.sortAsc), state)
  }

  if (tab === 'bone') {
    const enemyRows = state.view === 'a' ? grouped.b : grouped.a
    const enemyDeaths = enemyRows.reduce((s, r) => s + Number(r.serious_injuries || 0), 0)
    const totalBones = rows.reduce((s, r) => s + Number(r.burning_bone || 0), 0)
    const boneRate = enemyDeaths > 0 ? totalBones / enemyDeaths : 0
    const boneRows = rows.filter((r) => Number(r.burning_bone || 0) > 0).map((r) => ({ ...r, bone_share: totalBones > 0 ? Number(r.burning_bone || 0) / totalBones : 0 }))
    return `
      <div class="detail-summary" style="margin-bottom:10px;">
        <div class="detail-summary-box">對面總死亡次數：<strong>${formatNum(enemyDeaths)}</strong></div>
        <div class="detail-summary-box">總焚骨次數：<strong>${formatNum(totalBones)}</strong></div>
        <div class="detail-summary-box">焚骨比例：<strong>${enemyDeaths > 0 ? formatPct(boneRate) : '—'}</strong></div>
      </div>
      ${buildTable([
        { label: '#', sortKey: null, render: (_, i) => i + 1 },
        { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
        { label: '職業', sortKey: 'class_name', render: (r) => r.class_name || '—' },
        { label: '焚骨', sortKey: 'burning_bone', render: (r) => formatNum(r.burning_bone) },
        { label: '焚骨佔比', sortKey: 'bone_share', render: (r) => (totalBones > 0 ? formatPct(r.bone_share) : '—') },
        { label: '人傷', sortKey: 'damage_to_players', render: (r) => formatNum(r.damage_to_players) },
        { label: '塔傷', sortKey: 'damage_to_buildings', render: (r) => formatNum(r.damage_to_buildings) },
      ], sortRows(boneRows, state.sortKey, state.sortAsc), state)}
    `
  }

  if (tab === 'suwen') {
    const suwenRows = rows.filter((r) => r.class_name === '素問').map((r) => ({ ...r }))
    const totalHeal = rows.reduce((s, r) => s + Number(r.healing || 0), 0)
    const totalEnemyPvp = (state.view === 'a' ? grouped.b : grouped.a).reduce((s, r) => s + Number(r.damage_to_players || 0), 0)
    const healRateVsEnemyPvp = totalEnemyPvp > 0 ? totalHeal / totalEnemyPvp : 0
    const totalSuwenHeal = suwenRows.reduce((s, r) => s + Number(r.healing || 0), 0) || 1
    const suwenTableRows = suwenRows.map((r) => ({ ...r, heal_pct: Number(r.healing || 0) / totalSuwenHeal }))
    return `
      ${buildSuwenQuadrant(suwenRows)}
      <div class="detail-summary" style="margin-bottom:10px;">
        <div class="detail-summary-box">對面總人傷：<strong>${formatNum(totalEnemyPvp)}</strong></div>
        <div class="detail-summary-box">我方總治療：<strong>${formatNum(totalHeal)}</strong></div>
        <div class="detail-summary-box">治療/對面總人傷：<strong>${totalEnemyPvp > 0 ? formatPct(healRateVsEnemyPvp) : '—'}</strong></div>
      </div>
      ${buildTable([
        { label: '#', sortKey: null, render: (_, i) => i + 1 },
        { label: '玩家', sortKey: 'player_name', render: (r) => r.player_name || '—' },
        { label: '治療', sortKey: 'healing', render: (r) => formatNum(r.healing) },
        { label: '治療佔比', sortKey: 'heal_pct', render: (r) => formatPct(r.heal_pct) },
        { label: '化羽', sortKey: 'feather_spring', render: (r) => formatNum(r.feather_spring) },
        { label: '承傷', sortKey: 'damage_taken', render: (r) => formatNum(r.damage_taken) },
        { label: '重傷', sortKey: 'serious_injuries', render: (r) => formatNum(r.serious_injuries) },
      ], sortRows(suwenTableRows, state.sortKey, state.sortAsc), state)}
    `
  }

  if (tab === 'cquadrant') return buildCustomQuadrant(rows, state)

  return '<div class="detail-empty">尚未支援的頁面</div>'
}
