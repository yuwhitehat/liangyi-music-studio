// profile/profile.js
const app = getApp()
const studio = require('../../utils/studio.js')

Page({
  data: {
    userInfo: {}, roleText: '', isTeacher: false, canEditStudio: false,
    studio: {}, studioDone: false,
    sheet: { show: false, kind: '', title: '', intro: '', rows: [], tip: '' }
  },

  onShow() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || { name: '未登录' }
    const isTeacher = app.getRole() === 'teacher'
    const s = studio.get()
    this.setData({
      userInfo,
      isTeacher,
      canEditStudio: isTeacher && app.can('editStudio'),
      roleText: isTeacher ? '老师' : '学员',
      studio: s,
      studioDone: !studio.incomplete()
    })
  },

  /** 关于工作室：整段介绍 */
  onAbout() {
    const s = this.data.studio
    this.setData({
      sheet: {
        show: true, kind: 'about', title: s.name,
        intro: s.intro || '老师还没有填写工作室介绍。',
        rows: [], tip: ''
      }
    })
  },

  /** 联系我们：每条信息独立一行，可单独复制 */
  onContact() {
    const s = this.data.studio
    const rows = []
    if (s.phone)   rows.push({ k: 'phone',   label: '电话',   value: s.phone,   copy: true })
    if (s.wechat)  rows.push({ k: 'wechat',  label: '微信',   value: s.wechat,  copy: true })
    if (s.address) rows.push({ k: 'address', label: '地址',   value: s.address, copy: true, wrap: true })
    if (s.hours)   rows.push({ k: 'hours',   label: '开放时间', value: s.hours, copy: false })

    this.setData({
      sheet: rows.length
        ? { show: true, kind: 'contact', title: '联系我们', intro: '', rows: rows, tip: '点击任意一行即可复制该项内容' }
        : { show: true, kind: 'about', title: '联系我们', intro: '老师还没有填写联系方式。', rows: [], tip: '' }
    })
  },

  onCloseSheet() { this.setData({ 'sheet.show': false }) },

  onCopyRow(e) {
    const { v, c, l } = e.currentTarget.dataset
    if (!c) return
    wx.setClipboardData({
      data: v,
      success: () => wx.showToast({ title: '已复制' + l, icon: 'none' })
    })
  },

  goStudio() { wx.navigateTo({ url: '/pages/teacher/studio/studio' }) },

  onLogout() {
    wx.showModal({
      title: '退出登录', content: '确定要退出登录吗？', confirmColor: '#2B3FA8',
      success: (r) => {
        if (!r.confirm) return
        app.signOut()          // 清掉 session，首页才不会自动跳回工作台
        wx.reLaunch({ url: '/pages/index/index' })
      }
    })
  },

  goBack() { wx.navigateBack() }
})
