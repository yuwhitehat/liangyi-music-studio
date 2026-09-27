// quota.js — 课时超支检查
// 单独成模块：students 与 lessons 互相有依赖，放任意一边都会循环引用
const students = require('./students.js')
const lessons  = require('./lessons.js')

/** 某学员的课时汇总：共报 / 已上（基线+系统内）/ 剩余（可为负） */
function summary(sid) {
  const rec = students.byId(sid)
  if (!rec) return null
  const mine = lessons.all().filter(function (l) {
    return l.status === 'completed' && (l.students || []).some(function (x) { return x && x.id === sid })
  })
  const total = rec.totalLessons || 0
  const used = (rec.doneBefore || 0) + mine.length
  return {
    name: rec.name, total: total, used: used,
    remain: total - used,          // 允许为负，如实反映超支
    over: total > 0 && used > total,
    hasTotal: total > 0, hasUsed: used > 0
  }
}

/** 一节课上的学员里，签到后会导致超支的人 */
function overQuotaAfterCheckIn(lesson) {
  if (!lesson || !lesson.students) return []
  const out = []
  ;(lesson.students || []).forEach(function (st) {
    const s = summary(st.id)
    if (s && s.over) out.push(s)
  })
  return out
}

module.exports = { summary: summary, overQuotaAfterCheckIn: overQuotaAfterCheckIn }
