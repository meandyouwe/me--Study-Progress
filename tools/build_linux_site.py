#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 src/*.md 生成为 Quartz 风格的 docs/ 静态站点。"""
import os, re, json, html, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "src", "linux")
DOCS = os.path.join(ROOT, "docs", "linux")
FILES = sorted(os.path.join(SRC_DIR, f) for f in os.listdir(SRC_DIR) if f.endswith(".md"))
SRC = "\n".join(open(f, encoding="utf-8").read() for f in FILES)
SITE = "Linux系统编程知识库"
DESC = "按课程顺序整理的 Linux 系统编程与 LVGL 知识主干、完整代码与易错点复盘笔记。"
FOOTER = "按课程顺序整理的 Linux 系统编程知识库 · 内容源《Linux 系统编程与 LVGL 知识总结》<br>静态站点 · 亮暗模式与全文搜索均在本地运行，无需联网"

C_KW = set("""auto break case char const continue default do double else enum extern float for goto
if inline int long register restrict return short signed sizeof static struct switch typedef union
unsigned void volatile while _Bool NULL""".split())

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def hl_c(src):
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith("/*", i):
            j = src.find("*/", i + 2); j = n if j < 0 else j + 2
            out.append('<span class="tok-com">%s</span>' % src[i:j]); i = j
        elif src.startswith("//", i):
            j = src.find("\n", i); j = n if j < 0 else j
            out.append('<span class="tok-com">%s</span>' % src[i:j]); i = j
        elif c in "\"'":
            q, j = c, i + 1
            while j < n:
                if src[j] == "\\": j += 2; continue
                if src[j] == q: j += 1; break
                if src[j] == "\n": break
                j += 1
            out.append('<span class="tok-str">%s</span>' % esc(src[i:j])); i = j
        elif c == "#" and (i == 0 or src[i-1] == "\n"):
            j = src.find("\n", i); j = n if j < 0 else j
            out.append('<span class="tok-pp">%s</span>' % esc(src[i:j])); i = j
        elif c.isdigit():
            j = i
            while j < n and (src[j].isalnum() or src[j] in ".xX_"): j += 1
            out.append('<span class="tok-num">%s</span>' % src[i:j]); i = j
        elif c.isalpha() or c == "_":
            j = i
            while j < n and (src[j].isalnum() or src[j] == "_"): j += 1
            w = src[i:j]; k = j
            while k < n and src[k] in " \t": k += 1
            if w in C_KW:
                out.append('<span class="tok-kw">%s</span>' % w)
            elif k < n and src[k] == "(":
                out.append('<span class="tok-fn">%s</span>' % w)
            else:
                out.append(w)
            i = j
        else:
            out.append(esc(c)); i += 1
    return "".join(out)

def hl_plain(src, lang):
    lines = []
    for ln in src.split("\n"):
        if lang in ("bash", "sh", "make") and ln.lstrip().startswith("#"):
            lines.append('<span class="tok-com">%s</span>' % esc(ln))
        else:
            lines.append(esc(ln))
    return "\n".join(lines)

def inline(s):
    s = esc(s)
    store = []
    def repl(m):
        store.append(m.group(1))
        return "\x00%d\x00" % (len(store) - 1)
    s = re.sub(r"`([^`]+)`", repl, s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    for i, c in enumerate(store):
        s = s.replace("\x00%d\x00" % i, "<code>%s</code>" % c)
    return s

def slug_id(n):
    return "sec-%d" % n

def plain(s):
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return s

# ---------------- 解析 ----------------
def parse(md):
    chapters, cur, sec = [], None, None

    def ensure():
        nonlocal sec
        if sec is None:
            sec = {"title": None, "blocks": []}
            cur["sections"].append(sec)
        return sec

    lines = md.split("\n")
    i, in_code = 0, False
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            lang = ln[3:].strip() or "text"
            i += 1
            buf = []
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1
            code = "\n".join(buf)
            body = hl_c(code) if lang in ("c", "h") else hl_plain(code, lang)
            ensure()["blocks"].append('<figure data-rehype-pretty-code-figure><pre data-language="%s"><code>%s</code></pre></figure>' % (lang, body))
            continue
        if ln.startswith("# ") and not in_code:
            cur = {"title": ln[2:].strip(), "sections": []}
            chapters.append(cur); sec = None
        elif ln.startswith("## "):
            sec = {"title": ln[3:].strip(), "blocks": []}
            cur["sections"].append(sec)
        elif ln.startswith("### "):
            ensure()["blocks"].append("<h3>%s</h3>" % inline(ln[4:].strip()))
        elif ln.strip() == "":
            pass
        elif ln.startswith("<"):
            buf = []
            while i < len(lines) and lines[i].strip() != "":
                buf.append(lines[i]); i += 1
            blk = "\n".join(buf)
            if blk.strip().startswith("<table") and "</table>" in blk:
                blk = '<div class="table-container">%s</div>' % blk
            ensure()["blocks"].append(blk); continue
        elif ln.startswith("|"):
            buf = []
            while i < len(lines) and lines[i].startswith("|"):
                buf.append(lines[i]); i += 1
            rows = [r for r in buf if not re.match(r"^\|[\s\-:|]+\|$", r.strip())]
            cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
            th = "".join("<th>%s</th>" % inline(c) for c in cells[0])
            tb = ""
            for r in cells[1:]:
                tb += "<tr>" + "".join("<td>%s</td>" % inline(c) for c in r) + "</tr>"
            ensure()["blocks"].append('<div class="table-container"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, tb))
            continue
        elif ln.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip(">").strip()); i += 1
            ps = "".join("<p>%s</p>" % inline(b) for b in buf if b)
            ensure()["blocks"].append("<blockquote>%s</blockquote>" % ps)
            continue
        elif re.match(r"^- ", ln):
            buf = []
            while i < len(lines) and re.match(r"^- ", lines[i]):
                t = lines[i][2:].strip()
                if t.startswith("[ ] "):
                    t = "☐ " + t[4:]
                buf.append("<li>%s</li>" % inline(t)); i += 1
            ensure()["blocks"].append("<ul>%s</ul>" % "".join(buf)); continue
        elif re.match(r"^\d+\. ", lines[i]):
            buf = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                buf.append("<li>%s</li>" % inline(re.sub(r"^\d+\. ", "", lines[i]))); i += 1
            ensure()["blocks"].append("<ol>%s</ol>" % "".join(buf)); continue
        else:
            ensure()["blocks"].append("<p>%s</p>" % inline(ln.strip()))
        i += 1
    return chapters

# ---------------- 页面骨架 ----------------
SVG_SEARCH = '<svg viewBox="0 0 19.9 19.7" aria-hidden="true"><g fill="none" stroke-linecap="square"><path d="M18.5 18.3l-5.4-5.4"/><circle cx="8" cy="8" r="7"/></g></svg>'
SVG_DAY = '<svg class="dayIcon" viewBox="0 0 35 35" aria-hidden="true"><path d="M17.5 7C11.71 7 7 11.71 7 17.5S11.71 28 17.5 28 28 23.29 28 17.5 23.29 7 17.5 7zm0 18c-4.136 0-7.5-3.364-7.5-7.5S13.364 10 17.5 10s7.5 3.364 7.5 7.5S21.636 25 17.5 25zM17.5 6c.829 0 1.5-.672 1.5-1.5v-3C19 .672 18.329 0 17.5 0S16 .672 16 1.5v3C16 5.328 16.671 6 17.5 6zm0 23c-.829 0-1.5.672-1.5 1.5v3c0 .828.671 1.5 1.5 1.5s1.5-.672 1.5-1.5v-3c0-.828-.671-1.5-1.5-1.5zM4.5 16h-3C.672 16 0 16.672 0 17.5S.672 19 1.5 19h3c.828 0 1.5-.672 1.5-1.5S5.328 16 4.5 16zm29 0h-3c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5h3c.828 0 1.5-.672 1.5-1.5S34.328 16 33.5 16zM7.5 26c-.414 0-.789.168-1.061.439l-2 2c-.271.272-.439.647-.439 1.061C4 30.328 4.671 31 5.5 31c.414 0 .789-.168 1.06-.44l2-2c.272-.271.44-.646.44-1.06C9 26.672 8.329 26 7.5 26zm20-18c.414 0 .789-.168 1.06-.439l2-2C30.832 5.289 31 4.914 31 4.5 31 3.672 30.329 3 29.5 3c-.414 0-.789.168-1.061.44l-2 2C26.168 5.711 26 6.086 26 6.5 26 7.328 26.671 8 27.5 8zm2 18c-.828 0-1.5.672-1.5 1.5 0 .414.168.789.439 1.06l2 2c.271.272.646.44 1.061.44.828 0 1.5-.672 1.5-1.5 0-.414-.168-.789-.439-1.061l-2-2c-.272-.271-.647-.439-1.061-.439zM6.439 8.561c.272.271.647.439 1.061.439C8.328 9 9 8.328 9 7.5c0-.414-.168-.789-.439-1.061l-2-2C6.289 4.168 5.914 4 5.5 4 4.672 4 4 4.672 4 5.5c0 .414.168.789.439 1.06l2 2z"/></svg>'
SVG_NIGHT = '<svg class="nightIcon" viewBox="0 0 100 100" aria-hidden="true"><path d="M96.76 66.458c-.853-.852-2.15-1.064-3.23-.534-6.063 2.991-12.858 4.571-19.655 4.571C62.022 70.495 50.88 65.88 42.5 57.5 29.043 44.043 25.658 23.536 34.076 6.47c.532-1.08.318-2.379-.534-3.23-.851-.852-2.15-1.064-3.23-.534-4.918 2.427-9.375 5.619-13.246 9.491C7.619 21.644 2.416 34.205 2.416 47.566c0 13.36 5.203 25.921 14.65 35.368s22.008 14.65 35.368 14.65c13.361 0 25.921-5.203 35.369-14.65 3.872-3.871 7.064-8.328 9.491-13.246.532-1.08.318-2.379-.534-3.23z"/></svg>'
ANCHOR = '<a class="anchor" href="#%s" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></a>'

def head(title):
    return f'''<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} – {SITE}</title>
<meta name="description" content="{DESC}">
<link rel="stylesheet" href="../assets/style.css">
<script>try{{var t=localStorage.getItem('cl-notes-theme');if(!t){{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}}document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}</script>
</head>
<body class="page">
<div class="mobile-bar">
  <button class="nav-toggle" aria-label="切换目录">☰</button>
  <span class="brand">{SITE}</span>
  <button class="search-button" aria-label="搜索" style="margin-left:auto;border:none;">{SVG_SEARCH}<span style="margin-left:.35rem">搜索</span></button>
</div>
<div id="quartz-body">
  <aside class="left sidebar">
    <h2 class="page-title"><a href="index.html">{SITE}</a></h2>
    <div class="sidebar-tools">
      <button class="search-button" aria-label="搜索">{SVG_SEARCH}<p>搜索</p></button>
      <button class="darkmode" aria-label="切换亮暗模式">{SVG_DAY}{SVG_NIGHT}</button>
    </div>
    <div class="explorer">
      <h2 class="explorer-title">课程目录</h2>
      <ul class="explorer-list">
{explorer_html(active_idx)}
      </ul>
    </div>
    <div class="sidebar-foot">共 {len(CHAPTERS)} 篇 · 约 {WORDS} 千字<br>按课程顺序整理</div>
  </aside>
'''

active_idx = None

def explorer_html(active):
    out = []
    for n, ch in enumerate([c for c in CHAPTERS if not c["is_app"]], 1):
        cls = " active" if (active == n) else ""
        out.append(f'        <li><a class="explorer-link{cls}" href="{ch["file"]}"><span class="explorer-num">{ch["num"]}</span><span>{ch["nav"]}</span></a>')
        if active == n:
            subs = "".join(f'<li><a href="{ch["file"]}#sec-{k}">{s["title"]}</a></li>' for k, s in enumerate([x for x in ch["sections"] if x["title"]], 1))
            out.append(f'<ul class="explorer-sub">{subs}</ul>')
        out.append("</li>")
    a = " active" if active == 0 else ""
    out.append(f'        <li><a class="explorer-link{a}" href="appendix.html"><span class="explorer-num">·</span><span>使用说明</span></a></li>')
    return "\n".join(out)

def related_html():
    items = "".join(f'<li><a href="{c["file"]}">{c["nav_full"]}</a></li>' for c in CHAPTERS if not c["is_app"])
    items += '<li><a href="appendix.html">附录 · 使用说明</a></li>'
    return items

SEARCH_BLOCK = '''<div class="search-modal" hidden>
  <div class="search-panel">
    <input class="search-bar" type="text" placeholder="搜索内容..." autocomplete="off" aria-label="搜索内容">
    <ul class="search-results"></ul>
    <div class="search-hint">↑↓ 选择 · Enter 打开 · Esc 关闭 · 快捷键 / 或 Ctrl+K</div>
  </div>
</div>
<script src="assets/search-index.js"></script>
<script src="../assets/quartz.js"></script>
</body>
</html>'''

# ---------------- 主流程 ----------------
os.makedirs(os.path.join(DOCS, "assets"), exist_ok=True)
md = SRC
raw_chapters = parse(md)

CHAPTERS = []
for idx, rc in enumerate(raw_chapters):
    t = rc["title"]
    is_app = t.startswith("附录")
    file = "appendix.html" if is_app else "%02d.html" % (idx + 1)
    nav = t
    if is_app:
        nav = t.replace("附录 · ", "")
        num = "·"
    else:
        m = re.match(r"^(\d+)\.\s*(.+)$", t)
        num, nav = (m.group(1), m.group(2)) if m else (str(idx), t)
    CHAPTERS.append({"title": t, "nav": nav, "nav_full": t if not is_app else "附录 · " + nav,
                     "file": file, "num": num, "sections": rc["sections"], "is_app": is_app})

WORDS = round(len(re.sub(r"\s", "", md)) / 1000, 1)

# 生成各章页面
for idx, ch in enumerate(CHAPTERS):
    active_idx = 0 if ch["is_app"] else idx + 1
    body = []
    toc = []
    k = 0
    for sec in ch["sections"]:
        if sec["title"] is None:
            body.extend(sec["blocks"])
            continue
        k += 1
        sid = "sec-%d" % k
        toc.append(f'<li class="depth-0"><a href="#{sid}" data-for="{sid}">{sec["title"]}</a></li>')
        body.append(f'<h2 id="{sid}">{sec["title"]}{ANCHOR % sid}</h2>')
        body.extend(sec["blocks"])
    crumb = '<a href="index.html">首页</a><span class="sep">❯</span><span>%s</span>' % ("附录" if ch["is_app"] else "第 %d 章" % active_idx)

    if idx == 0:
        prev_a = '<a class="prev" href="index.html"><span class="nav-label">← 返回</span>知识导航</a>'
    else:
        p = CHAPTERS[idx-1]
        prev_a = '<a class="prev" href="%s"><span class="nav-label">← 上一章</span>%s</a>' % (p["file"], p["nav_full"])
    if idx == len(CHAPTERS) - 1:
        next_a = '<a class="next" href="index.html"><span class="nav-label">回到 →</span>知识导航</a>'
    else:
        nx = CHAPTERS[idx+1]
        next_a = '<a class="next" href="%s"><span class="nav-label">下一章 →</span>%s</a>' % (nx["file"], nx["nav_full"])

    page = head(ch["title"]) + f'''  <div class="center">
    <header class="page-header">
      <nav class="breadcrumb">{crumb}</nav>
      <h1 class="article-title">{ch["title"]}</h1>
    </header>
    <article>
{chr(10).join(body)}
    </article>
    <hr class="page-rule">
    <div class="page-footer">{prev_a}{next_a}</div>
    <footer class="site-footer">{FOOTER}</footer>
  </div>

  <aside class="right sidebar">
    <div class="toc"><h3>本页目录</h3><ul>{''.join(toc)}</ul></div>
    <div class="related"><h3>全部章节</h3><ul>{related_html()}</ul></div>
  </aside>
</div>

{SEARCH_BLOCK}
'''
    open(os.path.join(DOCS, ch["file"]), "w", encoding="utf-8").write(page)

# 首页
active_idx = None
groups = []
for ch in CHAPTERS:
    links = "".join(f'<li><a href="{ch["file"]}#sec-{k}"><span class="num">{k}</span>{s["title"]}</a></li>'
                    for k, s in enumerate([x for x in ch["sections"] if x["title"]], 1))
    groups.append(f'<div class="home-group"><h2><a href="{ch["file"]}">{ch["title"]}</a></h2><ul class="home-links">{links}</ul></div>')

n_sections = sum(len([x for x in c["sections"] if x["title"]]) for c in CHAPTERS)
n_entries = len(CHAPTERS) and n_sections

home = head("知识导航") + f'''  <div class="center">
    <header class="page-header">
      <nav class="breadcrumb"><span>Home</span></nav>
      <h1 class="article-title">Linux 系统编程与 LVGL 知识总结</h1>
    </header>
    <article>
      <dl class="home-props">
        <dt>description</dt>
        <dd>按课程顺序整理的 Linux 系统编程知识主干：文件 I/O、时间、目录与属性、进程、信号，以及 LVGL 图形界面。</dd>
      </dl>
      <p>本书以五份课程讲义为骨架，按「工程组织 → 文件 I/O → 时间与文件系统 → 进程与信号 → 图形界面」的顺序组织。每章保留可复用的判断规则、完整示例代码与常见错误对照表，第十二章给出综合项目拆解和可在线填写的复盘区。</p>
      <div class="home-stats">
        <span><b>{len(CHAPTERS)-1}</b>章正文</span>
        <span><b>{n_sections}</b>个小节</span>
        <span><b>5</b>份课程讲义</span>
        <span><b>{n_sections}</b>条可检索条目</span>
      </div>
{chr(10).join(groups)}
    </article>
    <hr class="page-rule">
    <div class="page-footer"><a class="next" href="01.html"><span class="nav-label">开始阅读</span>{CHAPTERS[0]["nav_full"]} →</a></div>
    <footer class="site-footer">{FOOTER}</footer>
  </div>

  <aside class="right sidebar">
    <div class="related"><h3>全部章节</h3><ul>{related_html()}</ul></div>
  </aside>
</div>

{SEARCH_BLOCK}
'''
open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8").write(home)

# 搜索索引
index = []
for ch in CHAPTERS:
    for k, sec in enumerate([x for x in ch["sections"] if x["title"]], 1):
        txt = " ".join(re.sub(r"<[^>]+>", " ", b) for b in sec["blocks"])
        txt = html.unescape(re.sub(r"\s+", " ", txt)).strip()[:220]
        index.append({"t": ch["nav_full"], "sec": sec["title"], "x": txt,
                      "u": ch["file"], "id": "sec-%d" % k})
open(os.path.join(DOCS, "assets", "search-index.js"), "w", encoding="utf-8").write(
    "window.__SEARCH_INDEX__ = " + json.dumps(index, ensure_ascii=False, indent=0) + ";\n")
open(os.path.join(DOCS, "search-index.json"), "w", encoding="utf-8").write(
    json.dumps(index, ensure_ascii=False, indent=0))

print("pages:", len(CHAPTERS) + 1, "sections:", n_sections, "chars:", len(md))
