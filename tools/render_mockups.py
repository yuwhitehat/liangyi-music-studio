# -*- coding: utf-8 -*-
"""按真实设计稿渲染各屏原型图（PRD 用）。
1 rpx = 1 px（画布 750 宽 = 小程序 750rpx），2x 抗锯齿后缩到 50%。
组件几何与配色一律对齐 app.wxss「贴纸手账风」：方格纸底 + 白卡黑描边 + 错位硬彩影。
插画直接解码 app.wxss 里内联的 base64，保证原型图与线上像素同源。
"""
from PIL import Image, ImageDraw, ImageFont
import base64, io, os, re

W, H = 750, 1560  # 1 rpx = 1 px
S = 2
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'docs', 'mockups')

# ── 设计令牌（与 app.wxss 顶部一致）──
PINK, YELLOW, BLUE = '#FF5FA2', '#FFD23F', '#4D8DFF'
INK = '#111111'
WHITE = '#FFFFFF'
PAPER = '#F6F4EE'
SKY, SKYL = '#FFF3C4', '#FFF8DC'
RED = '#C0392B'
GRID = None          # 方格纸线色，mix 定义后回填
SUB = None           # 次级文字 rgba(17,17,17,.55)
SH = {'blue': BLUE, 'pink': PINK, 'yellow': YELLOW, 'ink': INK}

def mix(hexcol, alpha, bg='#FFFFFF'):
    """rgba 半透明叠加到背景上，转成实色（Pillow RGB 画布不支持 alpha 字符串）"""
    def h(c):
        c = c.lstrip('#')
        if len(c) == 3: c = ''.join(ch*2 for ch in c)   # 兼容 #000 缩写
        return tuple(int(c[i:i+2],16) for i in (0,2,4))
    a, b = h(hexcol), h(bg)
    return '#%02X%02X%02X' % tuple(round(a[i]*alpha + b[i]*(1-alpha)) for i in range(3))

GRID = mix('#2B3FA8', .11, PAPER)
SUB = mix(INK, .55, WHITE)
SUB2 = mix(INK, .45, WHITE)
SUB3 = mix(INK, .30, WHITE)
SH_SOFT = mix(INK, .14, PAPER)     # 小控件的浅硬影
TAGC = {'t-cobalt': (PINK, INK, INK), 't-sky': (SKY, INK, INK),
        't-terra': (BLUE, WHITE, INK), 't-over': (YELLOW, INK, INK),
        't-mute': (WHITE, mix(INK, .5, WHITE), mix(INK, .25, WHITE))}

FP = '/System/Library/Fonts/Hiragino Sans GB.ttc'
_fc = {}
def F(sz, bold=False):
    k = (sz, bold)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(FP, sz*S, index=1 if bold else 0)
    return _fc[k]

_f1 = {}
def F1(sz, bold=False):
    """1x 字号（直接画在成品图上，不做超采样）"""
    k = (sz, bold)
    if k not in _f1:
        _f1[k] = ImageFont.truetype(FP, sz, index=1 if bold else 0)
    return _f1[k]

_ill_cache = {}
def ill_img(key):
    """解码 app.wxss 内联 base64；key 可为 'ill-dog' / 'dog' / 'dog.png' / 'ic-piano'"""
    if key not in _ill_cache:
        if not _ill_cache.get('__loaded__'):
            src = open(os.path.join(ROOT, 'app.wxss'), encoding='utf-8').read()
            for m in re.finditer(r'\.(ill-[\w-]+|ic-[\w-]+)\s*\{\s*background-image:\s*url\("data:image/png;base64,([^"]+)"\)', src):
                _ill_cache[m.group(1)] = Image.open(io.BytesIO(base64.b64decode(m.group(2)))).convert('RGBA')
            _ill_cache['__loaded__'] = True
        stem = key[:-4] if key.endswith('.png') else key
        for cand in (stem, 'ill-'+stem, 'ic-'+stem):
            if cand in _ill_cache:
                _ill_cache[key] = _ill_cache[cand]
                break
        else:
            raise KeyError('app.wxss 里没有插画：%s' % key)
    return _ill_cache[key]

class Screen:
    def __init__(self, h=None, paper=True):
        self.h = h or H
        self.im = Image.new('RGB', (W*S, self.h*S), PAPER)
        self.d = ImageDraw.Draw(self.im)
        if paper: self._grid()
        self.ref = self.im.copy()   # 空白方格纸底，供 save() 裁切时判断「这一行有没有内容」
        self.y = 0

    def _grid(self):
        x = 0
        while x <= W:
            self.d.line([(x*S, 0), (x*S, self.h*S)], fill=GRID, width=2*S); x += 44
        y = 0
        while y <= self.h:
            self.d.line([(0, y*S), (W*S, y*S)], fill=GRID, width=2*S); y += 44

    # ── 基础 ──
    def rect(self, x, y, w, h, fill=None, outline=None, r=0, wd=2):
        self.d.rounded_rectangle([x*S, y*S, (x+w)*S, (y+h)*S], radius=r*S,
                                 fill=fill, outline=outline, width=wd*S)
    def card(self, x, y, w, h, r=36, sh=BLUE, so=12, bw=6, fill=WHITE):
        """白卡 + 黑描边 + 错位硬彩影（app.wxss .blk / .bk / .item 的共同母题）"""
        if sh:
            self.d.rounded_rectangle([(x+so)*S, (y+so)*S, (x+w+so)*S, (y+h+so)*S],
                                     radius=r*S, fill=sh)
        self.d.rounded_rectangle([x*S, y*S, (x+w)*S, (y+h)*S], radius=r*S,
                                 fill=fill, outline=INK if bw else None, width=bw*S)
    def text(self, x, y, s, sz=28, color=INK, bold=False, anchor=None, maxw=None):
        f = F(sz, bold)
        if maxw:
            while f.getbbox(s)[2]-f.getbbox(s)[0] > maxw*S and len(s) > 1:
                s = s[:-1]
        self.d.text((x*S, y*S), s, font=f, fill=color, anchor=anchor)
    def tw(self, s, sz, bold=False):
        return F(sz, bold).getbbox(s)[2]//S
    def ill(self, key, x, y, w, h=None, alpha=1.0):
        """贴一张与线上同源的插画（按 1rpx=1px 定位，2x 超采样）"""
        im = ill_img(key).copy()
        hh = int(round(h or w*im.height/im.width))
        im = im.resize((int(w*S), int(hh*S)), Image.LANCZOS)
        if alpha < 1.0:
            im.putalpha(im.split()[3].point(lambda v: int(v*alpha)))
        self.im.paste(im, (int(x*S), int(y*S)), im)
        return hh

    def chevron(self, x, y, size=34, color=SUB3):
        d, u = self.d, S
        d.line([(x*u,(y-size*.42)*u),((x+size*.62)*u,y*u),(x*u,(y+size*.42)*u)],
               fill=color, width=int(size*.17*u), joint='curve')
    def chevron_left(self, x, y, size=34, color=SUB3):
        d, u = self.d, S
        d.line([((x+size*.62)*u,(y-size*.42)*u),(x*u,y*u),((x+size*.62)*u,(y+size*.42)*u)],
               fill=color, width=int(size*.17*u), joint='curve')
    def xmark(self, x, y, size=34, color=SUB, circle=True):
        """弹层关闭钮：白圆 + 黑描边 + 浅硬影，中间手绘 ✕（Hiragino 缺字形）"""
        d, u, r = self.d, S, size*0.30
        if circle:
            self.card(x-size/2, y-size/2, size, size, r=size/2, sh=INK, so=4, bw=4)
        w = int(size*0.14*u)
        for (a1,b1),(a2,b2) in (((-r,-r),(r,r)), ((-r,r),(r,-r))):
            d.line([((x+a1)*u,(y+b1)*u),((x+a2)*u,(y+b2)*u)], fill=color, width=w)
    def checkmark(self, x, y, size=34, color=WHITE, circle=None):
        d, u = self.d, S
        if circle:
            d.ellipse([(x-size*.5)*u,(y-size*.5)*u,(x+size*.5)*u,(y+size*.5)*u], fill=circle)
        pts = [((x-size*.22)*u,(y+size*.02)*u), ((x-size*.04)*u,(y+size*.19)*u), ((x+size*.25)*u,(y-size*.16)*u)]
        d.line(pts, fill=color, width=int(size*.15*u), joint='curve')
        for r in pts:
            rr=size*.075
            d.ellipse([r[0]-rr*u,r[1]-rr*u,r[0]+rr*u,r[1]+rr*u], fill=color)
    def switch(self, x, y, on=True, w=100, h=56):
        """小程序 <switch color="#111111">：黑轨道 + 白圆钮"""
        track = INK if on else mix(INK, .18, WHITE)
        self.rect(x, y, w, h, fill=track, r=h/2)
        kx = x+w-h if on else x
        self.d.ellipse([(kx+4)*S, (y+4)*S, (kx+h-4)*S, (y+h-4)*S], fill=WHITE)

    # ── 组件 ──
    def head(self, title, sub=None, hd='blue', back=False, ava=None, dog=True):
        """头部贴纸卡：.top（工作台，本身是「我的」入口）与 .nav（内页带返回钮）"""
        x, w = 40, W-80
        y = 120
        h1 = 56 if back else 64
        th = 32
        if back: th += 76 + 40
        th += int(h1*1.25)
        if sub: th += (10 if back else 14) + int(26*1.5)
        th += 108 if back else 36
        self.card(x, y, w, th, r=44, sh=SH[hd], so=16)
        cy = y + 32
        if back:
            self.card(x+40, cy, 76, 76, r=38, sh=INK, so=5, bw=5)
            self.chevron_left(x+40+50, cy+38, 34, INK)
            cy += 76 + 40
        self.text(x+40, cy, title, h1, INK, True)
        if sub:
            self.text(x+40, cy + int(h1*1.25) + (10 if back else 14), sub, 26, SUB)
        if dog:
            self.ill('dog-w', x+w-18-190, y+th-98, 190, 98, alpha=.45)
        if ava:
            ax, ay = x+w-40-96, y+th-48-96
            self.card(ax, ay, 96, 96, r=48, sh=PINK, so=6, bw=5)
            self.text(ax+48, ay+48, ava, 44, INK, True, anchor='mm')
        self.y = y + th + 28
        return th

    def tiles(self, items):
        """功能入口：.tiles 两列网格；items = [(标题, 影子色, 是否横铺)]"""
        self.y += 44
        gap, th = 32, 268
        tw = (W-80-gap)//2
        r, c = 0, 0
        for t, sk, sp in items:
            y = self.y + r*(th+gap)
            if sp:
                cw, cx = tw*2+gap, 40
                r += 1
            else:
                cw, cx = tw, 40 + c*(tw+gap)
                c += 1
                if c == 2: r, c = r+1, 0
            self.card(cx, y, cw, th, r=40, sh=SH[sk], so=16)
            blk = 53 + 26 + 82
            ty = y + (th-blk)//2
            self.text(cx+cw//2, ty+26, t, 44, INK, True, anchor='mm')
            self.ill('arrow-b', cx+cw//2-48, ty+53+26, 96)
        self.y += r*(th+gap) + 12

    def sec(self, t, n=None):
        self.y += 56
        self.text(40, self.y, t, 34, INK, True)
        if n is not None:
            self.text(40 + self.tw(t, 34, True) + 16, self.y+6, str(n), 24, PINK, True)
        self.y += int(34*1.5) + 24

    def chips(self, labels, active=0, x0=40):
        """筛选胶囊：.chip / .chip.on"""
        self.y += 8
        x, h = x0, 70
        for i, l in enumerate(labels):
            w = self.tw(l, 27, True) + 80
            if i == active:
                self.card(x, self.y, w, h, r=100, sh=PINK, so=6, bw=4, fill=INK)
                self.text(x+w//2, self.y+h//2, l, 27, WHITE, True, anchor='mm')
            else:
                self.card(x, self.y, w, h, r=100, sh=SH_SOFT, so=6, bw=4)
                self.text(x+w//2, self.y+h//2, l, 27, mix(INK, .65, WHITE), True, anchor='mm')
            x += w + 18
        self.y += h + 36

    def tag(self, x, y, s, kind='t-sky', h=43):
        """状态胶囊：.tag + .t-*；返回占用宽度"""
        bg, fg, bd = TAGC[kind]
        w = self.tw(s, 22, True) + 44
        self.rect(x, y, w, h, fill=bg, outline=bd, r=100, wd=4)
        self.text(x+w//2, y+h//2, s, 22, fg, True, anchor='mm')
        return w

    def bk_left(self, x, y, h, bg, fg, d1, d2):
        """课卡左侧日期条：.bk-l（内圆角 30 = 36 外 − 6 描边）"""
        self.d.rounded_rectangle([x*S, y*S, (x+118)*S, (y+h)*S], radius=30*S, fill=bg)
        self.d.rectangle([(x+60)*S, y*S, (x+118)*S, (y+h)*S], fill=bg)
        self.d.line([((x+118)*S, y*S), ((x+118)*S, (y+h)*S)], fill=INK, width=4*S)
        self.text(x+59, y+h//2-26, d1, 48, fg, True, anchor='mm')
        self.text(x+59, y+h//2+30, d2, 22, mix(fg, .6, bg) if fg != WHITE else mix(WHITE, .6, bg), True, anchor='mm')

    def field(self, label, value=None, ph=None, x0=40):
        self.text(x0, self.y, label, 24, SUB, True)
        self.y += int(24*1.5) + 14
        self.card(x0, self.y, W-x0*2, 112, r=28, sh=mix(INK, .12, PAPER), so=6, bw=5)
        self.text(x0+32, self.y+56, value or ph or '', 32,
                  INK if value else SUB3, bool(value), anchor='lm')
        self.y += 112 + 36

    def btn(self, label, kind='cobalt', x0=40, h=108, sz=32):
        bg = {'cobalt': PINK, 'white': WHITE, 'verm': YELLOW}[kind]
        self.card(x0, self.y, W-x0*2, h, r=100, sh=INK, so=10, bw=6, fill=bg)
        self.text(W//2, self.y+h//2, label, sz, INK, True, anchor='mm')
        self.y += h + 28

    def btn_sm(self, label, x=None, y=None, w=190, kind='cobalt'):
        bg = {'cobalt': PINK, 'white': WHITE, 'verm': YELLOW}[kind]
        xx = x0 = x if x is not None else 40
        yy = y if y is not None else self.y
        self.card(xx, yy, w, 72, r=100, sh=INK, so=6, bw=6, fill=bg)
        self.text(xx+w//2, yy+36, label, 26, INK, True, anchor='mm')
        if x is None: self.y += 72 + 28

    def note(self, s, x0=40, color=SUB2, sz=23):
        self.text(x0, self.y, s, sz, color); self.y += sz+16
    def gap(self, n=28): self.y += n

    def empty(self, t):
        self.y += 70
        self.card(W//2-60, self.y, 120, 120, r=60, sh=None, bw=5, fill=SKY)
        self.y += 120 + 24
        self.text(W//2, self.y, t, 26, mix(INK, .5, WHITE), False, anchor='mm')
        self.y += 26 + 70

    def sheet(self, title, sy):
        """底部弹层：.mask + .sheet（白底 + 顶部黑描边 + 上圆角）"""
        self.rect(0, sy, W, self.h-sy, fill=mix(INK, .45, PAPER))
        self.d.rounded_rectangle([0, (sy+40)*S, W*S, (self.h+60)*S], radius=40*S, fill=WHITE)
        self.d.rectangle([0, (sy+40+40)*S, W*S, (self.h+60)*S], fill=WHITE)
        self.d.line([(0, (sy+40)*S), (W*S, (sy+40)*S)], fill=INK, width=6*S)
        iy = sy + 40 + 44
        self.text(40, iy, title, 40, INK, True)
        self.xmark(W-72, iy+20, 64)
        return iy + 40 + 32

    def _last_row(self, img):
        """最后一行有内容的 y（2x 坐标）：与空白方格纸底逐像素比对，
        否则方格线本身会被当成内容，裁切失效"""
        px, rp = img.load(), self.ref.load()
        w, h = img.size
        def empty(y):
            step = max(1, w//60)
            for x in range(2, w-1, step):
                c, r = px[x, y], rp[x, y]
                if abs(c[0]-r[0])+abs(c[1]-r[1])+abs(c[2]-r[2]) > 12: return False
            return True
        last = h-1
        while last > 0 and empty(last): last -= 1
        return last

    def save(self, name, caption=None, trim=True):
        im2 = self.im
        last = self._last_row(im2)
        if trim and last >= im2.size[1]-6:
            print("  !! 内容触底，请给该 Screen 传更大的 h：%s" % name)
        if trim:
            im2 = im2.crop((0, 0, im2.size[0], min(im2.size[1], last+1+44*S)))
        img = im2.resize((im2.size[0]//S, im2.size[1]//S), Image.LANCZOS)
        if caption:
            pad = 104
            out = Image.new('RGB', (W, img.size[1]+pad), WHITE)
            out.paste(img, (0, pad))
            d = ImageDraw.Draw(out)
            m = re.match(r'^(\d{2})-', name)
            cap = re.sub(r'^[①-⑭\s]+', '', caption).strip()
            cx, cy = 58, pad//2+2
            if m and int(m.group(1)) < 20:
                d.ellipse([cx-19, cy-19, cx+19, cy+19], fill=INK)
                d.text((cx, cy), str(int(m.group(1))), font=F1(24,True), fill=WHITE, anchor='mm')
            else:
                d.rounded_rectangle([cx-16, cy-16, cx+16, cy+16], radius=6, fill=YELLOW,
                                    outline=INK, width=3)
            sz, avail = 30, W-108-40
            while sz > 18 and F1(sz, True).getbbox(cap)[2] > avail: sz -= 1
            d.text((108, cy), cap, font=F1(sz, True), fill=INK, anchor='lm')
            out.save(os.path.join(OUT, name))
        else:
            img.save(os.path.join(OUT, name))
        print("  ok %-26s %dx%d" % (name, img.size[0], img.size[1]))
