# -*- coding: utf-8 -*-
"""README 头图 hero.png — 五屏横排（顶部裁切到统一高度）"""
from PIL import Image
import os
HERE=os.path.dirname(__file__)
MOCK=os.path.join(HERE,'..','docs','mockups')
NAMES=['01-首页.png','03-老师端工作台.png','04-排课.png','05-约课管理.png','11-我的课表.png']
GAP,MARGIN,H=36,36,976
k=(2688-2*MARGIN-4*GAP)/(750*5)
W=int(750*k)
canvas=Image.new('RGB',(2688,H),'#F6F4EE')
x=MARGIN
for n in NAMES:
    im=Image.open(os.path.join(MOCK,n)).convert('RGB')
    im=im.resize((W,int(im.height*k)),Image.LANCZOS)
    if im.height>H: im=im.crop((0,0,W,H))
    canvas.paste(im,(x,0))
    x+=W+GAP
canvas.save(os.path.join(MOCK,'hero.png'))
print("✓ hero.png", canvas.size)
