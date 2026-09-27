// student/home/home.js
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const courses = require('../../../utils/courses.js')
const dateUtil = require('../../../utils/date.js')
const { LESSON_STATUS_TEXT, LESSON_STATUS_TAG } = require('../../../utils/constants.js')

Page({
  data: { userInfo: {}, todayText: '', displayName: '', upcomingLessons: [], doneCount: 0 },

  onLoad() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || { name: '同学' }
    const nm = userInfo.name || '同学'
    this.setData({
      userInfo,
      todayText: dateUtil.friendlyDate(new Date()),
      displayName: /同学$/.test(nm) ? nm : nm + '同学'
    })
  },

  onShow() {
    const me = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const myKeys = app.myStudentKeys()   // sid / openid / p_手机号 都算我
    const today = dateUtil.formatDate(new Date())
    const mine = lessons.all().filter(l => (l.students || []).some(s => s && myKeys.indexOf(s.id) > -1))

    const upcoming = mine
      .filter(l => l.status === 'booked' && l.date >= today)
      .sort((a, b) => (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1)
      .map((l, i) => ({
        ...l,
        friendlyDate: dateUtil.friendlyDate(l.date),
        bg: ['#2B3FA8', '#E8763A', '#D9EAF5'][i % 3],
        ill: courses.byId(l.courseType).ill,
        statusText: LESSON_STATUS_TEXT[l.status], statusTag: LESSON_STATUS_TAG[l.status]
      }))

    this.setData({
      upcomingLessons: upcoming,
      doneCount: mine.filter(l => l.status === 'completed').length
    })
  },

  goBook()     { wx.navigateTo({ url: '/pages/student/book/book' }) },
  goSchedule() { wx.navigateTo({ url: '/pages/student/schedule/schedule' }) },
  goRecords()  { wx.navigateTo({ url: '/pages/student/records/records' }) },
  goProfile()  { wx.navigateTo({ url: '/pages/profile/profile' }) }
})
