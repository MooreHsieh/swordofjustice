import { supabase } from './supabase-client.js'
import { buildSidebarCompareHtml, computeMvp, renderMvpHtml, renderTabContent } from './stats-detail.views.js'
import { wireEvents } from './stats-detail.events.js'
import { requireAuth, splitByGuild, fetchDetailData } from './stats-detail.data.js'

// ===== DOM 參照 =====
const statusEl = document.querySelector('#status')
const detailVsLineEl = document.querySelector('#detailVsLine')
const logoutBtn = document.querySelector('#logoutBtn')
const viewBtnA = document.querySelector('#viewBtnA')
const viewBtnB = document.querySelector('#viewBtnB')
const sidebarCompareEl = document.querySelector('#sidebarCompare')
const tabsEl = document.querySelector('#detailTabs')
const mvpListEl = document.querySelector('#mvpList')
const searchEl = document.querySelector('#playerSearch')
const detailContentEl = document.querySelector('#detailContent')

// ===== 頁面狀態 =====
const state = {
  league: null,
  records: [],
  view: 'a',
  tab: 'overview',
  search: '',
  jobFilter: '',
  sortKey: 'kills',
  sortAsc: false,
  grouped: { a: [], b: [] },
  cqSettings: null,
  cqHiddenByView: { a: new Set(), b: new Set() },
}

function setStatus(message, isError = false) {
  if (!statusEl) return
  statusEl.textContent = message
  statusEl.style.color = isError ? '#ff8f89' : '#9aa8ba'
}

// 頂部標題列（VS、勝方皇冠、人數）
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

function getVisibleRows() {
  const rawRows = state.grouped[state.view]
  return rawRows.filter((r) => String(r.player_name || '').toLowerCase().includes(state.search.toLowerCase()))
}

function renderMvp() {
  const rows = state.grouped[state.view]
  const mvp = computeMvp(rows, state.sortKey, state.sortAsc)
  const enemyGuild = state.view === 'a' ? state.league?.guild_b : state.league?.guild_a
  mvpListEl.innerHTML = renderMvpHtml(mvp, state.league, enemyGuild)
}

function renderSidebarCompare() {
  if (!sidebarCompareEl || !state.league) return
  sidebarCompareEl.innerHTML = buildSidebarCompareHtml(state.grouped, state.league)
}

function renderContent() {
  const rows = getVisibleRows()
  detailContentEl.innerHTML = renderTabContent(state.tab, rows, state, state.grouped)
}

function applyTabDefaultSort(tab) {
  if (tab === 'overview') {
    state.sortKey = 'kills'
    state.sortAsc = false
  } else if (tab === 'dmg') {
    state.sortKey = 'damage_to_players'
    state.sortAsc = false
  } else if (tab === 'eff') {
    state.sortKey = 'damage_to_buildings'
    state.sortAsc = false
  } else if (tab === 'heavy') {
    state.sortKey = 'damage_taken'
    state.sortAsc = false
  }
}

function onSortToggle(key) {
  if (state.sortKey === key) state.sortAsc = !state.sortAsc
  else {
    state.sortKey = key
    state.sortAsc = false
  }
}

function onCqChange(action, payload) {
  if (!state.cqSettings) return false

  if (action === 'toggle-job') {
    const job = payload.cqJob || ''
    if (state.cqSettings.jobs.has(job)) state.cqSettings.jobs.delete(job)
    else state.cqSettings.jobs.add(job)
    return true
  }
  if (action === 'select-all-jobs') {
    state.cqSettings.seenJobs.forEach((j) => state.cqSettings.jobs.add(j))
    return true
  }
  if (action === 'clear-all-jobs') {
    state.cqSettings.jobs.clear()
    return true
  }
  if (action === 'toggle-player') {
    const key = decodeURIComponent(payload.cqPlayer || '')
    const hidden = state.cqHiddenByView[state.view]
    if (hidden.has(key)) hidden.delete(key)
    else hidden.add(key)
    return true
  }
  if (action === 'select-all-players') {
    state.cqHiddenByView[state.view] = new Set()
    return true
  }
  if (action === 'clear-all-players') {
    const rows = state.grouped[state.view]
    state.cqHiddenByView[state.view] = new Set(rows.map((r) => r.player_name || ''))
    return true
  }
  if (action === 'set-x') {
    state.cqSettings.xKey = payload.value
    return true
  }
  if (action === 'set-y') {
    state.cqSettings.yKey = payload.value
    return true
  }
  return false
}

// 讀取聯賽與戰績資料，寫入 state 後渲染
async function loadDetail() {
  const params = new URLSearchParams(window.location.search)
  const leagueId = params.get('leagueId')
  if (!leagueId) {
    setStatus('缺少 leagueId 參數。', true)
    return
  }

  const { league, records, error } = await fetchDetailData(supabase, leagueId)
  if (error) {
    setStatus(error.message || '讀取聯賽失敗。', true)
    return
  }

  state.league = league
  state.records = records
  state.grouped = splitByGuild(state.records, league)

  renderHeader()
  renderSidebarCompare()
  renderMvp()
  renderContent()
  setStatus('聯賽細節已更新。')
}

// 啟動入口
async function bootstrap() {
  const user = await requireAuth(supabase)
  if (!user) return

  wireEvents({
    elements: { logoutBtn, viewBtnA, viewBtnB, tabsEl, searchEl, detailContentEl },
    state,
    setStatus,
    onRenderMvp: renderMvp,
    onRenderContent: renderContent,
    onSortToggle,
    onTabActivated: applyTabDefaultSort,
    onCqChange,
    onSignOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  })

  await loadDetail()
}

bootstrap()
