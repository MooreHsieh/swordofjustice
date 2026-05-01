// 登入檢查：未登入導回 login
export async function requireAuth(supabase) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    window.location.replace('./login.html')
    return null
  }
  return data.user
}

// 依聯賽兩側幫會切分玩家資料
export function splitByGuild(records, league) {
  const a = records.filter((r) => r.guild_name === league.guild_a)
  const b = records.filter((r) => r.guild_name === league.guild_b)
  return { a, b }
}

// 讀取 league 與對應個人戰績
export async function fetchDetailData(supabase, leagueId) {
  const { data: league, error: leagueError } = await supabase
    .from('guild_leagues')
    .select('id, match_date, round_no, guild_a, guild_b, guild_a_players, guild_b_players, result')
    .eq('id', leagueId)
    .single()

  if (leagueError || !league) {
    return { error: leagueError || new Error('讀取聯賽失敗。') }
  }

  const { data: records, error: recordError } = await supabase
    .from('personal_records')
    .select('guild_name, player_name, class_name, kills, assists, resources, damage_to_players, damage_to_buildings, healing, damage_taken, serious_injuries, feather_spring, burning_bone')
    .eq('league_id', leagueId)

  if (recordError) {
    return { error: recordError }
  }

  return { league, records: records || [] }
}
