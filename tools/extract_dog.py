# -*- coding: utf-8 -*-
"""从手绘稿直接提取线条，生成透明 PNG（黑线 / 白线两版）。

原理：手绘稿是「白纸 + 黑墨」，把亮度当作 alpha 通道即可无损留下笔触
（白=透明，黑=不透明，灰边保留为半透明，缩小时自然抗锯齿）。
用法：python3 tools/extract_dog.py <手绘稿.jpg>
"""
import sys, os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'images')
REF_W, REF_H = 200, 210
PAD = 6                     # 画布内留白（1rpx）
INK_LEVEL, WHITE_LEVEL = 30, 245   # 色阶：<30 全黑，>245 全透明


def main(path):
    g = Image.open(path).convert('L')
    a = np.array(g).astype(np.int16)

    # 1) 自动找墨迹范围（忽略浅灰水印）
    ys, xs = np.where(a < 170)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pad = 10
    crop = a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
    print('  墨迹范围 %dx%d' % (x1 - x0 + 1, y1 - y0 + 1))

    # 2) 亮度 → alpha（白纸透明，墨迹不透明，灰边半透明）
    alpha = (WHITE_LEVEL - crop) * 255.0 / (WHITE_LEVEL - INK_LEVEL)
    alpha = np.clip(alpha, 0, 255).astype(np.uint8)

    # 3) 等比缩放到 200×210（留白 6）
    h, w = alpha.shape
    k = min((REF_W - PAD * 2) / w, (REF_H - PAD * 2) / h)
    tw, th = max(1, round(w * k)), max(1, round(h * k))

    for color, name in (((26, 26, 26), 'dog.png'), ((255, 255, 255), 'dog-w.png')):
        rgba = Image.new('RGBA', (w, h), color + (0,))
        rgba.putalpha(Image.fromarray(alpha, 'L'))
        small = rgba.resize((tw, th), Image.LANCZOS)
        canvas = Image.new('RGBA', (REF_W, REF_H), (0, 0, 0, 0))
        canvas.paste(small, ((REF_W - tw) // 2, (REF_H - th) // 2), small)
        canvas.save(os.path.join(OUT, name), optimize=True)
        print('  ok', name, canvas.size, '内容 %dx%d' % (tw, th))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/Users/mac/Desktop/照片/约克夏.jpg')
