// teacher/schedule/schedule.js — 自由排课 + 已有预约登记
const app = getApp()
const courses = require('../../../utils/courses.js')
const students = require('../../../utils/students.js')
const lessons = require('../../../utils/lessons.js')
const dateUtil = require('../../../utils/date.js')
const { DURATIONS } = require('../../../utils/constants.js')

const AVA = [
  { bg: '#2B3FA8', fg: '#FFFFFF' }, { bg: '#E8763A', fg: '#FFFFFF' },
  { bg: '#D9EAF5', fg: '#1E2E7A' }, { bg: '#1E2E7A', fg: '#FFFFFF' }
]

function toMin(hm) { const p = hm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10) }
function toHM(m) {
  const t = ((m % 1440) + 1440) % 1440
  const h = Math.floor(t / 60), mm = t % 60
  return (h < 10 ? '0' + h : '' + h) + ':' + (mm < 10 ? '0' + mm : '' + mm)
}

Page({
  data: {
    dateList: [], selectedDate: '', dateBusy: {},
    courses: [], selectedCourse: '', selectedCourseName: '', selectedIll: '',
    durations: DURATIONS,
    startAt: '09:00', endAt: '10:00', minutes: 60,
    repeat: 0, times: 8, timesOptions: [4, 8, 12, 24], weekdayText: '', lastDate: '',
    hasBooking: false, pickedStudents: [], pickedNames: '',
    slots: [],
    showPicker: false, keyword: '', pickerList: []
  },

  onLoad() {
    const dates = dateUtil.getNextDays(14).map(d => ({
      ...d, weekdayText: dateUtil.getWeekdayText(d.weekday)
    }))
    const list = courses.list()
    const first = list[0]
    const end = toHM(9 * 60 + (first ? first.duration : 60))
    this.setData({
      dateList: dates, selectedDate: dates[0].date,
      courses: list,
      selectedCourse: first ? first.id : '',
      selectedCourseName: first ? first.name : '',
      selectedIll: first ? first.ill : '',
      minutes: first ? first.duration : 60,
      endAt: first ? toHM(9 * 60 + first.duration) : '10:00'
    })
    this.refreshBusy()
    this.refreshRepeatHint()
  },

  /** 每天已排几节课（用于日期卡提示 + 冲突检测由 lessons 负责） */
  refreshBusy() {
    const map = {}
    lessons.all().forEach(function (l) {
      if (l.status === 'cancelled') return
      map[l.date] = (map[l.date] || 0) + 1
    })
    this.setData({ dateBusy: map })
  },

  onSelectDate(e) { this.setData({ selectedDate: e.currentTarget.dataset.date }, () => this.refreshRepeatHint()) },

  onSelectCourse(e) {
    const { id, name, dur } = e.currentTarget.dataset
    this.setData({
      selectedCourse: id, selectedCourseName: name,
      selectedIll: courses.byId(id).ill,
      minutes: parseInt(dur, 10),
      endAt: toHM(toMin(this.data.startAt) + parseInt(dur, 10))
    })
  },

  onStartChange(e) {
    const s = e.detail.value
    this.setData({ startAt: s, endAt: toHM(toMin(s) + this.data.minutes) })
  },

  onEndChange(e) {
    const end = e.detail.value
    const mins = toMin(end) - toMin(this.data.startAt)
    if (mins <= 0) { wx.showToast({ title: '结束要晚于开始', icon: 'none' }); return }
    this.setData({ endAt: end, minutes: mins })
  },

  onPickDuration(e) {
    const d = parseInt(e.currentTarget.dataset.d, 10)
    this.setData({ minutes: d, endAt: toHM(toMin(this.data.startAt) + d) })
  },

  // ── 固定课 ──
  onPickRepeat(e) {
    this.setData({ repeat: parseInt(e.currentTarget.dataset.r, 10) }, () => this.refreshRepeatHint())
  },
  onPickTimes(e) {
    this.setData({ times: parseInt(e.currentTarget.dataset.t, 10) }, () => this.refreshRepeatHint())
  },
  /** 预览：第 N 节落在哪一天 */
  refreshRepeatHint() {
    const d = this.data
    const wd = dateUtil.getWeekdayText(new Date(d.selectedDate).getDay())
    const last = d.repeat ? dateUtil.addDays(d.selectedDate, d.repeat * (d.times - 1)) : d.selectedDate
    this.setData({ weekdayText: wd, lastDate: last === d.selectedDate ? d.selectedDate : dateUtil.friendlyDate(last) })
  },

  // ── 已有预约 ──
  onToggleBooking(e) {
    const on = e.detail.value
    this.setData({ hasBooking: on })
    if (on && !this.data.pickedStudents.length) this.onOpenPicker()
  },

  onOpenPicker() {
    this.setData({ showPicker: true }, () => this.buildPicker())
  },
  onClosePicker() { this.setData({ showPicker: false }) },
  onSearchStudent(e) { this.setData({ keyword: e.detail.value }, () => this.buildPicker()) },

  buildPicker() {
    const kw = this.data.keyword
    const picked = this.data.pickedStudents.map(s => s.id)
    const rows = students.list()
      .filter(s => !kw || s.name.indexOf(kw) > -1 || (s.phone || '').indexOf(kw) > -1)
      .map((s, i) => ({
        ...s,
        bg: AVA[i % AVA.length].bg, fg: AVA[i % AVA.length].fg,
        checked: picked.indexOf(s.id) > -1
      }))
    this.setData({ pickerList: rows })
  },

  onToggleStudent(e) {
    const id = e.currentTarget.dataset.id
    let picked = this.data.pickedStudents
    picked = picked.some(s => s.id === id)
      ? picked.filter(s => s.id !== id)
      : picked.concat(students.snapshot(id))
    this.setPicked(picked)
  },

  onDropStudent(e) {
    this.setPicked(this.data.pickedStudents.filter(s => s.id !== e.currentTarget.dataset.id))
  },

  setPicked(list) {
    this.setData({
      pickedStudents: list,
      pickedNames: list.map(s => s.name).join('、')
    }, () => this.buildPicker())
  },

  // ── 待排列表 ──
  onAddSlot() {
    const d = this.data
    if (!d.selectedCourse) { wx.showToast({ title: '请先选课程类型', icon: 'none' }); return }
    if (d.minutes < 10) { wx.showToast({ title: '至少 10 分钟', icon: 'none' }); return }
    if (toMin(d.endAt) <= toMin(d.startAt)) { wx.showToast({ title: '结束要晚于开始', icon: 'none' }); return }
    if (d.hasBooking && !d.pickedStudents.length) {
      wx.showToast({ title: '请至少选一位学员', icon: 'none' }); return
    }

    const cand = { date: d.selectedDate, timeStart: d.startAt, timeEnd: d.endAt }
    // ① 与已保存到课表的课冲突（跨课程类型同样禁止重叠）
    const savedHit = lessons.forDate(cand.date).filter(l => lessons.overlap(l, cand))[0]
    // ② 与本次已添加的时段冲突
    const batchHit = d.slots.filter(s => s.date === cand.date && lessons.overlap(s, cand))[0]
    const hit = savedHit || batchHit
    if (hit) {
      wx.showModal({
        title: '时间冲突',
        content: '与 ' + hit.timeStart + '–' + hit.timeEnd + ' 的「' + hit.courseName + '」重叠，换个工作时间？',
        showCancel: false, confirmText: '知道了', confirmColor: '#2B3FA8'
      })
      return
    }

    const booked = d.hasBooking && d.pickedStudents.length > 0
    const key = [cand.date, cand.timeStart, cand.timeEnd, d.selectedCourse, d.repeat, d.times].join('_')
    if (d.slots.some(s => s.key === key)) { wx.showToast({ title: '该时段已添加', icon: 'none' }); return }

    this.setData({
      slots: d.slots.concat([{
        key: key,
        date: cand.date, timeStart: cand.timeStart, timeEnd: cand.timeEnd,
        minutes: d.minutes, courseType: d.selectedCourse, courseName: d.selectedCourseName,
        ill: d.selectedIll, booked: booked,
        students: booked ? d.pickedStudents : [],
        studentNames: booked ? d.pickedStudents.map(s => s.name).join('、') : '',
        repeat: d.repeat, times: d.times,
        repeatText: d.repeat ? (d.repeat === 14 ? '隔周' : '每周') + this.data.weekdayText + ' · 共 ' + d.times + ' 节' : ''
      }])
    })

    // 单节课顺延开始时间方便连排；固定课已占整周，不再顺延
    const patch = d.repeat ? {} : {
      startAt: cand.timeEnd, endAt: toHM(toMin(cand.timeEnd) + d.minutes)
    }
    // 清掉本次学员选择，避免误带进下一节
    patch.hasBooking = false; patch.pickedStudents = []; patch.pickedNames = ''
    this.setData(patch)
    wx.showToast({
      title: d.repeat ? '已添加 ' + d.times + ' 节' : '已添加',
      icon: 'success', duration: 700
    })
  },

  onRemoveSlot(e) {
    const k = e.currentTarget.dataset.key
    this.setData({ slots: this.data.slots.filter(s => s.key !== k) })
  },

  // ── 真正写入课表 ──
  onConfirmSchedule() {
    const { slots } = this.data
    if (!slots.length) { wx.showToast({ title: '请先添加时段', icon: 'none' }); return }

    const res = lessons.addMany(slots)

    if (res.conflict.length) {
      // showModal 的 content 不保证支持换行，多条冲突会糊成一团 → 改用逐行弹层
      this.setData({
        showConflicts: true,
        conflicts: res.conflict,
        conflictTitle: res.added ? '已排入 ' + res.added + ' 节，' + res.conflict.length + ' 节未排入'
                                 : '全部 ' + res.conflict.length + ' 节未排入'
      })
    }
    if (!res.ok) return

    this.refreshBusy()
    wx.showToast({ title: '已排 ' + res.added + ' 节', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1000)
  },

  onCloseConflicts() { this.setData({ showConflicts: false }) },

  goBack() { wx.navigateBack() }
})
