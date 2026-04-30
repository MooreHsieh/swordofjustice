import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const statusEl = document.querySelector('#status')
const authArea = document.querySelector('#authArea')
const userArea = document.querySelector('#userArea')
const userEmailEl = document.querySelector('#userEmail')
const providerNameEl = document.querySelector('#providerName')
const googleLoginBtn = document.querySelector('#googleLoginBtn')
const discordLoginBtn = document.querySelector('#discordLoginBtn')
const logoutBtn = document.querySelector('#logoutBtn')

const guildAInput = document.querySelector('#guildAInput')
const guildBInput = document.querySelector('#guildBInput')
const matchDateInput = document.querySelector('#matchDateInput')
const matchRoundInput = document.querySelector('#matchRoundInput')
const createLeagueBtn = document.querySelector('#createLeagueBtn')

const leagueSelect = document.querySelector('#leagueSelect')
const csvFileInput = document.querySelector('#csvFileInput')
const importStatsBtn = document.querySelector('#importStatsBtn')
const previewFileCountEl = document.querySelector('#previewFileCount')
const previewTeamCountEl = document.querySelector('#previewTeamCount')
const previewRowCountEl = document.querySelector('#previewRowCount')
const leagueTableBody = document.querySelector('#leagueTableBody')
const selectedFilesList = document.querySelector('#selectedFilesList')

const config = window.SUPABASE_CONFIG
if (!config || !config.url || !config.anonKey) {
  setStatus('缺少 Supabase 設定。請建立 config.js（可由 config.example.js 複製）。', true)
  throw new Error('Missing SUPABASE_CONFIG in config.js')
}

const supabase = createClient(config.url, config.anonKey)

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function lockAuthActions(disabled) {
  googleLoginBtn.disabled = disabled
  discordLoginBtn.disabled = disabled
  logoutBtn.disabled = disabled
}

function lockLeagueActions(disabled) {
  createLeagueBtn.disabled = disabled
  importStatsBtn.disabled = disabled
  leagueSelect.disabled = disabled
  csvFileInput.disabled = disabled
  guildAInput.disabled = disabled
  guildBInput.disabled = disabled
  matchDateInput.disabled = disabled
  matchRoundInput.disabled = disabled
}

function readProviderName(user) {
  const provider = user.app_metadata?.provider
  if (provider === 'google') return 'Google'
  if (provider === 'discord') return 'Discord'
  return provider ?? 'Unknown'
}

async function refreshUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    authArea.classList.remove('hidden')
    userArea.classList.add('hidden')
    userEmailEl.textContent = ''
    providerNameEl.textContent = ''
    return null
  }

  authArea.classList.add('hidden')
  userArea.classList.remove('hidden')
  userEmailEl.textContent = data.user.email ?? '(無 Email)'
  providerNameEl.textContent = readProviderName(data.user)
  return data.user
}

async function onLogout() {
  lockAuthActions(true)
  const { error } = await supabase.auth.signOut()
  if (error) {
    lockAuthActions(false)
    setStatus(error.message, true)
    return
  }
  window.location.assign(`${window.location.origin}${window.location.pathname}`)
}

async function onOAuthLogin(provider) {
  lockAuthActions(true)
  setStatus(`導向 ${provider} 登入中...`)

  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })

  lockAuthActions(false)
  if (error) setStatus(error.message, true)
}

function normalizeOAuthReturnUrl() {
  const url = new URL(window.location.href)
  const hasOAuthParams =
    url.searchParams.has('code') ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description')

  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '')
  const hasOAuthHashParams =
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    hashParams.has('expires_in') ||
    hashParams.has('token_type') ||
    hashParams.has('provider_token')

  if (!hasOAuthParams && !hasOAuthHashParams) return false

  window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`)
  return true
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += ch
  }
  result.push(current)

  return result.map((v) => v.trim())
}

function toInt(value) {
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

function parseGuildsFromFilename(name) {
  const m = name.match(/^[^_]+_([^_]+)_([^_.]+)\.csv$/i)
  if (!m) return null
  return { guildA: m[1], guildB: m[2] }
}

function parseBattleCsv(text) {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())

  const teams = []
  let i = 0

  while (i < rows.length) {
    const line = rows[i]
    if (!line) {
      i += 1
      continue
    }

    const fields = parseCsvLine(line)
    if (fields.length >= 2 && fields[0] !== '玩家名字' && /^\d+$/.test(fields[1])) {
      const teamName = fields[0]
      const totalPlayers = toInt(fields[1])
      i += 1

      if (i < rows.length && parseCsvLine(rows[i])[0] === '玩家名字') i += 1

      const players = []
      while (i < rows.length) {
        const rowLine = rows[i]
        if (!rowLine) {
          i += 1
          break
        }

        const row = parseCsvLine(rowLine)
        if (row.length >= 2 && row[0] !== '玩家名字' && /^\d+$/.test(row[1])) break
        if (row[0] === '玩家名字') {
          i += 1
          continue
        }

        if (row.length >= 12) {
          players.push({
            player_name: row[0],
            class_name: row[1],
            kills: toInt(row[2]),
            assists: toInt(row[3]),
            resources: toInt(row[4]),
            damage_to_players: toInt(row[5]),
            damage_to_buildings: toInt(row[6]),
            healing: toInt(row[7]),
            damage_taken: toInt(row[8]),
            serious_injuries: toInt(row[9]),
            feather_spring: toInt(row[10]),
            burning_bone: toInt(row[11])
          })
        }

        i += 1
      }

      teams.push({ teamName, totalPlayers, players })
      continue
    }

    i += 1
  }

  return teams
}

function formatLeagueOption(league) {
  return `${league.match_date}｜第${league.round_no}場｜${league.guild_a} vs ${league.guild_b}`
}

function renderLeagueTable(leagues) {
  leagueTableBody.innerHTML = ''
  if (!leagues.length) {
    leagueTableBody.innerHTML = '<tr><td colspan="4">尚無資料</td></tr>'
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
    leagueTableBody.appendChild(tr)
  }
}

function updateImportPreview(fileCount, teamCount, rowCount) {
  previewFileCountEl.textContent = String(fileCount)
  previewTeamCountEl.textContent = String(teamCount)
  previewRowCountEl.textContent = String(rowCount)
}

function renderSelectedFiles(files) {
  selectedFilesList.innerHTML = ''
  if (!files.length) return

  for (const file of files) {
    const li = document.createElement('li')
    li.textContent = file.name
    selectedFilesList.appendChild(li)
  }
}

async function loadLeagues() {
  const { data, error } = await supabase
    .from('guild_leagues')
    .select('id, guild_a, guild_b, match_date, round_no')
    .order('match_date', { ascending: false })
    .order('round_no', { ascending: false })
    .limit(100)

  if (error) {
    setStatus(`讀取聯賽失敗：${error.message}`, true)
    return
  }

  leagueSelect.innerHTML = '<option value="">請先選擇聯賽</option>'
  const leagues = data ?? []
  for (const league of leagues) {
    const opt = document.createElement('option')
    opt.value = league.id
    opt.textContent = formatLeagueOption(league)
    leagueSelect.appendChild(opt)
  }
  renderLeagueTable(leagues)
}

async function onCreateLeague() {
  const guildA = guildAInput.value.trim()
  const guildB = guildBInput.value.trim()
  const matchDate = matchDateInput.value
  const roundNo = toInt(matchRoundInput.value)

  if (!guildA || !guildB || !matchDate || !roundNo) {
    setStatus('請完整填入幫會 A / 幫會 B / 日期 / 場次。', true)
    return
  }

  lockLeagueActions(true)
  setStatus('建立幫會聯賽中...')

  const { data, error } = await supabase
    .from('guild_leagues')
    .insert({
      guild_a: guildA,
      guild_b: guildB,
      match_date: matchDate,
      round_no: roundNo
    })
    .select('id')
    .single()

  lockLeagueActions(false)

  if (error) {
    setStatus(`建立失敗：${error.message}`, true)
    return
  }

  await loadLeagues()
  leagueSelect.value = data.id
  setStatus('幫會聯賽已建立，請繼續匯入個人戰績。')
}

async function onImportStats() {
  const leagueId = leagueSelect.value
  const files = Array.from(csvFileInput.files ?? [])

  if (!leagueId) {
    setStatus('請先選擇對應聯賽。', true)
    return
  }

  if (!files.length) {
    setStatus('請至少選擇一個 CSV 檔案。', true)
    return
  }

  lockLeagueActions(true)
  setStatus('匯入戰績中...')

  let inserted = 0
  const fileNames = files.map((f) => f.name)

  const { data: existingFiles, error: existingFilesError } = await supabase
    .from('personal_records')
    .select('source_file_name')
    .eq('league_id', leagueId)
    .in('source_file_name', fileNames)

  if (existingFilesError) {
    lockLeagueActions(false)
    setStatus(`檢查重複檔案失敗：${existingFilesError.message}`, true)
    return
  }

  const duplicated = Array.from(
    new Set((existingFiles ?? []).map((r) => r.source_file_name).filter(Boolean))
  )

  if (duplicated.length) {
    lockLeagueActions(false)
    setStatus(`偵測到重複檔案，請勿重複上傳：${duplicated.join('、')}`, true)
    return
  }

  for (const file of files) {
    const content = await file.text()
    const teams = parseBattleCsv(content)

    if (!teams.length) continue

    const filenameGuilds = parseGuildsFromFilename(file.name)
    if (filenameGuilds) {
      if (!guildAInput.value.trim()) guildAInput.value = filenameGuilds.guildA
      if (!guildBInput.value.trim()) guildBInput.value = filenameGuilds.guildB
    }

    const rows = []
    for (const team of teams) {
      for (const player of team.players) {
        rows.push({
          league_id: leagueId,
          guild_name: team.teamName,
          total_players_in_guild: team.totalPlayers,
          ...player,
          source_file_name: file.name
        })
      }
    }

    if (rows.length) {
      const { error } = await supabase.from('personal_records').insert(rows)
      if (error) {
        lockLeagueActions(false)
        setStatus(`匯入失敗（${file.name}）：${error.message}`, true)
        return
      }
      inserted += rows.length
    }
  }

  lockLeagueActions(false)
  setStatus(`匯入完成，共新增 ${inserted} 筆個人戰績。`)
  csvFileInput.value = ''
  updateImportPreview(0, 0, 0)
  renderSelectedFiles([])
}

async function onCsvFilesChanged() {
  const files = Array.from(csvFileInput.files ?? [])
  renderSelectedFiles(files)
  if (!files.length) {
    updateImportPreview(0, 0, 0)
    return
  }

  let totalTeams = 0
  let totalRows = 0
  let filenameGuildsCandidate = null

  for (const file of files) {
    const parsed = parseGuildsFromFilename(file.name)
    if (parsed && !filenameGuildsCandidate) filenameGuildsCandidate = parsed

    const content = await file.text()
    const teams = parseBattleCsv(content)
    totalTeams += teams.length
    totalRows += teams.reduce((sum, t) => sum + t.players.length, 0)
  }

  if (filenameGuildsCandidate) {
    if (!guildAInput.value.trim()) guildAInput.value = filenameGuildsCandidate.guildA
    if (!guildBInput.value.trim()) guildBInput.value = filenameGuildsCandidate.guildB
  }

  updateImportPreview(files.length, totalTeams, totalRows)
}

const fromOAuthCallback = normalizeOAuthReturnUrl()

logoutBtn.addEventListener('click', onLogout)
googleLoginBtn.addEventListener('click', () => onOAuthLogin('google'))
discordLoginBtn.addEventListener('click', () => onOAuthLogin('discord'))
createLeagueBtn.addEventListener('click', onCreateLeague)
importStatsBtn.addEventListener('click', onImportStats)
csvFileInput.addEventListener('change', onCsvFilesChanged)

supabase.auth.onAuthStateChange(async () => {
  const user = await refreshUser()
  if (user) await loadLeagues()
})

const user = await refreshUser()
if (user) {
  await loadLeagues()
}

if (fromOAuthCallback) {
  setStatus('OAuth 回跳完成，正在更新登入狀態。')
} else {
  setStatus('請選擇 Google 或 Discord 登入。')
}
