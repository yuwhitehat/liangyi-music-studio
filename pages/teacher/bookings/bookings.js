// teacher/bookings/bookings.js — 真实课表：状态 + 日期双筛选 / 签到 / 取消 / 指定学员
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const dateUtil = require('../../../utils/date.js')
const { lessonStatusText, lessonStatusTag } = require('../../../utils/constants.js')
const dialog = require('../../../utils/dialog.js')
const quota = require('../../../utils/quota.js')

const STRIPE = ['#111111', '#FFF3C4', '#4D8DFF', '#FF5FA2']
const AVA = [
  { bg: '#111111', fg: '#FFFFFF' }, { bg: '#FF5FA2', fg: '#FFFFFF' },
  { bg: '#FFF3C4', fg: '#4D8DFF' }, { bg: '#4D8DFF', fg: '#FFFFFF' }
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
      bg: c, fg: (c === '#FFF3C4' ? '#4D8DFF' : '#FFFFFF'),
      // 双保险：即使数据源缺字段也能显示时间
      timeSlot: l.timeSlot || (l.timeStart + '–' + l.timeEnd),
      minutes: l.minutes || mins(l.timeStart, l.timeEnd),
      dayLabel: l.date.slice(8), dateLabel: dateUtil.friendlyDate(l.date),
      studentNames: (l.students || []).map(s => s.name).join('、'),
      canCheckIn: lessons.canCheckIn(l).ok,
      statusText: lessonStatusText(l),
      statusTag: lessonStatusTag(l)
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
    showPicker: false, pickerId: '', pickerCourse: '', pickerCourseType: '', pickerTime: '',
    keyword: '', pickerList: [], picked: [], pickerWarn: [],
    showCx: false, cx: null
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
        showCancel: false, confirmText: '知道了', confirmColor: '#FF5FA2' })
      return
    }
    wx.showToast({ title: '已签到', icon: 'success' })
    // 签到会让这门课的「已上」+1，若因此超过报名总数就当场提醒，别等对账才发现
    const over = quota.overQuotaAfterCheckIn(lesson)
    if (over.length) {
      setTimeout(function () {
        dialog.show({
          title: '有学员课时已超',
          content: over.map(function (o) {
            return o.name + '：' + o.courseName + ' 报名 ' + o.total + ' 节，已上 ' + o.used + ' 节（超 ' + o.overBy + ' 节）'
          }).join('\n') + '\n\n记得给学员补充课时。',
          showCancel: false, confirmText: '知道了', confirmColor: '#FF5FA2'
        })
      }, 700)
    }
  },

  /* ── 取消 / 扣课时：同一个弹层，后果与「扣不扣」同屏，一次决策 ── */
  onCancel(e) { this.openCx(e.currentTarget.dataset.id, 'cancel') },
  onCharge(e) { this.openCx(e.currentTarget.dataset.id, 'charge') },

  openCx(id, mode) {
    const l = lessons.all().filter(function (x) { return x.id === id })[0]
    if (!l) { wx.showToast({ title: '课程不存在', icon: 'none' }); return }
    // 取消时默认按时间给（已到→扣，未到→不扣）；改课时时沿用课上已有标记
    const charge = mode === 'charge' ? !!l.cancelCharge : lessons.hasStarted(l)
    this.setData({ showCx: true, cx: this.buildCx(l, mode, charge) })
  },

  buildCx(l, mode, charge) {
    const started = lessons.hasStarted(l)
    // 扣了课时就不释放：课时要记在名单上，名单清空就没得可扣
    const keep = mode === 'charge' ? true : (started || charge)
    // 课时按门记，这里只看这节课所属课程的报名
    const rows = (l.students || []).map(function (s) {
      const q = quota.summary(s.id, l.courseType)
      const noRoster = !students.byId(s.id)
      return {
        id: s.id, name: s.name, hasQuota: !!q, noRoster: noRoster,
        total: q ? q.total : 0, used: q ? q.used : 0, usedAfter: q ? q.used + 1 : 0,
        overAfter: !!(q && q.total > 0 && q.used + 1 > q.total)
      }
    })
    const none = rows.length === 0
    const unenrolled = rows.filter(function (r) { return !r.hasQuota }).length
    // 只说取消的后果；扣不扣由下面的单选回答，别在这里重复一遍
    const note = mode === 'charge'
      ? '这节课已取消。改的只是课时标记，课程状态和名单都不动。'
      : (started ? '已到上课时间 · ' : '未到上课时间 · ')
        + (keep ? '保留学员名单，标记「已取消」。' : '释放为「待约」、清空学员，其他同学可以重新约。')
    const timeSlot = l.timeSlot || (l.timeStart + '–' + l.timeEnd)
    return {
      mode: mode, id: l.id, charge: charge, started: started, keep: keep, none: none,
      unenrolled: unenrolled, courseName: l.courseName,
      title: mode === 'charge' ? '这节课的课时' : '取消课程',
      meta: l.courseName + ' · ' + dateUtil.friendlyDate(l.date) + ' ' + timeSlot
          + ' · ' + (l.minutes || mins(l.timeStart, l.timeEnd)) + ' 分',
      note: note, students: rows,
      confirmText: mode === 'charge' ? '保存' : '确认取消'
    }
  },

  onPickCharge(e) {
    const cx = this.data.cx
    const charge = e.currentTarget.dataset.v === '1'
    if (!cx || charge === cx.charge) return
    const l = lessons.all().filter(function (x) { return x.id === cx.id })[0]
    if (l) this.setData({ cx: this.buildCx(l, cx.mode, charge) })
  },

  onCloseCx() { this.setData({ showCx: false }) },

  onConfirmCx() {
    const cx = this.data.cx
    if (!cx) return
    const res = cx.mode === 'charge'
      ? lessons.setCharge(cx.id, cx.charge)
      : lessons.cancel(cx.id, cx.charge)
    this.setData({ showCx: false })
    this.refresh()
    if (!res.ok) {
      dialog.show({ title: cx.mode === 'charge' ? '修改失败' : '取消失败',
        content: res.reason || '暂时无法处理', showCancel: false,
        confirmText: '知道了', confirmColor: '#FF5FA2' })
      return
    }
    if (cx.mode === 'charge') {
      wx.showToast({ title: cx.charge ? '已标记扣课时' : '已改为不扣', icon: 'none' })
      this.warnAfterCharge(cx)
      return
    }
    wx.showToast({
      title: res.released ? '已释放为待约' : (res.charged ? '已取消 · 扣 1 节' : '已取消'),
      icon: 'none'
    })
    this.warnAfterCharge(cx)
  },

  /** 扣课时可能当场把学员推过这门课的报名总数；没报本课的人扣了也不计入 —— 两条都要当场说一声 */
  warnAfterCharge(cx) {
    if (!cx.charge) return
    const over = cx.students.filter(function (s) { return s.overAfter })
    const lines = over.map(function (o) {
      return o.name + '：' + cx.courseName + ' 报名 ' + o.total + ' 节，已上 ' + o.usedAfter
        + ' 节（超 ' + (o.usedAfter - o.total) + ' 节）'
    })
    if (cx.unenrolled) {
      lines.push('另有 ' + cx.unenrolled + ' 人没报「' + cx.courseName + '」，扣的课时不计入任何课程')
    }
    if (!lines.length) return
    setTimeout(function () {
      dialog.show({
        title: '扣课时提醒',
        content: lines.join('\n') + (over.length ? '\n\n记得给学员补充课时。' : ''),
        showCancel: false, confirmText: '知道了', confirmColor: '#FF5FA2'
      })
    }, 700)
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除课程', content: '从课表中彻底删除这一节？',
      confirmText: '删除', confirmColor: '#FF5FA2',
      success: (r) => {
        if (!r.confirm) return
        lessons.remove(id); this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  // ── 事后指定学员 ──
  onOpenPicker(e) {
    const { id, course, time, type } = e.currentTarget.dataset
    const row = lessons.all().filter(l => l.id === id)[0]
    this.setData({
      showPicker: true, pickerId: id, pickerCourse: course, pickerTime: time,
      pickerCourseType: type, keyword: '',
      picked: (row && row.students ? row.students : []).slice()
    }, () => this.buildPicker())
  },
  onClosePicker() { this.setData({ showPicker: false }) },
  onSearchStudent(e) { this.setData({ keyword: e.detail.value }, () => this.buildPicker()) },

  /** 选中的人里，没报这门课 / 这门课已超支的 —— 只提醒，不拦 */
  warnOf(ids) {
    return quota.auditStudents(this.data.pickerCourseType, ids.map(function (id) { return { id: id } }))
  },

  buildPicker() {
    const kw = this.data.keyword
    const type = this.data.pickerCourseType
    const ids = this.data.picked.map(s => s.id)
    const rows = students.list()
      .filter(s => !kw || s.name.indexOf(kw) > -1 || (s.phone || '').indexOf(kw) > -1)
      .map((s, i) => {
        const a = AVA[i % AVA.length]
        const q = quota.summary(s.id, type)
        return {
          ...s, bg: a.bg, fg: a.fg, checked: ids.indexOf(s.id) > -1,
          notEnrolled: !q, over: !!(q && q.over),
          // 副标题按这门课报，原来那个人身上的总课时和这节课没关系
          sub: q ? (q.courseName + ' 剩 ' + q.remain + ' 节') : (s.note ? s.note + ' · 没报本课' : '没报本课')
        }
      })
    this.setData({ pickerList: rows, pickerWarn: this.warnOf(ids) })
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
