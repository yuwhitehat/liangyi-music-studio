// teacher/studio/studio.js — 老师编辑工作室资料
const app = getApp()
const studio = require('../../../utils/studio.js')

Page({
  data: { f: studio.DEFAULTS },

  onLoad() {
    // 权限守卫：只有超管或被授权的老师能改工作室资料
    if (!app.can('editStudio')) {
      wx.showModal({
        title: '没有权限', content: '工作室资料仅超级管理员，或被授权的老师可编辑。',
        showCancel: false, confirmText: '返回', confirmColor: '#2B3FA8',
        success: () => wx.navigateBack()
      })
      return
    }
    this.setData({ f: studio.get() })
  },

  onIn(e) {
    const k = e.currentTarget.dataset.k
    this.setData({ ['f.' + k]: e.detail.value })
  },

  onSave() {
    let row
    try { row = studio.save(this.data.f) }
    catch (err) { wx.showToast({ title: err.message || '保存失败', icon: 'none' }); return }

    this.setData({ f: row })
    app.globalData.studioInfo = row
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  },

  goBack() { wx.navigateBack() }
})
