import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const logoutBtn = document.querySelector('#logoutBtn')
const playerTitleEl = document.querySelector('#playerTitle')
const playerRadarWrapEl = document.querySelector('#playerRadarWrap')
const playerTrendWrapEl = document.querySelector('#playerTrendWrap')
const playerSummaryBodyEl = document.querySelector('#playerSummaryBody')
const playerTrendTipEl = document.querySelector('#playerTrendTip')

const RADAR_METRICS = [
  { key: 'kills_sum', label: '擊殺' },
  { key: 'pvp_sum', label: '人傷' },
  { key: 'bld_sum', label: '塔傷' },
  { key: 'heavy_sum', label: '重傷' },
  { key: 'tank_sum', label: '承傷' },
  { key: 'heal_sum', label: '治療' },
  { key: 'feather_sum', label: '化羽' },
  { key: 'bone_sum', label: '焚骨' },
]
const TREND_METRICS = [
  { key: 'kills', label: '擊殺' },
  { key: 'damage_to_players', label: '人傷' },
  { key: 'damage_to_buildings', label: '塔傷' },
  { key: 'serious_injuries', label: '重傷' },
  { key: 'damage_taken', label: '承傷' },
  { key: 'healing', label: '治療' },
  { key: 'feather_spring', label: '化羽' },
  { key: 'burning_bone', label: '焚骨' },
]

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString()
}

function escapeAttr(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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

function buildRadarSvg(target, allRows) {
  const n = RADAR_METRICS.length
  const W = 360
  const H = 280
  const cx = 180
  const cy = 140
  const r = 108

  const avgByMetric = (row, key) => safeDiv(row[key], row.matches) || 0
  const maxByMetric = Object.fromEntries(
    RADAR_METRICS.map((m) => [
      m.key,
      Math.max(...allRows.map((row) => avgByMetric(row, m.key)), 1),
    ]),
  )

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

  const values = RADAR_METRICS.map((m) => avgByMetric(target, m.key))
  const pts = values.map((v, i) => toPoint(i, v / maxByMetric[RADAR_METRICS[i].key]))
  const poly = `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="rgba(201,168,76,0.22)" stroke="rgba(201,168,76,0.95)" stroke-width="2"/>`
  const dots = pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="rgba(201,168,76,1)"/>`).join('')
  const labels = RADAR_METRICS.map((m, i) => {
    const p = toPoint(i, 1.12)
    return `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="middle" fill="#9fb1c6" font-size="11">${m.label}</text>`
  }).join('')

  return `
    <svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;height:auto;max-width:460px;">
      ${ring}${spokes}${poly}${dots}${labels}
    </svg>
  `
}

function renderTrendCharts(records) {
  if (!records.length) {
    playerTrendWrapEl.innerHTML = '<div class="detail-empty">此玩家尚無場次趨勢資料</div>'
    return
  }

  const sorted = [...records].sort((a, b) => {
    const da = String(a._match_date || '')
    const db = String(b._match_date || '')
    if (da !== db) return da.localeCompare(db)
    return Number(a._round_no || 0) - Number(b._round_no || 0)
  })

  const xLabel = (r) => {
    const d = String(r._match_date || '')
    const dm = d.length >= 10 ? d.slice(5) : d
    return `${dm}#${Number(r._round_no || 0)}`
  }

  const mkChart = (metric) => {
    const W = 760
    const H = 150
    const PL = 40
    const PR = 14
    const PT = 14
    const PB = 26
    const cw = W - PL - PR
    const ch = H - PT - PB
    const vals = sorted.map((r) => Number(r[metric.key] || 0))
    const max = Math.max(...vals, 1)
    const n = vals.length
    const xOf = (i) => PL + (n <= 1 ? cw / 2 : (i / (n - 1)) * cw)
    const yOf = (v) => PT + ch - (v / max) * ch

    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const y = yOf(f * max)
      const v = Math.round(f * max).toLocaleString()
      return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W - PR}" y2="${y.toFixed(1)}" stroke="rgba(201,168,76,0.10)" stroke-width="1"/><text x="${PL - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#6f7f93" font-size="9">${v}</text>`
    }).join('')

    const points = vals.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
    const circles = vals.map((v, i) => {
      const x = xOf(i).toFixed(1)
      const y = yOf(v).toFixed(1)
      const tip = `${metric.label}｜${xLabel(sorted[i])}：${fmtNum(v)}`
      return `<circle cx="${x}" cy="${y}" r="2.6" fill="#c9a84c"/><circle cx="${x}" cy="${y}" r="9" fill="transparent" data-tip="${escapeAttr(tip)}"/>`
    }).join('')
    const firstLabel = xLabel(sorted[0])
    const lastLabel = xLabel(sorted[n - 1])

    return `
      <div class="player-trend-card">
        <div class="player-trend-title">${metric.label}</div>
        <svg viewBox="0 0 ${W} ${H}" style="display:block;width:100%;height:auto;">
          <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + ch}" stroke="rgba(201,168,76,0.22)" stroke-width="1"/>
          <line x1="${PL}" y1="${PT + ch}" x2="${W - PR}" y2="${PT + ch}" stroke="rgba(201,168,76,0.22)" stroke-width="1"/>
          ${grid}
          <polyline points="${points}" fill="none" stroke="rgba(201,168,76,0.9)" stroke-width="1.8" stroke-linejoin="round"/>
          ${circles}
          <text x="${PL}" y="${H - 6}" text-anchor="start" fill="#7f90a6" font-size="9">${firstLabel}</text>
          <text x="${W - PR}" y="${H - 6}" text-anchor="end" fill="#7f90a6" font-size="9">${lastLabel}</text>
        </svg>
      </div>
    `
  }

  playerTrendWrapEl.innerHTML = TREND_METRICS.map(mkChart).join('')
}

function bindTrendTooltip() {
  if (!playerTrendWrapEl || !playerTrendTipEl) return

  playerTrendWrapEl.addEventListener('mousemove', (e) => {
    const hit = e.target.closest('[data-tip]')
    if (!hit) {
      playerTrendTipEl.style.display = 'none'
      return
    }
    const tip = hit.getAttribute('data-tip') || ''
    playerTrendTipEl.textContent = tip
    playerTrendTipEl.style.display = 'block'
    playerTrendTipEl.style.left = `${e.clientX + 12}px`
    playerTrendTipEl.style.top = `${e.clientY + 12}px`
  })

  playerTrendWrapEl.addEventListener('mouseleave', () => {
    playerTrendTipEl.style.display = 'none'
  })
}

function renderSummary(target) {
  const matches = Number(target.matches || 0)
  const wins = Number(target.wins || 0)
  const losses = Number(target.losses || 0)
  const rows = [
    ['總場次', matches, matches],
    ['勝場', wins, fmtPct(wins, matches)],
    ['敗場', losses, fmtPct(losses, matches)],
    ['擊殺', target.kills_sum, fmtAvg(target.kills_sum, matches)],
    ['助攻', target.assists_sum, fmtAvg(target.assists_sum, matches)],
    ['資源', target.resources_sum, fmtAvg(target.resources_sum, matches)],
    ['人傷', target.pvp_sum, fmtAvg(target.pvp_sum, matches)],
    ['塔傷', target.bld_sum, fmtAvg(target.bld_sum, matches)],
    ['治療', target.heal_sum, fmtAvg(target.heal_sum, matches)],
    ['承傷', target.tank_sum, fmtAvg(target.tank_sum, matches)],
    ['重傷', target.heavy_sum, fmtAvg(target.heavy_sum, matches)],
    ['化羽', target.feather_sum, fmtAvg(target.feather_sum, matches)],
    ['焚骨', target.bone_sum, fmtAvg(target.bone_sum, matches)],
    ['擊殺/重傷', safeDiv(target.kills_sum, target.heavy_sum), safeDiv(target.kills_sum, target.heavy_sum)],
    ['傷害/擊殺', safeDiv(target.pvp_sum, target.kills_sum), safeDiv(target.pvp_sum, target.kills_sum)],
  ]

  playerSummaryBodyEl.innerHTML = rows.map(([name, sumVal, avgVal]) => {
    const sumTxt = typeof sumVal === 'number' ? fmtNum(Math.round(sumVal)) : (sumVal ?? '—')
    const avgTxt = typeof avgVal === 'number' ? avgVal.toFixed(2) : (avgVal ?? '—')
    return `<tr><td>${name}</td><td>${sumTxt}</td><td>${avgTxt}</td></tr>`
  }).join('')
}

async function loadPlayerDetail() {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('name') || ''
  const job = params.get('job') || ''
  if (!name || !job) {
    setStatus('缺少玩家參數。', true)
    playerSummaryBodyEl.innerHTML = '<tr><td colspan="3">缺少玩家參數</td></tr>'
    return
  }

  playerTitleEl.textContent = `${name}｜${job}`
  setStatus('資料載入中...')

  const [{ data: targetRows, error: targetError }, { data: allRows, error: allError }, { data: records, error: recordsError }] = await Promise.all([
    supabase.from('guild_a_player_totals').select('*').eq('player_name', name).eq('class_name', job).limit(1),
    supabase.from('guild_a_player_totals').select('matches,kills_sum,pvp_sum,bld_sum,heavy_sum,tank_sum,heal_sum,feather_sum,bone_sum'),
    supabase.from('personal_records').select('league_id,kills,damage_to_players,damage_to_buildings,serious_injuries,damage_taken,healing,feather_spring,burning_bone').eq('guild_name', '有夢最美').eq('player_name', name).eq('class_name', job),
  ])

  if (targetError || allError || recordsError) {
    setStatus((targetError || allError || recordsError)?.message || '讀取失敗', true)
    playerSummaryBodyEl.innerHTML = '<tr><td colspan="3">讀取失敗</td></tr>'
    return
  }

  const target = (targetRows || [])[0]
  if (!target) {
    setStatus('查無此玩家資料。', true)
    playerSummaryBodyEl.innerHTML = '<tr><td colspan="3">查無資料</td></tr>'
    return
  }

  const rawRecords = records || []
  let trendRecords = []
  if (rawRecords.length) {
    const leagueIds = [...new Set(rawRecords.map((r) => r.league_id).filter(Boolean))]
    const { data: leagues, error: leaguesError } = await supabase
      .from('guild_leagues')
      .select('id,match_date,round_no')
      .in('id', leagueIds)
    if (leaguesError) {
      setStatus(leaguesError.message, true)
    } else {
      const leagueMap = new Map((leagues || []).map((g) => [g.id, g]))
      trendRecords = rawRecords.map((r) => {
        const g = leagueMap.get(r.league_id) || {}
        return { ...r, _match_date: g.match_date || '', _round_no: g.round_no || 0 }
      })
    }
  }

  playerRadarWrapEl.innerHTML = buildRadarSvg(target, allRows || [])
  renderTrendCharts(trendRecords)
  renderSummary(target)
  setStatus('個人資料已更新。')
}

async function bootstrap() {
  const user = await requireAuth()
  if (!user) return

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout)
  bindTrendTooltip()
  await loadPlayerDetail()
}

bootstrap()
