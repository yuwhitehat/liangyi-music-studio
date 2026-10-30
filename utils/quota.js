// quota.js — 课时汇总与超支检查（按课程分别计）
// 单独成模块：students 与 lessons 互相有依赖，放任意一边都会循环引用
const students = require('./students.js')
const lessons  = require('./lessons.js')
const courses  = require('./courses.js')

function one(rec, e, keys) {
  // 「已上」的唯一口径：签到完成的课 + 取消时勾选了扣课时的课，且只算这门课
  const inApp = lessons.all().filter(function (l) {
    return lessons.countsAsDone(l, keys, e.courseType)
  }).length
  const total = e.totalLessons || 0
  const used = (e.doneBefore || 0) + inApp
  return {
    sid: rec.id, name: rec.name,
    courseType: e.courseType, courseName: courses.byId(e.courseType).name,
    total: total, used: used, inApp: inApp,
    remain: total - used,          // 允许为负，如实反映超支
    over: total > 0 && used > total,
    overBy: total > 0 && used > total ? used - total : 0,
    hasTotal: total > 0, hasUsed: used > 0,
    start: e.start || '', end: e.end || ''
  }
}

/**
 * 某学员在某一门课上的课时汇总。
 * 没报这门课返回 null —— 调用方要区分「没报」和「报了但没填节数」。
 * keys 传该学员的全部身份键（sid / openid / p_手机号）。
 */
function summary(sid, courseType, keys) {
  const rec = students.byId(sid)
  if (!rec) return null
  const e = students.enrollment(sid, courseType)
  if (!e) return null
  return one(rec, e, keys && keys.length ? keys : [sid])
}

/** 某学员全部门课的汇总，按登记顺序 */
function enrollmentsOf(sid, keys) {
  const rec = students.byId(sid)
  if (!rec) return []
  const ks = keys && keys.length ? keys : [sid]
  return rec.enrollments.map(function (e) { return one(rec, e, ks) })
}

/** 一节课上的学员里，签到后会导致超支的人（只比对这节课类型的报名） */
function overQuotaAfterCheckIn(lesson) {
  if (!lesson || !lesson.students) return []
  const out = []
  ;(lesson.students || []).forEach(function (st) {
    const s = summary(st.id, lesson.courseType)
    if (s && s.over) out.push(s)
  })
  return out
}

/**
 * 老师指定学员时的两类异常：没报这门课 / 这门课已超支。
 * 只汇报，不拦 —— 老师看完自己决定要不要排。返回 [{ id, name, kind, text }]。
 */
function auditStudents(courseType, picked) {
  if (!courseType || !picked || !picked.length) return []
  const cname = courses.byId(courseType).name
  return picked.map(function (p) {
    const id = p && (p.id || p)
    const name = (p && p.name) || (students.byId(id) || {}).name || id
    const s = summary(id, courseType)
    if (!s) return { id: id, name: name, kind: 'none', text: name + '：没报「' + cname + '」这门课' }
    if (s.over) {
      return { id: id, name: name, kind: 'over',
               text: name + '：' + cname + ' 报名 ' + s.total + ' 节，已上 ' + s.used + ' 节（超 ' + s.overBy + ' 节）' }
    }
    return null
  }).filter(Boolean)
}

/**
 * 学员能不能约这门课的闸门：报了才能约，课时超了得先找老师补。
 * 返回 { ok, reason }，reason 直接给弹窗用。
 */
function bookable(keys, courseType) {
  const rec = (keys || []).map(function (k) { return students.byId(k) }).filter(Boolean)[0]
  if (!rec) return { ok: false, reason: '老师还没给你登记报名课程，请联系老师。' }
  const e = students.enrollment(rec.id, courseType)
  if (!e) {
    return { ok: false, reason: '你没有报名这门课，约不了。想学的话请联系老师登记。' }
  }
  const s = one(rec, e, keys)
  if (s.over) {
    return { ok: false, reason: '你报名的「' + s.courseName + '」共 ' + s.total + ' 节、已上 ' + s.used
      + ' 节，超出 ' + s.overBy + ' 节。请先联系老师补充课时，再回来约这节课。', over: true }
  }
  return { ok: true, quota: s }
}

/** 系统内已计入这门课的节数（不含老师录入的基线） */
function doneInApp(sid, courseType) {
  if (!sid || !courseType) return 0
  return lessons.all().filter(function (l) { return lessons.countsAsDone(l, [sid], courseType) }).length
}

module.exports = {
  summary: summary, enrollmentsOf: enrollmentsOf, doneInApp: doneInApp,
  overQuotaAfterCheckIn: overQuotaAfterCheckIn,
  auditStudents: auditStudents, bookable: bookable
}
