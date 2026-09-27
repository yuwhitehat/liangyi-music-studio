// date.js - 日期处理工具

// 格式化日期 YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 获取接下来 n 天的日期列表
function getNextDays(n) {
  const days = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push({
      date: formatDate(d),
      day: d.getDate(),
      month: d.getMonth() + 1,
      weekday: d.getDay(),
      isToday: i === 0
    })
  }
  return days
}

// 获取星期文字
function getWeekdayText(weekday) {
  return ['日', '一', '二', '三', '四', '五', '六'][weekday] || ''
}

// 友好日期显示
function friendlyDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (formatDate(d) === formatDate(today)) return '今天'
  if (formatDate(d) === formatDate(tomorrow)) return '明天'
  
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = getWeekdayText(d.getDay())
  return `${m}月${day}日 周${w}`
}

// 时间段解析
function parseTimeSlot(slot) {
  const [start, end] = slot.split('-')
  return { start, end }
}


// 在 YYYY-MM-DD 上加 n 天
function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

// 两个 HH:MM 区间是否交叉
function rangeCross(aStart, aEnd, bStart, bEnd) {
  const t = function (hm) { const p = hm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10) }
  return t(aStart) < t(bEnd) && t(bStart) < t(aEnd)
}


// 把 'YYYY-MM-DD' 拆成数字构造 Date。
// 不能用 new Date('2026-09-28T10:00:00')：iOS/JSC 对无时区的 ISO 串
// 常返回 Invalid Date，getTime() 变 NaN，会让所有时间判断失效。
function toDate(dateStr, timeStr) {
  const dp = String(dateStr || '').split('-')
  const tp = String(timeStr || '00:00').split(':')
  return new Date(
    parseInt(dp[0], 10), (parseInt(dp[1], 10) || 1) - 1, parseInt(dp[2], 10) || 1,
    parseInt(tp[0], 10) || 0, parseInt(tp[1], 10) || 0, 0, 0
  )
}

// 距离「date + HH:MM」还有多少小时（负数表示已开课）
function hoursUntil(dateStr, timeStr) {
  const t = toDate(dateStr, timeStr).getTime()
  if (isNaN(t)) return 0
  return (t - Date.now()) / 3600000
}

module.exports = {
  formatDate,
  getNextDays,
  getWeekdayText,
  friendlyDate,
  parseTimeSlot,
  addDays,
  rangeCross,
  hoursUntil,
  toDate
}
