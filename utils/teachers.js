// teachers.js — 老师登记表（本地缓存，接入云开发后换 teachers 集合）
// 登录身份判定、超管授权都以这份数据为准
const KEY = 'teachers'
const VER_KEY = 'teachers_ver'
const SEED_VER = 1   // 给 SEED 加字段时 +1，老缓存自动补齐

const cloudkit = require('./cloudkit.js')
const SEED = [
  { id: 't1', name: '林老师', phone: '13800000000', isSuperAdmin: true,  perms: { editStudio: true  } },
  { id: 't2', name: '苏老师', phone: '13900000001', isSuperAdmin: false, perms: { editStudio: false } }
]

const COLL = 'teachers'

/** 统一字段，缺 perms 的老数据补成只读 */
function normalize(t) {
  const perms = Object.assign({ editStudio: false }, t.perms || {})
  return {
    id: t.id, name: t.name, phone: t.phone || '',
    isSuperAdmin: !!t.isSuperAdmin,
    perms: t.isSuperAdmin ? { editStudio: true } : perms
  }
}
function normAll(rows) { return (rows || []).map(normalize) }

/** 种子升级：老缓存缺失的新字段按 id 从 SEED 补齐，不覆盖已有值 */
function upgrade(rows) {
  const ver = parseInt(wx.getStorageSync(VER_KEY), 10) || 0
  if (ver >= SEED_VER) return rows
  const byId = {}
  SEED.forEach(function (t) { byId[t.id] = t })
  const merged = rows.map(function (r) {
    const seed = byId[r.id]
    if (!seed) return r
    const out = Object.assign({}, r)
    if (out.perms === undefined && seed.perms) out.perms = seed.perms
    if (!out.id && seed.id) out.id = seed.id
    return out
  })
  wx.setStorageSync(VER_KEY, SEED_VER)
  return merged
}

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

function save(rows) { put(rows); return rows }

function list() {
  const saved = wx.getStorageSync(KEY)
  if (saved && saved.length) {
    const ver = parseInt(wx.getStorageSync(VER_KEY), 10) || 0
    if (ver >= SEED_VER) return normAll(saved)
    // upgrade 必须作用于原始缓存，否则 normalize 会先把字段补出来，
    // 导致分不清「字段缺失」与「老师填了合法默认值」
    const rows = normAll(upgrade(saved))
    put(rows)
    return rows
  }
  put(SEED)
  wx.setStorageSync(VER_KEY, SEED_VER)
  return normAll(SEED)
}

function byId(id) { return list().filter(function (t) { return t.id === id })[0] || null }
function byPhone(phone) { return list().filter(function (t) { return t.phone === phone })[0] || null }

function genId() { return 't' + Date.now().toString(36) }
function validPhone(p) { return /^1[3-9]\d{9}$/.test(p) }

/** 权限判定：超管天然拥有全部权限 */
function can(teacher, key) {
  if (!teacher) return false
  if (teacher.isSuperAdmin) return true
  return !!(teacher.perms && teacher.perms[key])
}

function add(data) {
  const rows = list()
  const name = (data.name || '').trim()
  const phone = (data.phone || '').trim()
  if (!name) throw new Error('请填写老师姓名')
  if (!validPhone(phone)) throw new Error('手机号格式不正确')
  if (rows.some(function (r) { return r.phone === phone })) throw new Error('该手机号已登记')
  if (rows.some(function (r) { return r.name === name })) throw new Error('已有同名老师')

  rows.push({
    id: genId(), name: name, phone: phone,
    isSuperAdmin: false,
    perms: { editStudio: !!data.editStudio }
  })
  return save(rows)
}

function update(id, data) {
  const rows = list()
  const name = (data.name || '').trim()
  const phone = (data.phone || '').trim()
  if (!name) throw new Error('请填写老师姓名')
  if (!validPhone(phone)) throw new Error('手机号格式不正确')
  if (rows.some(function (r) { return r.phone === phone && r.id !== id })) throw new Error('该手机号已被占用')
  return save(rows.map(function (r) {
    if (r.id !== id) return r
    return { ...r, name: name, phone: phone }
  }))
}

/** 授权 / 收回某项权限（超管自身始终为 true，不可收回） */
function setPerm(id, key, on) {
  const t = byId(id)
  if (!t) throw new Error('老师不存在')
  if (t.isSuperAdmin && !on) throw new Error('超级管理员始终拥有全部权限')
  const perms = Object.assign({}, t.perms || {})
  perms[key] = !!on
  return save(list().map(function (r) { return r.id === id ? { ...r, perms: perms } : r }))
}

/** 提升 / 取消超管；最后一个超管不可降级，避免无人可管理 */
function setSuper(id, on) {
  const rows = list()
  const t = rows.filter(function (r) { return r.id === id })[0]
  if (!t) throw new Error('老师不存在')
  if (!on && t.isSuperAdmin && rows.filter(function (r) { return r.isSuperAdmin }).length <= 1) {
    throw new Error('至少要保留一位超级管理员')
  }
  return save(rows.map(function (r) {
    if (r.id !== id) return r
    // 提升：全部权限随之打开（超管天然拥有）
    // 降级：随之收回 —— 这些权限当初是「因为是超管」才有的，
    //        若不收回会出现「已降级却仍保留全部权力」的越权残留
    const perms = {}
    Object.keys(r.perms || {}).forEach(function (k) { perms[k] = !!on })
    return { ...r, isSuperAdmin: !!on, perms: perms }
  }))
}

function remove(id) {
  const rows = list()
  const t = rows.filter(function (r) { return r.id === id })[0]
  if (t && t.isSuperAdmin && rows.filter(function (r) { return r.isSuperAdmin }).length <= 1) {
    throw new Error('不能删除最后一位超级管理员')
  }
  return save(rows.filter(function (r) { return r.id !== id }))
}

function reset() { put(SEED); return SEED }

module.exports = {
  list: list, byId: byId, byPhone: byPhone, can: can,
  add: add, update: update, remove: remove,
  setPerm: setPerm, setSuper: setSuper, reset: reset
}
