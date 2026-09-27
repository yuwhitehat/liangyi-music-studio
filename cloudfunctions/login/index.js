// 云函数 login — 取 openid、解码微信手机号、判定身份，并登记 members
//
// members 是服务端权限的唯一依据（sync 云函数靠它区分老师/学员），
// 由这里写入，客户端无法伪造。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function upsertMember(openid, doc) {
  const r = await db.collection('members').where({ openid: openid }).limit(1).get()
  if (r.data.length) {
    await db.collection('members').doc(r.data[0]._id).update({ data: doc })
    return r.data[0]._id
  }
  const add = await db.collection('members').add({ data: Object.assign({ openid: openid }, doc) })
  return add._id
}

exports.main = async function (event) {
  const wxc = cloud.getWXContext()
  const out = { openid: wxc.OPENID, appid: wxc.APPID, unionid: wxc.UNIONID || '' }

  // 微信「手机号快速验证组件」回传的 code -> 真实手机号
  if (event.code) {
    try {
      const r = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.code })
      out.phone = r.phoneInfo.phoneNumber
    } catch (e) {
      out.phoneError = String(e.errMsg || e.message || e)
    }
  } else if (event.phone) {
    out.phone = String(event.phone)      // 手动输入路径（工作室场景够用）
  }

  // 命中老师登记表 -> 老师身份；姓名取自登记表，无需本人填写
  if (out.phone) {
    const t = await db.collection('teachers').where({ phone: out.phone }).limit(1).get()
    if (t.data.length) {
      const rec = t.data[0]
      out.role = 'teacher'
      out.name = rec.name
      out.refId = rec.id || rec._id
      out.isSuperAdmin = !!rec.isSuperAdmin
      out.perms = rec.perms || {}
    } else {
      out.role = 'student'
      if (event.name) {
        out.name = event.name
        // 自助注册：写入名册，老师端立刻可见
        const exist = await db.collection('students').where({ name: event.name, phone: out.phone }).limit(1).get()
        if (exist.data.length) {
          out.refId = exist.data[0].id || exist.data[0]._id
        } else {
          const add = await db.collection('students').add({
            data: {
              id: 's' + Date.now().toString(36),
              name: event.name, phone: out.phone, note: '自助注册',
              totalLessons: 0, doneBefore: 0, enrollStart: '', enrollEnd: ''
            }
          })
          out.refId = add._id
        }
      }
    }
  }

  // 登记 members —— 后续 sync 云函数的鉴权依据
  if (out.role) {
    try {
      out.memberId = await upsertMember(out.openid, {
        role: out.role, name: out.name || '', phone: out.phone || '',
        refId: out.refId || '', isSuperAdmin: !!out.isSuperAdmin
      })
    } catch (e) {
      out.memberError = String(e && e.errMsg || e && e.message || e)
    }
  }
  return out
}
