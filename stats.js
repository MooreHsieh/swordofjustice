import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const logoutBtn = document.querySelector('#logoutBtn')
const enemyGuildSearchEl = document.querySelector('#enemyGuildSearch')
const leagueListBody = document.querySelector('#leagueListBody')

let allLeagues = []
const crownSvg = '<svg viewBox="0 0 20 20" fill="none"><path d="M3 15h14l-1.2-7-3.5 2.7L10 5.5 7.7 10.7 4.2 8 3 15Z"/><path d="M4 17h12"/></svg>'

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
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

function renderLeagueList(leagues) {
  leagueListBody.innerHTML = ''
  if (!leagues.length) {
    leagueListBody.innerHTML = '<tr><td colspan="7">尚無資料</td></tr>'
    return
  }

  for (const league of leagues) {
    const aWin = league.result === 'our_win'
    const bWin = league.result === 'enemy_win'
    const aName = `${league.guild_a}${aWin ? `<span class="vs-win-crown" title="勝利">${crownSvg}</span>` : ''}`
    const bName = `${league.guild_b}${bWin ? `<span class="vs-win-crown" title="勝利">${crownSvg}</span>` : ''}`
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${league.match_date}</td>
      <td>第${league.round_no}場</td>
      <td>${aName}</td>
      <td>${league.guild_a_players ?? 0}</td>
      <td>${bName}</td>
      <td>${league.guild_b_players ?? 0}</td>
      <td><a class="nav-btn" href="./stats-detail.html?leagueId=${league.id}">查看細節</a></td>
    `
    leagueListBody.appendChild(tr)
  }
}

function renderFilteredLeagueList() {
  const keyword = (enemyGuildSearchEl?.value ?? '').trim().toLowerCase()
  const filtered = keyword
    ? allLeagues.filter((league) => String(league.guild_b ?? '').toLowerCase().includes(keyword))
    : allLeagues

  renderLeagueList(filtered)
  setStatus(`聯賽清單已更新，共 ${filtered.length} 筆。`)
}

async function loadStats() {
  setStatus('資料載入中...')
  leagueListBody.innerHTML = '<tr><td colspan="7">載入中...</td></tr>'

  const { data: leagues, error } = await supabase
    .from('guild_leagues')
    .select('id, match_date, round_no, guild_a, guild_b, result')
    .order('match_date', { ascending: false })
    .order('round_no', { ascending: false })
    .limit(100)

  if (error) {
    leagueListBody.innerHTML = '<tr><td colspan="7">讀取失敗</td></tr>'
    setStatus(error.message, true)
    return
  }

  const baseLeagues = leagues ?? []
  const leagueIds = baseLeagues.map((l) => l.id).filter(Boolean)
  const leaguePlayerCountMap = new Map()

  if (leagueIds.length) {
    const { data: records, error: recordsError } = await supabase
      .from('personal_records')
      .select('league_id, guild_name, total_players_in_guild')
      .in('league_id', leagueIds)

    if (recordsError) {
      leagueListBody.innerHTML = '<tr><td colspan="7">讀取失敗</td></tr>'
      setStatus(recordsError.message, true)
      return
    }

    for (const row of records ?? []) {
      const leagueId = row.league_id
      const guildName = row.guild_name
      if (!leagueId || !guildName) continue

      if (!leaguePlayerCountMap.has(leagueId)) leaguePlayerCountMap.set(leagueId, new Map())
      const guildMap = leaguePlayerCountMap.get(leagueId)
      if (!guildMap.has(guildName)) guildMap.set(guildName, { maxTotal: 0, rowCount: 0 })
      const bucket = guildMap.get(guildName)
      bucket.rowCount += 1
      bucket.maxTotal = Math.max(bucket.maxTotal, Number(row.total_players_in_guild || 0))
    }
  }

  allLeagues = baseLeagues.map((league) => {
    const guildMap = leaguePlayerCountMap.get(league.id) || new Map()
    const a = guildMap.get(league.guild_a)
    const b = guildMap.get(league.guild_b)
    return {
      ...league,
      guild_a_players: a ? (a.maxTotal > 0 ? a.maxTotal : a.rowCount) : 0,
      guild_b_players: b ? (b.maxTotal > 0 ? b.maxTotal : b.rowCount) : 0
    }
  })

  renderFilteredLeagueList()
}

async function bootstrap() {
  const user = await requireAuth()
  if (!user) return

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout)
  if (enemyGuildSearchEl) {
    enemyGuildSearchEl.addEventListener('input', renderFilteredLeagueList)
  }
  await loadStats()
}

bootstrap()
