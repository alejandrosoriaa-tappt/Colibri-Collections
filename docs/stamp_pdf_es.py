# -*- coding: utf-8 -*-
"""Stamp top/bottom margin rules, page numbers and a running header onto ebook.pdf."""
import fitz, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ebook-es.pdf')
MM = 72 / 25.4

LINE_COL = (0.855, 0.835, 0.780)   # warm gray #ddd5c6
TEXT_COL = (0.541, 0.522, 0.478)   # muted #8a8577
HEADER = "COMO GANAR MAS DINERO Y HACER DE WHATSAPP TU MEJOR EMPLEADO"
FONT = "helv"

def main():
    doc = fitz.open(SRC)
    W = doc[0].rect.width
    H = doc[0].rect.height
    lx, rx = 16 * MM, W - 16 * MM
    top_y = 13 * MM
    bot_y = H - 13 * MM
    header_y = 9.5 * MM
    num_y = H - 8 * MM

    # front matter (cover, title, copyright) carries no marks; numbering starts at the Contents page
    start = 0
    for i, p in enumerate(doc):
        if 'Contenido' in p.get_text():
            start = i
            break

    for idx, page in enumerate(doc):
        if idx < start:         # front matter: no lines, no header, no number
            continue
        # top & bottom rules
        page.draw_line((lx, top_y), (rx, top_y), color=LINE_COL, width=0.5)
        page.draw_line((lx, bot_y), (rx, bot_y), color=LINE_COL, width=0.5)
        # running header (centered, small caps)
        hw = fitz.get_text_length(HEADER, fontname=FONT, fontsize=6.5)
        page.insert_text((W / 2 - hw / 2, header_y), HEADER,
                         fontname=FONT, fontsize=6.5, color=TEXT_COL)
        # page number
        num = str(idx - start + 1)
        nw = fitz.get_text_length(num, fontname=FONT, fontsize=9)
        page.insert_text((W / 2 - nw / 2, num_y), num,
                         fontname=FONT, fontsize=9, color=TEXT_COL)

    tmp = SRC + '.tmp'
    doc.save(tmp, garbage=3, deflate=True)
    doc.close()
    os.replace(tmp, SRC)
    print("Stamped:", SRC)

if __name__ == '__main__':
    main()
