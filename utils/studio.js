// studio.js — 工作室资料（老师可编辑，接入云开发后换 settings 集合的单条文档）
const KEY = 'studio'

const cloudkit = require('./cloudkit.js')
const DEFAULTS = {
  name: '两仪音乐工作室',
  intro: '',
  phone: '',
  address: '',
  wechat: '',
  hours: ''
}

const COLL = 'settings'
const DOC_ID = 'studio'

/** 单文档也套一层数组，复用 cloudkit 的差分同步 */
function put(row) {
  wx.setStorageSync(KEY, row)
  cloudkit.markDirty(COLL)
  return row
}

function hydrate(rows) {
  const hit = (rows || []).filter(function (r) { return r.id === DOC_ID })[0]
  if (!hit) return wx.getStorageSync(KEY)          // 云端还没有记录：保留本地
  const c = Object.assign({}, hit)
  delete c.id
  wx.setStorageSync(KEY, c)
  return c
}

cloudkit.register(COLL, {
  coll: COLL,
  read: function () {
    const d = wx.getStorageSync(KEY)
    if (!d || typeof d !== 'object') return []
    return [Object.assign({ id: DOC_ID }, d)]
  },
  write: hydrate
})

function get() {
  const saved = wx.getStorageSync(KEY)
  if (saved && saved.name !== undefined) {
    // 补齐旧数据缺失字段
    const out = {}
    Object.keys(DEFAULTS).forEach(function (k) { out[k] = saved[k] === undefined ? DEFAULTS[k] : saved[k] })
    return out
  }
  put(DEFAULTS)
  return DEFAULTS
}

function save(data) {
  const name = (data.name || '').trim()
  if (!name) throw new Error('请填写工作室名称')
  const phone = (data.phone || '').trim()
  if (phone && !/^1[3-9]\d{9}$/.test(phone) && !/^0\d{2,3}-?\d{7,8}$/.test(phone)) {
    throw new Error('联系电话格式不正确')
  }
  const row = {
    name: name,
    intro: (data.intro || '').trim(),
    phone: phone,
    address: (data.address || '').trim(),
    wechat: (data.wechat || '').trim(),
    hours: (data.hours || '').trim()
  }
  put(row)
  return row
}

/** 是否已填写完整（用于提示老师补全） */
function incomplete() {
  const s = get()
  return !s.intro || !s.phone || !s.address
}

function reset() { put(DEFAULTS); return DEFAULTS }

module.exports = { get: get, save: save, incomplete: incomplete, reset: reset, DEFAULTS: DEFAULTS }
