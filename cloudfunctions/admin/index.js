// 云函数 admin —— 超管专用：登记 / 管理工作室老师
// 普通用户调用会被直接拒绝，因此前端不需要任何隐藏入口，
// 只有超管在老师端看到的「添加老师」色块能触发到这里。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 超管判定：优先读 teachers 登记表里的 isSuperAdmin（由 sync/login 维护），
// BOOTSTRAP_ADMINS 仅用于「第一个超管」的冷启动 —— 因为登记老师本身就需要超管权限，
// 部署时把首位老师的手机号填进来即可，之后靠数据库判定。
const BOOTSTRAP_ADMINS = ['13800000000']   // ← 改成你朋友的手机号

const ok  = (data) => ({ code: 0, data })
const err = (msg,  code) => ({ code: code || 1, message: msg })

async function isSuper(openid) {
  const r = await db.collection('members').where({ openid: openid }).limit(1).get()
  if (r.data.length) {
    const m = r.data[0]
    if (m.isSuperAdmin) return true
    if (m.role === 'teacher' && m.phone && BOOTSTRAP_ADMINS.indexOf(m.phone) > -1) return true
    return false
  }
  // members 还没建立时的兜底：按手机号白名单
  return false
}
function validPhone(p) {
  return typeof p === 'string' && /^1[3-9]\d{9}$/.test(p)
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!(await isSuper(OPENID))) return err('没有权限：仅超级管理员可管理老师', 403)

  const action = event.action

  // ── 添加老师 ──
  if (action === 'addTeacher') {
    const name  = (event.name || '').trim()
    const phone = (event.phone || '').trim()
    if (!name)               return err('请填写老师姓名')
    if (!validPhone(phone))  return err('手机号格式不正确')

    const dup = await db.collection('teachers').where({ phone }).count()
    if (dup.total > 0)       return err('该手机号已登记为老师')

    const res = await db.collection('teachers').add({
      data: {
        id: 't' + Date.now().toString(36),
        name, phone,
        isSuperAdmin: false,
        addedBy: OPENID,
        createdAt: db.serverDate()
      }
    })
    return ok({ _id: res._id, name, phone })
  }

  // ── 老师列表 ──
  if (action === 'listTeachers') {
    const res = await db.collection('teachers').orderBy('createdAt', 'desc').limit(100).get()
    return ok({ list: res.data })
  }

  // ── 移除老师（不允许移除超管自己）──
  if (action === 'removeTeacher') {
    if (!event._id) return err('缺少老师 ID')
    const doc = await db.collection('teachers').doc(event._id).get()
    if (doc.data && isSuper(doc.data.addedBy)) return err('不能移除超级管理员')
    await db.collection('teachers').doc(event._id).remove()
    return ok({ removed: true })
  }

  return err('未知操作：' + action)
}
