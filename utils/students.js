// students.js — 学员名册（本地缓存，接入云开发后换 students 集合）
// 一个学员可以报多门课，课时与报名周期都挂在「报名记录」上，不在学员身上。
const KEY = 'students'

const cloudkit = require('./cloudkit.js')
const SEED = [
  { id: 's1', name: '张小明', phone: '13500000001', note: '考级',
    enrollments: [
      { courseType: 'piano', totalLessons: 12, doneBefore: 8, start: '2026-03-01', end: '2026-12-31' },
      { courseType: 'vocal', totalLessons: 6,  doneBefore: 2, start: '2026-05-10', end: '' }
    ] },
  { id: 's2', name: '李小红', phone: '13500000002', note: '声乐',
    enrollments: [{ courseType: 'vocal', totalLessons: 6, doneBefore: 5, start: '2026-05-10', end: '' }] },
  { id: 's3', name: '王小华', phone: '13500000003', note: '吉他 · 初学者',
    enrollments: [{ courseType: 'guitar', totalLessons: 4, doneBefore: 3, start: '', end: '' }] },
  { id: 's4', name: '赵小强', phone: '13500000004', note: '录音',
    enrollments: [{ courseType: 'record', totalLessons: 2, doneBefore: 1, start: '', end: '' }] },
  { id: 's5', name: '陈佳怡', phone: '13500000005', note: '钢琴 · 考级',
    enrollments: [
      { courseType: 'piano', totalLessons: 20, doneBefore: 6, start: '2026-01-05', end: '2026-12-31' },
      { courseType: 'vocal', totalLessons: 8,  doneBefore: 0, start: '2026-10-01', end: '2027-01-31' }
    ] },
  { id: 's6', name: '周思远', phone: '13500000006', note: '声乐 · 试课',
    enrollments: [{ courseType: 'vocal', totalLessons: 1, doneBefore: 0, start: '', end: '' }] }
]

const COLL = 'students'

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

/** 新字段可能不存在于旧缓存，读取时补默认值 */
function normalizeE(e) {
  return {
    courseType: e.courseType,
    totalLessons: parseInt(e.totalLessons, 10) || 0,
    doneBefore:   parseInt(e.doneBefore, 10) || 0,
    start: e.start || '',
    end:   e.end || ''
  }
}

function normalize(t) {
  return {
    id: t.id, name: t.name, phone: t.phone || '', note: t.note || '',
    enrollments: (t.enrollments || []).map(normalizeE)
  }
}

function normAll(rows) { return (rows || []).map(normalize) }

function list() {
  const saved = wx.getStorageSync(KEY)
  // 名册里没有 enrollments 的都是旧结构缓存（一课时一周期），
  // 那是开发期示例数据，直接丢掉重新播种，不搬旧数字
  if (saved && saved.length && saved.every(function (r) { return Array.isArray(r.enrollments) })) {
    return normAll(saved)
  }
  put(normAll(SEED))
  return normAll(SEED)
}

function save(rows) { put(rows); return rows }

function checkEnrollment(e) {
  if (e.totalLessons < 0 || e.doneBefore < 0) throw new Error('节数不能为负')
  if (e.totalLessons && e.doneBefore > e.totalLessons) throw new Error('已上不能大于共报')
  if (e.start && e.end && e.end < e.start) throw new Error('结束日期不能早于开始日期')
}

function byPhone(phone) { return list().filter(function (t) { return t.phone === phone })[0] || null }

function byId(id) {
  return list().filter(function (s) { return s.id === id })[0] || null
}

function add(data) {
  const rows = list()
  const name = (data.name || '').trim()
  if (!name) throw new Error('请填写学员姓名')
  if (rows.some(function (r) { return r.name === name })) throw new Error('已有同名学员')
  const phone = (data.phone || '').trim()
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) throw new Error('手机号格式不正确')
  rows.push(normalize({
    id: 's' + Date.now().toString(36), name: name, phone: phone,
    note: (data.note || '').trim(), enrollments: []
  }))
  put(rows)
  return rows
}

function update(id, data) {
  const cur = byId(id)
  if (!cur) throw new Error('学员不存在')
  const rows = list()
  const name = (data.name || '').trim()
  if (!name) throw new Error('请填写学员姓名')
  if (rows.some(function (r) { return r.name === name && r.id !== id })) throw new Error('已有同名学员')
  const phone = (data.phone || '').trim()
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) throw new Error('手机号格式不正确')
  // 报名记录不由这个入口改：整条带过去，避免编辑资料时把课时报掉
  return save(rows.map(function (r) {
    return r.id === id
      ? normalize({ id: id, name: name, phone: phone, note: (data.note || '').trim(),
                    enrollments: r.enrollments })
      : r
  }))
}

function remove(id) {
  const rows = list().filter(function (r) { return r.id !== id })
  put(rows)
  return rows
}

/** 某学员的全部报名（按登记顺序） */
function enrollments(id) {
  const s = byId(id)
  return s ? s.enrollments : []
}

/** 某学员在某一门课上的报名；没报过返回 null */
function enrollment(id, courseType) {
  return enrollments(id).filter(function (e) { return e.courseType === courseType })[0] || null
}

/** 新增或覆盖一门课的报名（同一类型只留一条，续报就是改这条的节数） */
function setEnrollment(id, data) {
  const rows = list()
  const next = normalizeE({
    courseType: data.courseType, totalLessons: data.totalLessons,
    doneBefore: data.doneBefore, start: data.start, end: data.end
  })
  if (!next.courseType) throw new Error('请选择课程类型')
  checkEnrollment(next)
  const hit = rows.filter(function (r) { return r.id === id })[0]
  if (!hit) throw new Error('学员不存在')
  const isNew = !hit.enrollments.some(function (e) { return e.courseType === next.courseType })
  hit.enrollments = isNew
    ? hit.enrollments.concat([next])
    : hit.enrollments.map(function (e) { return e.courseType === next.courseType ? next : e })
  put(rows)
  return next
}

function removeEnrollment(id, courseType) {
  const rows = list()
  const hit = rows.filter(function (r) { return r.id === id })[0]
  if (!hit) throw new Error('学员不存在')
  hit.enrollments = hit.enrollments.filter(function (e) { return e.courseType !== courseType })
  put(rows)
  return hit.enrollments
}

/** 精简快照，存进课表用（防止学员改名后历史记录跟着变） */
function snapshot(id) {
  const s = byId(id)
  return s ? { id: s.id, name: s.name } : null
}

module.exports = {
  list: list, byId: byId, byPhone: byPhone, add: add, update: update, remove: remove,
  enrollments: enrollments, enrollment: enrollment,
  setEnrollment: setEnrollment, removeEnrollment: removeEnrollment,
  snapshot: snapshot
}
