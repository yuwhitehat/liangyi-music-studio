// guest.js — 游客浏览：只读展示「关于工作室 / 联系我们」，无任何操作
const studio = require('../../utils/studio.js')

Page({
  data: { studio: {}, rows: [] },

  onShow() {
    const st = studio.get()
    const rows = []
    if (st.phone)   rows.push({ label: '电话', value: st.phone })
    if (st.wechat)  rows.push({ label: '微信', value: st.wechat })
    if (st.address) rows.push({ label: '地址', value: st.address, wrap: true })
    if (st.hours)   rows.push({ label: '开放时间', value: st.hours, wrap: true })
    this.setData({ studio: st, rows: rows })
  },

  onBack() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.reLaunch({ url: '/pages/index/index' })
  }
})
