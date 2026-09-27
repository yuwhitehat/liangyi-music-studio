// api.js - 云开发数据库操作封装

// 惰性获取：避免 require 时机早于 app.js 的 wx.cloud.init() 而崩溃。
// （换 AppID / 重开云环境时这类时序问题很常见）
let _db = null
function DB() {
  if (!_db) {
    if (!wx.cloud || !wx.cloud.database) throw new Error('云开发未初始化，请先在 app.js 里 wx.cloud.init()')
    _db = wx.cloud.database()
  }
  return _db
}
function CMD() { return DB().command }

// —— 课程（排课）操作 ——

// 获取课程列表（老师端）
async function getTeacherLessons(teacherOpenid, startDate, endDate) {
  let query = { teacherOpenid }
  if (startDate && endDate) {
    query.date = CMD().gte(startDate).and(CMD().lte(endDate))
  }
  const res = await DB().collection('lessons').where(query).orderBy('date', 'asc').orderBy('timeStart', 'asc').get()
  return res.data
}

// 创建课程（排课）
async function createLesson(lesson) {
  const res = await DB().collection('lessons').add({
    data: {
      ...lesson,
      status: 'available',
      studentOpenid: '',
      studentName: '',
      createdAt: DB().serverDate()
    }
  })
  return res._id
}

// 批量排课
async function batchCreateLessons(lessons) {
  const tasks = lessons.map(l => createLesson(l))
  return Promise.all(tasks)
}

// 更新课程状态（约课/取消）
async function updateLessonStatus(lessonId, status, studentInfo) {
  const updateData = { status }
  if (studentInfo) {
    updateData.studentOpenid = studentInfo.openid || ''
    updateData.studentName = studentInfo.name || ''
  }
  if (status === 'available') {
    updateData.studentOpenid = ''
    updateData.studentName = ''
  }
  const res = await DB().collection('lessons').doc(lessonId).update({ data: updateData })
  return res
}

// 删除课程
async function deleteLesson(lessonId) {
  const res = await DB().collection('lessons').doc(lessonId).remove()
  return res
}

// 学员约课
async function bookLesson(lessonId, studentInfo) {
  return updateLessonStatus(lessonId, 'booked', studentInfo)
}

// —— 学员操作 ——

// 获取可约课程
async function getAvailableLessons(courseType) {
  const today = new Date().toISOString().split('T')[0]
  let query = { status: 'available', date: CMD().gte(today) }
  if (courseType) {
    query.courseType = courseType
  }
  const res = await DB().collection('lessons').where(query)
    .orderBy('date', 'asc').orderBy('timeStart', 'asc').get()
  return res.data
}

// 获取学员的课表
async function getStudentLessons(studentOpenid) {
  const res = await DB().collection('lessons')
    .where({ studentOpenid })
    .orderBy('date', 'desc').orderBy('timeStart', 'desc').get()
  return res.data
}

// —— 学员管理 ——

// 获取老师所有学员
async function getTeacherStudents(teacherOpenid) {
  const res = await DB().collection('lessons')
    .where({ teacherOpenid, studentOpenid: CMD().neq('') })
    .field({ studentOpenid: true, studentName: true })
    .get()
  // 去重
  const map = new Map()
  res.data.forEach(l => {
    if (l.studentOpenid && !map.has(l.studentOpenid)) {
      map.set(l.studentOpenid, { openid: l.studentOpenid, name: l.studentName })
    }
  })
  return Array.from(map.values())
}

// —— 统计 ——

async function getTeacherStats(teacherOpenid) {
  const today = new Date().toISOString().split('T')[0]
  
  // 今日课程数
  const todayLessons = await DB().collection('lessons')
    .where({ teacherOpenid, date: today }).count()
  
  // 待确认约课
  const pendingBookings = await DB().collection('lessons')
    .where({ teacherOpenid, status: 'booked', date: CMD().gte(today) }).count()
  
  // 已完成课程
  const completed = await DB().collection('lessons')
    .where({ teacherOpenid, status: 'completed' }).count()
  
  // 总学员数
  const students = await getTeacherStudents(teacherOpenid)

  return {
    todayCount: todayLessons.total,
    pendingCount: pendingBookings.total,
    completedCount: completed.total,
    studentCount: students.length
  }
}

// —— 老师身份判定 / 超管管理 ——

// 手机号查老师（登录时判定身份用）
async function findTeacherByPhone(phone) {
  const res = await DB().collection('teachers').where({ phone }).limit(1).get()
  return res.data.length ? res.data[0] : null
}

// 超管：添加老师
async function addTeacher(name, phone) {
  const res = await wx.cloud.callFunction({
    name: 'admin', data: { action: 'addTeacher', name, phone }
  })
  if (res.result && res.result.code !== 0) throw new Error(res.result.message)
  return res.result.data
}

// 超管：老师列表
async function listTeachers() {
  const res = await wx.cloud.callFunction({ name: 'admin', data: { action: 'listTeachers' } })
  if (res.result && res.result.code !== 0) throw new Error(res.result.message)
  return res.result.data.list
}

// 超管：移除老师
async function removeTeacher(id) {
  const res = await wx.cloud.callFunction({ name: 'admin', data: { action: 'removeTeacher', _id: id } })
  if (res.result && res.result.code !== 0) throw new Error(res.result.message)
  return true
}

module.exports = {
  getTeacherLessons,
  createLesson,
  batchCreateLessons,
  updateLessonStatus,
  deleteLesson,
  bookLesson,
  getAvailableLessons,
  getStudentLessons,
  getTeacherStudents,
  getTeacherStats,
  findTeacherByPhone,
  addTeacher,
  listTeachers,
  removeTeacher
}
