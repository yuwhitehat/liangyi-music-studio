# -*- coding: utf-8 -*-
"""核心业务流程图（三泳道）— 贴纸手账风：白卡黑描边 + 泳道色硬影
所有坐标先算逻辑值再统一乘 S"""
from PIL import Image, ImageDraw, ImageFont
import os, math
S=2
W,H=1720,1180
OUT=os.path.join(os.path.dirname(__file__),'..','docs','mockups')
FP='/System/Library/Fonts/Hiragino Sans GB.ttc'
_fc={}
def F(z,b=False):
    k=(z,b)
    if k not in _fc: _fc[k]=ImageFont.truetype(FP,z*S,index=1 if b else 0)
    return _fc[k]
PINK, YELLOW, BLUE = '#FF5FA2', '#FFD23F', '#4D8DFF'
INK, WHITE, PAPER = '#111111', '#FFFFFF', '#F6F4EE'
SKY, SKYL, RED = '#FFF3C4', '#FFF8DC', '#C0392B'
def mix(c,a,bg='#FFFFFF'):
    h=lambda x:tuple(int((x[1:3],x[3:5],x[5:7])[i] if len(x)==7 else (x[1]*2,x[2]*2,x[3]*2)[i],16) for i in range(3))
    A,B=h(c),h(bg); return '#%02X%02X%02X'%tuple(round(A[i]*a+B[i]*(1-a)) for i in range(3))
SUB = mix(INK,.55,WHITE)
GRID = mix('#2B3FA8',.11,PAPER)
GREY = mix(INK,.08,WHITE)

im=Image.new('RGB',(W*S,H*S),PAPER); d=ImageDraw.Draw(im)
_gx=0
while _gx<=W:
    d.line([(_gx*S,0),(_gx*S,H*S)],fill=GRID,width=2*S); _gx+=44
_gy=0
while _gy<=H:
    d.line([(0,_gy*S),(W*S,_gy*S)],fill=GRID,width=2*S); _gy+=44
def P(x,y): return (int(x*S),int(y*S))          # 逻辑坐标 → 像素
def rr(x,y,w,h,fill=None,outline=None,r=16,lw=2,sh=None,so=8):
    if sh:
        d.rounded_rectangle([*P(x+so,y+so),*P(x+w+so,y+h+so)],radius=int(r*S),fill=sh)
    d.rounded_rectangle([*P(x,y),*P(x+w,y+h)],radius=int(r*S),fill=fill,outline=outline,width=int(lw*S))
def tx(x,y,s,z=24,c=INK,b=False,an='la'):
    d.text(P(x,y),s,font=F(z,b),fill=c,anchor=an)

# ── 标题 ──
tx(48,52,'两仪音乐工作室 · 核心业务流程',36,INK,True)
tx(48,100,'排课 → 约课 → 签到 / 取消（含固定课与冲突校验）',21,SUB)

# ── 泳道：白面板 + 黑描边；节点影子取泳道色 ──
LANE_H=250
LANE_C=[PINK, YELLOW, BLUE]
lanes=[('老师 / 超管',150),('系统 · 校验与状态',430),('学员',710)]
for _i,(nm,y) in enumerate(lanes):
    rr(40,y,W-80,LANE_H,fill=WHITE,outline=INK,r=18,lw=3)
    tx(62,y+16,nm,21,SUB,True)

def node(lane,x,w,label,sub=None,fill=None,tc=None,z=25):
    y=lanes[lane][1]+72
    h=LANE_H-110
    bg = fill or WHITE
    tc = tc or (WHITE if bg==INK else INK)
    sh = INK if bg in (PINK, YELLOW, BLUE) else LANE_C[lane]
    rr(x,y,w,h,fill=bg,outline=INK,r=16,lw=3,sh=sh,so=8)
    cy=y+h/2-(16 if sub else 0)
    tx(x+w/2,cy,label,z,tc,True,'mm')
    if sub: tx(x+w/2,cy+34,sub,18,mix(tc,.62,bg) if bg!=WHITE else SUB,False,'mm')
    return (x,y,w,h)

def link(a,b,label=None,color=None,detour=None):
    color=color or mix(INK,.45,PAPER)
    ax=a[0]+a[2]; ay=a[1]+a[3]/2; bx=b[0]; by=b[1]+b[3]/2
    if detour:
        my=detour
        d.line([*P(ax,ay),*P(ax,my)],fill=color,width=int(3*S))
        d.line([*P(ax,my),*P(bx,my)],fill=color,width=int(3*S))
        d.line([*P(bx,my),*P(bx,by)],fill=color,width=int(3*S))
        head(bx,by,90,color)
    else:
        d.line([*P(ax,ay),*P(bx,by)],fill=color,width=int(3*S)); head(bx,by,0,color)
    if label:
        mx,my_=(ax+bx)/2,(ay+by)/2 if not detour else detour
        if getattr(link,'_dy',None): my_+=link._dy
        bb=F(18,True).getbbox(label); pad=12
        bbw=(bb[2]-bb[0])/S
        rr(mx-bbw/2-pad, my_-17, bbw+2*pad, 34, fill=WHITE, outline=INK, r=8, lw=2)
        tx(mx,my_,label,18,INK,True,'mm')
def head(x,y,ang,color):
    L=14; a=math.radians(ang)
    for s_ in (1,-1):
        d.line([*P(x,y),*P(x-L*math.cos(a-0.42*s_), y-L*math.sin(a-0.42*s_))],fill=color,width=int(3*S))

link._dy=0
# ═══ 老师泳道 ═══
n_login =node(0,  90,150,'登录','手机号命中登记表')
n_sched =node(0, 280,170,'排课','日期/课程/自由时间')
n_assign=node(0, 490,170,'指定学员','排课时勾选',fill=PINK)
n_avail =node(0, 700,160,'待约',None,fill=SKY)
n_checkin=node(0,1300,170,'签到','当天或已开课',fill=INK)
n_cancel =node(0,1510,160,'取消','不限时间',fill=PINK)
link(n_login,n_sched); link(n_sched,n_assign)
link(n_assign,n_avail,label='未指定')
link(n_checkin,n_cancel)


# ═══ 系统泳道 ═══
n_conf =node(1,280,240,'冲突校验','同类型互斥 · 学员互斥')
n_exp  =node(1,560,200,'周期展开','每周×N → N 节',fill=SKYL)
n_open =node(1,790,190,'available',None)
n_book =node(1,1020,190,'booked 已约','名额占用',fill=YELLOW)
n_done =node(1,1270,190,'completed',None,fill=GREY,tc=SUB)
n_canc =node(1,1500,190,'已取消','保留名单',fill=GREY,tc=SUB)
link(n_sched,n_conf); link(n_conf,n_exp); link(n_exp,n_open)
link._dy=-22; link(n_assign,n_book,label='直接指定'); link._dy=0
link._dy=-26; link(n_book,n_done,label='签到')
link._dy=0

# ═══ 学员泳道 ═══
s_login=node(2,  90,150,'登录','未命中→学员')
s_book =node(2, 280,170,'约课','看 available 列表')
s_tap  =node(2, 490,160,'点「约」','二次确认',fill=PINK)
s_plan =node(2, 690,180,'我的课表','出现该节课')
s_ci   =node(2, 910,170,'自助签到','仅当天',fill=INK)
s_cc   =node(2,1120,180,'自助取消','需距开课 >6h',fill=PINK)
link(s_login,s_book); link(s_book,s_tap); link(s_tap,s_plan)
link(s_plan,s_ci); link(s_ci,s_cc)

# ── 跨泳道连线（所有节点定义完毕后再连）──
link._dy=22; link(n_avail, n_open, label='无学员，开放自助约'); link._dy=0
link(s_tap, n_book, label='学员约课', detour=lanes[1][1]+LANE_H-26)
link._dy=26
link(s_cc, n_canc, label='学员取消', detour=lanes[1][1]+LANE_H-14)
link(n_done, n_checkin, detour=lanes[1][1]+30)
link._dy=0

# ── 图例 ──
rr(40,1000,W-80,160,fill=WHITE,outline=INK,r=18,lw=3,sh=YELLOW,so=8)
tx(64,1022,'关键规则',22,INK,True)
rules=[('课程时间冲突','同日 + 同课程类型 + 区间交叉 → 拒绝；不同类型可并行（不同老师同时上课）',BLUE),
       ('学员时间冲突','同日 + 同一学员 + 区间交叉 → 拒绝（跨课程类型也算，一人不能同时在两节课）',PINK),
       ('签到','师生同规则：仅「当天 或 已开课」；未来不可签，过去可补签',INK),
       ('取消','未下课 → 释放为待约并清空学员；已下课 → 标已取消并保留名单；学员额外需 >6 小时',SUB),
       ('课时口径','已上 = 上线前录入 + 小程序内完成；超出报名数显示红色「已超 N 节」并提醒老师',RED)]
for i,(k,v,c) in enumerate(rules):
    yy=1052+i*22
    d.ellipse([*P(66,yy-5),*P(76,yy+5)],fill=c)
    tx(86,yy,k,18,c,True,'lm'); tx(250,yy,v,18,mix(INK,.72,WHITE),False,'lm')

im.resize((W,H),Image.LANCZOS).save(os.path.join(OUT,'00-业务流程图.png'))
print("✓ 00-业务流程图.png")
