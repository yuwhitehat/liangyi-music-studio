// teacher/course-types/course-types.js — 超管：课程类型增删改
const app = getApp()
const courses = require('../../../utils/courses.js')
const { ICON_LIBRARY, DURATIONS } = require('../../../utils/constants.js')

Page({
  data: {
    list: [], showForm: false, editingId: '',
    iconLibrary: ICON_LIBRARY, durations: DURATIONS, customDur: '',
    form: { name: '', duration: 60, ill: 'ic-piano' }
  },

  onLoad() {
    if (!app.globalData.isSuperAdmin) {
      wx.showModal({
        title: '没有权限', content: '课程类型仅超级管理员可编辑。',
        showCancel: false, confirmText: '返回', confirmColor: '#2B3FA8',
        success: () => wx.navigateBack()
      })
      return
    }
    this.refresh()
  },

  onShow() { this.refresh() },
  refresh() { this.setData({ list: courses.list() }) },

  onName(e) { this.setData({ 'form.name': e.detail.value }) },

  onDuration(e) {
    const d = parseInt(e.currentTarget.dataset.d, 10)
    this.setData({ 'form.duration': d, customDur: '' })
  },

  /** 自定义时长：填了就优先用填的 */
  onDurationInput(e) {
    const v = e.detail.value
    this.setData({ customDur: v })
    const n = parseInt(v, 10)
    if (n > 0) this.setData({ 'form.duration': n })
  },

  onPickIcon(e) { this.setData({ 'form.ill': e.currentTarget.dataset.ill }) },

  onOpenAdd() {
    const used = this.data.list.map(l => l.ill)
    const free = (ICON_LIBRARY.filter(i => used.indexOf(i.ill) === -1)[0] || ICON_LIBRARY[0]).ill
    this.setData({
      showForm: true, editingId: '', customDur: '',
      form: { name: '', duration: 60, ill: free }
    })
  },

  onEdit(e) {
    const row = this.data.list.filter(l => l.id === e.currentTarget.dataset.id)[0]
    if (!row) return
    const preset = DURATIONS.indexOf(row.duration) > -1
    this.setData({
      showForm: true, editingId: row.id,
      customDur: preset ? '' : String(row.duration),
      form: { name: row.name, duration: row.duration, ill: row.ill }
    })
  },

  onCloseForm() { this.setData({ showForm: false, editingId: '' }) },

  onSubmit() {
    const f = this.data.form
    try {
      if (this.data.editingId) courses.update(this.data.editingId, f)
      else courses.add(f)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' }); return
    }
    this.setData({ showForm: false, editingId: '' })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onRemove(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除课程类型', content: '确定删除「' + name + '」吗？已排的课不受影响，但不能再新排该课程。',
      confirmText: '删除', confirmColor: '#E8763A',
      success: (r) => {
        if (!r.confirm) return
        courses.remove(id)
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  onReset() {
    wx.showModal({
      title: '恢复默认', content: '将重置为钢琴 / 声乐 / 吉他 / 录音四门课，现有自定义类型会丢失。',
      confirmText: '恢复', confirmColor: '#2B3FA8',
      success: (r) => {
        if (!r.confirm) return
        courses.reset(); this.refresh()
        wx.showToast({ title: '已恢复默认', icon: 'success' })
      }
    })
  },

  goBack() { wx.navigateBack() }
})
