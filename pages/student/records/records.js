// student/records/records.js — 上课记录 + 我的课时档案
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const quota = require('../../../utils/quota.js')
const dateUtil = require('../../../utils/date.js')
const { lessonStatusText, lessonStatusTag } = require('../../../utils/constants.js')

const BG = ['#111111', '#FF5FA2', '#4D8DFF', '#FFF3C4']

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
        statusText: lessonStatusText(l), statusTag: lessonStatusTag(l)
      }))

    // 报名档案：一门课一行，都收在同一张卡里
    const rec = students.byId(me.sid || app.getStudentId()) || students.byPhone(me.phone)
    let enroll = null
    if (rec) {
      const rows = quota.enrollmentsOf(rec.id, myKeys).map(function (q) {
        let span = ''
        if (q.start && q.end) span = md(q.start) + ' → ' + md(q.end)
        else if (q.start) span = md(q.start) + ' 开始'
        else if (q.end) span = '至 ' + md(q.end)
        return {
          ...q, span: span,
          // 不再用 Math.max(0, …) 吞掉超支：上了比报名还多的课，要如实显示
          pct: q.total > 0 ? Math.min(100, Math.round(q.used / q.total * 100)) : 0,
          days: q.end && q.end >= dateUtil.formatDate(new Date())
            ? daysBetween(dateUtil.formatDate(new Date()), q.end) : -1
        }
      })
      enroll = {
        // 有报名 / 有上课记录 —— 任一成立就显示卡片，避免自助注册的学员看到卡片凭空消失
        show: rows.length > 0 || records.length > 0,
        rows: rows,
        // 只报一门课时不用「共 N 门课」这句话
        one: rows.length === 1
      }
    }

    this.setData({
      records: records,
      enroll: (enroll && enroll.show) ? enroll : null
    })
  },

  goBack() { wx.navigateBack() }
})
