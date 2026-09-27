// student/schedule/schedule.js — 我的课表：学员自助签到 / 取消（取消受 6 小时限制）
const app = getApp()
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const studio = require('../../../utils/studio.js')
const dateUtil = require('../../../utils/date.js')
const dialog = require('../../../utils/dialog.js')
const cloudkit = require('../../../utils/cloudkit.js')
const { LESSON_STATUS_TEXT, LESSON_STATUS_TAG } = require('../../../utils/constants.js')

const BG = [
  { bg: '#2B3FA8', fg: '#FFFFFF' }, { bg: '#E8763A', fg: '#FFFFFF' },
  { bg: '#D9EAF5', fg: '#1E2E7A' }, { bg: '#1E2E7A', fg: '#FFFFFF' }
]

const CANCEL_LIMIT = 6   // 距开课不足 6 小时不允许学员自行取消

/**
 * 若工具用了旧的 utils 缓存（增量编译常见），调用会不存在。
 * 这里给出可读提示，而不是抛 MiniProgramError。
 */
function need(fn, name) {
  if (typeof fn === 'function') return null
  return '功能未就绪（' + name + '）：请在开发者工具「工具 → 清除缓存 → 清除全部缓存」后重新编译'
}

Page({
  data: { activeTab: 'upcoming', displayLessons: [] },

  onShow() { this.show(this.data.activeTab) },

  show(tab) {
    const myKeys = app.myStudentKeys()
    const today = dateUtil.formatDate(new Date())
    const list = lessons.all()
      .filter(l => (l.students || []).some(s => s && myKeys.indexOf(s.id) > -1))
      .filter(l => tab === 'upcoming'
        ? (l.status === 'booked' && l.date >= today)
        : (l.status === 'completed' || l.status === 'cancelled' || (l.status === 'booked' && l.date < today)))
      .sort((a, b) => tab === 'upcoming'
        ? ((a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1)
        : ((a.date + a.timeStart) > (b.date + b.timeStart) ? -1 : 1))
      .map((l, i) => {
        const a = BG[i % BG.length]
        return {
          ...l,
          dayLabel: l.date.slice(8),
          monthLabel: parseInt(l.date.slice(5, 7), 10) + '月',
          dateLabel: dateUtil.friendlyDate(l.date),
          bg: a.bg, fg: a.fg,
          isToday: l.date === today,
          canCheckIn: lessons.canCheckIn(l).ok,
          hoursLeft: (typeof dateUtil.hoursUntil === 'function')
            ? Math.round(dateUtil.hoursUntil(l.date, l.timeStart) * 10) / 10
            : 9999,
          statusText: LESSON_STATUS_TEXT[l.status], statusTag: LESSON_STATUS_TAG[l.status]
        }
      })
    this.setData({ activeTab: tab, displayLessons: list })
  },

  onTab(e) { this.show(e.currentTarget.dataset.tab) },

  /* ── 学员签到 ── */
  onSelfCheckIn(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认签到', content: '确认已到课并签到？', confirmText: '签到', confirmColor: '#2B3FA8',
      success: (r) => {
        if (!r.confirm) return
        const miss = need(lessons.completeByStudent, 'completeByStudent')
        if (miss) { dialog.show({ title: '出错了', content: miss, showCancel: false, confirmColor: '#E8763A' }); return }
        const res = lessons.completeByStudent(id)
        this.show(this.data.activeTab)
        if (!res || typeof res.ok !== 'boolean') { this.show(this.data.activeTab); return }
        if (res.ok) wx.showToast({ title: '签到成功', icon: 'success' })
        else dialog.show({ title: '签到失败', content: res.reason || '暂时无法签到',
          showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
      }
    })
  },

  /* ── 学员取消：距开课 > 6 小时才允许 ── */
  onSelfCancel(e) {
    const d = e.currentTarget.dataset
    const hours = parseFloat(d.hours)

    if (!(hours > CANCEL_LIMIT)) {
      this.blockCancel(d, hours)
      return
    }

    dialog.show({
      title: '取消课程',
      content: '确定取消「' + d.course + '」' + d.date + ' ' + d.time + ' 这节课吗？课程还没上，取消后名额会释放给其他同学。',
      confirmText: '确认取消', confirmColor: '#E8763A',
      success: (r) => {
        if (!r.confirm) return
        const miss = need(lessons.cancelByStudent, 'cancelByStudent')
        if (miss) { dialog.show({ title: '出错了', content: miss, showCancel: false, confirmColor: '#E8763A' }); return }
        const res = lessons.cancelByStudent(d.id)
        this.show(this.data.activeTab)
        if (!res || typeof res.ok !== 'boolean') { this.show(this.data.activeTab); return }
        if (res.ok) {
          wx.showToast({ title: res.released ? '已取消，名额已释放' : '已取消', icon: 'success' })
          if (cloudkit.mode() === 'cloud') {
            const me = app.globalData.userInfo || {}
            cloudkit.bookRemote(d.id, 'remove', me.name || '').then(r => {
              if (!r.ok && !r.local) {
                dialog.show({ title: '同步失败', content: r.error || '请稍后重试',
                  showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
              }
              cloudkit.pullAll().then(() => this.show(this.data.activeTab))
            })
          }
        }
        else dialog.show({ title: '取消失败', content: res.reason || '暂时无法取消',
          showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
      }
    })
  },

  /** 不足 6 小时：说明原因并引导联系老师 */
  blockCancel(d, hours) {
    const s = studio.get()
    const soon = hours <= 0
    const when = soon
      ? '这节课已经开始'
      : '距离开课只剩 ' + hours + ' 小时'
    dialog.show({
      title: '暂时无法自行取消',
      content: when + '，不足 6 小时。\n请直接联系老师帮忙取消：' + (s.phone || '（老师还没填联系电话）') +
               (s.address ? '\n' + s.address : ''),
      cancelText: '知道了',
      confirmText: s.phone ? '复制电话' : '知道了',
      showCancel: !!s.phone,
      confirmColor: '#E8763A',
      success: (r) => {
        if (r.confirm && s.phone) {
          wx.setClipboardData({ data: s.phone, success: () => wx.showToast({ title: '已复制老师电话', icon: 'none' }) })
        }
      }
    })
  },

  goBack() { wx.navigateBack() }
})
