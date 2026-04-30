import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const logoutBtn = document.querySelector('#logoutBtn')
const enemyGuildSearchEl = document.querySelector('#enemyGuildSearch')
const leagueListBody = document.querySelector('#leagueListBody')

let allLeagues = []

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
    leagueListBody.innerHTML = '<tr><td colspan="5">尚無資料</td></tr>'
    return
  }

  for (const league of leagues) {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${league.match_date}</td>
      <td>第${league.round_no}場</td>
      <td>${league.guild_a}</td>
      <td>${league.guild_b}</td>
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
  const { data: leagues, error } = await supabase
    .from('guild_leagues')
    .select('id, match_date, round_no, guild_a, guild_b')
    .order('match_date', { ascending: false })
    .order('round_no', { ascending: false })
    .limit(100)

  if (error) {
    setStatus(error.message, true)
    return
  }

  allLeagues = leagues ?? []
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
