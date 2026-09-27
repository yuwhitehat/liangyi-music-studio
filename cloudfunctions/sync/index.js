// 云函数 sync — 本地优先模式的服务端
//
// 权限模型（不信任客户端自称的身份）：
//   members 集合由 login 云函数写入，记录 openid -> role
//   pull : 任意已登录用户可读（限白名单集合）
//   push : 仅 teacher 可写业务集合
//   book : 学员只能把「自己」加进/移出某节课的 students
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const PAGE = 100

const ok  = function (data) { return { code: 0, data: data } }
const err = function (message, code) { return { code: code || 1, message: message } }

const WRITABLE = ['teachers', 'students', 'courses', 'lessons', 'settings']

// 与客户端 date.hoursUntil 同一算法：拆数字构造，避免 ISO 串解析差异
function hoursUntil(dateStr, timeStr) {
  const dp = String(dateStr || '').split('-')
  const tp = String(timeStr || '00:00').split(':')
  const t = new Date(+dp[0], (+dp[1] || 1) - 1, +dp[2] || 1, +tp[0] || 0, +tp[1] || 0, 0, 0).getTime()
  return isNaN(t) ? 0 : (t - Date.now()) / 3600000
}

async function member(openid) {
  if (!openid) return null
  const r = await db.collection('members').where({ openid: openid }).limit(1).get()
  return r.data.length ? r.data[0] : null
}

// 服务端分页拉全量（客户端单次上限很低）
async function fetchAll(name) {
  const coll = db.collection(name)
  const total = (await coll.count()).total
  const pages = Math.ceil(total / PAGE)
  let out = []
  for (let i = 0; i < pages; i++) {
    const r = await coll.skip(i * PAGE).limit(PAGE).get()
    out = out.concat(r.data)
  }
  // 去掉云端 _id，统一用记录自带的 id 字段
  return out.map(function (d) {
    const c = Object.assign({}, d)
    delete c._id
    return c
  })
}

async function pull(event, m) {
  if (!m) return err('未登录', 401)
  const names = (event.payload && event.payload.names) || []
  const data = {}
  for (const n of names) {
    if (WRITABLE.indexOf(n) === -1) continue      // 白名单，防越权读任意集合
    try { data[n] = await fetchAll(n) }
    catch (e) { data[n] = [] }                    // 集合不存在按空处理，客户端保留本地
  }
  return ok(data)
}

async function push(event, m) {
  if (!m) return err('未登录', 401)
  if (m.role !== 'teacher') return err('仅老师可写入数据', 403)

  const ops = (event.payload && event.payload.ops) || []
  const done = []
  for (const op of ops) {
    if (WRITABLE.indexOf(op.coll) === -1) continue
    const coll = db.collection(op.coll)

    const put = async function (body) {
      const b = Object.assign({}, body)
      delete b._id
      if (b.id) {
        try { await coll.doc(String(b.id)).set({ data: b }) }   // 用 id 当 _id，保证幂等
        catch (e) { await coll.add({ data: b }) }
      } else {
        await coll.add({ data: b })
      }
    }

    for (const d of (op.add || []))    await put(d)
    for (const d of (op.update || [])) await put(d)
    for (const id of (op.remove || [])) {
      try { await coll.doc(String(id)).remove() } catch (e) { /* 已不存在，忽略 */ }
    }
    done.push(op.coll)
  }
  return ok({ pushed: done })
}

// 学员自助约课 / 取消：只动 students，且只能写自己
async function book(event, m) {
  if (!m) return err('未登录', 401)
  const p = event.payload || {}
  if (!p.lessonId) return err('缺少课程 id')

  const r = await db.collection('lessons').doc(String(p.lessonId)).get().catch(function () { return null })
  if (!r || !r.data) return err('课程不存在')
  const lesson = r.data
  if (lesson.status === 'completed') return err('这节课已完成')
  if (lesson.status === 'cancelled') return err('这节课已取消')

  const me = { id: m.refId, name: p.selfName || m.name || '学员' }
  const cur = lesson.students || []

  if (p.action === 'add') {
    if (cur.some(function (s) { return s.id === me.id })) return ok({ already: true })
    const students = cur.concat([me])
    await db.collection('lessons').doc(String(p.lessonId)).update({
      data: { students: students, booked: true, status: 'booked' }
    })
    return ok({ added: me })
  }

  if (p.action === 'remove') {
    const students = cur.filter(function (s) { return s.id !== me.id })   // 只能移除自己
    // 与客户端同一套规则：已过结束时间的课标记 cancelled 并保留原名单，
    // 未下课的才释放为待约。服务端不依赖客户端做这个判断。
    const ended = hoursUntil(lesson.date, lesson.timeEnd) <= 0
    await db.collection('lessons').doc(String(p.lessonId)).update(
      ended
        ? { data: { status: 'cancelled' } }                       // 保留 students
        : { data: {
              students: students,
              booked: students.length > 0,
              status: students.length ? 'booked' : 'available'
            } }
    )
    return ok({ removed: me.id, ended: ended })
  }
  return err('未知操作')
}

exports.main = async function (event) {
  const wxc = cloud.getWXContext()
  const m = await member(wxc.OPENID)
  switch (event.action) {
    case 'pull': return pull(event, m)
    case 'push': return push(event, m)
    case 'book': return book(event, m)
    default: return err('未知操作：' + event.action)
  }
}
