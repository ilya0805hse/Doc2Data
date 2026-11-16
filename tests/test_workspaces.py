import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import server
import workspace_store as ws

class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=server.DB;server.DB=Path(self.tmp.name)/'test.db'
        with server.connection() as db:
            db.executescript('CREATE TABLE documents (id TEXT PRIMARY KEY,name TEXT,size INTEGER,kind TEXT,units INTEGER,chunks TEXT,created REAL);CREATE TABLE runs (id TEXT PRIMARY KEY,title TEXT,result TEXT,created REAL);')
            db.execute('INSERT INTO documents VALUES (?,?,?,?,?,?,?)',('d1','first.txt',20,'txt',1,json.dumps([{'id':'c1','text':'Revenue 120','location':'Text'}]),1))
            db.execute('INSERT INTO runs VALUES (?,?,?,?)',('old-run','Original extraction',json.dumps({'prompt':'Original prompt','events':[]}),1))
        ws.migrate(server.connection)
    def tearDown(self):
        server.DB=self.old;self.tmp.cleanup();server.JOBS.pop('new-run',None)
    def test_legacy_data_is_preserved_and_migration_idempotent(self):
        ws.migrate(server.connection)
        with server.connection() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT prompt FROM runs').fetchone()[0],'Original prompt')
            self.assertEqual(db.execute('SELECT workspace_id FROM documents').fetchone()[0],ws.DEFAULT_WORKSPACE)
    def test_workspace_documents_are_isolated(self):
        with server.connection() as db:
            db.execute('INSERT INTO workspaces (id,name,created,deleted) VALUES (?,?,?,0)',('second','Second',2))
            sid=ws.create_session(db,'second')
            with self.assertRaisesRegex(ValueError,'belong'):ws.validate_documents(db,'second',['d1'])
            self.assertEqual(ws.session(db,sid)['workspace_id'],'second')
        self.assertEqual(server.documents(True,'second'),[])
        self.assertEqual(len(server.documents(True,ws.DEFAULT_WORKSPACE)),1)
    def test_deleted_workspace_blocks_sessions_but_can_be_restored(self):
        with server.connection() as db:
            db.execute('UPDATE workspaces SET deleted=1')
            with self.assertRaisesRegex(ValueError,'Workspace not found'):ws.session(db,'session-old-run')
            db.execute('UPDATE workspaces SET deleted=0')
            self.assertEqual(ws.session(db,'session-old-run')['title'],'Original extraction')
    def test_cell_citations_cannot_be_missing_or_invented(self):
        for rows in [[{'values':[120],'references':['d1:c1']}],[{'values':[120],'cell_references':[[]]}],[{'values':[120],'cell_references':[['fake:c1']]}]]:
            with self.assertRaises(ValueError):ws.validate_rows(['Revenue'],rows,{'d1:c1'})
    def test_null_cells_and_independent_sources(self):
        rows=[{'values':[120,None,140],'cell_references':[['d1:c1'],[],['d2:c4']]}]
        ws.validate_rows(['2023','2024','2025'],rows,{'d1:c1','d2:c4'})
        self.assertEqual(rows[0]['references'],['d1:c1','d2:c4'])
    def test_run_persists_in_session_with_cell_references(self):
        with server.connection() as db:
            sid=ws.create_session(db,ws.DEFAULT_WORKSPACE)
            db.execute('INSERT INTO runs (id,title,result,created,session_id,status,prompt) VALUES (?,?,?,?,?,?,?)',('new-run','Revenue','{}',2,sid,'running','Revenue'))
        server.JOBS['new-run']={'status':'running','events':[],'session_id':sid,'workspace_id':ws.DEFAULT_WORKSPACE}
        message={'role':'assistant','tool_calls':[{'id':'call1','function':{'name':'submit_extraction','arguments':json.dumps({'summary':'Revenue found','columns':['Revenue'],'rows':[{'values':[120],'cell_references':[['d1:c1']]}]})}}]}
        with patch.object(server,'provider_call',return_value=message):
            server.run_agent('new-run','Revenue',['d1'],{'provider':'openai','model':'test'})
        with server.connection() as db:run=db.execute('SELECT * FROM runs WHERE id=?',('new-run',)).fetchone()
        self.assertEqual(run['session_id'],sid);self.assertEqual(run['status'],'complete')
        self.assertEqual(json.loads(run['result'])['rows'][0]['cell_references'],[['d1:c1']])
        self.assertTrue(all(e['status']=='complete' for e in json.loads(run['events'])))
    def test_interrupted_runs_are_recoverable_as_failed_turns(self):
        with server.connection() as db:db.execute("UPDATE runs SET status='running'")
        ws.mark_interrupted(server.connection)
        with server.connection() as db:run=db.execute('SELECT * FROM runs').fetchone()
        self.assertEqual(run['status'],'error');self.assertIn('restarted',run['error'])
        self.assertEqual(run['prompt'],'Original prompt')

    def test_session_pins_persist_and_migration_preserves_them(self):
        with server.connection() as db:
            sid=ws.create_session(db,ws.DEFAULT_WORKSPACE,'Pinned session')
            ws.pin_session(db,sid,True)
        ws.migrate(server.connection)
        with server.connection() as db:
            self.assertEqual(ws.session(db,sid)['pinned'],1)
            self.assertEqual(ws.session(db,'session-old-run')['pinned'],0)
            rows=db.execute('SELECT id FROM sessions ORDER BY pinned DESC,updated DESC').fetchall()
            self.assertEqual(rows[0]['id'],sid)
            ws.pin_session(db,sid,False)
            self.assertEqual(ws.session(db,sid)['pinned'],0)

    def test_pin_rejects_deleted_session_workspace_and_invalid_values(self):
        with server.connection() as db:
            sid=ws.create_session(db,ws.DEFAULT_WORKSPACE)
            with self.assertRaises(ValueError): ws.pin_session(db,sid,'true')
            db.execute('UPDATE sessions SET deleted=1 WHERE id=?',(sid,))
            with self.assertRaises(ValueError): ws.pin_session(db,sid,True)
            db.execute('UPDATE sessions SET deleted=0 WHERE id=?',(sid,))
            db.execute('UPDATE workspaces SET deleted=1 WHERE id=?',(ws.DEFAULT_WORKSPACE,))
            with self.assertRaises(ValueError): ws.pin_session(db,sid,True)

    def test_workspace_and_document_metadata_survive_migration(self):
        with server.connection() as db:
            ws.update_item(db,'workspaces',ws.DEFAULT_WORKSPACE,'pin',True)
            ws.update_item(db,'workspaces',ws.DEFAULT_WORKSPACE,'rename','Renamed workspace')
            ws.update_item(db,'documents','d1','pin',True,ws.DEFAULT_WORKSPACE)
            ws.update_item(db,'documents','d1','rename','New name.txt',ws.DEFAULT_WORKSPACE)
            before=dict(db.execute('SELECT * FROM documents WHERE id="d1"').fetchone())
        ws.migrate(server.connection)
        with server.connection() as db:
            self.assertEqual(ws.workspace(db,ws.DEFAULT_WORKSPACE)['pinned'],1)
            self.assertEqual(ws.workspace(db,ws.DEFAULT_WORKSPACE)['name'],'Renamed workspace')
            after=dict(db.execute('SELECT * FROM documents WHERE id="d1"').fetchone())
            self.assertEqual(after,before)
            self.assertEqual(after['name'],'New name.txt')
            self.assertEqual(after['pinned'],1)
            self.assertEqual(json.loads(after['chunks'])[0]['text'],'Revenue 120')
            ws.update_item(db,'documents','d1','pin',False,ws.DEFAULT_WORKSPACE)
            self.assertEqual(db.execute('SELECT pinned FROM documents WHERE id="d1"').fetchone()[0],0)

    def test_document_actions_enforce_workspace_and_retain_sources(self):
        with server.connection() as db:
            db.execute('INSERT INTO workspaces (id,name,created) VALUES (?,?,?)',('other','Other',3))
            for action,value in [('pin',True),('rename','Wrong'),('delete',None)]:
                with self.assertRaises(ValueError):ws.update_item(db,'documents','d1',action,value,'other')
            with self.assertRaises(ValueError):ws.update_item(db,'documents','d1','rename',' ',ws.DEFAULT_WORKSPACE)
            with self.assertRaises(ValueError):ws.update_item(db,'workspaces',ws.DEFAULT_WORKSPACE,'pin','true')
            ws.update_item(db,'documents','d1','delete',workspace_id=ws.DEFAULT_WORKSPACE)
            row=db.execute('SELECT * FROM documents WHERE id="d1"').fetchone()
            self.assertEqual(row['deleted'],1)
            self.assertEqual(json.loads(row['chunks'])[0]['text'],'Revenue 120')
            with self.assertRaises(ValueError):ws.update_item(db,'documents','d1','pin',True,ws.DEFAULT_WORKSPACE)
