// login.js — 手机号验证 / 微信一键登录
// 老师：手机号命中工作室登记表即通过，无需姓名与邀请码
// 学员：手机号验证后补一次姓名（老师课表要显示）
const app = getApp()
const teachers = require('../../utils/teachers.js')
const students = require('../../utils/students.js')
const dialog = require('../../utils/dialog.js')

// 开发期开关：控制登录页那张测试账号提示卡，上线前置 false
const DEV_MODE = true

function validPhone(p) { return /^1[3-9]\d{9}$/.test(p) }

Page({
  data: {
    step: 'phone',            // 'phone' | 'studentName'
    pendingRole: 'student',
    phone: '', name: '',
    devMode: DEV_MODE, devAccounts: [], devHint: '', devPickedName: ''
  },

  onLoad() {
    this.setData({ pendingRole: app.getPendingRole() || 'student' }, () => this.buildDevAccounts())
  },

  /* ───────── 开发期测试账号 ───────── */

  /** 按当前入口给出对应身份的名册 */
  buildDevAccounts() {
    if (!DEV_MODE) { this.setData({ devAccounts: [], devHint: '' }); return }

    if (this.data.pendingRole === 'teacher') {
      this.setData({
        devHint: '点一下即可填入 · 超管可管理老师与权限',
        devAccounts: teachers.list().map(t => ({
          phone: t.phone, name: t.name, role: 'teacher',
          tag: t.isSuperAdmin ? '超级管理员' : '普通老师'
        }))
      })
    } else {
      this.setData({
        devHint: '点一下即可填入 · 学员直接进，无需再填姓名',
        devAccounts: students.list().slice(0, 4).map((t, i) => ({
          phone: t.phone, name: t.name, role: 'student',
          tag: i === 0 ? '有排课' : '学员'
        }))
      })
    }
  },

  /** 点测试卡：填入手机号；学员账号顺带填好姓名，可跳过补录 */
  onPickDevPhone(e) {
    const ds = e.currentTarget.dataset
    const patch = { phone: ds.phone, devPickedName: '' }
    if (ds.role === 'student') {
      patch.name = ds.name
      patch.devPickedName = ds.name
    }
    this.setData(patch)
  },

  /* ───────── 输入 ───────── */

  onInputPhone(e) { this.setData({ phone: e.detail.value }) },
  onInputName(e)  { this.setData({ name: e.detail.value }) },

  /* ───────── 身份判定 ───────── */

  /**
   * 学员身份落定：
   *  - 名册已有（老师提前录入的老学员）→ 用名册 id
   *  - 名册没有 → 自动入册，老师端立刻可见
   * 课表 students 存的就是这个 id，必须统一，否则约课会静默失效。
   */
  ensureRoster(phone, name) {
    const hit = students.byPhone(phone) ||
                students.list().filter(function (t) { return t.name === name })[0]
    if (hit) return hit.id
    try {
      const rows = students.add({ name: name, phone: phone, note: '自助注册' })
      const added = rows.filter(function (t) { return t.name === name })[0]
      return added ? added.id : ('p_' + phone)
    } catch (e) {
      return 'p_' + phone   // 同名等异常：退回手机号，至少不串号
    }
  },

  enterAsStudent(phone, name, sid) {
    app.signIn({
      role: 'student',
      openid: 'mock_student_' + phone,
      userInfo: { name: name, phone: phone, role: 'student', sid: sid }
    })
    wx.reLaunch({ url: '/pages/student/home/home' })
  },

  /** 手机号 → 判定身份 */
  resolvePhone(phone) {
    const t = teachers.byPhone(phone)

    // 命中老师登记表 → 老师，姓名取自登记表
    if (t) {
      app.signIn({
        role: 'teacher',
        openid: 'mock_teacher_' + phone,
        isSuperAdmin: !!t.isSuperAdmin,
        perms: t.perms || {},
        userInfo: { name: t.name, phone: phone, role: 'teacher' }
      })
      wx.reLaunch({ url: '/pages/teacher/home/home' })
      return true
    }

    // 开发期：从测试卡选中的学员，姓名已知，直接进
    const roster = students.byPhone(phone)
    if (this.data.devPickedName && roster && this.data.devPickedName === roster.name) {
      this.enterAsStudent(phone, roster.name, roster.id)
      return true
    }

    // 点了「我是老师」但没登记
    if (this.data.pendingRole === 'teacher') {
      dialog.show({
        title: '不是老师账号',
        content: '该手机号未登记为工作室老师。工作室老师由管理员添加，如需开通请联系工作室。',
        confirmText: '当学员',
        cancelText: '改号码',
        confirmColor: '#2B3FA8',
        success: (r) => { if (r.confirm) this.setData({ step: 'studentName' }) }
      })
      return false
    }

    // 学员：名册里已有且姓名已填 → 直接进
    if (roster && this.data.name && this.data.name === roster.name) {
      this.enterAsStudent(phone, roster.name, roster.id)
      return true
    }

    this.setData({ step: 'studentName' })
    return false
  },

  onVerifyPhone() {
    const p = this.data.phone
    if (!validPhone(p)) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return }
    wx.showLoading({ title: '验证中...' })
    const go = () => wx.hideLoading()
    try { this.resolvePhone(p) } finally { go() }
  },

  /** 微信一键登录（手机号快速验证组件） */
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '已取消，可用手机号登录', icon: 'none' })
      return
    }
    wx.showLoading({ title: '登录中...' })
    try {
      // 接入云开发后：把 e.detail.code 交给云函数换取真实手机号
      // const res = await wx.cloud.callFunction({ name:'login', data:{ code: e.detail.code } })
      // const phone = res.result.phone
      const phone = '13800000000'   // ← Mock：真实手机号需云函数解码
      this.setData({ phone: phone })
      this.resolvePhone(phone)
    } catch (err) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
    wx.hideLoading()
  },

  /** 新学员补姓名后确认 */
  onConfirmStudent() {
    const phone = this.data.phone
    const nm = (this.data.name || '').trim()
    if (!nm) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return }
    this.enterAsStudent(phone, nm, this.ensureRoster(phone, nm))
  },

  onBackToPhone() { this.setData({ step: 'phone', name: '', devPickedName: '' }) },

  /* ───────── 导航 ───────── */

  /** 左上角返回：回上一页（首页） */
  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/index/index' })
  },

  onGoHome() { wx.reLaunch({ url: '/pages/index/index' }) }
})
