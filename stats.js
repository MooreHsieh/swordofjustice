import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const userEmailEl = document.querySelector('#userEmail')
const providerNameEl = document.querySelector('#providerName')
const logoutBtn = document.querySelector('#logoutBtn')
const leagueCountEl = document.querySelector('#leagueCount')
const recordCountEl = document.querySelector('#recordCount')
const latestMatchEl = document.querySelector('#latestMatch')
const recentLeagueBody = document.querySelector('#recentLeagueBody')
const guildChartEl = document.querySelector('#guildChart')
const classChartEl = document.querySelector('#classChart')

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function readProviderName(user) {
  const provider = user.app_metadata?.provider
  if (provider === 'google') return 'Google'
  if (provider === 'discord') return 'Discord'
  return provider ?? 'Unknown'
}

async function requireAuth() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    window.location.replace('./login.html')
    return null
  }

  userEmailEl.textContent = data.user.email ?? '(無 Email)'
  providerNameEl.textContent = readProviderName(data.user)
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

function renderRecentLeagues(leagues) {
  recentLeagueBody.innerHTML = ''
  if (!leagues.length) {
    recentLeagueBody.innerHTML = '<tr><td colspan="4">尚無資料</td></tr>'
    return
  }

  for (const league of leagues) {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${league.match_date}</td>
      <td>第${league.round_no}場</td>
      <td>${league.guild_a}</td>
      <td>${league.guild_b}</td>
    `
    recentLeagueBody.appendChild(tr)
  }
}

function renderBarChart(container, items, valueLabel) {
  container.innerHTML = ''
  if (!items.length) {
    container.innerHTML = '<div class="hint">尚無資料</div>'
    return
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1)
  for (const item of items) {
    const row = document.createElement('div')
    row.className = 'chart-row'
    const width = Math.max(4, Math.round((item.value / maxValue) * 100))
    row.innerHTML = `
      <span>${item.label}</span>
      <div class="chart-bar-wrap"><div class="chart-bar" style="width:${width}%"></div></div>
      <span>${item.value}${valueLabel}</span>
    `
    container.appendChild(row)
  }
}

async function loadStats() {
  const [{ count: leagueCount, error: leagueCountError }, { count: recordCount, error: recordCountError }] = await Promise.all([
    supabase.from('guild_leagues').select('*', { count: 'exact', head: true }),
    supabase.from('personal_records').select('*', { count: 'exact', head: true })
  ])

  if (leagueCountError || recordCountError) {
    const message = leagueCountError?.message ?? recordCountError?.message ?? '讀取統計失敗'
    setStatus(message, true)
    return
  }

  leagueCountEl.textContent = String(leagueCount ?? 0)
  recordCountEl.textContent = String(recordCount ?? 0)

  const { data: recentLeagues, error: recentError } = await supabase
    .from('guild_leagues')
    .select('id, match_date, round_no, guild_a, guild_b')
    .order('match_date', { ascending: false })
    .order('round_no', { ascending: false })
    .limit(10)

  if (recentError) {
    setStatus(recentError.message, true)
    return
  }

  const leagues = recentLeagues ?? []
  renderRecentLeagues(leagues)

  if (leagues.length) {
    latestMatchEl.textContent = `${leagues[0].match_date} 第${leagues[0].round_no}場`
  } else {
    latestMatchEl.textContent = '-'
  }

  const leagueIds = leagues.map((l) => l.id).filter(Boolean)
  if (leagueIds.length) {
    const { data: records, error: recordError } = await supabase
      .from('personal_records')
      .select('guild_name, class_name, kills, assists')
      .in('league_id', leagueIds)

    if (!recordError) {
      const guildMap = new Map()
      const classMap = new Map()

      for (const r of records ?? []) {
        const guildScore = (guildMap.get(r.guild_name) ?? 0) + (r.kills ?? 0) + (r.assists ?? 0)
        guildMap.set(r.guild_name, guildScore)
        const classCount = (classMap.get(r.class_name) ?? 0) + 1
        classMap.set(r.class_name, classCount)
      }

      const guildItems = Array.from(guildMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)

      const classItems = Array.from(classMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)

      renderBarChart(guildChartEl, guildItems, '')
      renderBarChart(classChartEl, classItems, '人')
    } else {
      renderBarChart(guildChartEl, [], '')
      renderBarChart(classChartEl, [], '')
    }
  } else {
    renderBarChart(guildChartEl, [], '')
    renderBarChart(classChartEl, [], '')
  }

  setStatus('統計資料已更新。')
}

async function bootstrap() {
  const user = await requireAuth()
  if (!user) return

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout)
  await loadStats()
}

bootstrap()
