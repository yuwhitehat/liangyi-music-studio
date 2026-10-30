// student/book/book.js — 可约课程来自老师真实排课，且只开放自己报过名的课程
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const courses = require('../../../utils/courses.js')
const students = require('../../../utils/students.js')
const quota = require('../../../utils/quota.js')
const cloudkit = require('../../../utils/cloudkit.js')
const dateUtil = require('../../../utils/date.js')

const BG = [
  { bg: '#111111', fg: '#FFFFFF' }, { bg: '#FFF3C4', fg: '#4D8DFF' },
  { bg: '#4D8DFF', fg: '#FFFFFF' }, { bg: '#FF5FA2', fg: '#FFFFFF' }
]

Page({
  data: {
    enrolled: [], selectedCourseType: '',
    shownLessons: [], shownCount: 0,
    noEnroll: false
  },

  onShow() {
    const sid = app.getStudentId()
    const keys = app.myStudentKeys()
    // 课时按门记，所以先把自己报过的课和每门剩几节取回来
    const enrolled = (sid ? students.enrollments(sid) : []).map(function (e) {
      const c = courses.byId(e.courseType)
      const q = quota.summary(sid, e.courseType, keys)
      return {
        id: c.id, name: c.name, ill: c.ill,
        remain: q ? q.remain : 0, over: !!(q && q.over), hasTotal: !!(q && q.hasTotal)
      }
    })
    const sel = this.data.selectedCourseType
    this.setData({
      enrolled: enrolled,
      noEnroll: enrolled.length === 0,
      selectedCourseType: enrolled.some(t => t.id === sel) ? sel : ''
    }, () => this.refresh())
  },

  refresh() {
    const today = dateUtil.formatDate(new Date())
    const mine = this.data.enrolled
    const type = this.data.selectedCourseType
    const sid = app.getStudentId()
    const keys = app.myStudentKeys()
    const list = lessons.all()
      .filter(l => l.status === 'available' && l.date >= today)
      .filter(l => mine.some(t => t.id === l.courseType))
      .filter(l => !type || l.courseType === type)
      .sort((a, b) => (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1)
      .map((l, i) => {
        const q = quota.summary(sid, l.courseType, keys)
        return {
          ...l,
          dayNum: l.date.slice(8), monLabel: parseInt(l.date.slice(5, 7), 10) + '月',
          friendlyDate: dateUtil.friendlyDate(l.date),
          bg: BG[i % BG.length].bg, fg: BG[i % BG.length].fg,
          ill: courses.byId(l.courseType).ill,
          over: !!(q && q.over),
          overBy: q ? q.overBy : 0
        }
      })
    this.setData({ shownLessons: list, shownCount: list.length })
  },

  onSelectCourse(e) {
    this.setData({ selectedCourseType: e.currentTarget.dataset.id }, () => this.refresh())
  },

  onBook(e) {
    const { id, name, type } = e.currentTarget.dataset
    const me = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const sid = app.getStudentId()          // 自愈：旧 session 没有 sid 也能拿到
    if (!sid) {
      wx.showModal({ title: '请先登录', content: '没有取到你的学员身份，请退出后重新登录。',
        showCancel: false, confirmText: '知道了', confirmColor: '#111111' })
      return
    }
    // 闸门：没报这门课 / 这门课课时超了都不能约，得先找老师
    const gate = quota.bookable(app.myStudentKeys(), type)
    if (!gate.ok) {
      wx.showModal({ title: gate.over ? '这节课的课时已用完' : '没报这门课',
        content: gate.reason, showCancel: false, confirmText: '我知道了', confirmColor: '#FF5FA2' })
      return
    }
    wx.showModal({
      title: '确认约课', content: '确定预约「' + name + '」这节课吗？',
      confirmText: '约！', confirmColor: '#FF5FA2',
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
                  showCancel: false, confirmText: '知道了', confirmColor: '#FF5FA2' })
              }
              cloudkit.pullAll().then(() => this.refresh())
            })
          }
        } else {
          wx.showModal({ title: '约课失败', content: res.reason || '这节课目前无法预约',
            showCancel: false, confirmText: '知道了', confirmColor: '#FF5FA2' })
        }
      }
    })
  },

  goBack() { wx.navigateBack() }
})
