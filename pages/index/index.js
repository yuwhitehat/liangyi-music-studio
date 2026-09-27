// index.js - 首页（身份入口）
const app = getApp()

Page({
  data: {},

  onShow() {
    // 关键修正：必须「已登录」才自动进入工作台。
    // 旧版在点击入口时就写入 role，导致返回首页瞬间被弹进老师端。
    if (!app.isLoggedIn()) return
    const url = app.getRole() === 'teacher'
      ? '/pages/teacher/home/home'
      : '/pages/student/home/home'
    wx.reLaunch({ url })
  },

  onSelectRole(e) {
    app.setPendingRole(e.currentTarget.dataset.role)
    wx.setStorageSync('pendingRole', e.currentTarget.dataset.role)
    // navigateTo 保留返回栈，左上角返回才是「回到上一页」
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
