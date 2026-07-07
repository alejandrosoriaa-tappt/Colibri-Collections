# -*- coding: utf-8 -*-
"""Build the ebook: docs/ebook.md -> docs/ebook.html (whitepaper design) -> PDF via Chrome."""
import re, html, os
from ebook_graphics import GRAPHICS

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ebook.md')
OUT_HTML = os.path.join(HERE, 'ebook.html')
WEB = os.environ.get('EBOOK_WEB') == '1'
IMGDIR = 'ebook-assets/images-web' if WEB else 'ebook-assets/images'
EXT = '.jpg' if WEB else '.png'

def inline(t, hl=True):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
    if hl:
        t = re.sub(r'WhatsApp Business', '<span class="wa">WhatsApp Business</span>', t)
        t = re.sub(r'(?<![\w.>])WhatsApp(?! Business)(?![\w.])', '<span class="wa">WhatsApp</span>', t)
    return t

def callout_class(text):
    if '📱' in text: return 'co co-phone'
    if '💻' in text: return 'co co-pc'
    if 'Did you know' in text: return 'co co-gold'
    if '⚙' in text: return 'co co-gold'
    if text.strip().startswith('**Example') or text.strip().startswith('**Or') or \
       text.strip().startswith('**Another') or text.strip().startswith('**Script') or \
       text.strip().startswith('**Example Prompt'): return 'co co-ex'
    return 'epigraph'

def render_blockquote(lines):
    joined = '\n'.join(lines)
    cls = callout_class(joined)
    body = '<br>'.join(inline(l) for l in lines)
    if cls == 'epigraph':
        return f'<blockquote class="epigraph">{body}</blockquote>'
    return f'<div class="{cls}">{body}</div>'

def render_table(rows):
    header = [c.strip() for c in rows[0].strip('|').split('|')]
    body = rows[2:]
    out = ['<table class="md"><thead><tr>']
    for h in header: out.append(f'<th>{inline(h)}</th>')
    out.append('</tr></thead><tbody>')
    for r in body:
        cells = [c.strip() for c in r.strip('|').split('|')]
        out.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in cells) + '</tr>')
    out.append('</tbody></table>')
    return ''.join(out)

def build_body(md):
    lines = md.split('\n')
    html_parts = []
    i = 0
    cur_chapter = None
    pending_para = []
    float_count = [0]

    def flush_para():
        if pending_para:
            html_parts.append('<p>' + inline(' '.join(pending_para)) + '</p>')
            pending_para.clear()

    while i < len(lines):
        line = lines[i]
        s = line.strip()

        hm = re.match(r'^<!--HERO:(\w+)-->$', s)
        if hm:
            flush_para()
            img = f'{IMGDIR}/{hm.group(1)}-hero{EXT}'
            if os.path.exists(os.path.join(HERE, img)):
                html_parts.append(f'<img class="hero" src="{img}">')
            i += 1; continue

        gm = re.match(r'^<!--GFX:(\w+)-->$', s)
        if gm:
            flush_para()
            g = GRAPHICS.get(gm.group(1))
            if g:
                if 'graphic infographic' in g:
                    html_parts.append(f'<div class="ig-block">{g}</div>')
                else:
                    html_parts.append(f'<div class="mock-center">{g}</div>')
            i += 1; continue

        if s.startswith('<!--'):
            i += 1; continue

        # headings
        m = re.match(r'^(#{1,4})\s+(.*)$', s)
        if m:
            flush_para()
            level = len(m.group(1)); text = m.group(2)
            chm = re.match(r'^Chapter (\d+)', text)
            if level == 2 and chm:
                cur_chapter = int(chm.group(1))
                html_parts.append(f'<h2 class="chapter">{inline(text, hl=False)}</h2>')
            elif level == 1:
                html_parts.append(f'<h1>{inline(text, hl=False)}</h1>')
            else:
                html_parts.append(f'<h{level}>{inline(text, hl=False)}</h{level}>')
            i += 1; continue

        # hr — skip the divider when a heading follows (avoids ghost blank pages before chapters)
        if s == '---':
            flush_para()
            j = i + 1
            while j < len(lines) and lines[j].strip() == '':
                j += 1
            if j < len(lines) and lines[j].strip().startswith('#'):
                i += 1; continue
            html_parts.append('<hr class="divider">')
            i += 1; continue

        # blockquote group
        if s.startswith('>'):
            flush_para()
            bq = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                bq.append(re.sub(r'^\s*>\s?', '', lines[i]))
                i += 1
            html_parts.append(render_blockquote(bq))
            continue

        # table group
        if s.startswith('|') and i+1 < len(lines) and re.match(r'^\|[\s:|-]+\|', lines[i+1].strip()):
            flush_para()
            tbl = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                tbl.append(lines[i]); i += 1
            html_parts.append(render_table(tbl))
            continue

        # list group (ul / ol / task)
        if re.match(r'^(\-|\d+\.)\s+', s):
            flush_para()
            ordered = bool(re.match(r'^\d+\.', s))
            tag = 'ol' if ordered else 'ul'
            items = []
            while i < len(lines) and re.match(r'^(\-|\d+\.)\s+', lines[i].strip()):
                it = re.sub(r'^(\-|\d+\.)\s+', '', lines[i].strip())
                tm = re.match(r'^\[([ xX])\]\s+(.*)$', it)
                if tm:
                    box = '☑' if tm.group(1).lower() == 'x' else '☐'
                    items.append(f'<li class="task">{box} {inline(tm.group(2))}</li>')
                else:
                    items.append(f'<li>{inline(it)}</li>')
                i += 1
            html_parts.append(f'<{tag}>' + ''.join(items) + f'</{tag}>')
            continue

        # blank
        if s == '':
            flush_para(); i += 1; continue

        pending_para.append(s)
        i += 1

    flush_para()
    return '\n'.join(html_parts)

CSS = '''
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
@page { size: 152mm 214mm; margin: 20mm 16mm 20mm 16mm; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; background:#FAF7F0; color:#1c2b26;
  font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif; font-size:16px; line-height:1.75; }
.page { padding:0; }
h1 { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:34px; color:#075E54; line-height:1.15; margin:0 0 6px; }
h2.chapter { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:29px; color:#075E54;
  line-height:1.2; margin:0 0 6px; break-before:page; page-break-before:always; clear:both; }
h2.chapter::after { content:""; display:block; width:44px; height:3px; background:#E0A83C; margin:12px 0 4px; }
h3 { font-family:'Inter',sans-serif; font-weight:600; font-size:13.5px; color:#128C7E;
  text-transform:uppercase; letter-spacing:0.06em; margin:24px 0 8px; }
h4 { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:17px; color:#0B2721; margin:18px 0 6px; }
p { margin:0 0 11px; }
code { font-family:ui-monospace,Menlo,monospace; font-size:0.88em; background:#EDE7DA; color:#075E54; padding:1px 5px; border-radius:4px; }
strong { font-weight:600; color:#0B2721; }
.wa { color:#0f7a5f; font-weight:600; font-size:1.05em; letter-spacing:0.01em; }
a { color:#128C7E; text-decoration:none; }
ul,ol { margin:0 0 12px; padding-left:30px; }
li { margin:3px 0; }
li.task { list-style:none; margin-left:-16px; }
hr.divider { border:none; border-top:0.5px solid #ddd5c6; margin:20px 0; }
blockquote.epigraph { font-family:'Fraunces',Georgia,serif; font-style:italic; font-size:17px;
  color:#5a6b64; border-left:3px solid #E0A83C; margin:14px 0 18px; padding:2px 0 2px 16px; line-height:1.5; }
.co { border-radius:0 10px 10px 0; padding:14px 17px; margin:16px 0; font-size:13px; line-height:1.62; page-break-inside:avoid; clear:both; }
.co strong { display:inline; }
.co-phone { background:#E7F7EE; border-left:4px solid #25D366; color:#0b4a40; }
.co-pc    { background:#E8F0F5; border-left:4px solid #2A6F97; color:#244f68; }
.co-gold  { background:#FBF1DC; border-left:4px solid #E0A83C; color:#7a5210; }
.co-ex    { background:#F1ECE1; border-left:4px solid #b8ad95; color:#4a4436; }
table.md { border-collapse:collapse; width:100%; font-size:12px; margin:12px 0 16px; page-break-inside:avoid; clear:both; }
table.md th { background:#075E54; color:#fff; font-weight:500; text-align:left; padding:7px 9px; }
table.md td { border-bottom:0.5px solid #e4ddce; padding:6px 9px; vertical-align:top; }
table.md tr:nth-child(even) td { background:#F3EFE6; }
img.cover { display:block; width:68%; max-width:290px; margin:0 auto 16px; border-radius:6px; }
img.hero { display:block; width:100%; border-radius:8px; margin:10px 0 18px; page-break-inside:avoid; }
.mock-center { text-align:center; margin:20px 0; page-break-inside:avoid; clear:both; }
.ig-block { clear:both; margin:18px 0; page-break-inside:avoid; }
figure.graphic { margin:0; page-break-inside:avoid; }
figure.infographic { background:#FAF7F0; border:0.5px solid #e6e0d5; border-radius:12px; padding:20px 18px; }
figure.graphic .graphic { }
.ig-kicker { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#128C7E; margin-bottom:3px; }
.ig-title { font-family:'Fraunces',Georgia,serif; font-size:18px; color:#075E54; }
.ig-rule { width:44px; height:3px; background:#E0A83C; margin:6px 0 16px; }
.ig-tail { margin-top:14px; font-size:10.5px; color:#5f5a50; line-height:1.5; }
.ig-flow { display:flex; flex-wrap:wrap; align-items:center; gap:7px 5px; font-size:11px; font-weight:600; }
table.ig-table { border-collapse:collapse; width:100%; font-size:11px; }
table.ig-table th { padding:8px; text-align:center; color:#5f5a50; font-weight:600; }
table.ig-table th.hl { background:#075E54; color:#fff; border-radius:8px 8px 0 0; }
table.ig-table th.hl span { font-size:8.5px; font-weight:400; opacity:0.9; }
table.ig-table td { padding:7px 8px; text-align:center; border-bottom:0.5px solid #ece5d6; }
table.ig-table td:first-child { text-align:left; color:#5f5a50; }
table.ig-table td.hlc { background:#E7F7EE; }
table.ig-table td.x { color:#c0392b; }
.cover-page { text-align:center; page-break-after:always; padding-top:2mm; }
.cover-page .cover-title { font-size:24px; margin:0 0 6px; line-height:1.15; }
.cover-page .cover-sub { font-size:13.5px; color:#128C7E; font-family:'Fraunces',Georgia,serif; margin:0 auto 12px; max-width:88%; line-height:1.35; }
.legal-page { page-break-after:always; break-after:page; padding-top:6mm; }
.legal-page .legal-title { font-family:'Fraunces',Georgia,serif; font-size:15px; color:#075E54; margin-bottom:16px; }
.legal-page p { font-size:11px; line-height:1.65; color:#5f5a50; margin:0 0 10px; }
.legal-page .legal-foot { margin-top:20px; font-size:11px; color:#8a8577; }
.byline { font-size:12px; color:#5f5a50; margin-top:6px; text-align:center; }
.byline .edition { font-style:italic; color:#8a8577; }
'''

def main():
    with open(SRC, encoding='utf-8') as f:
        md = f.read()

    # split off the cover (title block) — everything before first "## Contents"
    parts = md.split('## Contents', 1)
    cover_md = parts[0]
    rest_md = '## Contents' + parts[1] if len(parts) > 1 else md

    # cover title lines
    title_line = re.search(r'^#\s+(.*)$', cover_md, re.M)
    sub_line = re.search(r'^###\s+(.*)$', cover_md, re.M)
    author = re.search(r'\*\*By (.*?)\*\*', cover_md)
    edition = re.search(r'\*([^*]*Edition[^*]*)\*', cover_md)

    cover_html = ['<section class="cover-page">']
    cover_html.append(f'<img class="cover" src="{IMGDIR}/cover{EXT}">')
    if title_line: cover_html.append(f'<h1 class="cover-title">{inline(title_line.group(1), hl=False)}</h1>')
    if sub_line: cover_html.append(f'<p class="cover-sub">{inline(sub_line.group(1), hl=False)}</p>')
    by = f'<div class="byline"><strong>By {author.group(1)}</strong>' if author else '<div class="byline">'
    if edition: by += f'<div class="edition">{inline(edition.group(1))}</div>'
    by += '</div>'
    cover_html.append(by)
    cover_html.append('</section>')

    legal_html = '''<section class="legal-page">
<div class="legal-title">Turn WhatsApp Business Into Your Best Sales Employee</div>
<p><strong>Published by NKUVO Labs.</strong></p>
<p>Copyright &copy; 2026 Alejandro Soria / NKUVO Labs. All rights reserved.</p>
<p>No part of this publication may be reproduced, distributed, or transmitted in any form or by any means — including photocopying, recording, screenshotting, or other electronic or mechanical methods — without the prior written permission of the publisher, except for brief quotations used in reviews. This ebook is licensed for the personal use of the original purchaser only and may not be resold or given away.</p>
<p>First Edition. Published in the United States of America.</p>
<p><strong>Disclaimer.</strong> This book is provided for general informational and educational purposes only. It does not constitute legal, financial, tax, or professional business advice. While every effort has been made to ensure accuracy, the author and publisher make no representations or warranties with respect to the completeness or accuracy of the contents and assume no liability for any loss or damage arising from its use. App features, prices, and screens described may change over time. Results vary from business to business; nothing in this book guarantees any particular outcome.</p>
<p><strong>Trademarks.</strong> "WhatsApp" and "WhatsApp Business" are trademarks of WhatsApp LLC and/or Meta Platforms, Inc. "ChatGPT" is a trademark of OpenAI, L.L.C. All other trademarks are the property of their respective owners. This book is an independent publication and is <strong>not affiliated with, authorized by, sponsored by, or endorsed by</strong> WhatsApp, Meta, or OpenAI.</p>
<p class="legal-foot">NKUVO Labs &nbsp;&middot;&nbsp; nkuvo.com</p>
</section>'''

    body = build_body(rest_md)

    out = ['<!DOCTYPE html><html><head><meta charset="utf-8">',
           f'<style>{CSS}</style></head><body><div class="page">',
           ''.join(cover_html), legal_html, body, '</div></body></html>']
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print('HTML written:', OUT_HTML)

if __name__ == '__main__':
    main()
