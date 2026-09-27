// teacher/teachers/teachers.js — 超管：老师名单 + 权限授予
const app = getApp()
const teachers = require('../../../utils/teachers.js')
const { PERMS } = require('../../../utils/constants.js')

const AVA = [
  { bg: '#2B3FA8', fg: '#FFFFFF' }, { bg: '#E8763A', fg: '#FFFFFF' },
  { bg: '#D9EAF5', fg: '#1E2E7A' }, { bg: '#1E2E7A', fg: '#FFFFFF' }
]

function labelOf(k) { return (PERMS.filter(p => p.k === k)[0] || {}).t || k }

Page({
  data: {
    keyword: '', list: [], filteredList: [],
    permDefs: PERMS, isSelf: false,
    showForm: false, editingId: '',
    form: { name: '', phone: '', isSuperAdmin: false, perms: {} }
  },

  onShow() {
    if (!app.globalData.isSuperAdmin) {
      wx.showModal({
        title: '没有权限', content: '老师名单仅超级管理员可查看与管理。',
        showCancel: false, confirmText: '返回', confirmColor: '#2B3FA8',
        success: () => wx.navigateBack()
      })
      return
    }
    this.refresh()
  },

  refresh() {
    const me = app.globalData.userInfo || {}
    const rows = teachers.list().map((t, i) => {
      const a = AVA[i % AVA.length]
      const permLabels = PERMS.filter(p => teachers.can(t, p.k) && !t.isSuperAdmin).map(p => p.t)
      return { ...t, bg: a.bg, fg: a.fg, permLabels: permLabels, isMe: t.phone === me.phone }
    })
    this.setData({ list: rows, filteredList: this.applyKw(rows) })
  },

  applyKw(rows) {
    const kw = this.data.keyword
    return kw ? rows.filter(t => t.name.indexOf(kw) > -1 || t.phone.indexOf(kw) > -1) : rows
  },
  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()) },

  onIn(e) { this.setData({ ['form.' + e.currentTarget.dataset.k]: e.detail.value }) },

  blankForm() {
    const perms = {}
    PERMS.forEach(p => { perms[p.k] = false })
    return { name: '', phone: '', isSuperAdmin: false, perms: perms }
  },

  onOpenAdd() { this.setData({ showForm: true, editingId: '', isSelf: false, form: this.blankForm() }) },

  onEdit(e) {
    const t = this.data.list.filter(x => x.id === e.currentTarget.dataset.id)[0]
    if (!t) return
    const perms = {}
    PERMS.forEach(p => { perms[p.k] = !!((t.perms || {})[p.k]) || !!t.isSuperAdmin })
    this.setData({
      showForm: true, editingId: t.id, isSelf: !!t.isMe,
      form: { name: t.name, phone: t.phone, isSuperAdmin: !!t.isSuperAdmin, perms: perms }
    })
  },

  onCloseForm() { this.setData({ showForm: false, editingId: '' }) },

  onTogglePerm(e) {
    const k = e.currentTarget.dataset.k
    this.setData({ ['form.perms.' + k]: e.detail.value })
  },

  /** 提升/取消超管：即时把全部权限跟随勾选状态 */
  onToggleSuper(e) {
    const on = e.detail.value
    const perms = {}
    PERMS.forEach(p => { perms[p.k] = on ? true : false })
    this.setData({ 'form.isSuperAdmin': on, 'form.perms': perms })
  },

  onSubmit() {
    const f = this.data.form
    try {
      if (this.data.editingId) {
        teachers.update(this.data.editingId, f)
        // 先落基础信息，再单独应用权限与超管状态（含"最后一个超管"保护）
        teachers.setSuper(this.data.editingId, f.isSuperAdmin)
        if (!f.isSuperAdmin) {
          PERMS.forEach(p => teachers.setPerm(this.data.editingId, p.k, !!f.perms[p.k]))
        }
      } else {
        teachers.add({ name: f.name, phone: f.phone, editStudio: !!f.perms.editStudio })
      }
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' }); return
    }

    this.setData({ showForm: false, editingId: '' })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })

    // 若改的是自己，同步刷新登录态里的权限
    const me = app.globalData.userInfo || {}
    const now = teachers.byPhone(me.phone)
    if (now && now.phone === me.phone) {
      app.globalData.isSuperAdmin = !!now.isSuperAdmin
      app.globalData.perms = now.perms || {}
    }
  },

  onRemove() {
    const id = this.data.editingId
    try {
      if (id === (teachers.byPhone((app.globalData.userInfo || {}).phone) || {}).id) throw new Error('不能删除自己')
      teachers.remove(id)
    } catch (err) {
      wx.showToast({ title: err.message || '删除失败', icon: 'none' }); return
    }
    this.setData({ showForm: false, editingId: '' })
    this.refresh()
    wx.showToast({ title: '已删除', icon: 'none' })
  },

  goBack() { wx.navigateBack() }
})
