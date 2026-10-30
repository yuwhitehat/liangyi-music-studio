// teacher/students/students.js — 学员名册：资料增改删 + 按课程登记报名与课时
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const courses = require('../../../utils/courses.js')
const quota = require('../../../utils/quota.js')
const dateUtil = require('../../../utils/date.js')

const AVA = [
  { bg: '#111111', fg: '#FFFFFF' }, { bg: '#FF5FA2', fg: '#FFFFFF' },
  { bg: '#FFF3C4', fg: '#4D8DFF' }, { bg: '#4D8DFF', fg: '#FFFFFF' }
]

function blank() { return { name: '', phone: '', note: '' } }

/** 报名周期 → 「3月1日 → 12月31日 · 剩 62 天」；没填就是未填 */
function md(d) { return d ? parseInt(d.slice(5, 7), 10) + '月' + parseInt(d.slice(8, 10), 10) + '日' : '' }
function spanOf(q) {
  if (q.start && q.end) return md(q.start) + ' → ' + md(q.end)
  if (q.start) return md(q.start) + ' 开始'
  if (q.end) return '至 ' + md(q.end)
  return '未填周期'
}
function daysLeft(q) {
  if (!q.end) return -1
  const today = dateUtil.formatDate(new Date())
  if (q.end < today) return -1
  return Math.round((new Date(q.end) - new Date(today)) / 86400000)
}

Page({
  data: {
    keyword: '', students: [], filteredStudents: [], enrollTotal: 0,
    showForm: false, editingId: '', form: blank(), formCourses: [],
    showEnroll: false, enrollId: '', enrollName: '', enrollIsNew: false,
    enrollForm: { courseType: '', totalLessons: '', doneBefore: '', start: '', end: '' },
    enrollTypes: [], enrollCourseName: '', live: null
  },

  onShow() { this.refresh() },

  refresh() {
    const all = students.list().map((s, i) => {
      const a = AVA[i % AVA.length]
      // 课时按门记：每门课各算各的，人和人之间不合并
      const rows = quota.enrollmentsOf(s.id).map(q => ({
        ...q,
        span: spanOf(q),
        days: daysLeft(q)
      }))
      return {
        ...s, bg: a.bg, fg: a.fg,
        rows: rows,
        courseCount: rows.length,
        overCount: rows.filter(q => q.over).length
      }
    })
    this.setData({
      students: all,
      filteredStudents: this.applyKw(all),
      enrollTotal: all.reduce((n, s) => n + s.courseCount, 0)
    })
  },

  applyKw(rows) {
    const kw = this.data.keyword
    return kw ? rows.filter(s => s.name.indexOf(kw) > -1 || (s.phone || '').indexOf(kw) > -1) : rows
  },
  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()) },

  /* ── 学员资料 ── */
  onIn(e) { this.setData({ ['form.' + e.currentTarget.dataset.k]: e.detail.value }) },

  onOpenAdd() { this.setData({ showForm: true, editingId: '', form: blank(), formCourses: [] }) },

  onEdit(e) {
    const s = this.pick(e.currentTarget.dataset.id)
    if (!s) return
    this.setData({
      showForm: true, editingId: s.id,
      form: { name: s.name, phone: s.phone || '', note: s.note || '' },
      formCourses: s.rows
    })
  },

  pick(id) { return this.data.students.filter(x => x.id === id)[0] || null },
  onCloseForm() { this.setData({ showForm: false, editingId: '' }) },

  /** 资料落库：返回该学员的 id；校验没过返回 false（已弹提示） */
  commitForm() {
    const f = this.data.form
    try {
      if (this.data.editingId) { students.update(this.data.editingId, f); return this.data.editingId }
      students.add(f)
      const hit = students.list().filter(function (r) { return r.name === (f.name || '').trim() })[0]
      return hit ? hit.id : false
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      return false
    }
  },

  onSubmit() {
    if (this.commitForm() === false) return
    this.onCloseForm()
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  /** 新增学员：存完直接接着报第一门课，省老师回头再点一次 */
  onSubmitAndEnroll() {
    const id = this.commitForm()
    if (id === false) return
    this.onCloseForm()
    this.refresh()
    if (id) this.openEnroll(id, '')
  },

  onRemove() {
    const id = this.data.editingId
    const name = this.data.form.name
    const n = lessons.all().filter(l => (l.students || []).some(s => s.id === id)).length
    const m = (this.pick(id) || {}).courseCount || 0
    wx.showModal({
      title: '删除学员',
      content: '「' + name + '」已报 ' + m + ' 门课'
        + (n ? '、关联 ' + n + ' 节课。' : '。')
        + '删除后课表里的名字仍会保留，但无法再约课。',
      confirmText: '删除', confirmColor: '#FF5FA2',
      success: (r) => {
        if (!r.confirm) return
        students.remove(id)
        this.setData({ showForm: false, editingId: '' })
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  /* ── 一门课的报名 ── */
  /** 课程行的 data-type 有值就是改那条，没有（点「+ 加一门课」）就是新增 */
  onEnrollTap(e) {
    this.openEnroll(e.currentTarget.dataset.id, e.currentTarget.dataset.type || '')
  },

  /** 从资料弹层里点某门课 / 加一门课：先把资料存了再进报名，免得回来重存 */
  onFormCourse(e) { this.formToEnroll(e.currentTarget.dataset.type) },
  onFormAddEnroll() { this.formToEnroll('') },
  formToEnroll(type) {
    const id = this.data.editingId
    if (!id) return
    if (this.commitForm() === false) return
    this.onCloseForm()
    this.refresh()
    this.openEnroll(id, type)
  },

  /** 课程类型胶囊：同一门课只能有一条报名，已报的置灰 */
  buildTypes(sid, picked) {
    const mine = students.enrollments(sid)
    return courses.list().map(function (c) {
      return {
        id: c.id, name: c.name,
        taken: mine.some(function (e) { return e.courseType === c.id }) && c.id !== picked,
        cur: c.id === picked
      }
    })
  },

  openEnroll(sid, courseType) {
    const s = this.pick(sid) || students.byId(sid) || {}
    const e = courseType ? students.enrollment(sid, courseType) : null
    const type = e ? e.courseType : (courseType || '')
    this.setData({
      showEnroll: true, enrollId: sid, enrollName: s.name || '', enrollIsNew: !e,
      enrollTypes: this.buildTypes(sid, type),
      enrollCourseName: type ? courses.byId(type).name : '',
      enrollForm: e
        ? { courseType: type, totalLessons: String(e.totalLessons || ''),
            // 表单里让老师填「一共上了几节」，存的时候才换算回基线
            doneBefore: String((e.doneBefore || 0) + quota.doneInApp(sid, type)),
            start: e.start || '', end: e.end || '' }
        : { courseType: type, totalLessons: '', doneBefore: '', start: '', end: '' }
    }, () => this.syncLive())
  },

  onCloseEnroll() { this.setData({ showEnroll: false }) },

  onPickType(e) {
    // 编辑已有报名时类型锁死：换课要先删掉这条再新增，否则「同一门课只留一条」会被绕开
    if (!this.data.enrollIsNew) return
    const { id: type, taken } = e.currentTarget.dataset
    if (taken === '1') { wx.showToast({ title: '这门课已经报过了', icon: 'none' }); return }
    if (type === this.data.enrollForm.courseType) return
    // 换类型时把「已上」按新那门课重算：各门课系统内完成的节数不一样
    this.setData({
      'enrollForm.courseType': type,
      enrollCourseName: courses.byId(type).name,
      enrollTypes: this.buildTypes(this.data.enrollId, type),
      'enrollForm.doneBefore': String(quota.doneInApp(this.data.enrollId, type))
    }, () => this.syncLive())
  },

  onEnrollNum(e) {
    this.setData({ ['enrollForm.' + e.currentTarget.dataset.k]: (e.detail.value || '').replace(/\D/g, '') },
      () => this.syncLive())
  },
  onEnrollDate(e) { this.setData({ ['enrollForm.' + e.currentTarget.dataset.k]: e.detail.value }) },
  onClearDates() { this.setData({ 'enrollForm.start': '', 'enrollForm.end': '' }) },

  /** 实时算给老师看：剩余 = 共报 −（基线 + 系统内）；WXML 不能调方法，得塞进 data */
  syncLive() {
    const f = this.data.enrollForm
    const total = parseInt(f.totalLessons, 10) || 0
    const done = parseInt(f.doneBefore, 10) || 0
    this.setData({
      live: {
        has: !!f.courseType,
        total: total, done: done, remain: total - done,
        overBy: total > 0 && done > total ? done - total : 0,
        inApp: quota.doneInApp(this.data.enrollId, f.courseType)
      }
    })
  },

  onSubmitEnroll() {
    const f = this.data.enrollForm
    if (!f.courseType) { wx.showToast({ title: '请选择课程类型', icon: 'none' }); return }
    const total = parseInt(f.totalLessons, 10) || 0
    const done = parseInt(f.doneBefore, 10) || 0
    if (total && done > total) { wx.showToast({ title: '已上不能大于共报', icon: 'none' }); return }
    try {
      students.setEnrollment(this.data.enrollId, {
        courseType: f.courseType, totalLessons: f.totalLessons,
        // 老师填的是「一共上了几节」，存的时候减去这门课系统内完成的节数换算成基线
        doneBefore: Math.max(0, done - quota.doneInApp(this.data.enrollId, f.courseType)),
        start: f.start, end: f.end
      })
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' }); return
    }
    this.setData({ showEnroll: false })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onRemoveEnroll() {
    const f = this.data.enrollForm
    const name = courses.byId(f.courseType).name
    const id = this.data.enrollId
    const n = lessons.all().filter(l =>
      l.courseType === f.courseType && (l.students || []).some(s => s.id === id)).length
    wx.showModal({
      title: '删掉这门课',
      content: '「' + this.data.enrollName + '」的' + name + '报名连同课时一起删除'
        + (n ? '；课表里 ' + n + ' 节' + name + '课仍会保留记录，只是不再计入课时。' : '。'),
      confirmText: '删除', confirmColor: '#FF5FA2',
      success: (r) => {
        if (!r.confirm) return
        try { students.removeEnrollment(id, f.courseType) }
        catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); return }
        this.setData({ showEnroll: false })
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  goBack() { wx.navigateBack() }
})
