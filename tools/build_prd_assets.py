# -*- coding: utf-8 -*-
"""生成 PRD 所需的全部原型图（贴纸手账风，几何与配色对齐 pages/* 与 app.wxss）"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from render_mockups import (Screen, mix, W, H, S, F, PINK, PINKD, YELLOW, BLUE, INK,
                            WHITE, PAPER, SKY, SKYL, RED, SUB, SUB2, SUB3, SH, SH_SOFT)

AV = [{'bg': '#111111', 'fg': '#FFFFFF'}, {'bg': '#FF5FA2', 'fg': '#FFFFFF'},
      {'bg': '#FFF3C4', 'fg': '#4D8DFF'}, {'bg': '#4D8DFF', 'fg': '#FFFFFF'}]

def T(t, sk, sp=False): return (t, sk, sp)

# ── 通用小件 ──
def fchips(s, cap, labels, active=0, extra=None):
    """筛选行：.fcap + .chips（约课管理的双维筛选）"""
    s.text(40, s.y+24, cap, 22, SUB)
    x, h = 96, 70
    yy = s.y + 8
    for i, l in enumerate(labels + ([extra] if extra else [])):
        caret = l.endswith('▾')
        if caret: l = l[:-1].rstrip()
        w = s.tw(l, 27, True) + 80 + (26 if caret else 0)
        if x + w > W - 40:
            x = 96; yy += h + 16
        on = (i == active)
        s.card(x, yy, w, h, r=100, sh=PINK if on else SH_SOFT, so=6, bw=4,
               fill=INK if on else WHITE)
        fg = WHITE if on else mix(INK, .65, WHITE)
        s.text(x+w//2-(13 if caret else 0), yy+h//2, l, 27, fg, True, anchor='mm')
        if caret:
            cx, cy = x+w//2+s.tw(l, 27, True)//2+8, yy+h//2
            s.d.polygon([(cx*S, (cy-4)*S), ((cx+14)*S, (cy-4)*S), ((cx+7)*S, (cy+6)*S)], fill=fg)
        x += w + 16
    s.y = yy + h + 36

def ab(s, x, y, w, labels):
    """卡内操作钮行：.ab / .ba-btn（等宽 flex，主操作粉）"""
    n = len(labels); gap = 16
    bw = (w - 56 - gap*(n-1))//n
    for j, (t, main) in enumerate(labels):
        bx = x + 28 + j*(bw+gap)
        s.card(bx, y, bw, 68, r=100, sh=mix(INK, .3, PAPER) if main else mix(INK, .18, PAPER),
               so=5, bw=4, fill=PINK if main else WHITE)
        s.text(bx+bw//2, y+34, t, 25, INK, True, anchor='mm')

def bkcard(s, i, bg, fg, d1, d2, h, body):
    x, w = 40, W-80
    s.card(x, s.y, w, h, r=36, sh=BLUE if i % 2 == 0 else PINK, so=12)
    s.bk_left(x, s.y, h, bg, fg, d1, d2)
    body(x+118, s.y, w-118)
    s.y += h + 28

def icon_chip(s, x, y, sz, ill, r=None, bw=3, bg=SKY, isz=None):
    s.card(x, y, sz, sz, r=r or int(sz*.29), sh=None, bw=bw, fill=bg)
    s.ill(ill, x+(sz-(isz or int(sz*.65)))//2, y+(sz-(isz or int(sz*.65)))//2, isz or int(sz*.65))

# ── 虚线（PIL 画不了 dashed，按段自己描） ──
def dash_seg(s, xa, ya, xb, yb, color, wd=3, seg=14, gap=11):
    dx, dy = xb-xa, yb-ya
    L = math.hypot(dx, dy)
    if L <= 0:
        return
    ux, uy = dx/L, dy/L
    t = 0.0
    while t < L:
        e = min(t+seg, L)
        s.d.line([((xa+ux*t)*S, (ya+uy*t)*S), ((xa+ux*e)*S, (ya+uy*e)*S)],
                 fill=color, width=wd*S)
        t = e + gap

def dash_arc(s, cx, cy, r, a0, a1, color, wd=4, seg=7, gap=7):
    a = a0
    while a < a1:
        b = min(a+seg, a1)
        s.d.arc([(cx-r)*S, (cy-r)*S, (cx+r)*S, (cy+r)*S], start=a, end=b,
                fill=color, width=wd*S)
        a = b + gap

def dash_box(s, x, y, w, h, r, color, wd=3):
    """虚线圆角矩形（PIL 的 line 不支持 dashed，四边 + 四角自己拼）"""
    dash_seg(s, x+r, y, x+w-r, y, color, wd)
    dash_seg(s, x+r, y+h, x+w-r, y+h, color, wd)
    dash_seg(s, x, y+r, x, y+h-r, color, wd)
    dash_seg(s, x+w, y+r, x+w, y+h-r, color, wd)
    for cx, cy, a0, a1 in ((x+r, y+r, 180, 270), (x+w-r, y+r, 270, 360),
                           (x+w-r, y+h-r, 0, 90), (x+r, y+h-r, 90, 180)):
        dash_arc(s, cx, cy, r, a0, a1, color, wd)

def dash_pill(s, x, y, w, h, color, wd=4):
    """虚线胶囊（.st-add 的「+ 加一门课」）"""
    dash_box(s, x, y, w, h, h/2.0, color, wd)

def stucard(s, nm, sub, cnt, ava, rows, none=None):
    """.st-card：头部身份 + 撕票虚线 + 一门课一行 + 「+ 加一门课」"""
    x, w, RH = 40, W-80, 102
    y0 = s.y
    h = 30+92+27 + (RH*len(rows) if rows else 44) + 20+62+26
    s.card(x, y0, w, h, r=28, sh=BLUE, so=10)
    ix = x+32
    s.card(ix, y0+30, 92, 92, r=46, sh=None, bw=4, fill=ava['bg'])
    s.text(ix+46, y0+76, nm[0], 40, ava['fg'], True, anchor='mm')
    s.text(ix+118, y0+36, nm, 32, INK, True)
    s.text(ix+118, y0+84, sub, 24, SUB)
    s.text(x+w-104, y0+60, str(cnt), 34, INK, True, anchor='mm')
    s.text(x+w-104, y0+96, '门课', 19, mix(INK, .45, WHITE), False, anchor='mm')
    s.chevron(x+w-58, y0+76, 34)
    yc = y0+30+92+24
    dash_seg(s, ix, yc, x+w-32, yc, mix(INK, .3, WHITE), 3, 12, 10)
    yy = yc+3+18
    for i, r in enumerate(rows):
        if i:
            dash_seg(s, ix, yy-16, x+w-32, yy-16, mix(INK, .14, WHITE), 2, 8, 8)
        s.text(ix, yy, r['cn'], 28, INK, True)
        s.text(x+w-32, yy, r['rm'], 25, RED if r.get('neg') else INK, True, anchor='rm')
        s.text(ix, yy+40, r['num'], 21, SUB)
        s.text(x+w-32, yy+40, r['pd'], 21, mix(INK, .42, WHITE), anchor='rm')
        yy += RH
    if none:
        s.text(ix, yy+2, none, 22, mix(INK, .4, WHITE))
        yy += 44
    dash_pill(s, ix, yy+20, w-64, 62, mix(INK, .4, WHITE))
    s.text(x+w//2, yy+51, '+ 加一门课', 24, mix(INK, .55, WHITE), True, anchor='mm')
    s.y = y0 + h + 30

def enrollcard(s, rows, cnt_note='共 2 门课'):
    """.enroll：一张卡，一门课一行（每门课一张卡会把屏幕顶掉）"""
    x, w, pad = 40, W-80, 32
    hh, RH = 84, 186
    y0 = s.y
    hs = [RH + (36 if r.get('span') else 0) for r in rows]
    h = hh + sum(hs) + max(0, len(rows)-1)*3
    s.card(x, y0, w, h, r=32, sh=YELLOW, so=12)
    s.d.rounded_rectangle([(x+6)*S, (y0+6)*S, (x+w-6)*S, (y0+hh)*S], radius=26*S, fill=SKY)
    s.d.rectangle([(x+6)*S, (y0+32)*S, (x+w-6)*S, (y0+hh)*S], fill=SKY)
    s.d.line([(x*S, (y0+hh)*S), ((x+w)*S, (y0+hh)*S)], fill=INK, width=4*S)
    s.text(x+pad, y0+hh//2, '我的课时', 30, INK, True, anchor='lm')
    if cnt_note:
        s.text(x+w-pad, y0+hh//2+2, cnt_note, 21, SUB, False, anchor='rm')
    yy = y0 + hh
    for i, (r, rh) in enumerate(zip(rows, hs)):
        if i:
            yy += 3
            dash_seg(s, x+pad, yy, x+w-pad, yy, mix(INK, .18, WHITE), 3, 12, 10)
        neg = r.get('over')
        xr = x + w - pad
        unit = ' 节'
        uw = s.tw(unit, 21, False)
        s.text(xr, yy+24+8, unit, 21, mix(INK, .5, WHITE), False, anchor='rm')
        s.text(xr-uw, yy+24, r['rm'], 40, RED if neg else INK, True, anchor='rm')
        s.text(x+pad, yy+24+4, r['cn'], 30, INK, True)
        by = yy + 24 + 42 + 18
        s.card(x+pad, by, w-pad*2, 26, r=100, sh=None, bw=4)
        fw = int((w-pad*2-8) * r['pct'] / 100.0)
        if fw > 0:
            s.d.rounded_rectangle([((x+pad+4)*S, (by+4)*S), ((x+pad+4+fw)*S, (by+22)*S)],
                                  radius=9*S, fill=RED if neg else BLUE)
        ey = by + 26 + 14
        s.text(x+pad, ey, r['det'], 21, SUB)
        lab = r.get('tip') or r.get('days')
        if lab:
            lw = s.tw(lab, 20, True) + 32
            lc = RED if neg else YELLOW
            s.rect(xr-lw, ey-2, lw, 40, fill=mix(lc, .08, WHITE) if neg else YELLOW,
                   outline=lc, r=100, wd=3)
            s.text(xr-lw//2, ey+18, lab, 20, lc if neg else INK, True, anchor='mm')
        if r.get('span'):
            s.text(x+pad, ey+40+8, r['span'], 20, mix(INK, .42, WHITE))
        yy += rh
    s.y = y0 + h + 32

# ═══ 01 首页（pages/index：方格纸留白 190 / 标题卡 / 白色地面）═══
s = Screen(h=1500)
s.ill('sun', W-160-76, 96, 76)
s.ill('cloud', 40, 104, 130, 66)
x, w = 64, W-128
y = 190 + 16
ph = 40 + 58 + 40 + int(132*1.22)*2 + 48
s.card(x, y, w, ph, r=44, sh=YELLOW, so=18)
pw = s.tw('LIANGYI · 两仪', 24, True) + 60
s.rect(x+40, y+40, pw, 58, fill=INK, r=100)
s.text(x+40+pw//2, y+40+29, 'LIANGYI · 两仪', 24, WHITE, True, anchor='mm')
s.text(x+w-60, y+44, '+', 34, INK, True)
s.text(x+w-250, y+250, '+', 34, INK, True)
s.text(x+w-44, y+ph-52, '+', 34, INK, True)
ty = y + 40 + 58 + 40
s.text(x+40, ty, '两仪', 132, INK, True)
s.text(x+40, ty+int(132*1.22), '音乐', 132, INK, True)
yy = y + ph + 56
gap, bh = 28, 300
bw2 = (W-80-gap)//2
for i, (txt, sk) in enumerate([('我是老师', BLUE), ('我是学员', PINK)]):
    bx = 40 + i*(bw2+gap)
    s.card(bx, yy, bw2, bh, r=40, sh=sk, so=16)
    blk = 56 + 30 + 108
    t0 = yy + (bh-blk)//2
    s.text(bx+40, t0+28, txt, 40, INK, True)
    s.card(bx+40, t0+56+30, 108, 108, r=32, sh=None, bw=5, fill=sk)
    s.ill('arrow-b', bx+40+26, t0+56+30+30, 56, 48)
yy += bh + 40
gw = s.tw('先随便看看 · 工作室介绍', 26, True) + 88
s.card((W-gw)//2, yy, gw, 68, r=100, sh=None, bw=5)
s.text(W//2, yy+34, '先随便看看 · 工作室介绍', 26, INK, True, anchor='mm')
s.y = yy + 68 + 60
s.save('01-首页.png', '① 首页 · 身份入口（左右并排的实体按钮）')

# ═══ 02 登录页 ═══
s = Screen(h=2100)
s.card(40, 120, 76, 76, r=38, sh=INK, so=5, bw=5)
s.chevron_left(90, 158, 34, INK)
s.text(40, 256, '学员登录', 84, INK, True)
s.text(40, 256+105+16, '两仪音乐工作室', 26, SUB)
fy = 566
dev_h = 24 + 49 + 3*74 + 24
form_h = 60 + 198 + 67 + dev_h + 40 + 136 + 110 + 108 + 143 + 84 + 80
s.card(40, fy, W-80, form_h, r=48, sh=PINK, so=18)
s.y = fy + 60
s.field('手机号', '135 0000 0001')
s.text(40, s.y, '老师由工作室预先登记，手机号匹配即身份确认', 23, SUB2)
s.y += 39 + 28
s.rect(40, s.y, W-80, dev_h, fill=WHITE, outline=mix(INK, .4, WHITE), r=24, wd=4)
s.text(68, s.y+24, '测试账号 · 点一下即可填入', 22, SUB)
ry = s.y + 24 + 49
for tagc, tagn, nm, ph in [(YELLOW, '学员', '张小明', '135 0000 0001'),
                           (PINK, '超级管理员', '林老师', '138 0000 0000'),
                           (YELLOW, '老师', '苏老师', '139 0000 0001')]:
    s.d.line([(68*S, ry*S), ((W-68)*S, ry*S)], fill=mix(INK, .12, WHITE), width=2*S)
    tw_ = s.tw(tagn, 20, True) + 32
    s.rect(68, ry+18, tw_, 38, fill=tagc, outline=INK, r=100, wd=3)
    s.text(68+tw_//2, ry+37, tagn, 20, INK, True, anchor='mm')
    s.text(68+tw_+20, ry+37, nm, 27, INK, True, anchor='lm')
    s.text(W-68, ry+37, ph, 26, SUB, False, anchor='rm')
    ry += 74
s.y = s.y + dev_h + 40
s.btn('验证并进入')
dy = s.y - 28 + 44
s.d.line([(40*S, (dy+11)*S), ((W//2-60)*S, (dy+11)*S)], fill=mix(INK, .12, WHITE), width=4*S)
s.d.line([((W//2+60)*S, (dy+11)*S), ((W-40)*S, (dy+11)*S)], fill=mix(INK, .12, WHITE), width=4*S)
s.text(W//2, dy+11, '或', 22, SUB2, False, anchor='mm')
s.y = dy + 22 + 44
s.card(40, s.y, W-80, 108, r=100, sh=INK, so=10, bw=6)
s.card(W//2-132-20, s.y+34, 40, 40, r=20, sh=None, bw=4, fill=YELLOW)
s.checkmark(W//2-132, s.y+54, 22, INK)
s.text(W//2+16, s.y+54, '微信一键登录', 32, INK, True, anchor='mm')
s.y += 108 + 56
s.text(W//2, s.y+24, '回到首页', 28, INK, True, anchor='mm')
s.y += 24 + 39 + 24 + 18
s.text(W//2, s.y+16, '游客浏览 · 看看工作室信息', 24, SUB2, False, anchor='mm')
s.save('02-登录页.png', '② 登录页 · 手机号 / 微信一键')

# ═══ 03 老师端工作台 ═══
s = Screen()
s.head('林老师', '今天 · 9月27日 · 3 节课 · 5 节待约', hd='yellow')
s.tiles([T('排课', 'blue'), T('约课管理', 'yellow'), T('学员', 'blue'),
         T('老师', 'pink'), T('课程', 'pink')])
s.save('03-老师端工作台.png', '③ 老师端 · 贴纸工作台（仅超管见「老师/课程」）')


#
PK_ROWS = [('张小明', '钢琴 剩 1 节', 1, None),
           ('李小红', '没报本课', 1, ('未报本课', 'nb')),
           ('王小华', '钢琴 剩 -2 节', 1, ('已超支', 'warn'))]
PK_WARN = ['李小红：没报「钢琴」这门课', '王小华：钢琴 报名 4 节，已上 6 节（超 2 节）']


def bkstu(s, x, y, w, names, warn, verb):
    """.bk-stu：选择学员入口 + 已选中的粉色胶囊 + 表单里的「这 N 位要注意」（排课用，warn 不在弹层内）"""
    s.card(x, y, w, 88, r=24, sh=None, bw=4, fill=SKY)
    s.text(x+30, y+44, '选择学员', 28, INK, True, anchor='lm')
    val = '、'.join(names)
    s.text(x+w-30-26, y+44, val, 27, INK, True, anchor='rm')
    s.chevron(x+w-30-16, y+44, 26, INK)
    y += 88 + 18
    tx_ = x
    for nm in names:
        tw_ = 44 + s.tw(nm, 25, True) + 40
        s.card(tx_, y, tw_, 54, r=100, sh=None, bw=4, fill=PINK)
        s.text(tx_+22, y+27, nm, 25, INK, True, anchor='lm')
        s.xmark(tx_+22+s.tw(nm, 25, True)+20, y+27, 22, mix(INK, .7, PINK), circle=False)
        tx_ += tw_ + 14
    y += 54 + 20
    pwh = 20 + 34 + 6 + 38*len(warn) + 10 + 30 + 20
    s.card(x, y, w, pwh, r=20, sh=SH_SOFT, so=8, bw=4, fill='#FFE9F1')
    py = y + 20
    s.text(x+24, py, '这 %d 位要注意' % len(warn), 25, INK, True)
    py += 34 + 6
    for t in warn:
        s.text(x+24, py, t, 22, INK); py += 38
    s.text(x+24, py + 10, verb, 21, SUB)
    return y + pwh
# ═══ 04 排课 ═══
s = Screen(h=3300)
s.head('排课', '选日期 · 选课程 · 定时间', hd='blue', back=True)
s.sec('选择日期')
x = 40
for wd, d, m, on in [('今天', '27', '2 节', 1), ('周日', '28', '9月', 0), ('周一', '29', '9月', 0),
                     ('周二', '30', '9月', 0), ('周三', '1', '10月', 0)]:
    if on:
        s.card(x, s.y, 132, 200, r=28, sh=PINK, so=6, bw=4, fill=INK)
        s.text(x+66, s.y+52, wd, 21, mix(WHITE, .75, INK), True, anchor='mm')
        s.text(x+66, s.y+112, d, 48, WHITE, True, anchor='mm')
        s.text(x+66, s.y+166, m, 20, mix(WHITE, .55, INK), False, anchor='mm')
    else:
        s.card(x, s.y, 132, 200, r=28, sh=SH_SOFT, so=6, bw=4)
        s.text(x+66, s.y+52, wd, 21, SUB, True, anchor='mm')
        s.text(x+66, s.y+112, d, 48, INK, True, anchor='mm')
        s.text(x+66, s.y+166, m, 20, SUB2, False, anchor='mm')
    x += 152
s.y += 200 + 8
s.sec('课程类型', 4)
x = 40
cw = (W-80-60)//4
for nm, ill, dur, on in [('钢琴', 'ic-piano', '60分', 1), ('声乐', 'ic-vocal', '45分', 0),
                         ('吉他', 'ic-guitar', '60分', 0), ('录音', 'ic-record', '90分', 0)]:
    if on:
        s.card(x, s.y, cw, 200, r=28, sh=BLUE, so=6, bw=4, fill=INK)
        icon_chip(s, x+(cw-76)//2, s.y+24, 76, ill, bg=WHITE)
        s.text(x+cw//2, s.y+132, nm, 26, WHITE, True, anchor='mm')
        s.text(x+cw//2, s.y+168, dur, 20, mix(WHITE, .6, INK), False, anchor='mm')
    else:
        s.card(x, s.y, cw, 200, r=28, sh=SH_SOFT, so=6, bw=4)
        icon_chip(s, x+(cw-76)//2, s.y+24, 76, ill)
        s.text(x+cw//2, s.y+132, nm, 26, INK, True, anchor='mm')
        s.text(x+cw//2, s.y+168, dur, 20, SUB2, False, anchor='mm')
    x += cw + 20
s.y += 200
s.sec('上课时间', '自由选')
px, pw, py = 40, W-80, s.y
BKS = 88 + 18 + 54 + 20 + (20 + 34 + 6 + 38*len(PK_WARN) + 10 + 30 + 20)
panel_h = 36+170+36+115+36+115+36+163+24+BKS+36+96+36
s.card(px, py, pw, panel_h, r=32, sh=YELLOW, so=12)
iy = py + 36
s.text(px+36, iy, '开始', 22, SUB)
s.text(px+36+240+40, iy, '结束', 22, SUB)
s.card(px+36, iy+33, 240, 105, r=24, sh=None, bw=4, fill=SKY)
s.text(px+36+120, iy+33+52, '15:00', 44, INK, True, anchor='mm')
s.text(px+36+240+20, iy+33+52, '—', 36, SUB3, False, anchor='mm')
s.card(px+36+240+40, iy+33, 240, 105, r=24, sh=None, bw=4, fill=SKY)
s.text(px+36+240+40+120, iy+33+52, '15:30', 44, INK, True, anchor='mm')
s.text(px+pw-36-30, iy+50, '30', 52, INK, True, anchor='mm')
s.text(px+pw-36-30, iy+100, '分钟', 20, SUB, False, anchor='mm')
iy += 33 + 105 + 36
for lab, opts, act in [('快捷时长', ['30 分', '45 分', '60 分', '90 分'], 0),
                       ('重复', ['不重复', '每周', '隔周'], 0)]:
    s.text(px+36, iy, lab, 22, SUB)
    iy += 33 + 18
    qw = (pw-72-3*18)//4 if lab == '快捷时长' else (pw-72-2*18)//3
    qx = px + 36
    for j, o in enumerate(opts):
        on = (j == act)
        s.card(qx, iy, qw, 76, r=100, sh=mix(INK, .35, PAPER) if on else SH_SOFT, so=5, bw=4,
               fill=YELLOW if on else WHITE)
        s.text(qx+qw//2, iy+38, o, 26, INK, True, anchor='mm')
        qx += qw + 18
    iy += 76 + 36
s.card(px+36, iy, pw-72, 163, r=28, sh=SH_SOFT, so=8, bw=4, fill=SKYL)
s.text(px+66, iy+26, '已有学员预约', 29, INK, True)
s.text(px+66, iy+73, '开启后可直接指定学员，无需等对方来约', 22, SUB)
s.switch(px+pw-36-100-30, iy+54, True)
iy += 163 + 24
# .bk-stu：开了「已有学员预约」之后，选学员的入口和「要注意」都留在表单里
iy = bkstu(s, px+36, iy, pw-72, ['张小明', '李小红', '王小华'], PK_WARN,
           '照常排入，课时会记成负数 · 记得补课时或改报名。') + 36
s.card(px+36, iy, pw-72, 96, r=100, sh=INK, so=10, bw=6, fill=PINK)
s.text(px+pw//2, iy+48, '+  添加这个时段', 30, INK, True, anchor='mm')
s.y = py + panel_h
s.sec('本次待排', 2)
for ill, t, tag, on, sub in [('ic-piano', '15:00 – 15:30', '已约', 1, '钢琴 · 30 分钟 · 张小明'),
                             ('ic-vocal', '16:00 – 16:45', '待约', 0, '声乐 · 45 分钟 · 每周六 · 共 8 节')]:
    s.card(40, s.y, W-80, 128, r=28, sh=BLUE, so=8, bw=4)
    icon_chip(s, 70, s.y+26, 76, ill, bw=3)
    s.text(172, s.y+30, t, 32, INK, True)
    tw_ = s.tw(tag, 20, True) + 32
    s.rect(172+s.tw(t, 32, True)+14, s.y+34, tw_, 38, fill=PINK if on else SKYL, outline=INK, r=100, wd=3)
    s.text(172+s.tw(t, 32, True)+14+tw_//2, s.y+53, tag, 20, INK, True, anchor='mm')
    s.text(172, s.y+78, sub, 24, SUB)
    s.card(W-40-30-64, s.y+32, 64, 64, r=32, sh=None, bw=4)
    s.xmark(W-72, s.y+64, 26, SUB, circle=False)
    s.y += 148
s.btn('确认排课（2 节）')
s.save('04-排课.png', '④ 排课 · 自由起止时间 + 固定课 + 已有预约')

# ═══ 05 约课管理 ═══
s = Screen(h=1900)
s.head('约课管理', '签到 · 取消 · 查看名单', hd='yellow', back=True)
fchips(s, '状态', ['全部', '已约', '待约', '已完成'], 1)
fchips(s, '日期', ['全部日期', '今天', '未来 7 天', '已过去'], 1, extra='指定某天 ▾')
s.text(40, s.y+4, '3', 34, INK, True)
s.text(40+s.tw('3', 34, True)+12, s.y+10, '节课 · 已约 · 今天', 23, SUB, False, anchor='lm')
cw_ = s.tw('清除筛选', 23, True) + 44
s.rect(W-40-cw_, s.y, cw_, 44, fill=YELLOW, outline=INK, r=100, wd=4)
s.text(W-40-cw_//2, s.y+22, '清除筛选', 23, INK, True, anchor='mm')
s.y += 44 + 26
def body5(x, y, w, meta, sub, acts):
    s.text(x+28, y+28, meta[0], 36, INK, True)
    s.tag(x+w-28-s.tw(meta[1], 22, True)-44, y+30, meta[1], meta[2])
    s.text(x+28, y+28+50+14, meta[3], 32, INK, True)
    dw = s.tw(meta[4], 20, True) + 28
    s.rect(x+28+s.tw(meta[3], 32, True)+14, y+28+50+14+6, dw, 34, fill=PINK, outline=INK, r=100, wd=3)
    s.text(x+28+s.tw(meta[3], 32, True)+14+dw//2, y+28+50+14+23, meta[4], 20, INK, True, anchor='mm')
    s.text(x+w-28, y+28+50+14+10, meta[5], 23, SUB2, False, anchor='rm')
    s.text(x+28, y+28+50+14+45+8, sub, 26, mix(INK, .65, WHITE), True)
    ab(s, x, y+28+50+14+45+8+36+24, w, acts)
bkcard(s, 0, AV[0]['bg'], AV[0]['fg'], '27', '9月', 301,
       lambda x, y, w: body5(x, y, w, ('钢琴', '已约', 't-terra', '15:00 – 16:00', '60 分', '今天'),
                             '张小明', [('签到', 1), ('取消课程', 0), ('删除', 0)]))
bkcard(s, 1, AV[1]['bg'], AV[1]['fg'], '28', '9月', 301,
       lambda x, y, w: body5(x, y, w, ('声乐', '已约', 't-terra', '10:00 – 10:45', '45 分', '明天'),
                             '李小红', [('签到', 1), ('取消课程', 0), ('删除', 0)]))
bkcard(s, 2, AV[3]['bg'], AV[3]['fg'], '30', '9月', 301,
       lambda x, y, w: body5(x, y, w, ('吉他', '待约', 't-sky', '14:00 – 15:00', '60 分', '后天'),
                             '还没有人约课', [('指定学员', 1), ('删除', 0)]))
s.save('05-约课管理.png', '⑤ 约课管理 · 状态+日期双筛选 / 起止时间为主信息')

# ═══ 06 学员管理（课时按课程记：一张卡里一门课一行）═══
s = Screen(h=1900)
s.head('学员', '共 3 位同学 · 3 门报名', hd='blue', back=True)
s.card(40, s.y, W-80-96-20, 112, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
s.text(72, s.y+56, '搜索姓名或手机号', 32, SUB3, False, anchor='lm')
s.card(W-40-96, s.y+8, 96, 96, r=48, sh=mix(INK, .25, PAPER), so=10, bw=6, fill=PINK)
s.text(W-40-48, s.y+56, '+', 52, INK, False, anchor='mm')
s.y += 112 + 32
stucard(s, '张小明', '135 0000 0001 · 考级', 2, AV[0], [
    {'cn': '钢琴', 'rm': '剩 1 节', 'num': '共报 12 · 已上 11', 'pd': '3月1日 → 12月31日 · 剩 63 天'},
    {'cn': '声乐', 'rm': '剩 3 节', 'num': '共报 6 · 已上 3', 'pd': '5月10日 开始'}])
stucard(s, '李小红', '135 0000 0002 · 声乐', 1, AV[1], [
    {'cn': '声乐', 'rm': '超 1 节', 'neg': 1, 'num': '共报 6 · 已上 7', 'pd': '未填周期'}])
stucard(s, '周思远', '135 0000 0006 · 试课', 0, AV[2], [], none='还没有报名课程')
s.save('06-学员管理.png', '⑥ 学员 · 卡内一门课一行，点行改那条 /「+ 加一门课」登记新报名')

# ═══ 07 老师管理 ═══
s = Screen(h=2500)
s.head('老师', '2 位 · 仅超级管理员可管理', hd='pink', back=True)
s.sec('老师名单', 2)
s.card(40, s.y, W-80, 112, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
s.text(72, s.y+56, '搜索姓名或手机号', 32, SUB3, False, anchor='lm')
s.y += 112 + 24
s.card(40, s.y, W-80, 148, r=32, sh=BLUE, so=10)
s.card(70, s.y+30, 88, 88, r=44, sh=None, bw=4, fill=AV[0]['bg'])
s.text(114, s.y+74, '林', 38, WHITE, True, anchor='mm')
s.text(184, s.y+40, '林老师', 32, INK, True)
s.tag(184+s.tw('林老师', 32, True)+14, s.y+38, '超级管理员', 't-terra')
s.text(184, s.y+92, '138 0000 0000', 24, SUB)
s.chevron(W-72, s.y+74, 34)
s.y += 172
s.card(40, s.y, W-80, 194, r=32, sh=PINK, so=10)
s.card(70, s.y+30, 88, 88, r=44, sh=None, bw=4, fill=AV[1]['bg'])
s.text(114, s.y+74, '苏', 38, WHITE, True, anchor='mm')
s.text(184, s.y+34, '苏老师', 32, INK, True)
s.text(184, s.y+82, '139 0000 0001', 24, SUB)
pw_ = s.tw('工作室资料', 20, True) + 32
s.rect(184, s.y+124, pw_, 38, fill=SKYL, outline=INK, r=100, wd=3)
s.text(184+pw_//2, s.y+143, '工作室资料', 20, INK, True, anchor='mm')
s.chevron(W-72, s.y+97, 34)
s.y += 194 + 24
s.btn('+ 添加老师')
sy = s.y + 20
iy = s.sheet('编辑老师 · 苏老师', sy)
s.y = iy
s.field('姓名', '苏老师')
s.field('手机号', '139 0000 0001')
pb_h = 28 + 33 + 8 + 22 + 44 + 22 + 44 + 26 + 34 + 28
s.card(40, s.y, W-80, pb_h, r=32, sh=SH_SOFT, so=10, bw=4, fill=SKYL)
s.text(70, s.y+28, '权限', 22, SUB)
ry = s.y + 28 + 33 + 8
s.d.line([(70*S, ry*S), ((W-70)*S, ry*S)], fill=mix(INK, .12, SKYL), width=3*S)
ry += 22
s.text(70, ry, '工作室资料', 29, INK, True)
s.text(70, ry+45, '可编辑工作室介绍、电话、地址', 22, SUB)
s.switch(W-70-100, ry+20, True)
ry += 45 + 22 + 26
s.d.line([(70*S, ry*S), ((W-70)*S, ry*S)], fill=INK, width=3*S)
ry += 26
sw = s.tw('超级管理员', 29, True) + 32
s.rect(70, ry-4, sw, 42, fill=YELLOW, outline=INK, r=100, wd=3)
s.text(70+sw//2, ry+17, '超级管理员', 29, INK, True, anchor='mm')
s.text(70, ry+52, '可管理老师、课程类型与全部权限', 22, SUB)
s.d.rounded_rectangle([(W-170)*S, (ry+16)*S, (W-70)*S, (ry+72)*S], radius=28*S, fill=RED)
s.d.ellipse([(W-170+4)*S, (ry+20)*S, (W-170+52)*S, (ry+68)*S], fill=WHITE)
s.y = s.y + pb_h + 40
s.btn('保存')
s.save('07-老师管理.png', '⑦ 老师管理 · 权限授予（仅超管可见此页）', trim=False)

# ═══ 08 课程类型 ═══
s = Screen(h=1500)
s.head('课程类型', '4 门 · 仅超级管理员可编辑', hd='pink', back=True)
s.sec('已开设课程', 4)
for ill, nm, d in [('ic-piano', '钢琴', '默认 60 分钟'), ('ic-vocal', '声乐', '默认 45 分钟'),
                   ('ic-guitar', '吉他', '默认 60 分钟'), ('ic-record', '录音', '默认 90 分钟')]:
    s.card(40, s.y, W-80, 136, r=32, sh=YELLOW, so=10)
    icon_chip(s, 70, s.y+26, 84, ill, bw=4, isz=54)
    s.text(180, s.y+34, nm, 34, INK, True)
    s.text(180, s.y+86, d, 23, SUB)
    ew = s.tw('编辑', 25, True) + 44
    s.card(W-40-56-14-ew, s.y+40, ew, 56, r=100, sh=None, bw=4)
    s.text(W-40-56-14-ew//2, s.y+68, '编辑', 25, INK, True, anchor='mm')
    s.card(W-40-56, s.y+40, 56, 56, r=28, sh=None, bw=4)
    s.xmark(W-40-28, s.y+68, 24, SUB, circle=False)
    s.y += 160
s.y += 24
s.btn('+ 添加课程类型')
s.text(W//2, s.y, '恢复默认四门课', 25, SUB2, False, anchor='mm')
s.y += 25 + 40
s.save('08-课程类型.png', '⑧ 课程类型 · 增删改 + 图标选择（仅超管）')

# ═══ 09 学员端工作台 ═══
s = Screen(h=2000)
s.head('陈小满同学', '今天 · 9月27日 · 2 节课待上', hd='yellow')
s.tiles([T('立即约课', 'blue'), T('我的课表', 'yellow'), T('上课记录', 'pink', True)])
s.sec('即将开始', 2)
for ill, nm, sub in [('ic-piano', '钢琴', '今天 · 15:00 – 16:00'), ('ic-vocal', '声乐', '9月29日 · 10:00 – 10:45')]:
    s.card(40, s.y, W-80, 160, r=28, sh=BLUE, so=10)
    icon_chip(s, 64, s.y+32, 96, ill, bw=5, isz=62)
    s.text(186, s.y+38, nm, 32, INK, True)
    s.text(186, s.y+90, sub, 24, SUB)
    s.tag(W-40-32-s.tw('已约', 22, True)-44, s.y+58, '已约', 't-terra')
    s.y += 188
s.save('09-学员端工作台.png', '⑨ 学员端 · 工作台（与老师端同一套贴纸块）')

# ═══ 10 学员约课（只开放自己报过的课，胶囊上带这门课的余额）═══
s = Screen(h=1700)
s.head('约课', '挑一个喜欢的时段', hd='blue', back=True)
s.sec('我报的课', 3)
s.y -= 12
x = 40
for i, (l, on, bad) in enumerate([('全部', 1, 0), ('吉他 · 超 2 节', 0, 1),
                                  ('钢琴 · 剩 1 节', 0, 0), ('声乐 · 剩 3 节', 0, 0)]):
    w = s.tw(l, 27, True) + 72
    bd = RED if bad else INK
    s.card(x, s.y, w, 78, r=100, sh=PINK if on else SH_SOFT, so=6, bw=4,
           fill=INK if on else WHITE)
    if not on:
        s.d.rounded_rectangle([x*S, s.y*S, (x+w)*S, (s.y+78)*S], radius=100*S,
                              outline=bd, width=4*S)
    s.text(x+w//2, s.y+39, l, 27,
           WHITE if on else (RED if bad else mix(INK, .65, WHITE)), True, anchor='mm')
    x += w + 18
s.y += 78 + 24
s.sec('可约时段', 3)
for i, (a, ill, nm, t, d, day, mon, ovr) in enumerate([
        (AV[0], 'ic-piano', '钢琴', '15:00–15:45', '今天', '27', '9月', 0),
        (AV[2], 'ic-vocal', '声乐', '10:00–10:45', '9月30日 周三', '30', '9月', 0),
        (AV[3], 'ic-guitar', '吉他', '16:00–17:00', '10月2日 周五', '02', '10月', 2)]):
    h = 184 if not ovr else 236
    x, w = 40, W-80
    s.card(x, s.y, w, h, r=36, sh=BLUE if i % 2 == 0 else PINK, so=12)
    s.bk_left(x, s.y, h, a['bg'], a['fg'], day, mon)
    icon_chip(s, x+118+28, s.y+34, 68, ill, bw=3, isz=44)
    s.text(x+118+28+68+20, s.y+68, nm, 36, INK, True, anchor='lm')
    s.text(x+118+28, s.y+34+68+12, t+' · '+d, 26, SUB)
    if ovr:
        s.text(x+118+28, s.y+34+68+12+36+8, '这门课已超 %d 节 · 约不了，' % ovr, 21, RED, True)
        s.text(x+118+28, s.y+34+68+12+36+8+32, '先联系老师补课时', 21, RED, True)
    gx = x+w-120
    go = WHITE if ovr else PINK
    s.d.rounded_rectangle([gx*S, s.y*S, (x+w)*S, (s.y+h)*S], radius=30*S, fill=go)
    s.d.rectangle([gx*S, s.y*S, (x+w-30)*S, (s.y+h)*S], fill=go)
    s.d.line([(gx*S, s.y*S), (gx*S, (s.y+h)*S)], fill=INK, width=4*S)
    s.d.rounded_rectangle([x*S, s.y*S, (x+w)*S, (s.y+h)*S], radius=36*S, outline=INK, width=6*S)
    s.text(gx+60, s.y+h//2, '约', 40, RED if ovr else INK, True, anchor='mm')
    s.y += h + 28
s.save('10-学员约课.png', '⑩ 学员约课 · 只列已报名的课，超支那门置灰并提示联系老师')

# ═══ 11 我的课表（三 tab 严格对应三状态）═══
s = Screen(h=1600)
s.head('我的课表', '看看接下来要上什么', hd='yellow', back=True)
s.chips(['待上课', '已完成', '已取消'], 0)
def body11(x, y, w, nm, tagk, tagt, meta, acts):
    s.text(x+28, y+34, nm, 36, INK, True)
    s.tag(x+28+s.tw(nm, 36, True)+12, y+30, tagt, tagk, h=38)
    s.text(x+28, y+34+50+14, meta, 26, SUB)
    if acts:
        ab(s, x, y+34+50+14+36+24, w, acts)
bkcard(s, 0, AV[0]['bg'], AV[0]['fg'], '27', '9月', 264,
       lambda x, y, w: body11(x, y, w, '钢琴', 't-terra', '已约', '15:00 – 16:00 · 今天',
                              [('签到', 1), ('取消课程', 0)]))
bkcard(s, 1, AV[1]['bg'], AV[1]['fg'], '29', '9月', 264,
       lambda x, y, w: body11(x, y, w, '声乐', 't-terra', '已约', '10:00 – 10:45 · 9月29日',
                              [('取消课程', 0)]))
bkcard(s, 2, AV[2]['bg'], AV[2]['fg'], '26', '9月', 264,
       lambda x, y, w: body11(x, y, w, '吉他', 't-over', '已逾期', '16:00 – 17:00 · 昨天',
                              [('签到', 1)]))
s.save('11-我的课表.png', '⑪ 我的课表 · 三 tab 对应三状态，当天可签到')

# ═══ 12 上课记录（课时按门记，全收在同一张卡里）═══
s = Screen(h=2000)
s.head('上课记录', '一节一节攒起来的', hd='pink', back=True)
s.y += 4
enrollcard(s, [
    {'cn': '钢琴', 'rm': '剩 1', 'pct': 92, 'det': '共报 12 节 · 已上 11 节',
     'days': '剩 63 天', 'span': '3月1日 → 12月31日'},
    {'cn': '声乐', 'rm': '超 1', 'over': 1, 'pct': 100, 'det': '共报 6 节 · 已上 7 节',
     'tip': '已超支 · 联系老师补充课时', 'span': '5月10日 开始'}])
s.sec('课程记录', 10)
for i, (a, nm, t, tagk, tagt) in enumerate([
        (AV[0], '钢琴', '今天 · 15:00 – 16:00', 't-terra', '已约'),
        (AV[1], '声乐', '9月20日 · 10:00 – 10:45', 't-mute', '已完成'),
        (AV[3], '钢琴', '9月18日 · 15:00 – 16:00', 't-charge', '已取消 · 已扣课时')]):
    s.card(40+8, s.y+8, 24, 24, r=12, sh=None, bw=3, fill=a['bg'])
    if i < 2:
        s.d.line([(59*S, (s.y+32)*S), (59*S, (s.y+163)*S)], fill=mix(INK, .25, PAPER), width=4*S)
    s.card(96, s.y, W-96-40, 151, r=28, sh=BLUE, so=8, bw=4)
    s.text(128, s.y+30, nm, 32, INK, True)
    s.tag(W-40-32-s.tw(tagt, 22, True)-44, s.y+28, tagt, tagk)
    s.text(128, s.y+30+45+12, t, 24, SUB)
    s.y += 175
s.save('12-上课记录.png', '⑫ 上课记录 · 一张课时卡按门分行 + 时间轴')

# ═══ 13 我的（pages/profile：头部卡 + bento + 底部弹层）═══
s = Screen(h=2500)
x, w = 40, W-80
th = 32 + 76 + 50 + 120 + 108
s.card(x, 120, w, th, r=44, sh=YELLOW, so=16)
s.card(x+40, 152, 76, 76, r=38, sh=INK, so=5, bw=5)
s.chevron_left(x+90, 190, 34, INK)
ry = 152 + 76 + 50
s.card(x+40, ry, 120, 120, r=60, sh=PINK, so=8, bw=6)
s.text(x+100, ry+60, '林', 54, INK, True, anchor='mm')
s.text(x+40+120+28, ry+18, '林老师', 48, INK, True)
s.text(x+40+120+28, ry+18+60+10, '老师 · 两仪音乐工作室', 24, SUB)
s.ill('dog-w', x+w-18-190, 120+th-98, 190, 98, alpha=.45)
s.y = 120 + th + 28 + 36
bw2 = (W-80-24)//2
s.card(40, s.y, bw2, 220, r=36, sh=None, bw=6)
s.text(40+bw2//2, s.y+110, '关于工作室', 34, INK, True, anchor='mm')
s.card(40+bw2+24, s.y, bw2, 220, r=36, sh=PINK, so=12)
s.text(40+bw2+24+bw2//2, s.y+110, '联系我们', 34, INK, True, anchor='mm')
s.y += 220 + 24
s.card(40, s.y, W-80, 160, r=36, sh=BLUE, so=12)
s.text(80, s.y+52, '工作室信息', 34, INK, True)
s.text(80, s.y+52+42+8, '介绍 · 电话 · 地址 已完善', 24, SUB)
s.text(W-80, s.y+80, '→', 40, mix(INK, .7, WHITE), False, anchor='mm')
s.y += 160 + 48
s.btn('退出登录', 'white')
s.text(W//2, s.y+40, '两仪音乐工作室', 26, INK, True, anchor='mm')
s.text(W//2, s.y+40+39+8, 'v24.0', 20, SUB3, False, anchor='mm')
s.y += 40 + 39 + 8 + 20 + 70
sy = s.y + 40
iy = s.sheet('联系我们', sy)
s.y = iy
for lab, val, cp in [('电话', '138 0000 0000', 1), ('微信', 'liangyi_music', 1),
                     ('地址', '上海市徐汇区 XX 路 1 号 3 层', 1), ('开放时间', '周一至周日 09:00–21:00', 0)]:
    s.text(40, s.y+8, lab, 25, SUB)
    s.text(W-40-(110+16 if cp else 0), s.y+4, val, 30, INK, True, anchor='rm')
    if cp:
        s.rect(W-40-110, s.y, 110, 42, fill=SKYL, outline=INK, r=100, wd=3)
        s.text(W-40-55, s.y+21, '复制', 20, INK, True, anchor='mm')
    s.y += 88
    s.d.line([(40*S, (s.y-14)*S), ((W-40)*S, (s.y-14)*S)], fill=mix(INK, .12, WHITE), width=2*S)
s.text(W//2, s.y+20, '点击任意一行即可复制该项内容', 21, SUB2, False, anchor='mm')
s.y += 20 + 21 + 24 + 8
s.btn('知道了')
s.save('13-我的.png', '⑬ 我的 · 信息逐行展示，可单独复制', trim=False)

# ═══ 14 工作室信息 ═══
s = Screen(h=2200)
s.head('工作室信息', '学员在小程序里看到的就是这些', hd='blue', back=True)
s.y += 20
s.field('工作室名称', '两仪音乐工作室')
s.text(40, s.y, '工作室介绍', 24, SUB, True)
s.y += 36 + 14
s.card(40, s.y, W-80, 220, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
s.text(72, s.y+26, '专注少儿钢琴与声乐教学，小班与一对一并行，', 30, INK)
s.text(72, s.y+26+48, '鼓励孩子在演奏中建立自信。', 30, INK)
s.text(W-64, s.y+220+8, '34 / 200', 20, SUB2, False, anchor='rm')
s.y += 220 + 32 + 36
s.field('联系电话', '138 0000 0000')
s.text(40, s.y, '工作室地址', 24, SUB, True)
s.y += 36 + 14
s.card(40, s.y, W-80, 160, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
s.text(72, s.y+34, '上海市徐汇区 XX 路 1 号 3 层', 30, INK)
s.y += 160 + 36
s.field('微信号', 'liangyi_music')
s.field('开放时间', '周一至周日 09:00–21:00')
s.text(40, s.y, '介绍、电话、地址建议都填上，学员咨询时能直接看到', 23, SUB2)
s.y += 23*1.7 + 36
s.btn('保存')
s.save('14-工作室信息.png', '⑭ 工作室信息 · 需超管或被授权')

# ═══ 关键弹窗 ═══
s = Screen(h=2120)
s.head('约课管理', '签到 · 取消 · 查看名单', hd='yellow', back=True)
bkcard(s, 0, AV[0]['bg'], AV[0]['fg'], '27', '9月', 264,
       lambda x, y, w: body11(x, y, w, '钢琴', 't-terra', '已约', '15:00 – 16:00 · 今天',
                              [('签到', 1), ('取消课程', 0)]))
sy = s.y + 40
iy = s.sheet('取消课程', sy)
s.y = iy
s.card(40, s.y, W-80, 79, r=20, sh=None, bw=4, fill=SKY)
s.text(40+28, s.y+39, '钢琴 · 今天 15:00–16:00 · 60 分', 26, INK, True, anchor='lm')
s.y += 79 + 24
# .cx-note：只说取消的后果，扣不扣由下面的单选回答
nh = 22 + 40*2 + 22
s.card(40, s.y, W-80, nh, r=20, sh=YELLOW, so=8, bw=4, fill=SKY)
s.text(66, s.y+24, '未到上课时间 · 选了扣课时，所以保留学员名单，', 25, INK)
s.text(66, s.y+24+40, '标记「已取消」，名额不重新开放。', 25, INK)
s.y += nh
for lab in ['这节课是否扣学员课时？', '名单（3 人 · 按「钢琴」课时算）']:
    s.y += 28
    s.text(40, s.y, lab, 24, SUB, False, anchor='lm')
    s.y += 36 + 16
    if lab.startswith('这节课'):
        for k, (t, d, on) in enumerate([
                ('扣 1 节课时', '学员缺课、或时间已占用 —— 名单上每人各扣 1 节', 1),
                ('不扣课时', '按正常取消处理，学员课时不变', 0)]):
            oh = 22 + 40 + 6 + 33 + 22
            s.card(40, s.y, W-80, oh, r=20, sh=PINK if on else SH_SOFT, so=6, bw=4,
                   fill='#FFEFF6' if on else WHITE)
            s.card(64, s.y+24, 36, 36, r=18, sh=None, bw=4)
            if on:
                s.card(76, s.y+36, 12, 12, r=6, sh=None, bw=0, fill=PINK)
            s.text(118, s.y+24, t, 29, INK, True)
            s.text(118, s.y+24+40+6, d, 22, SUB)
            s.y += oh + 16
s.y += 4
for nm, num, to in [('张小明', '本课 12 · 已上 11', '→ 12'),
                    ('李小红', '本课 6 · 已上 6', '→ 7（超支）'),
                    ('王小华', '没报本课 · 扣了不计入课时', '')]:
    sh_ = 18 + 38 + 18
    dash_box(s, 40, s.y, W-80, sh_, 18, mix(INK, .45, WHITE), 3)
    s.text(62, s.y+18, nm, 27, INK, True)
    tx = W-62
    if to:
        s.text(tx, s.y+22, to, 23, PINKD, True, anchor='rm')
        tx -= s.tw(to, 23, True) + 14
    s.text(tx, s.y+22, num, 23, BLUE if not to else SUB, bool(not to), anchor='rm')
    s.y += sh_ + 12
s.y += 16
s.d.line([(40*S, s.y*S), ((W-40)*S, s.y*S)], fill=INK, width=4*S)
s.y += 24
bw3 = (W-80-20)//2
s.card(40, s.y, bw3, 88, r=100, sh=INK, so=10, bw=6)
s.text(40+bw3//2, s.y+44, '再想想', 30, INK, True, anchor='mm')
s.card(40+bw3+20, s.y, bw3, 88, r=100, sh=INK, so=10, bw=6, fill=PINK)
s.text(40+bw3+20+bw3//2, s.y+44, '确认取消', 30, INK, True, anchor='mm')
s.y += 88 + 40
s.save('20-弹窗-取消确认.png', '弹层 · 先选扣不扣课时，再看名单里每门课的账', trim=False)

s = Screen(h=1500)
s.head('排课', '选日期 · 选课程 · 定时间', hd='blue', back=True)
sy = s.y + 60
iy = s.sheet('已排入 5 节，2 节未排入', sy)
s.y = iy
for i, t in enumerate(['2026-10-03 15:00–16:00 钢琴｜与已排的 15:00–16:00 钢琴 时间重叠',
                       '2026-10-17 15:00–16:00 钢琴｜学员「张小明」此时段已有 吉他 课']):
    s.card(40, s.y+4, 40, 40, r=20, sh=None, bw=3, fill=RED)
    s.text(60, s.y+24, str(i+1), 22, WHITE, True, anchor='mm')
    s.text(98, s.y, t[:26], 26, INK)
    s.text(98, s.y+40, t[26:52], 26, mix(INK, .6, WHITE))
    s.y += 110
    if i == 0:
        s.d.line([(40*S, (s.y-16)*S), ((W-40)*S, (s.y-16)*S)], fill=mix(INK, .12, WHITE), width=3*S)
s.y += 20
s.btn('知道了')
s.save('21-弹窗-冲突清单.png', '弹窗 · 冲突逐条带序号，成功的照常排入', trim=False)

s = Screen(h=1500)
s.head('我的课表', '看看接下来要上什么', hd='yellow', back=True)
sy = s.y + 60
iy = s.sheet('暂时无法自行取消', sy)
s.y = iy
s.text(40, s.y, '距离开课只剩 2.5 小时，不足 6 小时。', 27, INK)
s.text(40, s.y+52, '请直接联系老师帮忙取消：', 27, INK)
s.text(40, s.y+104, '138 0000 0000', 32, INK, True)
s.y += 104 + 45 + 24
bw3 = (W-80-16)//2
s.card(40, s.y, bw3, 88, r=100, sh=INK, so=10, bw=6)
s.text(40+bw3//2, s.y+44, '知道了', 30, INK, True, anchor='mm')
s.card(40+bw3+16, s.y, bw3, 88, r=100, sh=INK, so=10, bw=6, fill=PINK)
s.text(40+bw3+16+bw3//2, s.y+44, '复制电话', 30, INK, True, anchor='mm')
s.save('22-弹窗-取消受限.png', '弹窗 · 不足 6 小时引导联系老师', trim=False)


def pkpick(s, title, rows, btn, target=None, warn=None, cnt='3'):
    """学员多选弹层：排课的「选学员」和约课管理的「指定学员」共用同一套行样式。
    两处差别只在标题、目标课胶囊、底部按钮，以及「要注意」块画在弹层内还是表单里。"""
    s.y = s.sheet(title, s.y)
    if target:  # .pk-target：只有约课管理需要说清是给哪节课挑人
        s.card(40, s.y, W-80, 79, r=20, sh=None, bw=4, fill=SKY)
        s.text(68, s.y+39, target, 26, INK, True, anchor='lm')
        s.y += 79 + 24
    s.card(40, s.y, W-80, 112, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
    s.text(72, s.y+56, '搜索学员姓名', 32, SUB3, False, anchor='lm')
    s.y += 112 + 12
    # .pk-row：副标题按「这门课」算，名字后面挂一枚异常小标
    for i, (nm, note, ck, flag) in enumerate(rows):
        a = AV[i % 4]
        RH = 120
        s.card(40, s.y+22, 76, 76, r=38, sh=None, bw=4, fill=a['bg'])
        s.text(78, s.y+60, nm[0], 32, a['fg'], True, anchor='mm')
        s.text(140, s.y+28, nm, 30, INK, True, anchor='lm')
        if flag:
            lab, kind = flag
            fc = RED if kind == 'warn' else BLUE
            lx = 140 + s.tw(nm, 30, True) + 12
            lw = s.tw(lab, 19, True) + 28
            s.rect(lx, s.y+26, lw, 34, fill=mix(fc, .08, WHITE) if kind == 'warn' else WHITE,
                   outline=fc, r=100, wd=3)
            s.text(lx+lw//2, s.y+43, lab, 19, fc, True, anchor='mm')
        s.text(140, s.y+73, note, 22, SUB)
        if ck:
            s.card(W-40-48, s.y+36, 48, 48, r=14, sh=None, bw=4, fill=INK)
            s.checkmark(W-40-24, s.y+60, 28, WHITE)
        else:
            s.card(W-40-48, s.y+36, 48, 48, r=14, sh=None, bw=4)
        s.y += RH
        s.d.line([(40*S, (s.y-22)*S), ((W-40)*S, (s.y-22)*S)], fill=mix(INK, .12, WHITE), width=3*S)
    if warn:
        pwh = 20 + 34 + 6 + 38*len(warn) + 10 + 30 + 20
        s.card(40, s.y+8, W-80, pwh, r=20, sh=SH_SOFT, so=8, bw=4, fill='#FFE9F1')
        py = s.y + 8 + 20
        s.text(64, py, '这 %d 位要注意' % len(warn), 25, INK, True)
        py += 34 + 6
        for t in warn:
            s.text(64, py, t, 22, INK); py += 38
        s.text(64, py + 10, '照常指定，课时会记成负数 · 记得补课时或改报名。', 21, SUB)
        s.y = s.y + 8 + pwh + 24
    # .pk-foot：上边框 + 左计数 + 右按钮
    s.d.line([(40*S, s.y*S), ((W-40)*S, s.y*S)], fill=INK, width=4*S)
    s.y += 24
    s.text(40, s.y+22, '已选 %s 人' % cnt, 26, SUB, False, anchor='lm')
    bwk = 80 + s.tw(btn, 26, True)
    s.card(W-40-bwk, s.y-8, bwk, 72, r=100, sh=INK, so=6, bw=6, fill=PINK)
    s.text(W-40-bwk//2, s.y+28, btn, 26, INK, True, anchor='mm')
    s.y += 72 + 40



s = Screen(h=2000)
s.head('约课管理', '签到 · 取消 · 查看名单', hd='yellow', back=True)
bkcard(s, 0, AV[0]['bg'], AV[0]['fg'], '27', '9月', 264,
       lambda x, y, w: body11(x, y, w, '钢琴', 't-sky', '待约', '15:00 – 16:00 · 今天',
                              [('指定学员', 1), ('删除', 0)]))
s.y += 40
pkpick(s, '指定学员', PK_ROWS, '保存', target='钢琴 · 15:00 起', warn=PK_WARN)
s.save('23-弹层-选择学员.png', '弹层 · 约课管理里指定学员，顺带标出没报本课 / 已超支', trim=False)

# ═══ 26 排课的选学员弹层：同一套行，但「要注意」块在表单里，按钮是「确定」═══
s = Screen(h=2300)
s.head('排课', '选日期 · 选课程 · 定时间', hd='blue', back=True)
s.sec('上课时间', '自由选')
px, pw = 40, W-80
s.card(px, s.y, pw, 36 + 163 + 24 + BKS + 36, r=32, sh=YELLOW, so=12)
by = s.y + 36
s.card(px+36, by, pw-72, 163, r=28, sh=SH_SOFT, so=8, bw=4, fill=SKYL)
s.text(px+66, by+26, '已有学员预约', 29, INK, True)
s.text(px+66, by+73, '开启后可直接指定学员，无需等对方来约', 22, SUB)
s.switch(px+pw-36-100-30, by+54, True)
by = bkstu(s, px+36, by + 163 + 24, pw-72, ['张小明', '李小红', '王小华'], PK_WARN,
           '照常排入，课时会记成负数 · 记得补课时或改报名。')
s.y = by + 36 + 40
pkpick(s, '选学员 · 钢琴', PK_ROWS, '确定')
s.save('26-弹层-排课选学员.png', '弹层 · 排课里选学员：同一套标注，「要注意」留在表单里', trim=False)

# ═══ 24 游客浏览（只读展示，无任何操作）═══
s = Screen(h=1600)
s.head('工作室', '两仪音乐工作室', hd='blue', back=True)
ch = 40 + 48 + 24 + 28*1.95*2 + 40
s.card(40, s.y, W-80, ch, r=32, sh=YELLOW, so=12)
s.text(80, s.y+40, '关于工作室', 34, INK, True)
s.text(80, s.y+40+48+24, '专注少儿钢琴与声乐教学，小班与一对一并行，', 28, mix(INK, .72, WHITE))
s.text(80, s.y+40+48+24+55, '鼓励孩子在演奏中建立自信。', 28, mix(INK, .72, WHITE))
s.y += ch + 32
rows = 4
ch2 = 40 + 48 + rows*88 + 40 - 26
s.card(40, s.y, W-80, ch2, r=32, sh=PINK, so=12)
s.text(80, s.y+40, '联系我们', 34, INK, True)
yy = s.y + 40 + 48 + 22
for lab, val in [('电话', '138 0000 0000'), ('微信', 'liangyi_music'),
                 ('地址', '上海市徐汇区 XX 路 1 号 3 层'), ('开放时间', '周一至周日 09:00–21:00')]:
    s.text(80, yy+8, lab, 25, SUB)
    s.text(W-80, yy+4, val, 29, INK, True, anchor='rm')
    yy += 88
    if lab != '开放时间':
        s.d.line([(80*S, (yy-26)*S), ((W-80)*S, (yy-26)*S)], fill=mix(INK, .12, WHITE), width=2*S)
s.y = s.y + ch2 + 80
s.save('24-游客浏览.png', '游客浏览 · 只读「关于工作室 / 联系我们」，无任何操作')

# ═══ 25 弹层 · 一门课的报名（课时与周期都挂在课程上）═══
s = Screen(h=2400)
s.head('学员', '共 3 位同学 · 3 门报名', hd='blue', back=True)
stucard(s, '张小明', '135 0000 0001 · 考级', 2, AV[0], [
    {'cn': '钢琴', 'rm': '剩 1 节', 'num': '共报 12 · 已上 11', 'pd': '3月1日 → 12月31日 · 剩 63 天'},
    {'cn': '声乐', 'rm': '剩 3 节', 'num': '共报 6 · 已上 3', 'pd': '5月10日 开始'}])
s.y = s.sheet('张小明 · 钢琴', s.y + 20)
SWID = (W-80-60-20)//2        # .grp 里两列输入（.sub flex:1，gap 20）

def sfield(x, y, cap, val, w):
    s.text(x, y, cap, 24, SUB, True)
    yy = y + int(24*1.5) + 14
    s.card(x, yy, w, 112, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
    s.text(x+w//2, yy+56, val, 32, INK, True, anchor='mm')
    return yy + 112

# 课程类型：已报过的置灰（一人一门课只记一条），改课时时类型锁死
s.text(40, s.y, '课程类型', 24, SUB, True)
s.y += int(24*1.5) + 14
cx = 40
for nm, on, taken in [('钢琴', 1, 0), ('声乐', 0, 1), ('吉他', 0, 0), ('录音', 0, 0)]:
    cw = s.tw(nm, 26, True) + 60 + (s.tw('已报', 18) + 8 if taken else 0)
    if on:
        s.card(cx, s.y, cw, 64, r=100, sh=PINK, so=6, bw=4, fill=INK)
        fg = WHITE
    elif taken:
        dash_pill(s, cx, s.y, cw, 64, mix(INK, .3, WHITE), 4)
        fg = mix(INK, .3, WHITE)
    else:
        s.card(cx, s.y, cw, 64, r=100, sh=SH_SOFT, so=6, bw=4)
        fg = mix(INK, .7, WHITE)
    s.text(cx+30, s.y+32, nm, 26, fg, True, anchor='lm')
    if taken:
        s.text(cx+cw-30, s.y+34, '已报', 18, fg, anchor='rm')
    cx += cw + 16
s.y += 64 + 18
s.text(40, s.y, '课程类型改不了：要换成别的课，先「删掉这门课」再新增一条。', 21, SUB)
s.y += int(21*1.6) + 22

# .grp 课时
DESC = ['老学员直接填现状：这门课共报几节、一共上了几节。',
        '之后小程序里签到、或取消时勾了扣课时的节数会自动',
        '累加到「已上」']
H1 = 28 + 39 + 8 + int(21*1.6)*len(DESC) + 24 + 162 + 20 + 46 + 28
g1 = s.y
s.card(40, g1, W-80, H1, r=32, sh=mix(INK, .14, PAPER), so=10, bw=4, fill=SKYL)
gy = g1 + 28
s.text(70, gy, '课时', 26, INK, True); gy += 39 + 8
for ln in DESC:
    s.text(70, gy, ln, 21, SUB); gy += int(21*1.6)
gy += 24
sfield(70, gy, '共报（节）', '12', SWID)
sfield(70+SWID+20, gy, '已上 · 共几节（节）', '11', SWID)
gy += 162 + 20
lab, extra = '还剩 1 节', '· 系统内已上 9 节'
lw = s.tw(lab, 22, True) + s.tw(extra, 22, True) + 44 + 6
s.card(70, gy, lw, 46, r=100, sh=YELLOW, so=6, bw=3, fill=WHITE)
s.text(92, gy+23, lab, 22, INK, True, anchor='lm')
s.text(92 + s.tw(lab, 22, True) + 6, gy+23, extra, 22, SUB, True, anchor='lm')
s.y = g1 + H1 + 36

# .grp 报名日期
H2 = 28 + 39 + 20 + 162 + 18 + 44 + 28
g2 = s.y
s.card(40, g2, W-80, H2, r=32, sh=mix(INK, .14, PAPER), so=10, bw=4, fill=SKYL)
gy = g2 + 28
s.text(70, gy, '报名日期', 26, INK, True)
ow = s.tw('选填', 19, True) + 28
s.rect(70 + s.tw('报名日期', 26, True) + 12, gy-2, ow, 34, fill=YELLOW, outline=INK, r=100, wd=3)
s.text(70 + s.tw('报名日期', 26, True) + 12 + ow//2, gy+15, '选填', 19, INK, True, anchor='mm')
gy += 39 + 20
sfield(70, gy, '开始', '2026-03-01', SWID)
sfield(70+SWID+20, gy, '结束', '2026-12-31', SWID)
gy += 162 + 18
cw2 = s.tw('清除日期', 22, True) + 40
s.rect(W-110-cw2, gy, cw2, 44, fill=YELLOW, outline=INK, r=100, wd=3)
s.text(W-110-cw2//2, gy+22, '清除日期', 22, INK, True, anchor='mm')
s.y = g2 + H2 + 36

# .two-btn：删掉这门课（左，红）+ 保存这门课（右，粉）
bw2 = (W-80-20)//2
s.card(40, s.y, bw2, 72, r=100, sh=INK, so=6, bw=6, fill=RED)
s.text(40+bw2//2, s.y+36, '删掉这门课', 26, WHITE, True, anchor='mm')
s.card(40+bw2+20, s.y, bw2, 72, r=100, sh=INK, so=6, bw=6, fill=PINK)
s.text(40+bw2+20+bw2//2, s.y+36, '保存这门课', 26, INK, True, anchor='mm')
s.y += 72 + 60
s.save('25-弹层-报名课程.png', '弹层 · 一门课的报名：课时与周期跟着课程走', trim=False)

print("全部原型图生成完成")
