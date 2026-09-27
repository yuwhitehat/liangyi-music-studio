// app.js - 两仪音乐工作室
const cloudkit = require('./utils/cloudkit.js')

App({
  globalData: {
    userInfo: null,
    role: '',            // 已确认的登录身份：'teacher' | 'student' | ''
    pendingRole: '',     // 仅表示首页上"点了哪个入口"，未登录前不生效
    openid: '',
    isSuperAdmin: false,
    perms: {}          // { editStudio: true|false }
  },

  onLaunch: function () {
    // 云开发：utils/config.js 里填了 CLOUD_ENV 就走云端同步，否则纯本地模式
    // 云端回填完成后，让当前页面重跑一次 onShow（页面代码无需改动）
    cloudkit.onPulled(function () {
      const pages = getCurrentPages()
      const cur = pages[pages.length - 1]
      if (cur && typeof cur.onShow === 'function') cur.onShow()
    })

    if (cloudkit.init()) {
      this.syncFromCloud(true)
    }

    // 只有「已登录」才恢复身份，避免未登录被自动跳转
    const session = wx.getStorageSync('session')
    if (session && session.role && session.userInfo) {
      this.globalData.role = session.role
      this.globalData.userInfo = session.userInfo
      this.globalData.openid = session.openid || ''
      this.globalData.isSuperAdmin = !!session.isSuperAdmin
      this.globalData.perms = session.perms || {}
      cloudkit.setWritable(session.role === 'teacher')
    }
  },

  /** 是否已完成登录（有身份 + 有用户资料） */
  isLoggedIn() {
    return !!(this.globalData.role && this.globalData.userInfo)
  },

  /** 首页入口点击时记录意图，不写入正式身份 */
  setPendingRole(role) { this.globalData.pendingRole = role },
  getPendingRole() {
    return this.globalData.pendingRole || wx.getStorageSync('pendingRole') || ''
  },

  /** 登录成功后才真正落盘身份 */
  signIn({ role, userInfo, openid, isSuperAdmin, perms }) {
    this.globalData.role = role
    this.globalData.userInfo = userInfo
    this.globalData.openid = openid || ''
    this.globalData.isSuperAdmin = !!isSuperAdmin
    this.globalData.perms = perms || {}
    this.globalData.pendingRole = ''
    cloudkit.setWritable(role === 'teacher')   // 学员只读，改动走 bookRemote
    wx.removeStorageSync('pendingRole')
    wx.setStorageSync('session', { role, userInfo, openid: openid || '', isSuperAdmin: !!isSuperAdmin, perms: perms || {} })
  },

  signOut() {
    this.globalData.role = ''
    this.globalData.userInfo = null
    this.globalData.openid = ''
    this.globalData.isSuperAdmin = false
    this.globalData.perms = {}
    this.globalData.pendingRole = ''
    cloudkit.setWritable(false)            // 退出后回到只读，避免误推
    wx.removeStorageSync('session')
    wx.removeStorageSync('pendingRole')
    wx.removeStorageSync('userInfo')
  },

  getRole() { return this.globalData.role },

  /** 数据模式：'cloud' | 'local' */
  dataMode() { return cloudkit.mode() },

  /**
   * 与云端对齐：先拉全量回填本地，再补推未同步的本地改动。
   * 静默失败 —— 拉不到就继续用本地缓存，不影响使用。
   */
  syncFromCloud(pullFirst) {
    if (cloudkit.mode() !== 'cloud') return Promise.resolve({ ok: false, mode: 'local' })
    const silent = !!(this.globalData.userInfo)
    if (silent) wx.showLoading({ title: '同步中...', mask: true })
    const step = pullFirst ? cloudkit.pullAll().then(() => cloudkit.flush()) : cloudkit.flush()
    return step.then(r => {
      if (silent) wx.hideLoading()
      return r
    }).catch(e => { if (silent) wx.hideLoading(); return { ok: false, error: String(e) } })
  },

  /**
   * 学员身份 id（课表 students 里用的就是这个）。
   * 早期登录的 session 里没有 sid，这里会按手机号回查名册并**回写修复**，
   * 查不到就自动入册 —— 避免约课因 id 对不上而静默失败。
   */
  getStudentId() {
    const students = require('./utils/students.js')
    const info = this.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    if (info.sid) return info.sid

    let sid = null
    if (info.phone) {
      const hit = students.byPhone(info.phone)
      if (hit) {
        sid = hit.id
      } else if (info.name) {
        try {
          const rows = students.add({ name: info.name, phone: info.phone, note: '自助注册' })
          const added = rows.filter(function (t) { return t.name === info.name })[0]
          sid = added ? added.id : ('p_' + info.phone)
        } catch (e) {
          sid = 'p_' + info.phone
        }
      }
    }
    if (!sid) return info.openid || null

    // 回写，下次直接命中
    info.sid = sid
    this.globalData.userInfo = info
    const sess = wx.getStorageSync('session') || {}
    sess.userInfo = info
    wx.setStorageSync('session', sess)
    wx.setStorageSync('userInfo', info)
    return sid
  },

  /** 匹配课表用的一组身份键（含历史遗留 openid / 手机号，兼容旧数据） */
  myStudentKeys() {
    const info = this.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const keys = []
    const push = function (v) { if (v && keys.indexOf(v) === -1) keys.push(v) }
    push(this.getStudentId())        // 名册 id（现行唯一口径）
    push(this.globalData.openid)     // openid 存在 session 层，不在 userInfo 里
    push(info.openid)
    if (info.phone) push('p_' + info.phone)
    return keys
  },

  /** 当前登录者是否拥有某项权限（超管天然拥有全部） */
  can(key) {
    if (this.globalData.isSuperAdmin) return true
    return !!(this.globalData.perms && this.globalData.perms[key])
  },

  /** 回到首页：清空栈，避免回退到登录页 */
  goHome() { wx.reLaunch({ url: '/pages/index/index' }) }
})
