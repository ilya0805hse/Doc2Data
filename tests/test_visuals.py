import base64
import io
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch

import pymupdf
from docx import Document
import ingestion
import providers
import server


NO_OCR = {'available':False, 'languages':[], 'message':'Tesseract is not installed.'}
READY_OCR = {'available':True, 'languages':['eng','rus'], 'message':'Ready'}


def picture():
    with pymupdf.open() as pdf:
        page=pdf.new_page(width=400,height=160)
        page.insert_text((30,70),'Invoice total 120',fontsize=24)
        return page.get_pixmap(matrix=pymupdf.Matrix(2,2)).tobytes('png')


def scanned_pdf():
    with pymupdf.open() as pdf:
        page=pdf.new_page(width=400,height=160)
        page.insert_image(page.rect,stream=picture())
        return pdf.tobytes()


def image_docx():
    doc=Document()
    doc.add_paragraph('Invoice chart')
    doc.add_picture(io.BytesIO(picture()))
    table=doc.add_table(rows=1,cols=1)
    table.cell(0,0).paragraphs[0].add_run().add_picture(io.BytesIO(picture()))
    doc.sections[0].header.paragraphs[0].add_run().add_picture(io.BytesIO(picture()))
    data=io.BytesIO();doc.save(data)
    return data.getvalue()


class IngestionTests(unittest.TestCase):
    @patch('ingestion.ocr_status',return_value=NO_OCR)
    def test_image_only_docx_and_images_in_tables_and_headers(self,status):
        kind,units,chunks,assets,warnings=ingestion.visual_document('test.docx',image_docx())
        self.assertEqual(kind,'docx')
        self.assertEqual(len(assets),3)
        self.assertTrue(any('header' in a['location'] for a in assets))
        self.assertEqual(len({a['id'] for a in assets}),3)
        self.assertEqual(warnings,[NO_OCR['message']])
        self.assertTrue(any(c.get('source_type')=='visual' for c in chunks))

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image',return_value=('Сумма 120',[dict(text='120',x=.1,y=.2,width=.2,height=.1,confidence=92)]))
    def test_multilingual_scan_has_citable_ocr_and_measured_boxes(self,ocr,status):
        _,_,chunks,assets,warnings=ingestion.visual_document('scan.pdf',scanned_pdf(),{'ocr_languages':'eng+rus'})
        self.assertEqual(chunks[0]['source_type'],'ocr')
        self.assertIn('Сумма',chunks[0]['text'])
        self.assertEqual(ocr.call_args.args[-1],'eng+rus')
        self.assertEqual(assets[0]['words'][0]['confidence'],92)
        self.assertFalse(warnings)

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image')
    def test_native_vector_pdf_retained_without_unnecessary_ocr(self,ocr,status):
        with pymupdf.open() as pdf:
            page=pdf.new_page();page.insert_text((40,50),'Quarterly results')
            page.draw_rect((40,80,90,150))
            raw=pdf.tobytes()
        _,_,chunks,assets,_=ingestion.visual_document('chart.pdf',raw)
        self.assertEqual(chunks[0]['source_type'],'native')
        self.assertEqual(len(assets),1)
        ocr.assert_not_called()

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image',return_value=('Picture label',[]))
    def test_mixed_page_keeps_native_and_ocr(self,ocr,status):
        with pymupdf.open(stream=scanned_pdf(),filetype='pdf') as pdf:
            pdf[0].insert_text((20,20),'Native heading');raw=pdf.tobytes()
        _,_,chunks,_,_=ingestion.visual_document('mixed.pdf',raw)
        self.assertEqual({c['source_type'] for c in chunks},{'native','ocr','visual'})

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image')
    def test_missing_languages_warn_without_silently_using_english(self,ocr,status):
        *_,warnings=ingestion.visual_document('scan.pdf',scanned_pdf(),{'ocr_languages':'eng+jpn'})
        self.assertIn('jpn',warnings[0]);ocr.assert_not_called()

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image',side_effect=ValueError('OCR timed out'))
    def test_ocr_failure_retains_image(self,ocr,status):
        _,_,chunks,assets,warnings=ingestion.visual_document('scan.pdf',scanned_pdf())
        self.assertEqual(len(assets),1);self.assertIn('timed out',warnings[0])
        self.assertEqual(chunks[0]['source_type'],'visual')

    @patch('ingestion.ocr_status',return_value=NO_OCR)
    def test_native_pdf_never_renders_during_upload(self,status):
        with pymupdf.open() as pdf:
            for _ in range(205):
                pdf.new_page().insert_text((40,50),'Native report text')
            raw=pdf.tobytes()
        with patch('ingestion.render_visual',side_effect=AssertionError('Unexpected render')):
            _,units,_,assets,_=ingestion.visual_document('large.pdf',raw)
        self.assertEqual(units,205)
        self.assertTrue(all(a['data']==b'' for a in assets))
        self.assertEqual(assets[-1]['source']['page'],205)
        self.assertGreater(assets[-1]['width'],0)

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image',return_value=('Recognized image',[]))
    def test_standalone_image_ocr_without_retained_render(self,ocr,status):
        kind,_,chunks,assets,_=ingestion.visual_document('photo.png',picture())
        self.assertEqual(kind,'png')
        self.assertEqual(chunks[0]['source_type'],'ocr')
        self.assertEqual(assets[0]['data'],b'')

    def test_invalid_standalone_image_rejected_without_ocr(self):
        with self.assertRaises(Exception):
            ingestion.visual_document('broken.png',b'not an image',{'ocr_enabled':False})

    @patch('ingestion.ocr_status',return_value=READY_OCR)
    @patch('ingestion.ocr_image')
    def test_small_logo_does_not_trigger_page_ocr(self,ocr,status):
        with pymupdf.open() as pdf:
            page=pdf.new_page()
            page.insert_text((40,50),'Readable native content')
            page.insert_image((40,100,80,120),stream=picture())
            raw=pdf.tobytes()
        ingestion.visual_document('logo.pdf',raw)
        ocr.assert_not_called()

    def test_crop_matches_displayed_pixels_and_rotation(self):
        with pymupdf.open() as pdf:
            page=pdf.new_page(width=200,height=100)
            page.draw_rect((0,0,100,100),color=(1,0,0),fill=(1,0,0))
            page.draw_rect((100,0,200,100),color=(0,0,1),fill=(0,0,1))
            page.set_rotation(90)
            raw=pdf.tobytes()
        data,width,height=ingestion.render_visual(raw,{'page':1},{'x':0,'y':.5,'width':1,'height':.5})
        pix=pymupdf.Pixmap(data)
        self.assertEqual(width,height)
        self.assertEqual(pix.pixel(width//2,height//2),(0,0,255))

    def test_tsv_coordinates_and_unicode(self):
        tsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t10\t20\t30\t10\t95\tСумма\n'
        with patch('ingestion.subprocess.run',return_value=subprocess.CompletedProcess([],0,tsv.encode(),b'')):
            text,words=ingestion.ocr_image(b'png',100,100,'eng+rus')
        self.assertEqual(text,'Сумма');self.assertEqual(words[0]['x'],.1)
        with self.assertRaises(ValueError):ingestion.ocr_image(b'png',100,100,'eng;bad')

    @patch('ingestion.ocr_status',return_value=NO_OCR)
    def test_limits_and_encryption(self,status):
        with patch('ingestion.MAX_VISUALS',0),self.assertRaisesRegex(ValueError,'exceeds'):
            ingestion.visual_document('scan.pdf',scanned_pdf())
        with pymupdf.open(stream=scanned_pdf(),filetype='pdf') as pdf:
            raw=pdf.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256,owner_pw='owner',user_pw='pass')
        with self.assertRaisesRegex(ValueError,'Unlock'):server.parse_document('locked.pdf',raw)


class VisualIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.db_patch=patch.object(server,'DB',Path(self.directory.name)/'test.db');self.db_patch.start()
        with server.connection() as db:
            db.executescript('CREATE TABLE documents (id TEXT PRIMARY KEY,name TEXT,size INTEGER,kind TEXT,units INTEGER,chunks TEXT,created REAL);CREATE TABLE runs (id TEXT PRIMARY KEY,title TEXT,result TEXT,created REAL);CREATE TABLE originals (document_id TEXT PRIMARY KEY,data BLOB);CREATE TABLE settings (id INTEGER PRIMARY KEY,value TEXT);')
        server.ws.migrate(server.connection)
        self.config=providers.update({},dict(provider='ollama',vision_provider='ollama',vision_model='test-vision'))
        self.upload('scan.pdf',scanned_pdf())
        with server.connection() as db:self.doc=db.execute('SELECT id FROM documents').fetchone()[0]

    def tearDown(self):
        self.db_patch.stop();self.directory.cleanup();server.JOBS.pop('visual-run',None)

    def upload(self,name,raw):
        with server.connection() as db:
            db.execute("INSERT INTO uploads (id,workspace_id,name,status,detail,created) VALUES ('upload',?,?,'running','',0)",(server.ws.DEFAULT_WORKSPACE,name))
        server.UPLOAD_SLOTS.acquire()
        with patch('ingestion.ocr_status',return_value=NO_OCR):
            server.process_upload('upload',server.ws.DEFAULT_WORKSPACE,name,raw,self.config)

    def response(self,kind='exact'):
        return dict(role='assistant',content=json.dumps({'observations':[{'kind':kind,'text':'Invoice total 120'}]}))

    def test_upload_atomically_persists_assets_and_warnings(self):
        with server.connection() as db:
            upload=db.execute('SELECT * FROM uploads').fetchone()
            self.assertEqual(upload['status'],'complete');self.assertEqual(upload['document_id'],self.doc)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM visual_assets').fetchone()[0],1)
        self.assertTrue(server.documents()[0]['warnings'])

    def test_vision_protocols_and_cache(self):
        refs=[]
        for protocol,pid in [('ollama','ollama'),('openai','openai'),('anthropic','claude')]:
            config=providers.update(self.config,dict(provider=pid,vision_provider=pid,vision_model='vision-'+pid,api_key='fake'))
            envelope={'content':[{'type':'text','text':self.response()['content']}]} if protocol=='anthropic' else {'message':self.response(),'choices':[{'message':self.response()}]}
            with patch('server.urllib.request.urlopen',return_value=io.BytesIO(json.dumps(envelope).encode())) as network:
                result=server.inspect_visual(config,self.doc,'a1','Read the total')
            payload=json.loads(network.call_args.args[0].data)
            self.assertNotIn('tools',payload)
            self.assertEqual(payload['model'],'vision-'+pid)
            content=payload['messages'][0]
            if protocol=='ollama':self.assertTrue(content['images'])
            elif protocol=='openai':self.assertEqual(content['content'][1]['type'],'image_url')
            else:self.assertEqual(content['content'][1]['source']['media_type'],'image/png')
            with patch.object(server,'provider_call') as provider:
                self.assertEqual(server.inspect_visual(config,self.doc,'a1','Read the total'),result)
                provider.assert_not_called()
            refs.append(result['reference'])
        self.assertEqual(len(set(refs)),3)

    def test_asset_id_is_part_of_cache_and_reference(self):
        with server.connection() as db:
            db.execute("INSERT INTO visual_assets SELECT document_id,'a2',location,context,data,width,height,words FROM visual_assets")
        with patch.object(server,'provider_call',return_value=self.response()):
            first=server.inspect_visual(self.config,self.doc,'a1','Read');second=server.inspect_visual(self.config,self.doc,'a2','Read')
        self.assertNotEqual(first['reference'],second['reference'])

    def test_bad_vision_response_and_disabled_model(self):
        with self.assertRaisesRegex(ValueError,'Configure'):server.inspect_visual({},self.doc,'a1','Read')
        for content in ['not JSON','{"observations":[]}','{"observations":[{"kind":"certain","text":"120"}]}']:
            with patch.object(server,'provider_call',return_value={'content':content}),self.assertRaisesRegex(ValueError,'valid structured'):
                server.inspect_visual(self.config,self.doc,'a1','Read')

    def test_deleted_document_cannot_be_inspected_or_listed(self):
        with server.connection() as db:db.execute('UPDATE documents SET deleted=1')
        self.assertEqual(server.list_visuals([self.doc]),[])
        with self.assertRaisesRegex(ValueError,'not found'):server.inspect_visual(self.config,self.doc,'a1','Read')

    def test_agent_inspects_and_cites_image(self):
        def call(name,args):
            return dict(role='assistant',content=None,tool_calls=[dict(id='call',type='function',function=dict(name=name,arguments=json.dumps(args)))])
        def model(config,messages,tools=None, **kwargs):
            if tools==[]:return self.response('estimated')
            if messages[-1]['role']!='tool':return call('inspect_visual',dict(document_id=self.doc,asset_id='a1',question='Read total'))
            evidence=json.loads(messages[-1]['content'])
            return call('submit_extraction',dict(summary='Visual result',columns=['Total'],rows=[dict(values=['approximately 120'],cell_references=[[evidence['reference']]])]))
        server.JOBS['visual-run']={'status':'running','events':[],'workspace_id':server.ws.DEFAULT_WORKSPACE}
        with patch.object(server,'provider_call',side_effect=model):
            server.run_agent('visual-run','Read the chart',[self.doc],self.config)
        job=server.JOBS['visual-run'];self.assertEqual(job['status'],'complete',job.get('error'))
        evidence=next(iter(job['result']['references'].values()))
        self.assertEqual(evidence['source_type'],'vision');self.assertIn('[estimated]',evidence['text'])

    def test_settings_validation_and_migration_idempotence(self):
        server.ws.migrate(server.connection)
        for changes in [dict(ocr_languages='eng;cmd'),dict(vision_provider='missing'),dict(vision_model='')]:
            with self.assertRaises(ValueError):providers.update(self.config,dict(provider='ollama',**changes))
        self.assertEqual(server.documents()[0]['id'],self.doc)

    def test_visual_placeholders_cannot_be_cited(self):
        answer=dict(role='assistant',content=None,tool_calls=[dict(id='call',type='function',function=dict(name='submit_extraction',arguments=dict(summary='Bad',columns=['Total'],rows=[dict(values=[120],cell_references=[[self.doc+':c1']])])) )])
        server.JOBS['visual-run']={'status':'running','events':[]}
        with patch.object(server,'provider_call',side_effect=[answer, RuntimeError('Provider stopped')]):
            server.run_agent('visual-run','Read total',[self.doc],self.config)
        self.assertEqual(server.JOBS['visual-run']['status'],'error')
        self.assertIn('Tool needs correction', [event['title'] for event in server.JOBS['visual-run']['events']])

    def test_unselected_visual_cannot_reach_provider(self):
        answer=dict(role='assistant',content=None,tool_calls=[dict(id='call',type='function',function=dict(name='inspect_visual',arguments=dict(document_id='other',asset_id='a1',question='Read')))])
        server.JOBS['visual-run']={'status':'running','events':[]}
        with patch.object(server,'provider_call',side_effect=[answer, RuntimeError('Provider stopped')]),patch.object(server,'inspect_visual') as vision:
            server.run_agent('visual-run','Read total',[self.doc],self.config)
        vision.assert_not_called()

    def test_lazy_sources_render_without_persisting_bytes(self):
        asset=server.visual_asset(self.doc,'a1')
        self.assertGreater(len(asset['data']),100)
        with server.connection() as db:
            self.assertEqual(db.execute('SELECT length(data) FROM visual_assets').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM visual_locations').fetchone()[0],1)

    def test_selection_validation(self):
        valid=dict(document_id=self.doc,asset_id='a1',crop=dict(x=.1,y=.1,width=.5,height=.5))
        self.assertEqual(server.validate_visual_request('manual',[valid],[self.doc]),[valid])
        for mode,items,ids in [('bad',[],[self.doc]),('manual',[],[self.doc]),('manual',[valid],[]),
                               ('manual',[dict(valid,crop=dict(x=0,y=0,width=2,height=1))],[self.doc]),
                               ('manual',[dict(valid,crop=dict(x=float('nan'),y=0,width=1,height=1))],[self.doc])]:
            with self.assertRaises(ValueError):server.validate_visual_request(mode,items,ids)

    def test_crop_cache_and_evidence_keep_selection(self):
        crop=dict(x=0,y=0,width=.5,height=1)
        with patch.object(server,'provider_call',return_value=self.response()) as model:
            full=server.inspect_visual(self.config,self.doc,'a1','Read')
            region=server.inspect_visual(self.config,self.doc,'a1','Read',crop)
            again=server.inspect_visual(self.config,self.doc,'a1','Read',crop)
        self.assertEqual(model.call_count,2)
        self.assertNotEqual(full['reference'],region['reference'])
        self.assertEqual(region['crop'],crop)
        self.assertEqual(again,region)

    def test_text_mode_excludes_cached_vision_and_blocks_calls(self):
        with patch.object(server,'provider_call',return_value=self.response()):
            server.inspect_visual(self.config,self.doc,'a1','Read')
        answer=dict(role='assistant',content=None,tool_calls=[dict(id='call',type='function',function=dict(name='inspect_visual',arguments=dict(document_id=self.doc,asset_id='a1',question='Read')))])
        server.JOBS['visual-run']={'status':'running','events':[],'processing_mode':'text'}
        with patch.object(server,'provider_call',side_effect=[answer, RuntimeError('Provider stopped')]) as model,patch.object(server,'inspect_visual') as vision:
            server.run_agent('visual-run','Read',[self.doc],self.config)
        vision.assert_not_called()
        for call in model.call_args_list:
            self.assertNotIn('inspect_visual',[t['function']['name'] for t in call.kwargs['tools']])
            self.assertNotIn('Invoice total 120',json.dumps(call.args[1]))

    def test_manual_inspects_selected_crop_before_agent_and_cites_it(self):
        crop=dict(x=.1,y=.1,width=.5,height=.5)
        server.JOBS['visual-run']={'status':'running','events':[],'processing_mode':'manual',
                                  'visual_selections':[dict(document_id=self.doc,asset_id='a1',crop=crop)]}
        def model(config,messages,tools=None, **kwargs):
            if tools==[]:return self.response()
            self.assertNotIn('inspect_visual',[t['function']['name'] for t in tools])
            evidence=json.loads(next(m['content'].split(': ',1)[1] for m in messages if m.get('content','') and m['content'].startswith('User-selected visual evidence:')))[0]
            return dict(role='assistant',content=None,tool_calls=[dict(id='call',type='function',function=dict(name='submit_extraction',arguments=dict(summary='Done',columns=['Total'],rows=[dict(values=[120],cell_references=[[evidence['reference']]])])))])
        with patch.object(server,'provider_call',side_effect=model):
            server.run_agent('visual-run','Read total',[self.doc],self.config)
        job=server.JOBS['visual-run']
        self.assertEqual(job['status'],'complete',job.get('error'))
        self.assertEqual(next(iter(job['result']['references'].values()))['crop'],crop)
        self.assertEqual(job['result']['processing_mode'],'manual')

    def test_failed_upload_leaves_no_partial_document(self):
        with server.connection() as db:
            db.execute("DELETE FROM uploads")
        self.upload('broken.docx',b'not a zip')
        with server.connection() as db:
            self.assertEqual(db.execute('SELECT status FROM uploads').fetchone()[0],'error')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM documents').fetchone()[0],1)

    def test_http_visual_source_enforces_workspace_and_origin(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        url=f'http://127.0.0.1:{http.server_port}/api/visual/source'
        def request(wid,origin=None):
            headers={'Content-Type':'application/json'}
            if origin:headers['Origin']=origin
            body=dict(workspace_id=wid,document_id=self.doc,asset_id='a1',source_type='vision')
            return urllib.request.urlopen(urllib.request.Request(url,json.dumps(body).encode(),headers),timeout=5)
        try:
            with request(server.ws.DEFAULT_WORKSPACE) as response:
                data=json.load(response);self.assertTrue(data['image'].startswith('data:image/png'));self.assertEqual(data['boxes'],[])
            with server.connection() as db:db.execute("INSERT INTO workspaces VALUES ('other','Other',0,0,0)")
            with self.assertRaises(urllib.error.HTTPError) as error:request('other')
            self.assertEqual(error.exception.code,400);error.exception.close()
            with self.assertRaises(urllib.error.HTTPError) as error:request(server.ws.DEFAULT_WORKSPACE,'https://evil.example')
            self.assertEqual(error.exception.code,403);error.exception.close()
        finally:
            http.shutdown();http.server_close();thread.join()


if __name__=='__main__':unittest.main()
