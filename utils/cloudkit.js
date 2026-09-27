/**
 * cloudkit.js — 本地优先 + 云端同步
 *
 * 设计：
 *  - 页面/store 一律**同步读本地缓存**（秒开、离线可用、页面代码零改动）
 *  - store 每次写本地后调用 markDirty(name)
 *  - 本模块把脏数据**异步**推给云函数 sync（失败只告警，不影响界面）
 *  - 启动 / 下拉刷新时 pullAll() 拉全量，回填各 store
 *  - 未配置 CLOUD_ENV 时整个模块静默为「本地模式」
 *
 * 记录一律自带 `id` 字段（不用云端的 _id），避免主键映射带来的坑。
 */
const config = require('./config.js')

const REG = {}                 // name -> { coll, kind, read, write }
const snap = {}                // name -> 上次与云端一致的 JSON
const dirty = {}               // name -> true
let   state = { mode: 'local', lastSync: 0, error: '', busy: false }
let   timer = null

let pulledHook = null
let writable = true          // 学员为只读：他们的改动走 bookRemote，不走通用 push
function register(name, def) {
  REG[name] = def
  snap[name] = null
  dirty[name] = false
}

function mode() { return state.mode }
function status() { return state }

function cloudOn() {
  return config.cloudConfigured() && typeof wx !== 'undefined' && !!wx.cloud
}

function init() {
  if (!config.cloudConfigured()) { state.mode = 'local'; return false }
  if (!wx.cloud) { state.mode = 'local'; state.error = '当前基础库不支持云开发'; return false }
  try {
    wx.cloud.init({ env: config.CLOUD_ENV, traceUser: true })
    state.mode = 'cloud'
    return true
  } catch (e) {
    state.mode = 'local'
    state.error = String(e && e.message || e)
    console.warn('[cloudkit] 云开发初始化失败，退回本地模式：', state.error)
    return false
  }
}

/** store 写完本地后调用 */
function markDirty(name) {
  dirty[name] = true
  if (state.mode !== 'cloud' || !writable) return   // 只读身份不推通用写，避免 403
  schedule()
}

/** 登录后由 app 调用：老师可写，学员只读 */
function setWritable(v) {
  writable = !!v
  if (writable && state.mode === 'cloud') {
    // 恢复写权限时，把之前攒下的脏数据补推上去
    Object.keys(REG).forEach(function (n) { if (dirty[n]) schedule() })
  }
}
function isWritable() { return writable }

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(flush, 600)          // 合并连续操作，减少请求
}

function call(action, payload) {
  return wx.cloud.callFunction({ name: 'sync', data: { action: action, payload: payload } })
    .then(res => res && res.result)
}

/* ── 拉取 ── */
function pullAll() {
  if (!cloudOn() || state.busy) return Promise.resolve({ ok: false, skipped: true })
  state.busy = true
  const names = Object.keys(REG)
  return call('pull', { names: names.map(n => REG[n].coll) }).then(r => {
    state.busy = false
    if (!r || r.code !== 0) {
      state.error = (r && r.message) || '拉取失败'
      console.warn('[cloudkit] pull 失败：', state.error)
      return { ok: false, error: state.error }
    }
    names.forEach(n => {
      const docs = (r.data && r.data[REG[n].coll]) || []
      try { REG[n].write(docs) } catch (e) { console.warn('[cloudkit] 回填失败', n, e) }
      snap[n] = JSON.stringify(docs)
      dirty[n] = false
    })
    state.lastSync = Date.now()
    state.error = ''
    if (pulledHook) { try { pulledHook() } catch (e) { /* 页面可能已销毁 */ } }
    return { ok: true, count: names.length }
  }).catch(e => {
    state.busy = false
    state.error = String(e && e.errMsg || e && e.message || e)
    console.warn('[cloudkit] pull 异常：', state.error)
    return { ok: false, error: state.error }
  })
}

/* ── 推送（按 id 做增/改/删差分）── */
function diffOf(name) {
  const def = REG[name]
  const cur = def.read() || []
  const prev = JSON.parse(snap[name] || '[]')
  const prevMap = {}
  prev.forEach(x => { prevMap[x.id] = x })
  const curIds = {}
  const add = [], update = []
  cur.forEach(x => {
    curIds[x.id] = true
    if (!prevMap[x.id]) add.push(x)
    else if (JSON.stringify(prevMap[x.id]) !== JSON.stringify(x)) update.push(x)
  })
  const remove = prev.filter(x => !curIds[x.id]).map(x => x.id)
  return { coll: def.coll, add: add, update: update, remove: remove }
}

function flush() {
  if (state.mode !== 'cloud' || !writable) return Promise.resolve({ ok: false, skipped: true })
  const names = Object.keys(REG).filter(n => dirty[n])
  if (!names.length) return Promise.resolve({ ok: true, empty: true })
  const ops = names.map(diffOf).filter(o => o.add.length || o.update.length || o.remove.length)
  if (!ops.length) { names.forEach(n => dirty[n] = false); return Promise.resolve({ ok: true, noop: true }) }

  return call('push', { ops: ops }).then(r => {
    if (!r || r.code !== 0) {
      state.error = (r && r.message) || '同步失败'
      console.warn('[cloudkit] push 失败：', state.error, '（本地已保存，下次会重试）')
      return { ok: false, error: state.error }
    }
    names.forEach(n => {
      dirty[n] = false
      snap[n] = JSON.stringify(REG[n].read() || [])
    })
    state.lastSync = Date.now()
    state.error = ''
    return { ok: true, ops: ops.length }
  }).catch(e => {
    state.error = String(e && e.errMsg || e && e.message || e)
    console.warn('[cloudkit] push 异常：', state.error)
    return { ok: false, error: state.error }
  })
}

/**
 * 学员约课 / 取消：走服务端 book 动作。
 * 服务端只允许把「自己」加进或移出该节课的 students，其它字段改不了。
 */
function bookRemote(lessonId, action, selfName) {
  if (state.mode !== 'cloud') return Promise.resolve({ ok: true, local: true })
  return call('book', { lessonId: lessonId, action: action, selfName: selfName })
    .then(r => {
      if (!r || r.code !== 0) return { ok: false, error: (r && r.message) || '操作失败' }
      return { ok: true, data: r.data }
    })
    .catch(e => ({ ok: false, error: String(e && e.errMsg || e && e.message || e) }))
}

function onPulled(fn) { pulledHook = fn }

module.exports = {
  register, init, markDirty, pullAll, flush, mode, status, cloudOn, onPulled,
  setWritable, isWritable, bookRemote
}
