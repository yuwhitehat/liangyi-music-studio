// config.js — 唯一需要改的地方
//
// 填上云环境 ID 就走云端同步；留空（或仍是占位符）= 纯本地模式，功能照常可用。
// 云环境 ID 在 微信开发者工具 → 云开发 → 设置 → 环境ID 里查。
const config = { CLOUD_ENV: '' }

function cloudConfigured() {
  return !!(config.CLOUD_ENV && config.CLOUD_ENV !== 'your-cloud-env-id')
}

config.COLLECTIONS = {
  teachers: 'teachers',
  students: 'students',
  courses:  'courses',
  lessons:  'lessons',
  studio:   'settings'
}
config.cloudConfigured = cloudConfigured

module.exports = config
