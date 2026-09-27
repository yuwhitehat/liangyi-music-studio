// courses.js — 课程类型可编辑数据源
// 本地缓存优先，接入云开发后由 courses 集合替代（见文末注释）
const { COURSE_TYPES } = require('./constants.js')

const KEY = 'courseTypes'

const cloudkit = require('./cloudkit.js')
/** 读取课程类型列表（首次用默认值播种） */
const COLL = 'courses'

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

function list() {
  const saved = wx.getStorageSync(KEY)
  if (saved && saved.length) return saved
  const seeded = COURSE_TYPES.map(function (c, i) {
    return { id: c.id, name: c.name, ill: c.ill, duration: c.duration, sort: i }
  })
  put(seeded)
  return seeded
}

function save(rows) {
  put(rows)
  return rows
}

/** 按 id 取单个（课表渲染时用，兼容已被删除的旧类型） */
function byId(id) {
  const hit = list().filter(function (c) { return c.id === id })[0]
  return hit || { id: id, name: '课程', ill: 'ic-piano', duration: 60 }
}

function genId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** 新增 */
function add(data) {
  const rows = list()
  const name = (data.name || '').trim()
  if (!name) throw new Error('请填写课程名称')
  if (rows.some(function (r) { return r.name === name })) throw new Error('已有同名课程')
  const dur = parseInt(data.duration, 10)
  if (!dur || dur < 10 || dur > 480) throw new Error('时长需在 10–480 分钟之间')
  if (rows.some(function (r) { return r.ill === data.ill })) throw new Error('该图标已被占用')

  rows.push({ id: genId(), name: name, ill: data.ill, duration: dur, sort: rows.length })
  save(rows)
  return rows
}

/** 修改 */
function update(id, data) {
  const rows = list()
  const name = (data.name || '').trim()
  const dur = parseInt(data.duration, 10)
  if (!name) throw new Error('请填写课程名称')
  if (!dur || dur < 10 || dur > 480) throw new Error('时长需在 10–480 分钟之间')
  if (rows.some(function (r) { return r.name === name && r.id !== id })) throw new Error('已有同名课程')
  if (rows.some(function (r) { return r.ill === data.ill && r.id !== id })) throw new Error('该图标已被占用')

  return save(rows.map(function (r) {
    return r.id === id ? { id: id, name: name, ill: data.ill, duration: dur, sort: r.sort } : r
  }))
}

/** 删除 */
function remove(id) {
  return save(list().filter(function (r) { return r.id !== id }))
}

/** 恢复默认四门课 */
function reset() {
  wx.removeStorageSync(KEY)
  return list()
}

// ─────────────────────────────────────────────
// 接入云开发后，把上面的读写换成：
//   list   → db.collection('courses').where({ teacherOpenid }).orderBy('sort').get()
//   add    → db.collection('courses').add({ data })
//   update → db.collection('courses').doc(id).update({ data })
//   remove → db.collection('courses').doc(id).remove()
// 建议集合字段：_id id name ill duration sort teacherOpenid
// ─────────────────────────────────────────────

module.exports = { list: list, byId: byId, add: add, update: update, remove: remove, reset: reset }
