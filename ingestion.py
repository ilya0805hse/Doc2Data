"""Local visual indexing. Network/model calls never run during upload."""
import csv
import io
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import pymupdf
from pdf_sources import PDF_LOCK

MAX_VISUALS = 5000
MAX_PIXELS = 25_000_000


def ocr_status():
    executable = shutil.which('tesseract')
    if not executable:
        return {'available': False, 'languages': [], 'message': 'Tesseract is not installed. Install Tesseract and language packs, then restart the server.'}
    try:
        result = subprocess.run([executable, '--list-langs'], capture_output=True, text=True, timeout=10, check=True)
        languages = [s.strip() for s in result.stdout.splitlines()[1:] if re.fullmatch(r'[\w/]+', s.strip())]
        return {'available': True, 'languages': languages, 'message': 'Local Tesseract OCR is ready.'}
    except (OSError, subprocess.SubprocessError):
        return {'available': False, 'languages': [], 'message': 'Tesseract could not start. Check its installation and language packs.'}


def ocr_image(image, width, height, languages):
    """Return text and normalized word boxes measured by OCR, never a model."""
    if not re.fullmatch(r'[A-Za-z0-9_/]+(?:\+[A-Za-z0-9_/]+)*', languages):
        raise ValueError('OCR languages must be language codes separated by + (for example eng+rus).')
    with tempfile.TemporaryDirectory(prefix='doctodata-ocr-') as folder:
        path = Path(folder)/'image.png'
        path.write_bytes(image)
        try:
            result = subprocess.run(['tesseract', str(path), 'stdout', '-l', languages, 'tsv'],
                                    capture_output=True, timeout=90, check=True)
        except subprocess.TimeoutExpired:
            raise ValueError('OCR timed out on this image (90 seconds).') from None
        except (OSError, subprocess.CalledProcessError):
            raise ValueError('OCR failed. Check Tesseract and the selected language packs.') from None
    words = []
    lines = {}
    for row in csv.DictReader(io.StringIO(result.stdout.decode('utf-8', errors='replace')), delimiter='\t', quoting=csv.QUOTE_NONE):
        text = (row.get('text') or '').strip()
        if row.get('level') != '5' or not text:
            continue
        key = tuple(row[k] for k in ('page_num', 'block_num', 'par_num', 'line_num'))
        lines.setdefault(key, []).append(text)
        words.append(dict(text=text, x=int(row['left'])/width, y=int(row['top'])/height,
                          width=int(row['width'])/width, height=int(row['height'])/height,
                          confidence=float(row['conf'])))
    return '\n'.join(' '.join(line) for line in lines.values()), words


def visual_document(name, raw, config=None, progress=None):
    config = config or {}
    progress = progress or (lambda detail: None)
    ext = Path(name).suffix.lower()
    chunks, assets, warnings = [], [], []
    status = ocr_status() if config.get('ocr_enabled', True) else {'available': False, 'languages': [], 'message': 'OCR is disabled in document settings.'}
    languages = config.get('ocr_languages', 'eng')
    missing = set(languages.split('+')) - set(status['languages'])
    ocr_ready = status['available'] and not missing
    ocr_warning = ('Missing OCR language packs: '+', '.join(sorted(missing))) if status['available'] and missing else status['message']
    def chunk(text, location, **metadata):
        for start in range(0, len(text.strip()), 1400):
            chunks.append(dict(id=f'c{len(chunks)+1}', location=location, text=text.strip()[start:start+1600], **metadata))

    def visual(source, location, context='', needs_ocr=True):
        if len(assets) >= MAX_VISUALS:
            raise ValueError(f'Document exceeds {MAX_VISUALS} visual sources.')
        asset_id = f'a{len(assets)+1}'
        asset = dict(id=asset_id, location=location, context=context[:2000], data=b'',
                     width=source.get('width',0), height=source.get('height',0), words=[], source=source)
        assets.append(asset)
        if needs_ocr:
            progress(f'OCR · {location}')
            if ocr_ready:
                try:
                    data, width, height = render_visual(raw, source)
                    text, asset['words'] = ocr_image(data, width, height, languages)
                    if text.strip():
                        chunk(text, location+' · OCR', source_type='ocr', asset_id=asset_id)
                    else:
                        warnings.append(f'{location}: OCR found no text; visual inspection is available.')
                except ValueError as error:
                    warnings.append(f'{location}: {error}')
            else:
                warnings.append(ocr_warning)
        chunk('Visual source available for inspection. '+context[:800], location,
              source_type='visual', asset_id=asset_id)

    if ext == '.pdf':
        from pypdf import PdfReader
        with PDF_LOCK, pymupdf.open(stream=raw, filetype='pdf') as pdf:
            if pdf.is_encrypted:
                raise ValueError('Unlock this PDF before uploading it.')
            pdf_text = PdfReader(io.BytesIO(raw))
            if len(pdf) > MAX_VISUALS:
                raise ValueError(f'PDF exceeds {MAX_VISUALS} pages. Split it into smaller files.')
            units = len(pdf)
            for index, page in enumerate(pdf):
                location = f'Page {index+1}'
                progress(f'Reading {location} of {units}')
                text = pdf_text.pages[index].extract_text() or ''
                chunk(text, location, source_type='native')
                # Image coverage distinguishes a scan from a logo beside native text.
                image_area = sum((pymupdf.Rect(info['bbox']) & page.rect).get_area()
                                 for info in page.get_image_info())
                needs_ocr = not text.strip() or image_area > page.rect.get_area() * .5
                visual({'page': index+1, 'width':page.rect.width, 'height':page.rect.height}, location, text, needs_ocr=needs_ocr)
    elif ext in ('.png', '.jpg', '.jpeg'):
        # Validate image format and dimensions even when OCR is disabled.
        render_visual(raw, {'image': True})
        units = 1
        visual({'image': True}, 'Image 1')
    else:
        from docx import Document
        doc = Document(io.BytesIO(raw))
        units = 0
        for i, paragraph in enumerate(doc.paragraphs):
            if paragraph.text.strip():
                units += 1
                chunk(paragraph.text, f'Paragraph {i+1}', source_type='native')
        for i, table in enumerate(doc.tables):
            for j, row in enumerate(table.rows):
                units += 1
                chunk(' | '.join(c.text for c in row.cells), f'Table {i+1}, row {j+1}', source_type='native')
        # Resolve each image occurrence in its owning part (including tables, headers and footers).
        for part in doc.part.package.parts:
            element = getattr(part, 'element', None)
            if element is None:
                continue
            for node in element.iter():
                if node.tag.rsplit('}', 1)[-1] not in ('blip', 'imagedata'):
                    continue
                rid = node.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed') or node.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                if not rid:
                    warnings.append('An externally linked image was not fetched. Embed it in the DOCX first.')
                    continue
                relation = part.rels.get(rid)
                if not relation or relation.is_external:
                    warnings.append('An externally linked image was not fetched. Embed it in the DOCX first.')
                    continue
                ancestor = node
                while ancestor.getparent() is not None and ancestor.tag.rsplit('}', 1)[-1] != 'p':
                    ancestor = ancestor.getparent()
                neighbors = [ancestor.getprevious(), ancestor, ancestor.getnext()]
                context = ' '.join(n.text for element in neighbors if element is not None for n in element.iter()
                                   if n.tag.rsplit('}', 1)[-1] == 't' and n.text)
                paragraphs = list(part.element.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
                paragraph_number = paragraphs.index(ancestor)+1 if ancestor in paragraphs else 0
                location = f'{str(part.partname).split("/")[-1]} · Paragraph {paragraph_number} · Image {len(assets)+1}'
                progress('Reading '+location)
                try:
                    visual({'part': str(relation.target_part.partname).lstrip('/')}, location, context)
                except (RuntimeError, ValueError) as error:
                    if 'exceeds' in str(error):
                        raise
                    warnings.append(f'{location}: unsupported embedded image; export this DOCX as PDF to inspect it.')
        if any(str(p.partname).startswith('/word/charts/') or str(p.partname).startswith('/word/diagrams/') for p in doc.part.package.parts):
            warnings.append('Native Word charts/SmartArt may not include a readable preview. Export as PDF to inspect their complete appearance.')
        units += len(assets)
    if not chunks:
        raise ValueError('No readable content found. For unsupported Word drawings, export as PDF.')
    return ext[1:], units, chunks, assets, list(dict.fromkeys(warnings))


def render_visual(raw, source, crop=None):
    """Render one disposable image; normalized crops refer to the displayed orientation."""
    with PDF_LOCK:
        if 'page' in source:
            with pymupdf.open(stream=raw, filetype='pdf') as pdf:
                number = source['page']
                if not 1 <= number <= len(pdf):
                    raise ValueError('Page is outside this PDF.')
                page = pdf[number-1]
                scale = min(3, 2200/max(page.rect.width, page.rect.height))
                pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), colorspace=pymupdf.csRGB, alpha=False)
        else:
            if 'part' in source:
                import zipfile
                with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                    raw = archive.read(source['part'])
            pix = pymupdf.Pixmap(raw)
            if pix.width*pix.height > MAX_PIXELS:
                raise ValueError('Image exceeds 25 megapixels.')
            if pix.colorspace is None:
                raise ValueError('Image has no color space.')
            if pix.colorspace.n != 3:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            if pix.alpha:
                pix = pymupdf.Pixmap(pix, 0)
            while max(pix.width, pix.height) > 2200:
                pix.shrink(1)
        if crop:
            # Crop the rendered orientation, including rotated PDF pages.
            rect = pymupdf.IRect(int(crop['x']*pix.width), int(crop['y']*pix.height),
                                max(1, round((crop['x']+crop['width'])*pix.width)),
                                max(1, round((crop['y']+crop['height'])*pix.height)))
            target = pymupdf.Pixmap(pix.colorspace, rect, False)
            target.copy(pix, rect)
            pix = target
        return pix.tobytes('png'), pix.width, pix.height
