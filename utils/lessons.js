// lessons.js — 课表数据源（本地缓存，接入云开发后换 lessons 集合）
const students = require('./students.js')
const courses = require('./courses.js')
const dateUtil = require('./date.js')

const KEY = 'lessons'

const cloudkit = require('./cloudkit.js')
const COLL = 'lessons'

function put(rows) { wx.setStorageSync(KEY, rows); cloudkit.markDirty(COLL); return rows }

/** 云端全量回填：不标脏，避免回环推送 */
function hydrate(rows) {
  wx.setStorageSync(KEY, rows || [])
  return rows || []
}

cloudkit.register(COLL, {
  coll: COLL,
  read: function () { return wx.getStorageSync(KEY) || [] },
  write: hydrate
})

function toMin(hm) { const p = hm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10) }
function timeCross(a, b) {
  return a.date === b.date &&
         toMin(a.timeStart) < toMin(b.timeEnd) &&
         toMin(b.timeStart) < toMin(a.timeEnd)
}

/**
 * 课程时间冲突规则：
 * 只有「同一课程类型」才互斥 —— 不同课程可由不同老师同时开，时间允许重叠。
 */
function overlap(a, b) {
  if (a.courseType !== b.courseType) return false
  return timeCross(a, b)
}

/**
 * 学员冲突规则：同一个学员同一时刻只能在一节课上（跨课程类型也互斥）。
 */
function studentClash(rows, pickedIds, cand) {
  if (!pickedIds || !pickedIds.length) return null
  for (let i = 0; i < rows.length; i++) {
    const l = rows[i]
    if (l.status === 'cancelled' || !timeCross(l, cand)) continue
    const hit = (l.students || []).filter(function (s) { return pickedIds.indexOf(s.id) > -1 })[0]
    if (hit) return { lesson: l, student: hit }
  }
  return null
}

function seed() {
  const today = dateUtil.formatDate(new Date())
  const d1 = dateUtil.formatDate(new Date(Date.now() + 86400000))
  const c = function (id) { return courses.byId(id) }
  const piano = c('piano'), vocal = c('vocal'), guitar = c('guitar')
  // 学员可能不在名册里（如名册被清空），snapshot 会返回 null —— 必须过滤，
  // 否则课表里会存进 null，渲染时读 x.id 直接报错
  const snap = function (id) { return students.snapshot(id) }
  const snaps = function (ids) { return ids.map(snap).filter(Boolean) }
  return [
    { id: 'L1', date: today, timeStart: '09:00', timeEnd: '10:00', timeSlot: '09:00–10:00', minutes: 60,
      courseType: piano.id, courseName: piano.name, ill: piano.ill,
      booked: true, students: snaps(['s1']), status: 'booked' },
    { id: 'L2', date: today, timeStart: '14:00', timeEnd: '15:00', timeSlot: '14:00–15:00', minutes: 60,
      courseType: guitar.id, courseName: guitar.name, ill: guitar.ill,
      booked: false, students: [], status: 'available' },
    { id: 'L3', date: d1, timeStart: '10:00', timeEnd: '10:45', timeSlot: '10:00–10:45', minutes: 45,
      courseType: vocal.id, courseName: vocal.name, ill: vocal.ill,
      booked: true, students: snaps(['s2']), status: 'booked' }
  ]
}

/**
 * 读取时归一化：老缓存（修复前写入的）缺 timeSlot / minutes 时按起止时间补齐。
 * 放在读取入口，保证所有页面拿到的字段一定完整，不必各自兜底。
 */
function normalize(l) {
  if (!l || !l.timeStart || !l.timeEnd) return l
  const out = Object.assign({}, l)
  if (!out.timeSlot) out.timeSlot = out.timeStart + '–' + out.timeEnd
  if (!out.minutes) {
    const m = toMin(out.timeEnd) - toMin(out.timeStart)
    if (m > 0) out.minutes = m
  }
  return out
}

function list() {
  const saved = wx.getStorageSync(KEY)
  if (saved && saved.length) return saved.map(normalize)
  const s = seed()
  put(s)
  return s.map(normalize)
}
function save(rows) { put(rows); return rows }

function all() { return list() }

/** 某天全部课程（重叠检测与日课表都用它） */
function forDate(date) {
  return list().filter(function (l) { return l.date === date })
              .sort(function (a, b) { return toMin(a.timeStart) - toMin(b.timeStart) })
}

/**
 * 批量排课：同时校验
 *  ① 与数据库里已有课程的时间冲突（跨课程类型也不允许重叠）
 *  ② 本批次内部互相冲突
 * 返回 { ok, added, conflict }
 */

/**
 * 周期展开：repeat = 0 不重复 / 7 每周 / 14 隔周
 * times 为次数（不重复时恒为 1）
 */
function expand(item) {
  const times = item.repeat ? Math.max(1, parseInt(item.times, 10) || 1) : 1
  const step = item.repeat || 0
  const out = []
  for (let i = 0; i < times; i++) {
    out.push({
      ...item,
      date: step ? dateUtil.addDays(item.date, step * i) : item.date,
      occurrence: i + 1,
      total: times,
      seriesIndex: i
    })
  }
  return out
}

/** 周期标签，如「每周 · 共 8 节」 */
function seriesLabel(item) {
  if (!item.repeat) return ''
  const w = dateUtil.getWeekdayText(new Date(item.date).getDay())
  const unit = item.repeat === 14 ? '隔周' : '每周'
  return unit + '周' + w + ' · 共 ' + (parseInt(item.times, 10) || 1) + ' 节'
}

function addMany(items) {
  const existing = list()
  const batch = []
  const conflicts = []

  // 先把周期课展开成具体日期的单节
  const flat = []
  items.forEach(function (it) {
    expand(it).forEach(function (x) { flat.push(x) })
  })

  flat.forEach(function (it, idx) {
    if (!it.timeStart || !it.timeEnd) { conflicts.push('缺少时间'); return }
    if (toMin(it.timeEnd) <= toMin(it.timeStart)) {
      conflicts.push(it.timeStart + '–' + it.timeEnd + ' 结束需晚于开始'); return
    }

    const pool = existing.concat(batch)

    // ① 同课程类型时间互斥（不同类型可由不同老师并行）
    const hitType = pool.filter(function (l) { return overlap(l, it) })[0]
    if (hitType) {
      conflicts.push(it.date + ' ' + it.timeStart + '–' + it.timeEnd + ' ' + it.courseName
        + '｜与已排的 ' + hitType.timeStart + '–' + hitType.timeEnd + ' ' + hitType.courseName + ' 时间重叠')
      return
    }

    // ② 同一学员不能同时上两节课（跨课程类型也互斥）
    const ids = (it.students || []).map(function (x) { return x.id })
    const clash = studentClash(pool, ids, it)
    if (clash) {
      conflicts.push(it.date + ' ' + it.timeStart + '–' + it.timeEnd + ' ' + it.courseName
        + '｜学员「' + clash.student.name + '」此时段已有 ' + clash.lesson.courseName + ' 课')
      return
    }

    const course = courses.byId(it.courseType)
    const picked = (it.students || []).map(function (x) { return students.snapshot(x.id || x) }).filter(Boolean)
    const booked = !!it.booked && picked.length > 0

    batch.push({
      id: 'L' + Date.now().toString(36) + idx,
      date: it.date, timeStart: it.timeStart, timeEnd: it.timeEnd,
      timeSlot: it.timeStart + '–' + it.timeEnd, minutes: it.minutes,
      courseType: course.id, courseName: course.name, ill: course.ill,
      booked: booked, students: booked ? picked : [],
      status: booked ? 'booked' : 'available',
      // 固定课标记：同一次周期排课共享 seriesId，便于以后整组管理
      seriesId: it.repeat ? 'S' + Date.now().toString(36) : '',
      seriesLabel: seriesLabel(it),
      occurrence: it.total > 1 ? it.occurrence + '/' + it.total : '',
      createdAt: Date.now()
    })
  })

  if (batch.length) save(existing.concat(batch))
  return { ok: batch.length > 0, added: batch.length, conflict: conflicts }
}

/** 给某节课指定 / 更换学员 */
/**
 * 指定学员。返回 { ok, students, reason } —— 调用方必须检查 ok，
 * 不能无条件弹「约课成功」（之前的静默失败就是这么来的）。
 */
function book(id, picked) {
  const list0 = list()
  const target = list0.filter(function (l) { return l.id === id })[0]
  if (!target) return { ok: false, students: [], reason: '课程不存在' }
  if (target.status === 'completed') return { ok: false, students: target.students || [], reason: '这节课已完成' }
  if (target.status === 'cancelled') return { ok: false, students: [], reason: '这节课已取消' }

  const norm = []
  ;(picked || []).forEach(function (x) {
    const raw = (x && (x.id || x)) || ''
    const name = (x && x.name) || ''
    const snap = students.snapshot(raw)
    // 名册查不到时保留原 id + 姓名，绝不静默丢弃
    if (snap) norm.push(snap)
    else if (raw && name) norm.push({ id: raw, name: name })
  })

  if (!norm.length) return { ok: false, students: [], reason: '学员身份无效，请重新登录' }

  const rows = list0.map(function (l) {
    return l.id === id ? { ...l, booked: true, students: norm, status: 'booked' } : l
  })
  save(rows)
  return { ok: true, students: norm, reason: '' }
}

function unbook(id) { return book(id, []) }

/* ─────────────────────────────────
 * 学员侧操作：规则在数据层强制，不依赖界面判断
 * 老师侧的 complete() / cancel() 不受时间限制
 * ───────────────────────────────── */
const CANCEL_LIMIT_HOURS = 6

function find(id) { return list().filter(function (l) { return l.id === id })[0] || null }

/** 学员签到：仅今天、且状态为已约 */
function completeByStudent(id) {
  const l = find(id)
  if (!l) return { ok: false, reason: '课程不存在' }
  const gate = canCheckIn(l)          // 与老师端共用同一套签到规则
  if (!gate.ok) return gate
  return complete(id)
}

/** 学员取消：距开课需大于 6 小时 */
function cancelByStudent(id) {
  const l = find(id)
  if (!l) return { ok: false, reason: '课程不存在' }
  if (l.status === 'cancelled') return { ok: false, reason: '这节课已经取消过了' }
  if (l.status === 'completed') return { ok: false, reason: '这节课已完成' }
  // 与界面同一套算法，避免两处实现漂移
  const gap = dateUtil.hoursUntil(l.date, l.timeStart)
  if (!(gap > CANCEL_LIMIT_HOURS)) {
    return { ok: false, reason: '距开课不足 ' + CANCEL_LIMIT_HOURS + ' 小时，请联系老师取消', limited: true }
  }
  const r = cancel(id)
  return r.ok ? { ok: true, gap: gap, released: r.released } : r
}

/**
 * 签到资格：只能给「已开课」或「当天」的课签到。
 *  - 未来的课（明天及以后）一律拒绝，避免误触把没上的课标成已完成
 *  - 已过去的课允许，方便老师事后补签
 * 老师和学员共用这一条规则。
 */
function canCheckIn(l) {
  if (!l) return { ok: false, reason: '课程不存在' }
  if (l.status === 'completed') return { ok: false, reason: '这节课已签到' }
  if (l.status === 'cancelled') return { ok: false, reason: '这节课已取消，无法签到' }
  const today = dateUtil.formatDate(new Date())
  const started = dateUtil.hoursUntil(l.date, l.timeStart) <= 0
  if (!started && l.date !== today) {
    return { ok: false, reason: '只能签到当天或已开课的', future: true }
  }
  return { ok: true }
}

/** 是否已过结束时间（决定取消后是「保留名单」还是「释放为待约」） */
function hasEnded(l) {
  return !!l && dateUtil.hoursUntil(l.date, l.timeEnd) <= 0
}

function complete(id) {
  const l = find(id)
  const gate = canCheckIn(l)
  if (!gate.ok) return gate
  save(list().map(function (x) { return x.id === id ? { ...x, status: 'completed' } : x }))
  return { ok: true }
}

/**
 * 取消课程，按「是否已过结束时间」分两种结果：
 *  - 已下课：保留学员名单，标记 cancelled（历史要能查是谁上的）
 *  - 未下课：释放为待约（清掉学员），这节课重新开放给别人约
 */
function cancel(id) {
  const l = find(id)
  if (!l) return { ok: false, reason: '课程不存在' }
  if (l.status === 'cancelled') return { ok: false, reason: '这节课已经取消过了' }
  if (l.status === 'completed') return { ok: false, reason: '这节课已完成，无法取消' }

  const ended = dateUtil.hoursUntil(l.date, l.timeEnd) <= 0
  save(list().map(function (x) {
    if (x.id !== id) return x
    return ended
      ? { ...x, status: 'cancelled' }                                  // 保留 students
      : { ...x, status: 'available', booked: false, students: [] }     // 释放
  }))
  return { ok: true, released: !ended }
}

function remove(id) { return save(list().filter(function (l) { return l.id !== id })) }

/** 某天某时段之后仍未开始的课 */
function upcoming() {
  const today = dateUtil.formatDate(new Date())
  return list().filter(function (l) { return l.date >= today && l.status !== 'cancelled' && l.status !== 'completed' })
               .sort(function (a, b) { return (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1 })
}

/** 老师端统计 */
function stats() {
  const today = dateUtil.formatDate(new Date())
  const rows = list()
  return {
    todayCount: rows.filter(function (l) { return l.date === today && l.status !== 'cancelled' }).length,
    pendingCount: rows.filter(function (l) { return l.status === 'booked' && l.date >= today }).length,
    openCount: rows.filter(function (l) { return l.status === 'available' && l.date >= today }).length,
    completedCount: rows.filter(function (l) { return l.status === 'completed' }).length
  }
}

/** 重置为示例数据 */
function reset() { wx.removeStorageSync(KEY); return list() }

module.exports = {
  all: all, list: list, forDate: forDate, addMany: addMany,
  book: book, unbook: unbook, complete: complete, cancel: cancel, remove: remove,
  completeByStudent: completeByStudent, cancelByStudent: cancelByStudent,
  CANCEL_LIMIT_HOURS: CANCEL_LIMIT_HOURS,
  canCheckIn: canCheckIn, hasEnded: hasEnded,
  upcoming: upcoming, stats: stats, reset: reset,
  overlap: overlap, timeCross: timeCross, studentClash: studentClash, expand: expand
}
