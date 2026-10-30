# -*- coding: utf-8 -*-
"""核心业务流程图 — 一节课的一生
统一语法：状态 → 动作 → 状态，箭头一律向前（向下 / 沿回流线向上）。
状态卡带彩色硬影，动作卡白底黑描边 + 角色徽标（师=粉 / 学=蓝），规则做成连线门卡。"""
from PIL import Image, ImageDraw, ImageFont
import os, math
S=2
W,H=1600,1310
OUT=os.path.join(os.path.dirname(__file__),'..','docs','mockups')
FP='/System/Library/Fonts/Hiragino Sans GB.ttc'
_fc={}
def F(z,b=False):
    k=(z,b)
    if k not in _fc: _fc[k]=ImageFont.truetype(FP,z*S,index=1 if b else 0)
    return _fc[k]
PINK, YELLOW, BLUE = '#FF5FA2', '#FFD23F', '#4D8DFF'
INK, WHITE, PAPER = '#111111', '#FFFFFF', '#F6F4EE'
RED = '#C0392B'
def mix(c,a,bg='#FFFFFF'):
    h=lambda x:tuple(int(x[i:i+2],16) for i in (1,3,5))
    A,B=h(c),h(bg); return '#%02X%02X%02X'%tuple(round(A[i]*a+B[i]*(1-a)) for i in range(3))
SUB = mix(INK,.55,WHITE)
GRID = mix('#2B3FA8',.11,PAPER)
LINEC = mix(INK,.45,PAPER)
GREY = mix(INK,.08,WHITE)

im=Image.new('RGB',(W*S,H*S),PAPER); d=ImageDraw.Draw(im)
_gx=0
while _gx<=W:
    d.line([(_gx*S,0),(_gx*S,H*S)],fill=GRID,width=2*S); _gx+=44
_gy=0
while _gy<=H:
    d.line([(0,_gy*S),(W*S,_gy*S)],fill=GRID,width=2*S); _gy+=44
def P(x,y): return (int(x*S),int(y*S))
def rr(x,y,w,h,fill=None,outline=None,r=16,lw=3,sh=None,so=8):
    if sh:
        d.rounded_rectangle([*P(x+so,y+so),*P(x+w+so,y+h+so)],radius=int(r*S),fill=sh)
    d.rounded_rectangle([*P(x,y),*P(x+w,y+h)],radius=int(r*S),fill=fill,outline=outline,width=int(lw*S))
def tx(x,y,s,z=24,c=INK,b=False,an='la'):
    d.text(P(x,y),s,font=F(z,b),fill=c,anchor=an)
def seg(pts,head=None):
    for i in range(len(pts)-1):
        d.line([*P(*pts[i]),*P(*pts[i+1])],fill=LINEC,width=int(3*S))
    if head:
        hx,hy,dx,dy=head; L=13; a=math.atan2(dy,dx)
        for s_ in (1,-1):
            d.line([*P(hx,hy),*P(hx-L*math.cos(a-0.42*s_),hy-L*math.sin(a-0.42*s_))],fill=LINEC,width=int(3*S))
def badge(cx,cy,roles):
    r=21
    xs=[cx-(18 if len(roles)==2 else 0)+i*36 for i in range(len(roles))]
    for x0,rl in zip(xs,roles):
        c,tc=(PINK,WHITE) if rl=='师' else (BLUE,WHITE)
        d.ellipse([*P(x0-r,cy-r),*P(x0+r,cy+r)],fill=c,outline=INK,width=int(3*S))
        tx(x0,cy+1,rl,20,tc,True,'mm')
def state(x,y,w,h,title,sub,sh=YELLOW,fill=WHITE,tc=INK):
    rr(x,y,w,h,fill=fill,outline=INK,r=20,sh=sh,so=10)
    tx(x+w/2,y+h/2-(14 if sub else 0),title,30,tc,True,'mm')
    if sub: tx(x+w/2,y+h/2+26,sub,19,mix(tc,.6,fill) if fill!=WHITE else SUB,False,'mm')
def action(x,y,w,h,title,sub,roles):
    rr(x,y,w,h,fill=WHITE,outline=INK,r=18,lw=3)
    lines = sub.split('\n') if isinstance(sub,str) else list(sub or [])
    tx(x+w/2,y+34,title,26,INK,True,'mm')
    for i,l in enumerate(lines):
        tx(x+w/2,y+64+i*24,l,18,SUB,False,'mm')
    badge(x+w,y-2,roles)
def gate(cx,cy,s,c=INK):
    bb=F(19,True).getbbox(s); bw=(bb[2]-bb[0])/S+28
    rr(cx-bw/2,cy-21,bw,42,fill=WHITE,outline=INK,r=10,lw=2)
    tx(cx,cy,s,19,c,True,'mm')

# ── 标题 ──
tx(48,44,'一节课的一生 · 核心业务流程',36,INK,True)
tx(48,92,'状态 → 动作 → 状态：箭头一律向前，规则贴在它约束的那一步',21,SUB)

# ── 主干 ──
action(540,150,320,100,'排课','日期 / 课程 / 自由起止时间',['师'])
seg([(700,250),(700,330)],head=(700,330,0,1)); gate(700,290,'冲突校验 · 同类型 / 学员互斥',RED)
state(550,330,300,110,'available','待约 · 开放自助约')
# 进入 booked 的两条路
seg([(620,440),(620,470),(390,470),(390,500)],head=(390,500,0,1))
seg([(780,440),(780,470),(1010,470),(1010,500)],head=(1010,500,0,1))
action(250,500,280,100,'学员约课','看待约列表 · 点「约」二次确认',['学'])
action(870,500,280,100,'指定学员','排课时勾选 · 不开放自助约',['师'])
# 自助约课有一道闸门：课时按课程记，没报这门课就看不到、也约不了
gate(505,470,'报了本课 · 课时未超',BLUE)
# 老师指定走的是另一条：不做拦截，只在弹层里把异常列给老师看
gate(895,470,'未报本课 · 只提示不拦',BLUE)
seg([(390,600),(390,635),(640,635),(640,660)],head=(640,660,0,1))
seg([(1010,600),(1010,635),(760,635),(760,660)],head=(760,660,0,1))
state(550,660,300,110,'booked','已约 · 名额占用',sh=PINK)
# booked 的两条出路
seg([(620,770),(620,800),(400,800),(400,830)],head=(400,830,0,1))
seg([(780,770),(780,800),(1000,800),(1000,830)],head=(1000,830,0,1))
action(260,830,280,100,'签到','师生同规则 · 记入已上课时',['师','学'])
gate(400,985,'仅当天 或 已开课')
action(860,830,280,132,'取消','老师不限时\n学员需距开课 >6h\n取消时选扣 / 不扣课时',['师','学'])
# 两个终态
seg([(400,930),(400,1050)],head=(400,1050,0,1))
state(260,1050,280,110,'completed','已完成 · 计入已上课时',sh=BLUE)
seg([(1000,962),(1000,1050)],head=(1000,1050,0,1))
gate(1000,1006,'已过开始时间 或 扣课时',RED)
state(860,1050,280,110,'已取消','保留名单 · 扣课时算已上',sh=GREY,fill=GREY,tc=SUB)
# 未到开课时间且不扣课时：取消 → available（走最右边际通道）
seg([(1140,890),(1470,890),(1470,385),(850,385)],head=(850,385,-1,0))
gate(1160,385,'不扣课时 · 未到开始时间 · 释放为待约',BLUE)

# ── 底部口径 ──
rr(60,1210,W-120,56,fill=WHITE,outline=INK,r=14,lw=2)
d.ellipse([*P(88,1227),*P(104,1243)],fill=RED)
tx(120,1238,'课时口径：报名按课程记 · 已上 = 上线前录入 + 小程序内完成 + 取消时勾了扣课时；超出显示红色「已超 N 节」并提醒老师',20,mix(INK,.72,WHITE),False,'lm')

im.resize((W,H),Image.LANCZOS).save(os.path.join(OUT,'00-业务流程图.png'))
print("✓ 00-业务流程图.png")
