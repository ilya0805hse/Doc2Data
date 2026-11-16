import base64
import unittest
import pymupdf
from pdf_sources import source_page


def fixture(rotation=0):
    with pymupdf.open() as pdf:
        page=pdf.new_page(width=595,height=842)
        page.insert_text((48,65),'ACME / INVOICE',fontsize=24)
        page.insert_text((48,105),'Invoice INV-042',fontsize=14)
        page.insert_text((48,155),'Website design     $2,400.00',fontsize=14)
        page.insert_text((48,200),'Total due: $2,400.00',fontsize=18)
        page.insert_text((48,250),'Unrelated prior payment: $2,400.00',fontsize=12)
        page.set_rotation(rotation)
        pdf.new_page(width=595,height=842).insert_text((48,65),'Second page')
        return pdf.tobytes()

class SourcePageTests(unittest.TestCase):
    def test_exact_value_only_within_cited_passage(self):
        result=source_page(fixture(),1,'Total due: $2,400.00',['$2,400.00'])
        self.assertEqual(result['highlight_kind'],'value')
        self.assertEqual(len(result['boxes']),1)
        self.assertEqual(result['pages'],2)
        self.assertTrue(base64.b64decode(result['image'].split(',')[1]).startswith(b'\x89PNG'))
        self.assertLess(result['boxes'][0]['y'],.25)

    def test_passage_fallback_is_labelled(self):
        result=source_page(fixture(),1,'Total due: $2,400.00',['2400 USD'])
        self.assertEqual(result['highlight_kind'],'passage')
        self.assertTrue(result['boxes'])

    def test_unmatched_text_never_fabricates_box(self):
        result=source_page(fixture(),1,'This text does not exist',['2400'])
        self.assertEqual(result['highlight_kind'],'none')
        self.assertEqual(result['boxes'],[])

    def test_rotation_transforms_box(self):
        plain=source_page(fixture(),1,'Total due: $2,400.00',['$2,400.00'])['boxes'][0]
        result=source_page(fixture(90),1,'Total due: $2,400.00',['$2,400.00'])
        rotated=result['boxes'][0]
        self.assertAlmostEqual(rotated['x'],1-plain['y']-plain['height'],places=5)
        self.assertAlmostEqual(rotated['y'],plain['x'],places=5)
        self.assertGreater(result['width'],result['height'])

    def test_page_bounds(self):
        with self.assertRaisesRegex(ValueError,'outside'):source_page(fixture(),0)
        with self.assertRaisesRegex(ValueError,'outside'):source_page(fixture(),3)
