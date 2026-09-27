# -*- coding: utf-8 -*-
"""把所有原型图拼成一张总览图（便于快速走查；PRD 内引用的是单页图）"""
import os, glob
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'mockups')
names = [n for n in sorted(os.listdir(OUT)) if n.endswith('.png') and not n.startswith('_')]
cols, cw, gap = 5, 300, 20
ims = []
for n in names:
    im = Image.open(os.path.join(OUT, n))
    ims.append(im.resize((cw, int(im.height*cw/im.width)), Image.LANCZOS))
rh = max(i.height for i in ims)
rows = (len(ims)+cols-1)//cols
c = Image.new('RGB', (cols*(cw+gap)+gap, rows*(rh+gap)+gap), '#EDEFF4')
for k, im in enumerate(ims):
    r, col = divmod(k, cols)
    c.paste(im, (gap+col*(cw+gap), gap+r*(rh+gap)))
c.save(os.path.join(OUT, '_overview.png'))
print('ok _overview.png', c.size, len(ims), '张')
