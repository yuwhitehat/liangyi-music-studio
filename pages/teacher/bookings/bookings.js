// teacher/bookings/bookings.js — 真实课表：状态 + 日期双筛选 / 签到 / 取消 / 指定学员
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const dateUtil = require('../../../utils/date.js')
const { LESSON_STATUS_TEXT, LESSON_STATUS_TAG } = require('../../../utils/constants.js')
const dialog = require('../../../utils/dialog.js')
const quota = require('../../../utils/quota.js')

const STRIPE = ['#2B3FA8', '#D9EAF5', '#1E2E7A', '#E8763A']
const AVA = [
  { bg: '#2B3FA8', fg: '#FFFFFF' }, { bg: '#E8763A', fg: '#FFFFFF' },
  { bg: '#D9EAF5', fg: '#1E2E7A' }, { bg: '#1E2E7A', fg: '#FFFFFF' }
]

const STATUS_FILTERS = [
  { k: 'all', t: '全部' }, { k: 'booked', t: '已约' },
  { k: 'available', t: '待约' }, { k: 'completed', t: '已完成' }, { k: 'cancelled', t: '已取消' }
]
const DATE_FILTERS = [
  { k: 'all', t: '全部日期' }, { k: 'today', t: '今天' }, { k: 'tomorrow', t: '明天' },
  { k: 'week', t: '未来 7 天' }, { k: 'past', t: '已过去' }
]

function mins(a, b) {
  const t = function (hm) { const p = String(hm).split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10) }
  const d = t(b) - t(a)
  return d > 0 ? d : 0
}

function decorate(rows) {
  return rows.map((l, i) => {
    const c = STRIPE[i % STRIPE.length]
    return {
      ...l,
      bg: c, fg: (c === '#D9EAF5' ? '#1E2E7A' : '#FFFFFF'),
      // 双保险：即使数据源缺字段也能显示时间
      timeSlot: l.timeSlot || (l.timeStart + '–' + l.timeEnd),
      minutes: l.minutes || mins(l.timeStart, l.timeEnd),
      dayLabel: l.date.slice(8), dateLabel: dateUtil.friendlyDate(l.date),
      studentNames: (l.students || []).map(s => s.name).join('、'),
      canCheckIn: lessons.canCheckIn(l).ok,
      statusText: LESSON_STATUS_TEXT[l.status] || l.status,
      statusTag: LESSON_STATUS_TAG[l.status] || 't-mute'
    }
  })
}

/** 日期区间谓词 */
function dateMatch(l, range, pick, today) {
  if (range === 'all') return true
  if (range === 'day') return l.date === pick
  if (range === 'today') return l.date === today
  if (range === 'tomorrow') return l.date === dateUtil.addDays(today, 1)
  if (range === 'week') return l.date >= today && l.date <= dateUtil.addDays(today, 6)
  if (range === 'past') return l.date < today
  return true
}

Page({
  data: {
    statusFilters: STATUS_FILTERS, dateFilters: DATE_FILTERS,
    activeFilter: 'all', dateRange: 'today', pickDate: '', pickMD: '',
    activeLabel: '全部', dateLabel: '今天',
    hasFilter: true, emptyTitle: '今天没有课', emptyHint: '',
    allLessons: [], filteredLessons: [],
    showPicker: false, pickerId: '', pickerCourse: '', pickerTime: '',
    keyword: '', pickerList: [], picked: []
  },

  onShow() { this.refresh() },

  refresh() {
    const d = this.data
    const today = dateUtil.formatDate(new Date())
    const all = decorate(lessons.all().sort((a, b) =>
      (a.date + a.timeStart) < (b.date + b.timeStart) ? -1 : 1))

    const filtered = all.filter(l =>
      (d.activeFilter === 'all' || l.status === d.activeFilter) &&
      dateMatch(l, d.dateRange, d.pickDate, today))

    const dateLabel = d.dateRange === 'day'
      ? (d.pickMD || d.pickDate)
      : ((DATE_FILTERS.filter(f => f.k === d.dateRange)[0] || {}).t)

    // 空状态文案跟着筛选条件走，避免「这里还空着」看不出是被筛掉了
    let emptyTitle = '没有符合条件的课'
    let emptyHint = ''
    if (d.dateRange === 'today' && d.activeFilter === 'all') { emptyTitle = '今天没有课'; emptyHint = '看看明天或往后几天？' }
    else if (d.dateRange === 'today') { emptyTitle = '今天没有' + (d.activeLabel || '') + '的课' }
    else if (d.dateRange === 'tomorrow') { emptyTitle = '明天没有符合条件的课' }
    else if (d.dateRange === 'week') { emptyTitle = '未来 7 天没有符合条件的课' }
    else if (d.dateRange === 'past') { emptyTitle = '没有已过去的课' }
    else if (d.activeFilter !== 'all') { emptyTitle = '没有' + d.activeLabel + '的课' }

    this.setData({
      allLessons: all, filteredLessons: filtered,
      activeLabel: (STATUS_FILTERS.filter(f => f.k === d.activeFilter)[0] || {}).t,
      dateLabel: dateLabel,
      hasFilter: d.activeFilter !== 'all' || d.dateRange !== 'all',
      emptyTitle: emptyTitle,
      emptyHint: filtered.length ? '' : emptyHint
    })
  },

  onFilter(e) { this.setData({ activeFilter: e.currentTarget.dataset.filter }, () => this.refresh()) },

  onDateRange(e) {
    const r = e.currentTarget.dataset.range
    this.setData({ dateRange: r, pickDate: '', pickMD: '' }, () => this.refresh())
  },

  /** 指定某一天 */
  onPickDate(e) {
    const v = e.detail.value
    this.setData({
      dateRange: 'day', pickDate: v,
      pickMD: parseInt(v.slice(5, 7), 10) + '月' + parseInt(v.slice(8, 10), 10) + '日'
    }, () => this.refresh())
  },

  /** 空状态快捷出口：只放开日期，保留状态筛选 */
  onShowAllDates() {
    this.setData({ dateRange: 'all', pickDate: '', pickMD: '' }, () => this.refresh())
  },

  onClearFilter() {
    this.setData({ activeFilter: 'all', dateRange: 'all', pickDate: '', pickMD: '' }, () => this.refresh())
  },

  onComplete(e) {
    const id = e.currentTarget.dataset.id
    const lesson = lessons.all().filter(function (l) { return l.id === id })[0]
    const res = lessons.complete(id)
    this.refresh()
    if (!res.ok) {
      dialog.show({ title: '无法签到', content: res.reason || '暂时无法签到',
        showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
      return
    }
    wx.showToast({ title: '已签到', icon: 'success' })
    // 签到会让「已上」+1，若因此超过报名总数就当场提醒，别等对账才发现
    const over = quota.overQuotaAfterCheckIn(lesson)
    if (over.length) {
      setTimeout(function () {
        dialog.show({
          title: '有学员课时已超',
          content: over.map(function (o) {
            return o.name + '：报名 ' + o.total + ' 节，已上 ' + o.used + ' 节（超 ' + (o.used - o.total) + ' 节）'
          }).join('\n') + '\n\n记得给学员补充课时。',
          showCancel: false, confirmText: '知道了', confirmColor: '#E8763A'
        })
      }, 700)
    }
  },

  onCancel(e) {
    const id = e.currentTarget.dataset.id
    const l = lessons.all().filter(function (x) { return x.id === id })[0]
    const ended = l && lessons.hasEnded(l)
    dialog.show({
      title: '取消课程',
      content: ended
        ? '这节课已结束，取消后会保留学员名单并标记为「已取消」。'
        : '这节课还没上，取消后会释放为「待约」、清空学员，其他同学可以重新约。',
      confirmText: '确认取消', confirmColor: '#E8763A',
      success: (r) => {
        if (!r.confirm) return
        const res = lessons.cancel(id)
        this.refresh()
        if (!res.ok) {
          dialog.show({ title: '取消失败', content: res.reason || '暂时无法取消',
            showCancel: false, confirmText: '知道了', confirmColor: '#E8763A' })
          return
        }
        wx.showToast({ title: res.released ? '已释放为待约' : '已取消', icon: 'success' })
      }
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除课程', content: '从课表中彻底删除这一节？',
      confirmText: '删除', confirmColor: '#E8763A',
      success: (r) => {
        if (!r.confirm) return
        lessons.remove(id); this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  // ── 事后指定学员 ──
  onOpenPicker(e) {
    const { id, course, time } = e.currentTarget.dataset
    const row = lessons.all().filter(l => l.id === id)[0]
    this.setData({
      showPicker: true, pickerId: id, pickerCourse: course, pickerTime: time, keyword: '',
      picked: (row && row.students ? row.students : []).slice()
    }, () => this.buildPicker())
  },
  onClosePicker() { this.setData({ showPicker: false }) },
  onSearchStudent(e) { this.setData({ keyword: e.detail.value }, () => this.buildPicker()) },

  buildPicker() {
    const kw = this.data.keyword
    const ids = this.data.picked.map(s => s.id)
    const rows = students.list()
      .filter(s => !kw || s.name.indexOf(kw) > -1 || (s.phone || '').indexOf(kw) > -1)
      .map((s, i) => {
        const a = AVA[i % AVA.length]
        return { ...s, bg: a.bg, fg: a.fg, checked: ids.indexOf(s.id) > -1 }
      })
    this.setData({ pickerList: rows })
  },

  onToggleStudent(e) {
    const id = e.currentTarget.dataset.id
    let picked = this.data.picked
    picked = picked.some(s => s.id === id)
      ? picked.filter(s => s.id !== id)
      : picked.concat(students.snapshot(id))
    this.setData({ picked: picked }, () => this.buildPicker())
  },

  onSaveBooking() {
    if (!this.data.picked.length) { wx.showToast({ title: '请至少选一位学员', icon: 'none' }); return }
    lessons.book(this.data.pickerId, this.data.picked)
    this.setData({ showPicker: false }); this.refresh()
    wx.showToast({ title: '已指定学员', icon: 'success' })
  },

  goBack() { wx.navigateBack() }
})
