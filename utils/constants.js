// constants.js - 常量定义

// 课程状态
const LESSON_STATUS = {
  AVAILABLE: 'available',   // 可约
  BOOKED: 'booked',         // 已约
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
}

const LESSON_STATUS_TEXT = {
  available: '可约',
  booked: '已约',
  completed: '已完成',
  cancelled: '已取消'
}

const LESSON_STATUS_TAG = {
  available: 't-sky',     // 待约
  booked: 't-terra',      // 已约
  completed: 't-mute',    // 已完成
  cancelled: 't-cobalt'   // 已取消
}

// 课程类型
// 默认课程类型（工作室实际开设的四门）
// 运行时以 utils/courses.js 的可编辑副本为准，超管可增删改
const COURSE_TYPES = [
  { id: 'piano',  name: '钢琴', ill: 'ic-piano',  duration: 60 },
  { id: 'vocal',  name: '声乐', ill: 'ic-vocal',  duration: 45 },
  { id: 'guitar', name: '吉他', ill: 'ic-guitar', duration: 60 },
  { id: 'record', name: '录音', ill: 'ic-record', duration: 90 }
]

// 图标库：超管新建课程类型时从这里挑选（class 名对应 app.wxss 的 .ic-*）
const ICON_LIBRARY = [
  { ill: 'ic-piano',  label: '钢琴' },
  { ill: 'ic-vocal',  label: '声乐' },
  { ill: 'ic-guitar', label: '吉他' },
  { ill: 'ic-record', label: '录音' },
  { ill: 'ic-violin', label: '弦乐' },
  { ill: 'ic-drum',   label: '打击' },
  { ill: 'ic-flute',  label: '管乐' },
  { ill: 'ic-theory', label: '乐理' },
  { ill: 'ic-ear',    label: '练耳' }
]

// 排课时可选的时长（分钟）；老师也可自由选起止时间
const DURATIONS = [30, 45, 60, 90]

// 可授予老师的权限（超管天然拥有全部）
const PERMS = [
  { k: 'editStudio', t: '工作室资料', d: '可编辑工作室介绍、电话、地址' }
]


// 星期
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 课程类型 id → 线条图标 class（必须在 module.exports 之前定义）
const COURSE_ILL = {}
COURSE_TYPES.forEach(function (c) { COURSE_ILL[c.id] = c.ill })

module.exports = {
  LESSON_STATUS,
  LESSON_STATUS_TEXT,
  LESSON_STATUS_TAG,
  COURSE_TYPES,
  COURSE_ILL,
  ICON_LIBRARY,
  DURATIONS,
  PERMS,
  WEEKDAYS
}

