// student/book/book.js — 可约课程来自老师真实排课
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const courses = require('../../../utils/courses.js')
const cloudkit = require('../../../utils/cloudkit.js')
const dateUtil = require('../../../utils/date.js')

const BG = [
  { bg: '#2B3FA8', fg: '#FFFFFF' }, { bg: '#D9EAF5', fg: '#1E2E7A' },
  { bg: '#1E2E7A', fg: '#FFFFFF' }, { bg: '#E8763A', fg: '#FFFFFF' }
]

Page({
  data: { courseTypes: [], selectedCourseType: '', shownLessons: [], shownCount: 0 },

  onShow() {
    this.setData({ courseTypes: courses.list() }, () => this.refresh())
  },

  refresh() {
    const today = dateUtil.formatDate(new Date())
    const type = this.data.selectedCourseType
    const list = lessons.all()
      .filter(l => l.status === 'available' && l.date >= today)
      .filter(l => !type || l.courseType === type)
      .sort((a, b) => (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1)
      .map((l, i) => ({
        ...l,
        dayNum: l.date.slice(8), monLabel: parseInt(l.date.slice(5, 7), 10) + '月',
        friendlyDate: dateUtil.friendlyDate(l.date),
        bg: BG[i % BG.length].bg, fg: BG[i % BG.length].fg,
        ill: courses.byId(l.courseType).ill
      }))
    this.setData({ shownLessons: list, shownCount: list.length })
  },

  onSelectCourse(e) {
    this.setData({ selectedCourseType: e.currentTarget.dataset.id }, () => this.refresh())
  },

  onBook(e) {
    const { id, name } = e.currentTarget.dataset
    const me = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const sid = app.getStudentId()          // 自愈：旧 session 没有 sid 也能拿到
    if (!sid) {
      wx.showModal({ title: '请先登录', content: '没有取到你的学员身份，请退出后重新登录。',
        showCancel: false, confirmText: '知道了', confirmColor: '#2B3FA8' })
      return
    }
    wx.showModal({
      title: '确认约课', content: '确定预约「' + name + '」这节课吗？',
      confirmText: '约！', confirmColor: '#E8763A',
      success: (r) => {
        if (!r.confirm) return
        const res = lessons.book(id, [{ id: sid, name: me.name || '我' }])
        this.refresh()
        // 只有真的写进去了才报成功
        if (res.ok) {
          wx.showToast({ title: '约课成功', icon: 'success' })
          // 云端模式：走服务端 book（学员只读，通用 push 会被拒），再拉齐
          if (cloudkit.mode() === 'cloud') {
            cloudkit.bookRemote(id, 'add', me.name || '我').then(r => {
              if (!r.ok && !r.local) {
                wx.showModal({ title: '同步失败', content: r.error || '请稍后重试',
                  showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
              }
              cloudkit.pullAll().then(() => this.refresh())
            })
          }
        } else {
          wx.showModal({ title: '约课失败', content: res.reason || '这节课目前无法预约',
            showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
        }
      }
    })
  },

  goBack() { wx.navigateBack() }
})
