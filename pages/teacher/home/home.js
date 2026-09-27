// teacher/home/home.js
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const dateUtil = require('../../../utils/date.js')

Page({
  data: {
    userInfo: {}, todayText: '', displayName: '', todayDate: '',
    isSuperAdmin: false,
    stats: { todayCount: 0, pendingCount: 0, openCount: 0, completedCount: 0, studentCount: 0 }
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || { name: '老师' }
    const nm = userInfo.name || '老师'
    this.setData({
      userInfo,
      todayDate: dateUtil.formatDate(new Date()),
      todayText: dateUtil.friendlyDate(new Date()),
      displayName: /老师$/.test(nm) ? nm : nm + '老师'   // 避免「林老师老师」
    })
  },

  onShow() {
    const st = lessons.stats()
    this.setData({
      isSuperAdmin: !!app.globalData.isSuperAdmin,
      stats: {
        todayCount: st.todayCount,
        pendingCount: st.pendingCount,
        openCount: st.openCount,
        completedCount: st.completedCount,
        studentCount: students.list().length
      }
    })
  },

  goSchedule()  { wx.navigateTo({ url: '/pages/teacher/schedule/schedule' }) },
  goTeachers()  { wx.navigateTo({ url: '/pages/teacher/teachers/teachers' }) },
  goCourses()   { wx.navigateTo({ url: '/pages/teacher/course-types/course-types' }) },
  goBookings()  { wx.navigateTo({ url: '/pages/teacher/bookings/bookings' }) },
  goStudents()  { wx.navigateTo({ url: '/pages/teacher/students/students' }) },
  goProfile()   { wx.navigateTo({ url: '/pages/profile/profile' }) }
})
