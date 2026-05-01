// 職業顯示順序
export const JOB_ORDER = ['碎夢', '神相', '血河', '九靈', '玄機', '龍吟', '鐵衣', '素問']

// 職業主色
export const JOB_CLR = {
  '碎夢': '#5b9bd5',
  '神相': '#4fc3f7',
  '血河': '#ef5350',
  '九靈': '#ab47bc',
  '玄機': '#d4a63a',
  '龍吟': '#66bb6a',
  '鐵衣': '#ffca28',
  '素問': '#f48fb1',
}

// 自選象限可選軸
export const CQ_AXES = [
  { label: '人傷', key: 'damage_to_players' },
  { label: '塔傷', key: 'damage_to_buildings' },
  { label: '治療', key: 'healing' },
  { label: '承傷', key: 'damage_taken' },
  { label: '重傷', key: 'serious_injuries' },
  { label: '化羽', key: 'feather_spring' },
  { label: '焚骨', key: 'burning_bone' },
  { label: '擊殺', key: 'kills' },
  { label: '助攻', key: 'assists' },
  { label: '傷害/擊殺', key: 'kill_eff' },
  { label: '淨奶量', key: 'net_heal' },
  { label: '救援差', key: 'rescue_diff' },
]
