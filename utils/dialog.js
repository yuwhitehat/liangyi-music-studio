// dialog.js — wx.showModal 安全封装
// 小程序限制：confirmText / cancelText 最多 4 个字，超了会「静默失败」——
// 弹窗根本不出现，表现就是「点了没反应」。这里统一兜住并告警。
function fit(t) {
  if (t === undefined || t === null) return t
  const s = String(t)
  return s.length <= 4 ? s : s.slice(0, 4)
}

function show(opt) {
  const o = Object.assign({}, opt)
  if (o.confirmText && o.confirmText.length > 4) {
    console.warn('[dialog] confirmText 超长会被小程序拒绝，已截断：' + o.confirmText + ' → ' + fit(o.confirmText))
    o.confirmText = fit(o.confirmText)
  }
  if (o.cancelText && o.cancelText.length > 4) {
    console.warn('[dialog] cancelText 超长会被小程序拒绝，已截断：' + o.cancelText + ' → ' + fit(o.cancelText))
    o.cancelText = fit(o.cancelText)
  }
  if (o.showCancel === undefined) o.showCancel = true
  o.fail = function (err) {
    console.error('[dialog] showModal 失败', err)
    wx.showToast({ title: '弹窗失败', icon: 'none' })
  }
  return wx.showModal(o)
}

module.exports = { show: show, fit: fit }
