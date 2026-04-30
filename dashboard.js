import { supabase } from './supabase-client.js'

const statusEl = document.querySelector('#status')
const logoutBtn = document.querySelector('#logoutBtn')

const guildAInput = document.querySelector('#guildAInput')
const guildBInput = document.querySelector('#guildBInput')
const matchDateInput = document.querySelector('#matchDateInput')
const matchRoundInput = document.querySelector('#matchRoundInput')
const matchResultInput = document.querySelector('#matchResultInput')

const csvFileInput = document.querySelector('#csvFileInput')
const importStatsBtn = document.querySelector('#importStatsBtn')
const selectedFilesList = document.querySelector('#selectedFilesList')

function setStatus(message, isError = false) {
  statusEl.textContent = message
  statusEl.style.color = isError ? '#b42318' : '#69655e'
}

function lockLeagueActions(disabled) {
  if (importStatsBtn) importStatsBtn.disabled = disabled
  if (csvFileInput) csvFileInput.disabled = disabled
  if (guildAInput) guildAInput.disabled = disabled
  if (guildBInput) guildBInput.disabled = disabled
  if (matchDateInput) matchDateInput.disabled = disabled
  if (matchRoundInput) matchRoundInput.disabled = disabled
  if (matchResultInput) matchResultInput.disabled = disabled
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
  const base = name.replace(/\.csv$/i, '')
  const tokens = base.split('_')
  if (tokens.length < 4) return null
  const guildA = tokens[tokens.length - 2]
  const guildB = tokens[tokens.length - 1]
  if (!guildA || !guildB) return null
  return { guildA, guildB }
}

function parseDateFromFilename(name) {
  const m = name.match(/^(\d{8})_/)
  if (!m) return null
  const d = m[1]
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
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
    if (fields.length >= 2 && fields[0] !== '玩家名字' && /^\d+$/.test(String(fields[1]).replace(/[^\d]/g, ''))) {
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
        if (row.length >= 2 && row[0] !== '玩家名字' && /^\d+$/.test(String(row[1]).replace(/[^\d]/g, ''))) break
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

function renderSelectedFiles(files) {
  selectedFilesList.innerHTML = ''
  if (!files.length) return

  for (const file of files) {
    const li = document.createElement('li')
    li.textContent = file.name
    selectedFilesList.appendChild(li)
  }
}

async function onImportStats() {
  const file = csvFileInput.files?.[0]
  if (!file) {
    setStatus('請先選擇一個 CSV 檔案。', true)
    return
  }

  const guildA = guildAInput.value.trim()
  const guildB = guildBInput.value.trim()
  const matchDate = matchDateInput.value
  const roundNo = toInt(matchRoundInput.value)
  const matchResult = matchResultInput.value

  if (!guildA || !guildB || !matchDate || !roundNo) {
    setStatus('請完整填入我方幫會 / 敵方幫會 / 日期 / 場次。', true)
    return
  }

  lockLeagueActions(true)
  setStatus('匯入中（建立聯賽 + 個人戰績）...')

  const content = await file.text()
  const teams = parseBattleCsv(content)
  if (!teams.length) {
    lockLeagueActions(false)
    setStatus('CSV 解析失敗，找不到可匯入的隊伍資料。', true)
    return
  }

  const matchTeamByName = (name) => teams.find((t) => String(t.teamName || '').trim() === String(name || '').trim())
  const fallbackTeamA = teams[0]
  const fallbackTeamB = teams[1]
  const teamA = matchTeamByName(guildA) || fallbackTeamA
  const teamB = matchTeamByName(guildB) || fallbackTeamB
  const guildAPlayers = Number(teamA?.players?.length || 0)
  const guildBPlayers = Number(teamB?.players?.length || 0)

  const { data: existingByFile, error: existingByFileError } = await supabase
    .from('personal_records')
    .select('id')
    .eq('source_file_name', file.name)
    .limit(1)

  if (existingByFileError) {
    lockLeagueActions(false)
    setStatus(`檢查重複檔案失敗：${existingByFileError.message}`, true)
    return
  }

  if ((existingByFile ?? []).length > 0) {
    lockLeagueActions(false)
    setStatus(`此檔案已匯入過：${file.name}`, true)
    return
  }

  const baseLeaguePayload = {
    guild_a: guildA,
    guild_b: guildB,
    match_date: matchDate,
    round_no: roundNo,
    result: matchResult
  }
  const leaguePayloadWithCounts = {
    ...baseLeaguePayload,
    guild_a_players: guildAPlayers,
    guild_b_players: guildBPlayers
  }

  let createLeagueResult = await supabase
    .from('guild_leagues')
    .insert(leaguePayloadWithCounts)
    .select('id')
    .single()

  if (createLeagueResult.error && /guild_a_players|guild_b_players/i.test(createLeagueResult.error.message || '')) {
    createLeagueResult = await supabase
      .from('guild_leagues')
      .insert(baseLeaguePayload)
      .select('id')
      .single()
  }

  const { data: newLeague, error: createLeagueError } = createLeagueResult

  if (createLeagueError) {
    lockLeagueActions(false)
    setStatus(`建立聯賽失敗：${createLeagueError.message}`, true)
    return
  }

  const leagueId = newLeague.id
  const rows = []
  for (const team of teams) {
    for (const player of team.players) {
      rows.push({
        league_id: leagueId,
        guild_name: team.teamName,
        total_players_in_guild: team.players.length,
        ...player,
        source_file_name: file.name
      })
    }
  }

  const { error: insertError } = await supabase.from('personal_records').insert(rows)
  if (insertError) {
    await supabase.from('guild_leagues').delete().eq('id', leagueId)
    lockLeagueActions(false)
    setStatus(`匯入失敗（${file.name}）：${insertError.message}`, true)
    return
  }

  lockLeagueActions(false)
  setStatus(`匯入完成：已建立聯賽並新增 ${rows.length} 筆個人戰績。`)
  csvFileInput.value = ''
  renderSelectedFiles([])
}

async function onCsvFilesChanged() {
  const file = csvFileInput.files?.[0]
  const files = file ? [file] : []
  renderSelectedFiles(files)
  if (!file) {
    return
  }

  const parsed = parseGuildsFromFilename(file.name)
  if (parsed) {
    guildAInput.value = parsed.guildA
    guildBInput.value = parsed.guildB
    const parsedDate = parseDateFromFilename(file.name)
    if (parsedDate) matchDateInput.value = parsedDate
    setStatus('已由檔名自動判斷我方/敵方幫會與日期。')
  } else {
    setStatus('檔名無法判斷幫會或日期，請手動填寫。', true)
  }
}

async function bootstrap() {
  const user = await requireAuth()
  if (!user) return

  setStatus('請建立聯賽並匯入戰績。')

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout)
  if (importStatsBtn) importStatsBtn.addEventListener('click', onImportStats)
  if (csvFileInput) csvFileInput.addEventListener('change', onCsvFilesChanged)
}

bootstrap()
