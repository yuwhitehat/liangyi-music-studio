# -*- coding: utf-8 -*-
"""从手绘稿提取「只有小狗」的透明线条 PNG。

- 纸色当作透明：按与纸色的色差生成 alpha，保留笔触的毛边与浓淡
- 绿色（草地）与蓝色（地面线）按色相剔除
- 输出黑色 / 白色两版，等比放进 200×210
用法：python3 tools/extract_sketch.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

OUT = os.path.join(os.path.dirname(__file__), '..', 'images')
SRC = '/Users/mac/Desktop/照片'
REF_W, REF_H = 200, 210
PAD = 6


def extract(path, crop, erase_boxes=(), drop_colors=True, tongue=None, solid=True, keep_ground=None):
    im = Image.open(path).convert('RGB').crop(crop)
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape

    # 1) 纸色 = 四边中位数
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    paper = np.median(edge, axis=0)
    diff = np.linalg.norm(a - paper, axis=2)

    # 2) 色差 → alpha
    if solid:
        # 二值墨迹：实心黑线，边缘的抗锯齿交给缩小插值完成
        alpha = np.where(diff > 15.0, 255.0, 0.0)
    else:
        alpha = np.clip((diff - 10.0) * 255.0 / 62.0, 0, 255)

    if drop_colors:
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        green = (g > b + 22) & (g > r - 12)          # 草地（含偏橄榄的绿）
        blue = (b > r + 10) & (b > g + 4)            # 地面线
        # 膨胀 2px，把描边边缘的抗锯齿灰边一起带走，否则白底上会留一道灰影
        def grow(m, k=5):
            return np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(k))) > 0
        drop = grow(green) | grow(blue)
        if keep_ground:                                  # 保留狗脚下那段地面线（当作"坐在地上"的底）
            gx0, gx1 = keep_ground
            xx0, xx1 = gx0 - crop[0], gx1 - crop[0]
            keep = np.zeros_like(drop)
            keep[:, max(0, xx0):max(0, xx1)] = True
            drop = drop & ~keep
        alpha[drop] = 0

    yy, xx = np.mgrid[0:h, 0:w]
    for (x0, y0, x1, y1) in erase_boxes:
        alpha[(xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)] = 0

    if tongue:                                        # 舌头：实心粉块转黑会糊成一团
        x0, y0, x1, y1 = tongue
        m = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
        alpha[m] = 0

    # 4) 清掉孤立的小墨点（JPEG 噪点、装饰残留）；五官都比这个阈值大
    alpha = alpha.astype(np.uint8)
    binm = alpha > 128
    lab, n = ndimage.label(binm)
    if n > 1:
        sizes = ndimage.sum(binm, lab, range(1, n + 1))
        main = int(np.argmax(sizes)) + 1
        dist = ndimage.distance_transform_edt(lab != main)
        for i in range(1, n + 1):
            if i == main:
                continue
            m = lab == i
            if sizes[i - 1] < 60 and dist[m].min() > 10:
                alpha[m] = 0

    # 3) 等比缩放进 200×210
    k = min((REF_W - PAD * 2) / w, (REF_H - PAD * 2) / h)
    tw, th = max(1, round(w * k)), max(1, round(h * k))
    return alpha, (tw, th)


def save_pair(alpha, size, tag, tight=False):
    tw, th = size
    out = []
    for color, name in (((26, 26, 26), 'dog.png' if tag == 'full' else 'dog-w.png'),
                        ((255, 255, 255), 'dog-w.png' if tag == 'full' else 'dog.png')):
        pass
    # 只输出需要的两版：full→dog.png（黑），half→dog-w.png（白）
    color = (26, 26, 26) if tag == 'full' else (255, 255, 255)
    name = 'dog.png' if tag == 'full' else 'dog-w.png'
    rgba = Image.new('RGBA', (alpha.shape[1], alpha.shape[0]), color + (0,))
    rgba.putalpha(Image.fromarray(alpha, 'L'))
    small = rgba.resize((tw, th), Image.LANCZOS)
    canvas = Image.new('RGBA', (REF_W, REF_H), (0, 0, 0, 0))
    canvas.paste(small, ((REF_W - tw) // 2, (REF_H - th) // 2), small)
    if tight:                                   # 半身像裁到内容边界，避免 contain 时被留白挤小
        bb = canvas.getbbox()
        if bb:
            canvas = canvas.crop((bb[0], bb[1], bb[2], bb[3]))
    canvas.save(os.path.join(OUT, name), optimize=True)
    print('  ok', name, canvas.size, '内容 %dx%d' % (tw, th))
    return canvas


if __name__ == '__main__':
    # 全身：去掉文字 / 星星 / 花 / 草，只留狗；舌头不抠（黑色小舌）
    a, sz = extract(os.path.join(SRC, '约克夏全身.jpg'),
                    crop=(372, 256, 674, 598),
                    erase_boxes=[(0, 192, 14, 236),      # 左侧爱心碎片
                                 (280, 128, 302, 178)],  # 右侧星星（草地靠颜色剔除，不能用框）
                    keep_ground=(424, 636))              # 只留狗脚下那一段地面线
    save_pair(a, sz, 'full')

    # 半身：去掉草地、爱心、腮红、舌头
    a2, sz2 = extract(os.path.join(SRC, '约克夏半身.jpg'),
                      crop=(345, 295, 670, 470),
                      erase_boxes=[])
    save_pair(a2, sz2, 'half', tight=True)
