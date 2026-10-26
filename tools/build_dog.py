# -*- coding: utf-8 -*-
"""生成约克夏「乌龙茶」的线条插画（黑线 / 白线两版）。

设计约束（沿用小程序现有插画语言）：
- 纯线条、无填充色块、无渐变、无阴影
- 200x210 输出，4 倍超采样后缩小，保证 200rpx 下依然清晰
- 线宽 7/200 ≈ 3.5%，和现有 dog.png 一致
用法：python3 tools/build_dog.py
"""
import os
from PIL import Image, ImageDraw

REF_W, REF_H = 200, 210
S = 4                       # 超采样倍数
W, H = REF_W * S, REF_H * S
OUT = os.path.join(os.path.dirname(__file__), '..', 'images')


def catmull(pts, samples=18):
    """Catmull-Rom 插值，把控制点变成平滑曲线"""
    if len(pts) < 3:
        return pts
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(len(p) - 3):
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        for j in range(samples):
            t = j / samples
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
                       (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                       (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
                       (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                       (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(pts[-1])
    return out


def stroke(d, pts, width=7.0, color=(26, 26, 26), closed=False, samples=18):
    """圆头圆角折线"""
    q = catmull(pts, samples)
    if closed:
        q = q + [q[0], q[1]]
    q = [(x * S, y * S) for x, y in q]
    w = max(1, int(round(width * S)))
    d.line(q, fill=color, width=w, joint='curve')
    r = w / 2.0
    for x, y in (q[0], q[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)


def dot(d, x, y, r, color=(26, 26, 26)):
    d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=color)


def wavy(p0, p1, amp=1.6, n=6, ph=0.0):
    """两点之间加轻微波浪，用来画毛边"""
    import math
    x0, y0 = p0; x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    pts = []
    for i in range(n + 1):
        t = i / n
        s = math.sin(t * math.pi * 2.2 + ph) * amp * (1 - abs(t - .5))
        pts.append((x0 + dx * t + nx * s, y0 + dy * t + ny * s))
    return pts


def draw_dog(color=(26, 26, 26)):
    """头大身小、线条尽量少：耳朵 / 圆脸 / 点眼 / 小鼻子 / 羽状尾"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    LW = 7.4
    HEAD = (48, 32, 152, 136)                  # 大头：104 × 104
    hx0, hy0, hx1, hy1 = [v * S for v in HEAD]

    # ── 耳朵（两根折线，尖朝上外）──
    stroke(d, [(70, 48), (52, 6), (98, 34)], LW, color)
    stroke(d, [(130, 48), (148, 6), (102, 34)], LW, color)

    # ── 身体（小）──
    stroke(d, [(78, 130), (68, 156), (66, 186), (72, 197)], LW, color)
    stroke(d, [(122, 130), (132, 156), (134, 186), (128, 197)], LW, color)
    stroke(d, [(72, 197), (100, 200), (128, 197)], LW, color)

    # ── 掏空头部内圈（耳根藏到脑后）──
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    inset = LW * S / 2 + 1
    md.ellipse([hx0 + inset, hy0 + inset, hx1 - inset, hy1 - inset], fill=255)
    im.putalpha(Image.composite(Image.new('L', (W, H), 0), im.getchannel('A'), mask))

    # ── 头 ──
    d.ellipse([hx0, hy0, hx1, hy1], outline=color, width=int(LW * S))

    # ── 五官 ──
    dot(d, 84, 88, 7.2, color)
    dot(d, 116, 88, 7.2, color)
    dot(d, 100, 104, 4.8, color)                                  # 鼻子
    stroke(d, [(100, 109), (95, 114), (100, 112), (105, 114), (100, 109)],
           LW * .45, color)                                       # 嘴

    # ── 尾巴（贴在右臀，羽状）──
    stroke(d, [(133, 186), (150, 178), (161, 158), (159, 138)], LW, color)
    stroke(d, [(159, 138), (150, 146), (145, 168), (143, 184)], LW, color)

    # ── 两只小爪子 ──
    stroke(d, [(84, 198), (88, 203), (94, 198)], LW * .55, color)
    stroke(d, [(106, 198), (112, 203), (116, 198)], LW * .55, color)
    return im


def main():
    black = draw_dog((26, 26, 26))
    white = draw_dog((255, 255, 255))
    for im, name in ((black, 'dog.png'), (white, 'dog-w.png')):
        small = im.resize((REF_W, REF_H), Image.LANCZOS)
        small.save(os.path.join(OUT, name), optimize=True)
        print('  ok', name, small.size)
    black.resize((REF_W, REF_H), Image.LANCZOS).save('/tmp/dog_black.png')
    print('done')


if __name__ == '__main__':
    main()
