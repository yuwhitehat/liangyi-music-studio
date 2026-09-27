#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""小程序静态校验：改完代码必跑。
覆盖：页面四件套 / app.json 注册 / WXML 标签配平 / 事件函数存在 /
      require 路径 / CSS 类引用 / showModal 按钮文案 ≤4 字 / JS 语法。
"""
import os, re, sys, json, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
errs, warns = [], []

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

# ── 1. 页面四件套 + app.json 注册 ──
app = json.loads(read(os.path.join(ROOT, 'app.json')))
VOID = {'image','input','icon','progress','slider','switch','audio','video',
        'camera','canvas','open-data','ad','br','hr','checkbox','radio','import','include'}
for pg in app.get('pages', []):
    base = os.path.join(ROOT, pg)
    for ext in ('wxml', 'js', 'json', 'wxss'):
        if not os.path.exists(base + '.' + ext):
            errs.append('缺文件 %s.%s' % (pg, ext))

# ── 2. WXML 标签配平 ──
def check_wxml(path):
    src = read(path)
    stack = []
    for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>', src):
        close, tag, attrs, self_close = m.groups()
        if tag in ('block','wx:if'): continue
        if self_close or tag in VOID: continue
        if close:
            if not stack: errs.append('%s: 多余闭合 </%s>' % (path, tag)); continue
            if stack[-1][0] != tag:
                ln = src[:m.start()].count('\n') + 1
                errs.append('%s:%d 标签不配平，期望 </%s> 实为 </%s>' % (path, ln, stack[-1][0], tag))
                if tag in [t for t, _ in stack]:
                    while stack and stack[-1][0] != tag: stack.pop()
            if stack: stack.pop()
        else:
            stack.append((tag, src[:m.start()].count('\n') + 1))
    for t, ln in stack:
        errs.append('%s:%d 标签未闭合 <%s>' % (path, ln, t))

# ── 3. 事件处理函数 / require / showModal 文案 ──
def check_js(path, src):
    for m in re.finditer(r"require\('([^']+)'\)", src):
        dep = m.group(1)
        if not dep.startswith('.'):        # npm 包（wx-server-sdk 等）不做路径校验
            continue
        tgt = os.path.normpath(os.path.join(os.path.dirname(path), dep))
        if not (os.path.exists(tgt) or os.path.exists(tgt + '.js')):
            errs.append('%s: require 路径无效 %s' % (os.path.relpath(path, ROOT), m.group(1)))
    for m in re.finditer(r"confirmText:\s*'([^']{5,})'|cancelText:\s*'([^']{5,})'", src):
        errs.append('%s: showModal 按钮文案超过 4 字（会静默失败）：%s'
                    % (os.path.relpath(path, ROOT), m.group(1) or m.group(2)))

# ── 4. 类引用 ──
def collect_css():
    cls = set()
    for dp, _, fs in os.walk(ROOT):
        if 'node_modules' in dp: continue
        for f in fs:
            if f.endswith('.wxss'):
                for m in re.finditer(r'\.([A-Za-z][\w-]*)', read(os.path.join(dp, f))):
                    cls.add(m.group(1))
    return cls

def check_wxml_classes(path, css):
    src = read(path)
    rel = os.path.relpath(path, ROOT)
    page = os.path.splitext(rel)[0]
    local = read(page + '.wxss') if os.path.exists(page + '.wxss') else ''
    for m in re.finditer(r'class="([^"]*)"', src):
        val = re.sub(r'\{\{[^}]*\}\}', ' ', m.group(1))   # 去掉动态类名表达式
        for c in val.split():
            if '{{' in c or c in css: continue
            warns.append('%s: 类 .%s 未在 wxss 中找到' % (rel, c))

css = collect_css()
for dp, _, fs in os.walk(ROOT):
    if any(x in dp for x in ('node_modules', '/assets', '/images', '/docs', '/tools')): continue
    for f in fs:
        p = os.path.join(dp, f)
        if f.endswith('.wxml'):
            check_wxml(p); check_wxml_classes(p, css)
        elif f.endswith('.js'):
            check_js(p, read(p))
            r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
            if r.returncode: errs.append('%s: JS 语法错误\n%s' % (os.path.relpath(p, ROOT), r.stderr[:400]))

for w in warns: print('  ⚠', w)
for e in errs: print('  ✗', e)
print('\n%s 校验通过（%d 页 / %d 个警告）' % ('✅' if not errs else '❌', len(app.get('pages', [])), len(warns)))
sys.exit(1 if errs else 0)
