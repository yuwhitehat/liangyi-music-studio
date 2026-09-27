// student/records/records.js — 上课记录 + 我的课时档案
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const dateUtil = require('../../../utils/date.js')
const { LESSON_STATUS_TEXT, LESSON_STATUS_TAG } = require('../../../utils/constants.js')

const BG = ['#2B3FA8', '#E8763A', '#1E2E7A', '#D9EAF5']

function md(d) {
  if (!d) return ''
  return parseInt(d.slice(5, 7), 10) + '月' + parseInt(d.slice(8, 10), 10) + '日'
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

Page({
  data: {
    records: [],
    enroll: null          // 为 null 时整块不显示
  },

  onShow() {
    const me = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const myKeys = app.myStudentKeys()   // sid / openid / p_手机号 都算我

    const records = lessons.all()
      .filter(l => (l.students || []).some(s => s && myKeys.indexOf(s.id) > -1))
      .sort((a, b) => (a.date + a.timeStart) > (b.date + b.timeStart) ? -1 : 1)
      .map((l, i) => ({
        ...l,
        friendlyDate: dateUtil.friendlyDate(l.date),
        bg: BG[i % BG.length],
        statusText: LESSON_STATUS_TEXT[l.status], statusTag: LESSON_STATUS_TAG[l.status]
      }))

    const done = records.filter(r => r.status === 'completed')

    // 报名档案：优先用名册里的记录（老师录入的老学员数据）
    const rec = students.byId(me.sid || app.getStudentId()) || students.byPhone(me.phone)
    let enroll = null
    if (rec) {
      const total = rec.totalLessons || 0
      const used = (rec.doneBefore || 0) + done.length
      const hasDate = !!(rec.enrollStart || rec.enrollEnd)
      let span = ''
      if (rec.enrollStart && rec.enrollEnd) span = md(rec.enrollStart) + ' → ' + md(rec.enrollEnd)
      else if (rec.enrollStart) span = md(rec.enrollStart) + ' 开始'
      else if (rec.enrollEnd) span = '至 ' + md(rec.enrollEnd)

      enroll = {
        // 有课时档案 / 有报名日期 / 已有上课记录 —— 任一成立就显示卡片，
        // 避免自助注册的学员看到卡片凭空消失
        show: total > 0 || hasDate || records.length > 0,
        total: total,
        hasUsed: used > 0,
        used: used,
        // 不再用 Math.max(0, …) 吞掉超支：上了比报名还多的课，要如实显示
        remain: total - used,
        over: total > 0 && used > total,
        overBy: (total > 0 && used > total) ? used - total : 0,
        hasTotal: total > 0,
        span: span,
        hasDate: hasDate,
        daysLeft: (rec.enrollEnd && rec.enrollEnd >= dateUtil.formatDate(new Date()))
          ? daysBetween(dateUtil.formatDate(new Date()), rec.enrollEnd) : -1,
        pct: total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0
      }
    }

    this.setData({
      records: records,
      enroll: (enroll && enroll.show) ? enroll : null
    })
  },

  goBack() { wx.navigateBack() }
})
