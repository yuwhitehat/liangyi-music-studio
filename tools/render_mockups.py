# -*- coding: utf-8 -*-
"""按真实设计稿渲染各屏原型图（PRD 用）。
1 rpx = 1 px（画布 750 宽 = 小程序 750rpx），2x 抗锯齿后缩到 50%。
"""
from PIL import Image, ImageDraw, ImageFont
import os, re

W, H = 750, 1560  # 1 rpx = 1 px
S = 2
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'mockups')
IMG = os.path.join(os.path.dirname(__file__), '..', 'images')

COB, COBD = '#2B3FA8', '#1E2E7A'
WHITE, PAPER, LINE = '#FFFFFF', '#F6F8FC', '#E6ECF6'
SKY, SKYL = '#D9EAF5', '#EDF6FB'
TERRA, NAVY, RED = '#E8763A', '#16244A', '#C0392B'
INK = '#1A1A1A'

def mix(hexcol, alpha, bg='#FFFFFF'):
    """rgba 半透明叠加到背景上，转成实色（Pillow RGB 画布不支持 alpha 字符串）"""
    def h(c):
        c = c.lstrip('#')
        if len(c) == 3: c = ''.join(ch*2 for ch in c)   # 兼容 #000 缩写
        return tuple(int(c[i:i+2],16) for i in (0,2,4))
    a, b = h(hexcol), h(bg)
    return '#%02X%02X%02X' % tuple(round(a[i]*alpha + b[i]*(1-alpha)) for i in range(3))

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
def ill_img(fname):
    """直接复用小程序里的真实插画（images/*.png），保证原型图与线上像素一致"""
    if fname not in _ill_cache:
        im = Image.open(os.path.join(IMG, fname))
        if im.mode != 'RGBA':
            im = im.convert('RGBA')
        _ill_cache[fname] = im
    return _ill_cache[fname]

class Screen:
    def __init__(self, bg=PAPER, h=None):
        self.bg = bg
        self.h = h or H
        self.im = Image.new('RGB', (W*S, self.h*S), bg)
        self.d = ImageDraw.Draw(self.im)
        self.y = 0
    # ── 基础 ──
    def rect(self, x, y, w, h, fill=None, outline=None, r=0, wd=2):
        self.d.rounded_rectangle([x*S,y*S,(x+w)*S,(y+h)*S], radius=r*S,
                                 fill=fill, outline=outline, width=wd*S)
    def text(self, x, y, s, sz=28, color=NAVY, bold=False, anchor=None, maxw=None):
        f = F(sz, bold)
        if maxw:
            while f.getbbox(s)[2]-f.getbbox(s)[0] > maxw*S and len(s) > 1:
                s = s[:-1]
        self.d.text((x*S, y*S), s, font=f, fill=color, anchor=anchor)
    def ill(self, fname, x, y, w, h=None, alpha=1.0):
        """贴一张真实素材（按 1rpx=1px 定位，2x 超采样；alpha 对应 CSS opacity）"""
        im = ill_img(fname).copy()
        hh = int(round(h or w*im.height/im.width))
        im = im.resize((int(w*S), int(hh*S)), Image.LANCZOS)
        if alpha < 1.0:
            im.putalpha(im.split()[3].point(lambda v: int(v*alpha)))
        self.im.paste(im, (int(x*S), int(y*S)), im)
        return hh

    def chevron(self, x, y, size=34, color='#9AA1AE'):
        """右侧 > 指示符（Hiragino 的 › 字形缺失，改手绘）"""
        d, u = self.d, S
        d.line([(x*u,(y-size*.42)*u),((x+size*.62)*u,y*u),(x*u,(y+size*.42)*u)],
               fill=color, width=int(size*.17*u), joint='curve')

    def xmark(self, x, y, size=34, color='#9AA1AE'):
        """手绘关闭符号（Hiragino 缺 ✕ 字形）；x,y 为中心"""
        d, u, r = self.d, S, size*0.34
        w = int(size*0.15*u)
        for (a1,b1),(a2,b2) in (((-r,-r),(r,r)), ((-r,r),(r,-r))):
            d.line([((x+a1)*u,(y+b1)*u),((x+a2)*u,(y+b2)*u)], fill=color, width=w)
            for px,py in ((a1,b1),(a2,b2)):
                rr=size*0.075
                d.ellipse([(x+px-rr)*u,(y+py-rr)*u,(x+px+rr)*u,(y+py+rr)*u], fill=color)

    def checkmark(self, x, y, size=34, color='#FFFFFF', circle=None):
        """手绘对勾（Hiragino 缺 ✓ 字形）；x,y 为中心"""
        d, u = self.d, S
        if circle:
            d.ellipse([(x-size*.5)*u,(y-size*.5)*u,(x+size*.5)*u,(y+size*.5)*u], fill=circle)
        pts = [((x-size*.22)*u,(y+size*.02)*u), ((x-size*.04)*u,(y+size*.19)*u), ((x+size*.25)*u,(y-size*.16)*u)]
        d.line(pts, fill=color, width=int(size*.15*u), joint='curve')
        for r in pts:
            rr=size*.075
            d.ellipse([r[0]-rr*u,r[1]-rr*u,r[0]+rr*u,r[1]+rr*u], fill=color)

    def arrow(self, x, y, size=64, color='#FFFFFF'):
        """卡通线条箭头（简化：弧杆 + 两撇）"""
        d = self.d
        pts = [((x+t*size/100)*S, (y+size*0.62 - size*0.22*(t/100)**1.4)*S) for t in range(0,79,6)]
        d.line(pts, fill=color, width=int(size*0.13*S), joint='curve')
        for r in (pts[0], pts[-1]): d.ellipse([r[0]-size*.065*S, r[1]-size*.065*S, r[0]+size*.065*S, r[1]+size*.065*S], fill=color)
        d.line([pts[-1], (pts[-1][0]-size*.30*S, pts[-1][1]-size*.30*S)], fill=color, width=int(size*0.13*S))
        d.line([pts[-1], (pts[-1][0]-size*.34*S, pts[-1][1]+size*.20*S)], fill=color, width=int(size*0.13*S))
    # ── 组件 ──
    def band(self, title, sub=None, color=COB, h=None, txt=WHITE, pad_top=150):
        h = h or (pad_top + (190 if sub else 120) + 60)
        self.rect(0, 0, W, h, fill=color)
        self.text(40, pad_top, title, 68, txt, True)
        if sub: self.text(40, pad_top+96, sub, 26, txt, False)
        self.y = h
        return h
    def dog(self, x, y, w=200, color=INK):
        """约克夏线条示意（简化轮廓）"""
        d=self.d; s=S
        d.ellipse([(x+w*.52)*s,(y+w*.10)*s,(x+w*.98)*s,(y+w*.52)*s], outline=color, width=int(w*.055*s))
        d.line([(x+w*.60)*s,(y+w*.20)*s,(x+w*.55)*s,(y+w*.02)*s,(x+w*.76)*s,(y+w*.13)*s], fill=color, width=int(w*.05*s), joint='curve')
        d.line([(x+w*.90)*s,(y+w*.14)*s,(x+w*.99)*s,(y+w*.00)*s,(x+w+0)*s,(y+w*.24)*s], fill=color, width=int(w*.05*s), joint='curve')
        d.ellipse([(x+w*.06)*s,(y+w*.34)*s,(x+w*.72)*s,(y+w*.78)*s], outline=color, width=int(w*.055*s))
        d.line([(x+w*.16)*s,(y+w*.66)*s,(x+w*.16)*s,(y+w*.90)*s], fill=color, width=int(w*.05*s))
        d.line([(x+w*.38)*s,(y+w*.66)*s,(x+w*.38)*s,(y+w*.90)*s], fill=color, width=int(w*.05*s))
        d.ellipse([(x+w*.02)*s,(y+w*.50)*s,(x+w*.10)*s,(y+w*.58)*s], fill=color)
    def tiles(self, items, cols=2, gap=32, x0=40, hgt=268, label='tile'):
        """items: [(标题, 底色, 文字色, 箭头色)] —— 与 app.wxss .tile 同规格"""
        self.y += 44
        tw = (W - x0*2 - gap*(cols-1)) // cols
        for i, (t, bg, fg, ac) in enumerate(items):
            r, c = divmod(i, cols)
            x = x0 + c*(tw+gap); y = self.y + r*(hgt+40)
            self.rect(x, y, tw, hgt, fill=bg, r=40)
            hl = mix('#FFFFFF', .14, bg)
            self.rect(x, y, tw, 84, fill=hl, r=40)                    # 顶部高光
            self.rect(x+1, y+42, tw-2, 44, fill=bg)                   # 削平高光下沿
            sh = mix(COBD, .18, PAPER) if bg in (SKY, SKYL) else mix('#000000', .22, PAPER)
            self.rect(x, y+hgt-4, tw, 16, fill=sh, r=8)               # 硬阴影
            self.text(x+tw//2, y+hgt//2-54, t, 44, fg, True, anchor='mm')
            self.ill('arrow-w.png' if ac == WHITE else 'arrow-b.png',
                     x+tw//2-48, y+hgt//2-28, 96)
        self.y += ((len(items)-1)//cols+1)*(hgt+40)

    def rows(self, items, x0=40):
        """items: [(左块内容, 主标题, 副标题, 标签, 标签底色, 标签文字色)]"""
        for a,b,c,tag,tbg,tfg in items:
            self.rect(x0, self.y, W-x0*2, 148, fill=WHITE, outline=LINE, r=28, wd=2)
            self.rect(x0, self.y, 118, 148, fill=a[0], r=28); self.rect(x0+58, self.y, 60, 148, fill=a[0])
            self.text(x0+59, self.y+34, a[1], 40, a[2], True, anchor='mm')
            self.text(x0+59, self.y+96, a[3], 22, a[2], False, anchor='mm')
            self.text(x0+150, self.y+26, b, 32, NAVY, True)
            self.text(x0+150, self.y+80, c, 24, mix(NAVY,.55,WHITE))
            if tag:
                tw=F(22,True).getbbox(tag)[2]//S+30
                self.rect(W-x0-tw-24, self.y+44, tw, 44, fill=tbg, r=100)
                self.text(W-x0-tw-24+tw//2, self.y+66, tag, 22, tfg, True, anchor='mm')
            self.y += 148+20
    def chips(self, labels, active=0, x0=40, y_pad=14):
        x = x0; self.y += y_pad
        for i,l in enumerate(labels):
            w = F(26).getbbox(l)[2]//S + 60
            self.rect(x, self.y, w, 62, fill=COB if i==active else WHITE,
                      outline=None if i==active else LINE, r=100, wd=2)
            self.text(x+w//2, self.y+31, l, 26, WHITE if i==active else mix(NAVY,.6,WHITE), False, anchor='mm')
            x += w+16
            if x > W-100: break
        self.y += 62+y_pad
    def field(self, label, value=None, ph=None, x0=40):
        self.text(x0, self.y, label, 24, mix(NAVY,.50,WHITE))
        self.y += 40
        self.rect(x0, self.y, W-x0*2, 112, fill=WHITE, outline=LINE, r=28, wd=2)
        self.text(x0+32, self.y+56, value or ph or '', 30, NAVY if value else mix(NAVY,.35,WHITE), False, anchor='lm')
        self.y += 112+32
    def btn(self, label, color=COB, fg=WHITE, x0=40, h=108):
        self.rect(x0, self.y, W-x0*2, h, fill=color, r=100)
        self.rect(x0, self.y+h-4, W-x0*2, 14, fill=mix('#000000',.18,PAPER), r=7)
        self.text((W)//2, self.y+h//2, label, 32, fg, True, anchor='mm')
        self.y += h+28
    def note(self, s, x0=40, color=mix(NAVY,.45,WHITE), sz=23):
        self.text(x0, self.y, s, sz, color); self.y += sz+16
    def gap(self, n=28): self.y += n
    def _last_row(self, img):
        """最后一行有内容的 y（2x 坐标）"""
        px = img.load(); w, h = img.size; c0 = px[3, h-3]
        def empty(y):
            step = max(1, w//60)
            for x in range(2, w-1, step):
                c = px[x, y]
                if abs(c[0]-c0[0])+abs(c[1]-c0[1])+abs(c[2]-c0[2]) > 12: return False
            return True
        last = h-1
        while last > 0 and empty(last): last -= 1
        return last

    def save(self, name, caption=None, trim=True):
        im2 = self.im
        last = self._last_row(im2)
        if last >= im2.size[1]-6:
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
            cap = re.sub(r'^[\u2460-\u246d\s]+', '', caption).strip()
            cx, cy = 58, pad//2+2
            if m and int(m.group(1)) < 20:
                d.ellipse([cx-19, cy-19, cx+19, cy+19], fill=COB)
                d.text((cx, cy), str(int(m.group(1))), font=F1(24,True), fill=WHITE, anchor='mm')
            else:
                d.rounded_rectangle([cx-16, cy-16, cx+16, cy+16], radius=6, fill=TERRA)
            sz, avail = 30, W-108-40
            while sz > 18 and F1(sz, True).getbbox(cap)[2] > avail: sz -= 1
            d.text((108, cy), cap, font=F1(sz, True), fill=NAVY, anchor='lm')
            out.save(os.path.join(OUT, name))
        else:
            img.save(os.path.join(OUT, name))
        print("  ok %-26s %dx%d" % (name, img.size[0], img.size[1]))
