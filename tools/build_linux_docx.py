#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 src/*.md 转成 Word 版（封面 + 目录域 + 正文 + 复盘表）。"""
import os, re
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "src", "linux")
OUT = os.path.join(ROOT, "notes", "linux", "Linux系统编程与LVGL知识总结.docx")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
FILES = sorted(os.path.join(SRC_DIR, f) for f in os.listdir(SRC_DIR) if f.endswith(".md"))
SRC_TEXT = "\n".join(open(f, encoding="utf-8").read() for f in FILES)

INK = RGBColor(0x22, 0x2A, 0x27)
ACCENT = RGBColor(0x17, 0x6B, 0x68)

doc = Document()

# ---- 页面 ----
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(2.4)
sec.top_margin = Cm(2.4)
sec.bottom_margin = Cm(2.2)

# ---- 基础样式 ----
normal = doc.styles["Normal"]
normal.font.name = "Microsoft YaHei"
normal.font.size = Pt(10.5)
normal.font.color.rgb = INK
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
normal.paragraph_format.line_spacing = 1.5
normal.paragraph_format.space_after = Pt(6)

for name, size in (("Heading 1", 19), ("Heading 2", 14), ("Heading 3", 11.5)):
    st = doc.styles[name]
    st.font.name = "Microsoft YaHei"
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = ACCENT if name != "Heading 3" else INK
    st._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")

def shade(el, color):
    tcPr = el.get_or_add_tcPr() if el.tag.endswith("tc") else el.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), color)
    tcPr.append(shd)

def cell_shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), color)
    tcPr.append(shd)

def field(par, instr, placeholder=""):
    r = par.add_run()
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "separate")
    t = OxmlElement("w:t"); t.text = placeholder
    f3 = OxmlElement("w:fldChar"); f3.set(qn("w:fldCharType"), "end")
    r._r.append(f1); r._r.append(it); r._r.append(f2); r._r.append(t); r._r.append(f3)

# ---- 封面 ----
for _ in range(3):
    doc.add_paragraph()
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Linux 系统编程与 LVGL"); r.font.size = Pt(28); r.font.bold = True; r.font.color.rgb = ACCENT
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("知识总结与易错点复盘"); r.font.size = Pt(20); r.font.bold = True; r.font.color.rgb = INK

doc.add_paragraph()
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("文件 I/O · 时间 · 目录与属性 · 进程 · 信号 · 图形界面")
r.font.size = Pt(11); r.font.color.rgb = RGBColor(0x6A, 0x73, 0x7D)

for _ in range(6):
    doc.add_paragraph()
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("内容源：五份课程讲义（文件操作与时间编程 / 目录操作与文件属性 / 进程 / 信号 / LVGL）")
r.font.size = Pt(9); r.font.color.rgb = RGBColor(0x8A, 0x95, 0x90)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("12 章正文 · 83 个小节 · 附复盘区")
r.font.size = Pt(9); r.font.color.rgb = RGBColor(0x8A, 0x95, 0x90)

doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

# ---- 目录页 ----
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("目 录"); r.font.size = Pt(18); r.font.bold = True; r.font.color.rgb = ACCENT
p = doc.add_paragraph()
r = p.add_run("（在 Word 中全选后按 F9，或右键选择「更新域」，即可生成带页码的目录）")
r.font.size = Pt(8.5); r.font.color.rgb = RGBColor(0x8A, 0x95, 0x90)
p = doc.add_paragraph()
field(p, 'TOC \\o "1-2" \\h \\z \\u', "目录将在更新域后生成")
doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

# ---- 页脚页码 ----
footer_p = sec.footer.paragraphs[0]
footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
field(footer_p, " PAGE ", "1")

# ---- 行内解析 ----
def add_inline(par, text, base_size=10.5):
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    tokens = re.split(r"(\*\*.+?\*\*|`[^`]+`)", text)
    for tk in tokens:
        if not tk:
            continue
        if tk.startswith("**") and tk.endswith("**"):
            r = par.add_run(tk[2:-2]); r.font.bold = True
        elif tk.startswith("`") and tk.endswith("`"):
            r = par.add_run(tk[1:-1])
            r.font.name = "Consolas"; r.font.size = Pt(base_size - 1.2)
            r.font.color.rgb = RGBColor(0xB4, 0x53, 0x09)
            r._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
        else:
            r = par.add_run(tk)

def add_code(lines):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.left_indent = Cm(0.4); pf.space_before = Pt(4); pf.space_after = Pt(8)
    pf.line_spacing = 1.1
    shade(p._p, "F2F4F3")
    for i, ln in enumerate(lines):
        r = p.add_run(ln if ln else " ")
        r.font.name = "Consolas"; r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(0x24, 0x29, 0x2E)
        r._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
        if i < len(lines) - 1:
            r.add_break()

def add_quote(lines):
    for ln in lines:
        if not ln:
            continue
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        pPr = p._p.get_or_add_pPr()
        bdr = OxmlElement("w:pBdr")
        left = OxmlElement("w:left")
        left.set(qn("w:val"), "single"); left.set(qn("w:sz"), "12")
        left.set(qn("w:space"), "8"); left.set(qn("w:color"), "176B68")
        bdr.append(left); pPr.append(bdr)
        add_inline(p, ln)
        for r in p.runs:
            if not r.font.size:
                r.font.size = Pt(10)

def add_table(rows):
    rows = [r for r in rows if not re.match(r"^\|[\s\-:|]+\|$", r.strip())]
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    ncol = max(len(r) for r in cells)
    t = doc.add_table(rows=len(cells), cols=ncol)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(cells):
        for j in range(ncol):
            cell = t.cell(i, j)
            cell.text = ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            txt = row[j] if j < len(row) else ""
            add_inline(p, txt, base_size=9)
            for r in p.runs:
                r.font.size = Pt(9)
                if i == 0:
                    r.font.bold = True
            if i == 0:
                cell_shade(cell, "EEF2F0")
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def add_html_table(block):
    rows = re.findall(r"<tr>(.*?)</tr>", block, re.S)
    data = []
    for row in rows:
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, re.S)
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        data.append(cells)
    if not data:
        return
    ncol = max(len(r) for r in data)
    t = doc.add_table(rows=len(data), cols=ncol)
    t.style = "Table Grid"
    for i, row in enumerate(data):
        for j in range(ncol):
            cell = t.cell(i, j)
            cell.text = ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            if i == 0:
                r = p.add_run(row[j] if j < len(row) else "")
                r.font.bold = True; r.font.size = Pt(9)
                cell_shade(cell, "EEF2F0")
    doc.add_paragraph()

# ---- 正文解析 ----
lines = SRC_TEXT.split("\n")
i = 0
first_chapter = True
while i < len(lines):
    ln = lines[i]

    if ln.startswith("```"):
        lang = ln[3:].strip()
        i += 1
        buf = []
        while i < len(lines) and not lines[i].startswith("```"):
            buf.append(lines[i]); i += 1
        i += 1
        add_code(buf)
        continue

    if ln.startswith("# "):
        if not first_chapter:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        first_chapter = False
        doc.add_heading(ln[2:].strip(), level=1)
        i += 1
        continue

    if ln.startswith("## "):
        doc.add_heading(ln[3:].strip(), level=2)
        i += 1
        continue

    if ln.startswith("### "):
        doc.add_heading(ln[4:].strip(), level=3)
        i += 1
        continue

    if ln.strip() == "":
        i += 1
        continue

    if ln.startswith("<table"):
        buf = []
        while i < len(lines) and lines[i].strip() != "":
            buf.append(lines[i]); i += 1
        add_html_table("\n".join(buf))
        continue

    if ln.startswith("<"):
        i += 1
        continue

    if ln.startswith("|"):
        buf = []
        while i < len(lines) and lines[i].startswith("|"):
            buf.append(lines[i]); i += 1
        add_table(buf)
        continue

    if ln.startswith(">"):
        buf = []
        while i < len(lines) and lines[i].startswith(">"):
            buf.append(lines[i].lstrip(">").strip()); i += 1
        add_quote(buf)
        continue

    if re.match(r"^- ", ln):
        while i < len(lines) and re.match(r"^- ", lines[i]):
            t = lines[i][2:].strip()
            if t.startswith("[ ] "):
                t = "☐ " + t[4:]
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.space_after = Pt(3)
            add_inline(p, t)
            i += 1
        continue

    if re.match(r"^\d+\. ", ln):
        while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
            p = doc.add_paragraph(style="List Number")
            p.paragraph_format.space_after = Pt(3)
            add_inline(p, re.sub(r"^\d+\. ", "", lines[i]))
            i += 1
        continue

    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    add_inline(p, ln.strip())
    i += 1

doc.save(OUT)
print("saved", OUT, os.path.getsize(OUT))
