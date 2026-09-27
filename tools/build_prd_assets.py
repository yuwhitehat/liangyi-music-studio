# -*- coding: utf-8 -*-
"""生成 PRD 所需的全部原型图与流程图"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from render_mockups import Screen, mix, W, H, S, F, COB, COBD, WHITE, PAPER, LINE, SKY, SKYL, TERRA, NAVY, RED, INK
import render_mockups as M

def T(t, bg, fg, ac): return (t, bg, fg, ac)
TAG = {'open': (SKY, COBD), 'booked': (TERRA, WHITE), 'done': (mix(NAVY,.08), mix(NAVY,.5)), 'cancel': (COB, WHITE)}

# ═══ 01 首页（严格按 pages/index 的几何：天空带 170 / 钴蓝带 331 / 白色地面）═══
s=Screen(WHITE)
s.rect(0,0,W,170,fill=SKYL)
s.ill('sun.png',514,84,76); s.ill('cloud.png',40,92,130)
s.text(40,96,'LIANGYI MUSIC STUDIO',20,mix(COB,.55),True)
s.rect(0,170,W,331,fill=COB); s.text(40,226,'两仪音乐',104,WHITE,True)
s.ill('dog.png',504,315,210)                      # 骑跨色带交界，右侧
by, bh, gap = 651, 300, 28
bw = (W-80-gap)//2
for i,(txt,bg) in enumerate([('我是老师',COB),('我是学员',TERRA)]):
    bx = 40+i*(bw+gap)
    s.rect(bx,by,bw,bh,fill=bg,r=40)
    hl = mix('#FFFFFF',.14,bg)
    s.rect(bx,by,bw,84,fill=hl,r=40); s.rect(bx+1,by+42,bw-2,44,fill=bg)
    s.rect(bx,by+bh-4,bw,16,fill=mix('#000000',.22,WHITE),r=8)
    s.text(bx+bw//2, by+bh//2-54, txt, 40, WHITE, True, anchor='mm')
    s.ill('arrow-w.png', bx+bw//2-48, by+bh//2-28, 96)
s.y = by+bh+100
s.save('01-首页.png','① 首页 · 身份入口（左右并排的实体按钮）')

# ═══ 02 登录页 ═══
s=Screen(WHITE)
s.band('学员登录','两仪音乐工作室',h=430)
s.rect(0,406,W,s.h-406,fill=WHITE)
s.y=500; s.field('手机号','135 0000 0001')
s.note('老师由工作室预先登记，手机号匹配即身份确认')
s.rect(40,s.y,W-80,150,fill=SKYL,outline=mix(COB,.35),r=24,wd=2)
s.text(64,s.y+22,'测试账号 · 点一下即可填入',21,mix(NAVY,.5))
s.rect(64,s.y+64,110,40,fill=SKY,r=100); s.text(119,s.y+84,'有排课',20,COBD,True,anchor='mm')
s.text(190,s.y+84,'张小明',27,NAVY,True,anchor='lm'); s.text(W-64,s.y+84,'135 0000 0001',25,mix(NAVY,.55),False,anchor='rm')
s.gap(150)
s.btn('验证并进入')
s.gap(10); s.line_y=s.y
yy=s.y+30; s.rect(40,yy,290,2,fill=LINE); s.rect(W-430,yy,290,2,fill=LINE)
s.text(W//2,yy,'或',22,mix(NAVY,.35),False,anchor='mm'); s.y=yy+40
s.rect(40,s.y,W-80,108,fill=WHITE,outline=NAVY,r=100,wd=3)
s.checkmark(W//2-132,s.y+54,46,WHITE,circle=COB)
s.text(W//2+16,s.y+54,'微信一键登录',32,NAVY,True,anchor='mm'); s.y+=136
s.text(W//2,s.y+40,'回到首页',28,NAVY,True,anchor='mm')
s.save('02-登录页.png','② 登录页 · 手机号 / 微信一键')

# ═══ 03 老师端工作台 ═══
s=Screen(); s.band('林老师','今天 · 9月27日 · 3 节课 · 5 节待约')
s.tiles([T('排课',COB,WHITE,WHITE),T('约课管理',SKY,COBD,INK),T('学员',COB,WHITE,WHITE),
         T('老师',TERRA,WHITE,WHITE),T('课程',TERRA,WHITE,WHITE),T('我的',SKY,COBD,INK)])
s.save('03-老师端工作台.png','③ 老师端 · 纯色块工作台（仅超管见「老师/课程」）')

# ═══ 04 排课 ═══
s=Screen(h=2360); s.band('排课','选日期 · 选课程 · 定时间',h=400)
s.text(40,s.y+40,'选择日期',34,NAVY,True); s.y+=96
x=40
for i,(w,d,on) in enumerate([('今天','27',1),('周日','28',0),('周一','29',0),('周二','30',0),('周三','1',0)]):
    s.rect(x,s.y,126,150,fill=COB if on else WHITE,outline=None if on else LINE,r=28,wd=2)
    s.text(x+63,s.y+30,w,21,mix(WHITE,.7) if on else mix(NAVY,.5),False,anchor='mm')
    s.text(x+63,s.y+76,d,46,WHITE if on else NAVY,True,anchor='mm')
    s.text(x+63,s.y+124,'2 节' if on else '9月',20,mix(WHITE,.55) if on else TERRA,False,anchor='mm')
    x+=140
s.y+=190
s.text(40,s.y,'课程类型',34,NAVY,True); s.y+=60
x=40
for nm,c,on in [('钢琴',COB,1),('声乐',TERRA,0),('吉他',COBD,0),('录音',SKY,0)]:
    s.rect(x,s.y,158,180,fill=COB if on else WHITE,outline=None if on else LINE,r=28,wd=2)
    s.rect(x+41,s.y+22,76,76,fill=SKYL if not on else WHITE,r=22)
    s.text(x+79,s.y+130,nm,26,WHITE if on else NAVY,True,anchor='mm')
    s.text(x+79,s.y+158,'60分',20,mix(WHITE,.6) if on else mix(NAVY,.4),False,anchor='mm')
    x+=172
s.y+=220
s.text(40,s.y,'上课时间',34,NAVY,True); s.text(W-40,s.y+6,'自由选',22,TERRA,True,anchor='rm'); s.y+=56
s.rect(40,s.y,W-80,300,fill=WHITE,outline=LINE,r=32,wd=2)
s.text(72,s.y+30,'开始',22,mix(NAVY,.45)); s.rect(72,s.y+58,240,96,fill=SKYL,r=22)
s.text(192,s.y+106,'15:00',40,COBD,True,anchor='mm')
s.text(340,s.y+106,'—',32,mix(NAVY,.3),False,anchor='mm')
s.text(396,s.y+30,'结束',22,mix(NAVY,.45)); s.rect(396,s.y+58,240,96,fill=SKYL,r=22)
s.text(516,s.y+106,'15:30',40,COBD,True,anchor='mm')
s.text(516,s.y+210,'30',52,TERRA,True,anchor='mm'); s.text(516,s.y+258,'分钟',20,mix(NAVY,.45),False,anchor='mm')
s.y+=330
s.note('快捷时长'); s.chips(['30 分','45 分','60 分','90 分'],0)
s.rect(40,s.y,W-80,108,fill=COB,r=100); s.text(W//2,s.y+54,'+  添加这个时段',30,WHITE,True,anchor='mm'); s.y+=136
s.text(40,s.y,'本次待排',34,NAVY,True); s.text(W-40,s.y+6,'2',24,TERRA,True,anchor='rm'); s.y+=54
s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(72,s.y+34,82,82,fill=SKYL,r=24); s.text(176,s.y+40,'15:00 – 15:30',32,NAVY,True)
s.rect(W-150,s.y+30,86,34,fill=TERRA,r=100); s.text(W-107,s.y+47,'已约',20,WHITE,True,anchor='mm')
s.text(176,s.y+86,'钢琴 · 30 分钟 · 张小明',24,mix(NAVY,.5)); s.y+=170
s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(72,s.y+34,82,82,fill=SKYL,r=24); s.text(176,s.y+40,'16:00 – 16:45',32,NAVY,True)
s.rect(W-150,s.y+30,86,34,fill=SKY,r=100); s.text(W-107,s.y+47,'待约',20,COBD,True,anchor='mm')
s.text(176,s.y+86,'声乐 · 45 分钟 · 每周六 · 共 8 节',24,mix(NAVY,.5)); s.y+=180
s.btn('确认排课（2 节）')
s.save('04-排课.png','④ 排课 · 自由起止时间 + 固定课 + 已有预约')

# ═══ 05 约课管理 ═══
s=Screen(); s.band('约课管理','签到 · 指定学员 · 筛选',h=400)
s.text(40,s.y+30,'状态',22,mix(NAVY,.45)); s.chips(['全部','已约','待约','已完成'],1)
s.text(40,s.y,'日期',22,mix(NAVY,.45)); s.y+=40; s.chips(['全部日期','今天','未来 7 天','已过去'],1)
s.rect(40,s.y,W-80,80,fill=WHITE,outline=LINE,r=24,wd=2)
s.text(64,s.y+40,'3',34,COB,True,anchor='lm'); s.text(110,s.y+42,'节课 · 已约 · 今天',24,mix(NAVY,.5),False,anchor='lm')
s.rect(W-190,s.y+18,150,44,fill=mix(TERRA,.12),r=100); s.text(W-115,s.y+40,'清除筛选',22,TERRA,True,anchor='mm')
s.y+=108
# rows 左块格式: (底色, 大字, 文字色, 小字)
rows=[((COB,'27',WHITE,'9月'), '钢琴','15:00 – 16:00 · 60 分 · 今天','已约',*TAG['booked']),
      ((TERRA,'28',WHITE,'9月'),'声乐','10:00 – 10:45 · 45 分 · 明天','已约',*TAG['booked']),
      ((SKY,'30',COBD,'9月'),  '吉他','14:00 – 15:00 · 60 分 · 后天','待约',*TAG['open'])]
s.rows([(a,b,c,t,tbg,tfg) for a,b,c,t,tbg,tfg in rows])
s.save('05-约课管理.png','⑤ 约课管理 · 状态+日期双筛选 / 起止时间为主信息')

# ═══ 06 学员管理 ═══
s=Screen(); s.band('学员','共 6 位同学',h=380)
s.rect(40,s.y+30,W-180,96,fill=WHITE,outline=LINE,r=100,wd=2)
s.text(72,s.y+78,'搜索姓名或手机号',26,mix(NAVY,.35),False,anchor='lm')
s.rect(W-120,s.y+30,80,80,fill=COB,r=100); s.rect(W-120,s.y+106,80,10,fill=mix('#000',.2,PAPER),r=5)
s.text(W-80,s.y+70,'+',44,WHITE,True,anchor='mm'); s.y+=150
for c,nm,t,d,over in [(COB,'张小明',12,10,0),(TERRA,'李小红',6,5,0),(SKY,'王小华',4,3,0),(COBD,'陈佳怡',20,6,0)]:
    s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
    s.rect(64,s.y+32,86,86,fill=c,r=100); s.text(107,s.y+75,nm[0],36,WHITE if c!=SKY else COBD,True,anchor='mm')
    s.text(172,s.y+32,nm,32,NAVY,True); s.text(172,s.y+82,'共报 %d 节课 · 已上 %d 节课'%(t,d),24,mix(NAVY,.5))
    s.chevron(W-72,s.y+75,34,mix(NAVY,.3)); s.y+=170
s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(64,s.y+32,86,86,fill=COB,r=100); s.text(107,s.y+75,'周',36,WHITE,True,anchor='mm')
s.text(172,s.y+32,'周思远',32,NAVY,True); s.text(172,s.y+82,'共报 1 节课 · 已上 3 节课',24,mix(NAVY,.5))
s.rect(172,s.y+108,150,36,fill=mix(RED,.12),r=100); s.text(247,s.y+126,'已超 2 节',20,RED,True,anchor='mm')
s.y+=180
s.save('06-学员管理.png','⑥ 学员 · 点击行编辑 / 红色超支标记')

# ═══ 07 老师管理 ═══
s=Screen(h=1960); s.band('老师','2 位 · 仅超级管理员可管理',h=380)
s.rect(40,s.y+20,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(64,s.y+52,86,86,fill=COB,r=100); s.text(107,s.y+95,'林',36,WHITE,True,anchor='mm')
s.text(172,s.y+52,'林老师',32,NAVY,True); s.rect(300,s.y+46,150,40,fill=TERRA,r=100)
s.text(375,s.y+66,'超级管理员',19,WHITE,True,anchor='mm')
s.text(172,s.y+104,'138 0000 0000',24,mix(NAVY,.5)); s.chevron(W-72,s.y+95,34,mix(NAVY,.3)); s.y+=170
s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(64,s.y+52,86,86,fill=TERRA,r=100); s.text(107,s.y+95,'苏',36,WHITE,True,anchor='mm')
s.text(172,s.y+52,'苏老师',32,NAVY,True); s.text(172,s.y+104,'139 0000 0001',24,mix(NAVY,.5))
s.rect(172,s.y+96,140,34,fill=SKYL,r=100); s.text(242,s.y+113,'工作室资料',19,COBD,True,anchor='mm')
s.chevron(W-72,s.y+95,34,mix(NAVY,.3)); s.y+=200
s.btn('+ 添加老师')
s.rect(0,s.y,W,s.h-s.y,fill=mix('#000',.42,PAPER))
sy=s.y+40
s.rect(0,sy,W,s.h-sy,fill=WHITE)
s.text(40,sy+40,'编辑老师 · 苏老师',38,NAVY,True); s.xmark(W-72,sy+47,34,mix(NAVY,.55))
s.y=sy+110; s.field('姓名','苏老师'); s.field('手机号','139 0000 0001')
s.rect(40,s.y,W-80,270,fill=PAPER,outline=LINE,r=28,wd=2)
s.text(64,s.y+24,'权限',22,mix(NAVY,.45))
s.text(64,s.y+70,'工作室资料',28,NAVY,True); s.text(64,s.y+106,'可编辑工作室介绍、电话、地址',21,mix(NAVY,.5))
s.rect(W-160,s.y+72,100,56,fill=COB,r=100); s.rect(W-116,s.y+76,48,48,fill=WHITE,r=100)
s.rect(64,s.y+150,W-128,2,fill=mix(TERRA,.4))
s.text(64,s.y+176,'超级管理员',28,TERRA,True); s.text(64,s.y+212,'可管理老师、课程类型与全部权限',21,mix(NAVY,.5))
s.rect(W-160,s.y+178,100,56,fill=mix(NAVY,.18),r=100); s.rect(W-156,s.y+182,48,48,fill=WHITE,r=100)
s.y+=300; s.btn('保存')
s.save('07-老师管理.png','⑦ 老师管理 · 权限授予（仅超管可见此页）',trim=False)

# ═══ 08 课程类型 ═══
s=Screen(); s.band('课程类型','4 门 · 仅超级管理员可编辑',h=380)
for c,nm,d in [(COB,'钢琴','默认 60 分钟'),(TERRA,'声乐','默认 45 分钟'),(COBD,'吉他','默认 60 分钟'),(SKY,'录音','默认 90 分钟')]:
    s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
    s.rect(64,s.y+32,86,86,fill=SKYL,r=24)
    s.text(172,s.y+40,nm,34,NAVY,True); s.text(172,s.y+94,d,23,mix(NAVY,.5))
    s.rect(W-230,s.y+44,120,56,fill=SKYL,r=100); s.text(W-170,s.y+72,'编辑',24,COB,True,anchor='mm')
    s.rect(W-96,s.y+44,56,56,fill=PAPER,r=100); s.xmark(W-68,s.y+73,28,mix(NAVY,.45))
    s.y+=170
s.gap(20); s.btn('+ 添加课程类型')
s.text(W//2,s.y+10,'恢复默认四门课',24,mix(NAVY,.4),False,anchor='mm')
s.save('08-课程类型.png','⑧ 课程类型 · 增删改 + 图标选择（仅超管）')

# ═══ 09 学员端工作台 ═══
s=Screen(); s.band('陈小满同学','今天 · 9月27日 · 2 节课待上')
s.tiles([T('立即约课',COB,WHITE,WHITE),T('我的课表',SKY,COBD,INK),T('上课记录',TERRA,WHITE,WHITE),T('我的',SKY,COBD,INK)])
# 色块下方保留「即将开始」列表
s.text(40,s.y+30,'即将开始',32,NAVY,True); s.text(W-40,s.y+36,'2',24,TERRA,True,anchor='rm'); s.y+=86
for ic,nm,sub in [('ic-piano.png','钢琴','今天 · 15:00 – 16:00'),('ic-vocal.png','声乐','9月29日 · 10:00 – 10:45')]:
    s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
    s.rect(64,s.y+27,96,96,fill=SKYL,r=26); s.ill(ic,81,s.y+44,62)
    s.text(188,s.y+32,nm,32,NAVY,True); s.text(188,s.y+84,sub,24,mix(NAVY,.55))
    s.rect(W-160,s.y+53,86,44,fill=TERRA,r=100); s.text(W-117,s.y+75,'已约',22,WHITE,True,anchor='mm')
    s.y+=170
s.save('09-学员端工作台.png','⑨ 学员端 · 工作台（与老师端同一套色块）')

# ═══ 10 学员约课 ═══
s=Screen(); s.band('约课','挑一个喜欢的时段',h=380)
s.chips(['全部','钢琴','声乐','吉他','录音'],0)
s.text(40,s.y+20,'可约时段',34,NAVY,True); s.text(W-40,s.y+26,'3',24,TERRA,True,anchor='rm'); s.y+=76
for c,nm,t,d,day in [(COB,'钢琴','15:00 – 15:45','9月29日 · 周二','29'),(TERRA,'声乐','10:00 – 10:45','9月30日 · 周三','30'),(COBD,'录音','19:00 – 20:30','10月2日 · 周五','02')]:
    s.rect(40,s.y,W-80,160,fill=WHITE,outline=LINE,r=28,wd=2)
    s.rect(40,s.y,130,160,fill=c,r=28); s.rect(110,s.y,60,160,fill=c)
    s.text(105,s.y+62,day,48,WHITE,True,anchor='mm'); s.text(105,s.y+112,'9月',22,mix(WHITE,.8),False,anchor='mm')
    s.text(200,s.y+38,nm,34,NAVY,True); s.text(200,s.y+96,t,26,mix(NAVY,.55))
    s.text(200,s.y+130,d,22,mix(NAVY,.4)); s.y+=180
s.save('10-学员约课.png','⑩ 学员约课 · 课程筛选 + 时段列表')

# ═══ 11 我的课表 ═══
s=Screen(); s.band('我的课表','看看接下来要上什么',h=380)
s.chips(['待上课','已结束'],0)
s.rect(40,s.y,W-80,230,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(40,s.y,130,230,fill=COB,r=28); s.rect(110,s.y,60,230,fill=COB)
s.text(105,s.y+96,'27',48,WHITE,True,anchor='mm'); s.text(105,s.y+146,'9月',22,mix(WHITE,.8),False,anchor='mm')
s.text(200,s.y+34,'钢琴',34,NAVY,True); s.rect(300,s.y+30,90,38,fill=TERRA,r=100)
s.text(345,s.y+49,'已约',20,WHITE,True,anchor='mm')
s.text(200,s.y+88,'15:00 – 16:00',32,COB,True)
s.rect(200,s.y+140,150,64,fill=COB,r=100); s.text(275,s.y+172,'签到',26,WHITE,True,anchor='mm')
s.rect(366,s.y+140,180,64,fill=PAPER,outline=LINE,r=100,wd=2); s.text(456,s.y+172,'取消课程',26,NAVY,True,anchor='mm')
s.y+=250
s.rect(40,s.y,W-80,230,fill=WHITE,outline=LINE,r=28,wd=2)
s.rect(40,s.y,130,230,fill=TERRA,r=28); s.rect(110,s.y,60,230,fill=TERRA)
s.text(105,s.y+96,'29',48,WHITE,True,anchor='mm'); s.text(105,s.y+146,'9月',22,mix(WHITE,.8),False,anchor='mm')
s.text(200,s.y+34,'声乐',34,NAVY,True); s.rect(300,s.y+30,90,38,fill=TERRA,r=100)
s.text(345,s.y+49,'已约',20,WHITE,True,anchor='mm')
s.text(200,s.y+88,'10:00 – 10:45',32,COB,True)
s.rect(200,s.y+140,180,64,fill=PAPER,outline=LINE,r=100,wd=2); s.text(290,s.y+172,'取消课程',26,NAVY,True,anchor='mm')
s.save('11-我的课表.png','⑪ 我的课表 · 当天可签到，未开课前可取消')

# ═══ 12 上课记录 ═══
s=Screen(); s.band('上课记录','一节一节攒起来的',h=380)
s.rect(40,s.y,W-80,300,fill=WHITE,outline=LINE,r=32,wd=2)
for i,(n,l,c) in enumerate([(12,'共报（节）',COB),(10,'已上（节）',COB),(2,'剩余（节）',TERRA)]):
    cx=40+(W-80)/6+i*(W-80)/3
    s.text(cx,s.y+62,str(n),52,c,True,anchor='mm'); s.text(cx,s.y+112,l,21,mix(NAVY,.5),False,anchor='mm')
s.rect(72,s.y+160,W-144,14,fill=SKYL,r=100); s.rect(72,s.y+160,int((W-144)*0.83),14,fill=COB,r=100)
s.rect(72,s.y+206,W-144,2,fill=LINE)
s.text(72,s.y+246,'报名周期',22,mix(NAVY,.45),False,anchor='lm')
s.text(W//2+40,s.y+246,'3月1日 → 12月31日',27,NAVY,True,anchor='mm')
s.rect(W-210,s.y+224,120,44,fill=mix(TERRA,.12),r=100); s.text(W-150,s.y+246,'剩 95 天',20,TERRA,True,anchor='mm')
s.y+=340
s.text(40,s.y,'课程记录',34,NAVY,True); s.text(W-40,s.y+6,'10',24,TERRA,True,anchor='rm'); s.y+=60
for c,nm,t,st,k in [(COB,'钢琴','今天 · 15:00 – 16:00','已约','booked'),(TERRA,'声乐','9月20日 · 10:00 – 10:45','已完成','done'),(COBD,'钢琴','9月18日 · 15:00 – 16:00','已完成','done')]:
    s.rect(96,s.y,26,26,fill=c,r=200)
    s.rect(106,s.y+26,4,124,fill=LINE)
    s.rect(140,s.y-8,W-180,150,fill=WHITE,outline=LINE,r=28,wd=2)
    s.text(168,s.y+22,nm,30,NAVY,True); s.text(168,s.y+76,t,23,mix(NAVY,.5))
    lab = {'booked':'已约','done':'已完成','open':'待约','cancel':'已取消'}[k]
    tw = F(20,True).getbbox(lab)[2]//S + 34
    s.rect(W-80-tw-24,s.y+18,tw,40,fill=TAG[k][0],r=100)
    s.text(W-80-tw-24+tw//2,s.y+38,lab,20,TAG[k][1],True,anchor='mm')
    s.y+=170
s.save('12-上课记录.png','⑫ 上课记录 · 课时档案卡 + 时间轴')
print("全部原型图生成完成")

# ═══ 13 我的（与 pages/profile 同结构：水印 + 头像 + 卡片 + 底部弹层）═══
s=Screen(h=1820)
s.rect(0,0,W,430,fill=COB)
s.ill('cloud-w.png', W-40-180, 80, 180, alpha=.2)
s.ill('dog-w.png',   W-20-176, 430-185-8, 176, alpha=.2)
s.rect(40,215,120,120,fill=SKYL,r=100); s.text(100,276,'林',54,COB,True,anchor='mm')
s.text(188,228,'林老师',48,WHITE,True); s.text(188,300,'老师 · 两仪音乐工作室',24,mix(WHITE,.65,COB))
s.rect(0,430,W,s.h-430,fill=PAPER)
by, bh = 500, 220; bw = (W-80-24)//2
s.rect(40,by,bw,bh,fill=WHITE,outline=LINE,r=36,wd=2)
s.rect(80,by+40,108,108,fill=mix(COB,.08,WHITE),r=100); s.ill('plant.png',80+23,by+40+23,62)
s.text(80,by+bh-64,'关于工作室',34,NAVY,True)
x2=40+bw+24
s.rect(x2,by,bw,bh,fill=TERRA,r=36)
s.rect(x2+40,by+40,108,108,fill=mix(WHITE,.16,TERRA),r=100); s.ill('clock.png',x2+63,by+63,62)
s.text(x2+40,by+bh-64,'联系我们',34,WHITE,True)
cy=by+bh+24
s.rect(40,cy,W-80,160,fill=COB,r=36)
s.text(80,cy+38,'工作室信息',34,WHITE,True)
s.text(80,cy+92,'介绍 · 电话 · 地址 已完善',24,mix(WHITE,.62,COB))
s.chevron(W-72,cy+80,40,mix(WHITE,.7))
s.y=cy+160+48
s.btn('退出登录',WHITE,TERRA)
s.rect(0,s.y+150,W,s.h-s.y-150,fill=mix('#000',.42,PAPER))
sy=s.y+210
s.rect(0,sy,W,s.h-sy,fill=WHITE); s.text(40,sy+40,'联系我们',38,NAVY,True)
s.rect(W-104,sy+42,60,60,fill=PAPER,r=100); s.xmark(W-74,sy+73,30,mix(NAVY,.55))
yy=sy+130
for lab,val,cp in [('电话','138 0000 0000',1),('微信','liangyi_music',1),('地址','上海市徐汇区 XX 路 1 号 3 层',1),('开放时间','周一至周日 09:00–21:00',0)]:
    s.text(40,yy+8,lab,23,mix(NAVY,.45))
    s.text(W-200,yy+4,val,28,NAVY,True,anchor='rm')
    if cp:
        s.rect(W-150,yy,110,42,fill=SKYL,r=100); s.text(W-95,yy+21,'复制',20,COB,True,anchor='mm')
    yy+=88; s.rect(40,yy-14,W-80,2,fill=LINE)
s.text(W//2,yy+20,'点击任意一行即可复制该项内容',21,mix(NAVY,.4),False,anchor='mm')
s.save('13-我的.png','⑬ 我的 · 信息逐行展示，可单独复制')

# ═══ 14 工作室信息 ═══
s=Screen(h=1980); s.band('工作室信息','学员在小程序里看到的就是这些',h=400)
s.rect(0,376,W,s.h-376,fill=WHITE); s.y=440
s.field('工作室名称','两仪音乐工作室')
s.text(40,s.y,'工作室介绍',24,mix(NAVY,.5)); s.y+=40
s.rect(40,s.y,W-80,220,fill=WHITE,outline=LINE,r=28,wd=2)
s.text(72,s.y+30,'专注少儿钢琴与声乐教学，小班与一对一并行，',26,NAVY); s.text(72,s.y+76,'鼓励孩子在演奏中建立自信。',26,NAVY)
s.text(W-72,s.y+190,'34 / 200',20,mix(NAVY,.35),False,anchor='rm'); s.y+=252
s.field('联系电话','138 0000 0000'); s.field('微信号','liangyi_music')
s.text(40,s.y,'工作室地址',24,mix(NAVY,.5)); s.y+=40
s.rect(40,s.y,W-80,150,fill=WHITE,outline=LINE,r=28,wd=2)
s.text(72,s.y+34,'上海市徐汇区 XX 路 1 号 3 层',26,NAVY); s.y+=182
s.field('开放时间','周一至周日 09:00–21:00')
s.note('介绍、电话、地址建议都填上，学员咨询时能直接看到')
s.btn('保存')
s.save('14-工作室信息.png','⑭ 工作室信息 · 需超管或被授权')

# ═══ 关键弹窗 ═══
def dialog_bg(s, sy):
    s.rect(0,sy,W,s.h-sy,fill=mix('#000',.42,PAPER))
    s.rect(0,sy+40,W,s.h-sy-40,fill=WHITE)
    return sy+40

s=Screen(h=1100); s.band('约课管理','签到 · 指定学员 · 筛选',h=380); s.y=520
d0=dialog_bg(s,600)
s.text(40,d0+40,'取消课程',38,NAVY,True); s.rect(W-104,d0+42,60,60,fill=PAPER,r=100)
s.xmark(W-74,d0+73,30,mix(NAVY,.55))
s.text(40,d0+130,'这节课还没上，取消后会释放为「待约」、',27,NAVY)
s.text(40,d0+180,'清空学员，其他同学可以重新约。',27,NAVY)
s.rect(40,d0+250,300,88,fill=WHITE,outline=LINE,r=100,wd=2); s.text(190,d0+294,'再想想',30,NAVY,True,anchor='mm')
s.rect(W-340,d0+250,300,88,fill=TERRA,r=100); s.text(W-190,d0+294,'确认取消',30,WHITE,True,anchor='mm')
s.save('20-弹窗-取消确认.png','弹窗 · 预先说明取消后果',trim=False)

s=Screen(h=1190); s.band('排课','选日期 · 选课程 · 定时间',h=380); s.y=520
d0=dialog_bg(s,560)
s.text(40,d0+40,'已排入 5 节，2 节未排入',36,NAVY,True)
yy=d0+120
for i,t in enumerate(['2026-10-03 15:00–16:00 钢琴｜与已排的 15:00–16:00 钢琴 时间重叠',
                      '2026-10-17 15:00–16:00 钢琴｜学员「张小明」此时段已有 吉他 课']):
    s.rect(40,yy,52,52,fill=TERRA,r=100); s.text(66,yy+26,str(i+1),24,WHITE,True,anchor='mm')
    s.text(112,yy+4,t[:26],24,NAVY); s.text(112,yy+40,t[26:52],24,mix(NAVY,.6)); yy+=110
s.rect(40,yy+20,W-80,88,fill=COB,r=100); s.text(W//2,yy+64,'知道了',30,WHITE,True,anchor='mm')
s.save('21-弹窗-冲突清单.png','弹窗 · 冲突逐条带序号，成功的照常排入',trim=False)

s=Screen(h=1180); s.band('我的课表','看看接下来要上什么',h=380); s.y=520
d0=dialog_bg(s,640)
s.text(40,d0+40,'暂时无法自行取消',36,NAVY,True)
s.text(40,d0+120,'距离开课只剩 2.5 小时，不足 6 小时。',27,NAVY)
s.text(40,d0+172,'请直接联系老师帮忙取消：',27,NAVY)
s.text(40,d0+224,'138 0000 0000',32,COB,True)
s.rect(40,d0+290,300,88,fill=WHITE,outline=LINE,r=100,wd=2); s.text(190,d0+334,'知道了',30,NAVY,True,anchor='mm')
s.rect(W-340,d0+290,300,88,fill=TERRA,r=100); s.text(W-190,d0+334,'复制电话',30,WHITE,True,anchor='mm')
s.save('22-弹窗-取消受限.png','弹窗 · 不足 6 小时引导联系老师',trim=False)

s=Screen(h=1400); s.band('排课','选日期 · 选课程 · 定时间',h=380); s.y=520
d0=dialog_bg(s,540)
s.text(40,d0+40,'选择学员',38,NAVY,True); s.rect(W-104,d0+42,60,60,fill=PAPER,r=100)
s.xmark(W-74,d0+73,30,mix(NAVY,.55))
s.rect(40,d0+120,W-80,96,fill=PAPER,outline=LINE,r=100,wd=2); s.text(72,d0+168,'搜索学员姓名',26,mix(NAVY,.35),False,anchor='lm')
yy=d0+240
for c,nm,note,ck in [(COB,'张小明','钢琴 · 四级',1),(TERRA,'李小红','声乐',0),(SKY,'王小华','吉他 · 初学者',1)]:
    s.rect(40,yy,76,76,fill=c,r=100); s.text(78,yy+38,nm[0],30,WHITE if c!=SKY else COBD,True,anchor='mm')
    s.text(140,yy+8,nm,30,NAVY,True); s.text(140,yy+48,note,21,mix(NAVY,.5))
    s.rect(W-130,yy+14,52,52,fill=COB if ck else WHITE,outline=None if ck else LINE,r=16,wd=3)
    if ck: s.checkmark(W-104,yy+40,44,WHITE)
    yy+=110; s.rect(40,yy-16,W-80,2,fill=LINE)
s.text(40,yy+20,'已选 2 人',26,mix(NAVY,.55),False,anchor='lm')
s.rect(W-230,yy+6,190,72,fill=COB,r=100); s.text(W-135,yy+42,'确定',28,WHITE,True,anchor='mm')
s.save('23-弹层-选择学员.png','弹层 · 学员多选（排课与约课管理共用）',trim=False)
print("补充页面完成")
