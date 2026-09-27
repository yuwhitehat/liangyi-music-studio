// teacher/students/students.js — 学员名册：增改删 + 课时/报名日期录入
const lessons = require('../../../utils/lessons.js')
const students = require('../../../utils/students.js')
const dateUtil = require('../../../utils/date.js')

const AVA = [
  { bg: '#2B3FA8', fg: '#FFFFFF' }, { bg: '#E8763A', fg: '#FFFFFF' },
  { bg: '#D9EAF5', fg: '#1E2E7A' }, { bg: '#1E2E7A', fg: '#FFFFFF' }
]

function blank() {
  return { name: '', phone: '', note: '', totalLessons: '', doneBefore: '', enrollStart: '', enrollEnd: '' }
}

Page({
  data: {
    keyword: '', students: [], filteredStudents: [],
    showForm: false, editingId: '', form: blank()
  },

  onShow() { this.refresh() },

  refresh() {
    const today = dateUtil.formatDate(new Date())
    const rows = lessons.all()

    const all = students.list().map((s, i) => {
      const mine = rows.filter(l => (l.students || []).some(x => x.id === s.id))
      // 系统内已完成的课，累加到「已上」上（录入的是上线前的历史节数，两者不重叠）
      const inAppDone = mine.filter(l => l.status === 'completed').length
      const done = (s.doneBefore || 0) + inAppDone   // 展示用：基线 + 本小程序内完成
      const total = s.totalLessons || 0
      const a = AVA[i % AVA.length]
      return {
        ...s, bg: a.bg, fg: a.fg,
        done: done,
        inAppDone: inAppDone,
        totalLessons: total,
        // 不用 Math.max 吞掉超支：老师要能一眼看到谁上超了
        remain: total - done,
        over: total > 0 && done > total,
        overBy: (total > 0 && done > total) ? done - total : 0,
        pct: total ? Math.min(100, Math.round(done / total * 100)) : 0
      }
    })
    this.setData({ students: all, filteredStudents: this.applyKw(all) })
  },

  /** 该学员在本小程序内已完成的课数（用于把「总已上」换算回基线） */
  inAppOf(id) {
    if (!id) return 0
    return lessons.all().filter(l =>
      l.status === 'completed' && (l.students || []).some(x => x && x.id === id)
    ).length
  },

  applyKw(rows) {
    const kw = this.data.keyword
    return kw ? rows.filter(s => s.name.indexOf(kw) > -1 || (s.phone || '').indexOf(kw) > -1) : rows
  },
  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()) },

  onIn(e) { this.setData({ ['form.' + e.currentTarget.dataset.k]: e.detail.value }) },

  /** 节数输入：只留数字 */
  onNum(e) {
    const v = (e.detail.value || '').replace(/\D/g, '')
    this.setData({ ['form.' + e.currentTarget.dataset.k]: v })
  },

  onDate(e) { this.setData({ ['form.' + e.currentTarget.dataset.k]: e.detail.value }) },
  onClearDates() { this.setData({ 'form.enrollStart': '', 'form.enrollEnd': '' }) },

  onOpenAdd() { this.setData({ showForm: true, editingId: '', form: blank() }) },

  onEdit(e) {
    const s = this.data.students.filter(x => x.id === e.currentTarget.dataset.id)[0]
    if (!s) return
    this.setData({
      showForm: true, editingId: s.id,
      form: {
        name: s.name, phone: s.phone || '', note: s.note || '',
        totalLessons: s.totalLessons ? String(s.totalLessons) : '',
        // 表单里让老师填的是「一共上了几节」，存的时候换算成基线，
        // 否则老师填 10、系统内又有 4 节完成的，展示就会跳到 14
        doneBefore: String(s.done || 0),
        enrollStart: s.enrollStart || '', enrollEnd: s.enrollEnd || ''
      }
    })
  },

  onCloseForm() { this.setData({ showForm: false, editingId: '' }) },

  onSubmit() {
    const f = this.data.form
    const total = parseInt(f.totalLessons, 10) || 0
    const totalDone = parseInt(f.doneBefore, 10) || 0
    const inApp = this.inAppOf(this.data.editingId)
    if (total && totalDone > total) {
      wx.showToast({ title: '已上不能大于共报', icon: 'none' }); return
    }
    const payload = {
      name: f.name, phone: f.phone, note: f.note,
      totalLessons: total,
      doneBefore: Math.max(0, totalDone - inApp),   // 存基线：总已上 − 系统内已完成
      enrollStart: f.enrollStart, enrollEnd: f.enrollEnd
    }
    try {
      if (this.data.editingId) students.update(this.data.editingId, payload)
      else students.add(payload)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' }); return
    }
    this.setData({ showForm: false, editingId: '' })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onRemove() {
    const id = this.data.editingId
    const name = this.data.form.name
    const n = lessons.all().filter(l => (l.students || []).some(s => s.id === id)).length
    wx.showModal({
      title: '删除学员',
      content: n ? '「' + name + '」关联着 ' + n + ' 节课，删除后课表里的名字仍会保留，但无法再约课。'
                 : '确定删除「' + name + '」吗？',
      confirmText: '删除', confirmColor: '#E8763A',
      success: (r) => {
        if (!r.confirm) return
        students.remove(id)
        this.setData({ showForm: false, editingId: '' })
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  goBack() { wx.navigateBack() }
})
