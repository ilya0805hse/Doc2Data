"""Render original PDF pages and locate cited text in page coordinates."""
import base64
import re
import threading
import pymupdf

PDF_LOCK = threading.RLock()

def source_page(raw, page_number, passage='', values=None):
    with PDF_LOCK, pymupdf.open(stream=raw, filetype='pdf') as pdf:
        if not 1 <= page_number <= len(pdf):
            raise ValueError('Page is outside this PDF.')
        page = pdf[page_number-1]
        # Search literal source lines, never invent a bounding box from model output.
        lines = [line.strip() for line in passage.splitlines() if len(line.strip()) >= 4]
        regions = []
        for line in lines[:180]:
            regions.extend(page.search_for(line))
        if not regions and passage:
            words = passage.split()
            for start in range(0, min(len(words), 260), 6):
                phrase = ' '.join(words[start:start+6])
                if len(phrase) >= 12:
                    regions.extend(page.search_for(phrase))
        matches = []
        for value in (values or [])[:60]:
            if value is None or isinstance(value, bool):
                continue
            text = str(value).strip()
            if len(text) < 3:
                continue
            for rect in page.search_for(text):
                if any((rect & region).get_area() >= rect.get_area() * .5 for region in regions):
                    matches.append(rect)
        chosen = matches or regions
        boxes, seen = [], set()
        for rect in chosen:
            # Rendered pages respect rotation; transform text coordinates likewise.
            rect = (rect * page.rotation_matrix) & page.rect
            coords = tuple(round(v, 3) for v in rect)
            if coords in seen or rect.is_empty:
                continue
            seen.add(coords)
            boxes.append({'x':rect.x0/page.rect.width, 'y':rect.y0/page.rect.height,
                          'width':rect.width/page.rect.width, 'height':rect.height/page.rect.height})
        scale = min(2, 2200 / max(page.rect.width, page.rect.height))
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
        return {'page':page_number, 'pages':len(pdf), 'width':pix.width, 'height':pix.height,
                'image':'data:image/png;base64,'+base64.b64encode(pix.tobytes('png')).decode(),
                'boxes':boxes, 'highlight_kind':'value' if matches else 'passage' if boxes else 'none'}
