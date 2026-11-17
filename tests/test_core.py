import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import server

class DocumentTests(unittest.TestCase):
    def test_docx_paragraphs_and_tables(self):
        from docx import Document
        doc=Document(); doc.add_paragraph('Invoice ACME-42'); table=doc.add_table(rows=1,cols=2)
        table.cell(0,0).text='Total';table.cell(0,1).text='$120'
        stream=io.BytesIO();doc.save(stream)
        kind,units,chunks=server.parse_document('invoice.docx',stream.getvalue())
        self.assertEqual(kind,'docx');self.assertEqual(units,2)
        self.assertEqual(chunks[1]['location'],'Table 1, row 1')
        self.assertIn('$120',chunks[1]['text'])

    def test_xlsx_sheet_and_row(self):
        from openpyxl import Workbook
        wb=Workbook();wb.active.title='Purchases';wb.active.append(['Vendor','Total']);wb.active.append(['Acme',120])
        stream=io.BytesIO();wb.save(stream)
        kind,units,chunks=server.parse_document('data.xlsx',stream.getvalue())
        self.assertEqual(chunks[1]['location'],'Purchases · row 2')
        self.assertIn('120',chunks[1]['text'])

    def test_pdf_page_reference(self):
        from pypdf import PdfWriter
        from pypdf.generic import DecodedStreamObject,NameObject,DictionaryObject
        writer=PdfWriter();page=writer.add_blank_page(width=300,height=300)
        font=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')})
        page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
        content=DecodedStreamObject();content.set_data(b'BT /F1 12 Tf 20 250 Td (Invoice ACME Total 120) Tj ET')
        page[NameObject('/Contents')]=writer._add_object(content)
        stream=io.BytesIO();writer.write(stream)
        _,_,chunks=server.parse_document('invoice.pdf',stream.getvalue())
        self.assertEqual(chunks[0]['location'],'Page 1');self.assertIn('Total 120',chunks[0]['text'])

    def test_scanned_pdf_retains_visual_for_inspection(self):
        from pypdf import PdfWriter
        writer=PdfWriter();writer.add_blank_page(width=100,height=100);stream=io.BytesIO();writer.write(stream)
        with patch('ingestion.ocr_status', return_value={'available':False,'languages':[],'message':'Install OCR'}):
            _,_,chunks=server.parse_document('scan.pdf',stream.getvalue())
        self.assertEqual(chunks[0]['source_type'],'visual')
        self.assertEqual(chunks[0]['asset_id'],'a1')

    def test_retrieval_ranks_relevant_source(self):
        docs=[{'id':'d1','name':'a.txt','chunks':[{'id':'c1','location':'Text','text':'Unrelated apples'},{'id':'c2','location':'Text','text':'Invoice total 120'}]}]
        self.assertEqual(server.retrieve('invoice total',docs,1)[0]['reference'],'d1:c2')

class AgentTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old_db=server.DB;server.DB=Path(self.temp.name)/'test.db'
        with server.connection() as db:
            db.executescript('CREATE TABLE documents (id TEXT PRIMARY KEY,name TEXT,size INTEGER,kind TEXT,units INTEGER,chunks TEXT,created REAL);CREATE TABLE runs (id TEXT PRIMARY KEY,title TEXT,result TEXT,created REAL);')
            db.execute('INSERT INTO documents VALUES (?,?,?,?,?,?,?)',('d1','invoice.txt',10,'txt',1,json.dumps([{'id':'c1','location':'Text','text':'Acme invoice total $120'}]),0))
        server.ws.migrate(server.connection)
        server.JOBS['test']={'status':'running','events':[]}
    def tearDown(self):
        server.DB=self.old_db;server.JOBS.pop('test',None);self.temp.cleanup()
    def call(self,name,args):
        return {'role':'assistant','content':None,'tool_calls':[{'id':'call1','type':'function','function':{'name':name,'arguments':json.dumps(args)}}]}
    def test_agent_search_and_submit_persists_citations(self):
        answers=[self.call('search_documents',{'query':'invoice total'}),self.call('submit_extraction',{'summary':'One row','columns':['Vendor','Total'],'rows':[{'values':['Acme',120],'cell_references':[['d1:c1'],['d1:c1']]}]})]
        with patch.object(server,'provider_call',side_effect=answers) as provider:
            server.run_agent('test','Extract totals',['d1'],{'provider':'openai','model':'test'})
        self.assertEqual(server.JOBS['test']['status'],'complete')
        self.assertEqual(server.JOBS['test']['result']['references']['d1:c1']['document'],'invoice.txt')
        self.assertEqual(provider.call_count,2)
        with server.connection() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM runs').fetchone()[0],1)
    def test_invalid_citation_rejected_and_loop_bounded(self):
        answer=self.call('submit_extraction',{'summary':'Bad','columns':['Total'],'rows':[{'values':[120],'cell_references':[['invented:c1']]}]})
        with patch.object(server,'provider_call',return_value=answer) as provider:
            server.run_agent('test','Extract totals',['d1'],{'provider':'openai','model':'test'})
        self.assertEqual(server.JOBS['test']['status'],'error');self.assertEqual(provider.call_count,10)
        with server.connection() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM runs').fetchone()[0],0)
    def test_cancel_prevents_provider_call(self):
        server.JOBS['test']['cancelled']=True
        with patch.object(server,'provider_call') as provider:
            server.run_agent('test','Extract totals',['d1'],{'provider':'ollama','model':'test'})
        provider.assert_not_called();self.assertEqual(server.JOBS['test']['status'],'error')
    def test_unselected_documents_cannot_be_used(self):
        with patch.object(server,'provider_call') as provider:
            server.run_agent('test','Extract totals',['missing'],{'provider':'ollama','model':'test'})
        provider.assert_not_called();self.assertEqual(server.JOBS['test']['status'],'error')

if __name__=='__main__':unittest.main()
