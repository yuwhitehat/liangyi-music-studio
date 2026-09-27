// students.js — 学员名册（本地缓存，接入云开发后换 students 集合）
const KEY = 'students'
const VER_KEY = 'students_ver'
const SEED_VER = 2   // 给 SEED 加字段时把这个数字 +1，老缓存会自动补齐新字段

const cloudkit = require('./cloudkit.js')
const SEED = [
  { id: 's1', name: '张小明', phone: '13500000001', note: '钢琴 · 四级',
    totalLessons: 12, doneBefore: 8, enrollStart: '2026-03-01', enrollEnd: '2026-12-31' },
  { id: 's2', name: '李小红', phone: '13500000002', note: '声乐',
    totalLessons: 6,  doneBefore: 5, enrollStart: '2026-05-10', enrollEnd: '' },
  { id: 's3', name: '王小华', phone: '13500000003', note: '吉他 · 初学者',
    totalLessons: 4,  doneBefore: 3, enrollStart: '', enrollEnd: '' },
  { id: 's4', name: '赵小强', phone: '13500000004', note: '录音',
    totalLessons: 2,  doneBefore: 1, enrollStart: '', enrollEnd: '' },
  { id: 's5', name: '陈佳怡', phone: '13500000005', note: '钢琴 · 考级',
    totalLessons: 20, doneBefore: 6, enrollStart: '2026-01-05', enrollEnd: '2026-12-31' },
  { id: 's6', name: '周思远', phone: '13500000006', note: '声乐 · 试课',
    totalLessons: 1,  doneBefore: 0, enrollStart: '', enrollEnd: '' }
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
function normalize(t) {
  return {
    id: t.id, name: t.name, phone: t.phone || '', note: t.note || '',
    totalLessons: parseInt(t.totalLessons, 10) || 0,
    doneBefore:   parseInt(t.doneBefore, 10) || 0,
    enrollStart:  t.enrollStart || '',
    enrollEnd:    t.enrollEnd || ''
  }
}

function normAll(rows) { return (rows || []).map(normalize) }

/**
 * 种子升级：老缓存缺失的新字段按 id 从 SEED 补齐。
 * 只填「缺失 / 0 / 空」的值 —— 老师手动编辑过的数据不会被覆盖。
 */
function upgrade(rows) {
  const ver = parseInt(wx.getStorageSync(VER_KEY), 10) || 0
  if (ver >= SEED_VER) return rows
  const byId = {}
  SEED.forEach(function (t) { byId[t.id] = t })
  const merged = rows.map(function (r) {
    const seed = byId[r.id]
    if (!seed) return r
    const out = Object.assign({}, r)
    Object.keys(seed).forEach(function (k) {
      if (k === 'id') return
      // 只补「字段根本不存在」的情况：0 和 '' 都可能是老师有意填的合法值，
      // 当成缺失覆盖会造成数据损坏（例如新学员 doneBefore=0 被补成种子的 8）
      if (!(k in out) || out[k] === undefined || out[k] === null) out[k] = seed[k]
    })
    return out
  })
  wx.setStorageSync(VER_KEY, SEED_VER)
  return merged
}

function list() {
  const saved = wx.getStorageSync(KEY)
  if (saved && saved.length) {
    const ver = parseInt(wx.getStorageSync(VER_KEY), 10) || 0
    if (ver >= SEED_VER) return normAll(saved)
    // 顺序很关键：upgrade 必须作用在**原始缓存**上。
    // 若先 normalize，所有字段会被补成 0，upgrade 就分不清
    // 「老缓存没这个字段」和「老师真的填了 0」，补齐会失效。
    const rows = normAll(upgrade(saved))
    put(rows)
    return rows
  }
  put(SEED)
  wx.setStorageSync(VER_KEY, SEED_VER)
  return normAll(SEED)
}

function save(rows) { put(rows); return rows }

function checkCounts(row) {
  if (row.totalLessons < 0 || row.doneBefore < 0) throw new Error('节数不能为负')
  if (row.totalLessons && row.doneBefore > row.totalLessons) {
    throw new Error('已上课数不能大于共报节数')
  }
  if (row.enrollStart && row.enrollEnd && row.enrollEnd < row.enrollStart) {
    throw new Error('结束日期不能早于开始日期')
  }
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
  const row = normalize({
    id: 's' + Date.now().toString(36), name: name,
    phone: (data.phone || '').trim(), note: (data.note || '').trim(),
    totalLessons: data.totalLessons, doneBefore: data.doneBefore,
    enrollStart: data.enrollStart, enrollEnd: data.enrollEnd
  })
  checkCounts(row)
  rows.push(row); put(rows)
  return rows
}

function update(id, data) {
  const rows = list()
  const name = (data.name || '').trim()
  if (!name) throw new Error('请填写学员姓名')
  if (rows.some(function (r) { return r.name === name && r.id !== id })) throw new Error('已有同名学员')
  const phone = (data.phone || '').trim()
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) throw new Error('手机号格式不正确')
  const next = normalize({
    id: id, name: name, phone: phone, note: (data.note || '').trim(),
    totalLessons: data.totalLessons, doneBefore: data.doneBefore,
    enrollStart: data.enrollStart, enrollEnd: data.enrollEnd
  })
  checkCounts(next)
  return save(rows.map(function (r) { return r.id === id ? next : r }))
}

function remove(id) {
  const rows = list().filter(function (r) { return r.id !== id })
  put(rows)
  return rows
}

/** 精简快照，存进课表用（防止学员改名后历史记录跟着变） */
function snapshot(id) {
  const s = byId(id)
  return s ? { id: s.id, name: s.name } : null
}

module.exports = { list: list, byId: byId, byPhone: byPhone, add: add, update: update, remove: remove, snapshot: snapshot }
