"""Persistent workspace and session organization; additive legacy migration."""
import json
import time
import uuid

DEFAULT_WORKSPACE = 'workspace-default'

def migrate(connection):
    with connection() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, created REAL, deleted INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, title TEXT NOT NULL, created REAL, updated REAL, deleted INTEGER DEFAULT 0);
        ''')
        for table, fields in {
            'workspaces': [('pinned', 'INTEGER NOT NULL DEFAULT 0')],
            'sessions': [('pinned', 'INTEGER NOT NULL DEFAULT 0')],
            'documents': [('workspace_id', "TEXT DEFAULT 'workspace-default'"), ('deleted', 'INTEGER DEFAULT 0'), ('pinned', 'INTEGER NOT NULL DEFAULT 0')],
            'runs': [('session_id','TEXT'),('status',"TEXT DEFAULT 'complete'"),('prompt',"TEXT DEFAULT ''"),('events',"TEXT DEFAULT '[]'"),('error',"TEXT DEFAULT ''")]
        }.items():
            existing={r['name'] for r in db.execute(f'PRAGMA table_info({table})')}
            for name, definition in fields:
                if name not in existing: db.execute(f'ALTER TABLE {table} ADD COLUMN {name} {definition}')
        db.execute('INSERT OR IGNORE INTO workspaces (id,name,created,deleted) VALUES (?,?,?,0)',(DEFAULT_WORKSPACE,'Personal workspace',time.time()))
        for run in db.execute('SELECT * FROM runs WHERE session_id IS NULL').fetchall():
            sid='session-'+run['id']
            result=json.loads(run['result'] or '{}')
            db.execute('INSERT OR IGNORE INTO sessions (id,workspace_id,title,created,updated,deleted) VALUES (?,?,?,?,?,0)',(sid,DEFAULT_WORKSPACE,run['title'],run['created'],run['created']))
            db.execute('UPDATE runs SET session_id=?,prompt=?,events=? WHERE id=?',(sid,result.get('prompt',run['title']),json.dumps(result.get('events',[])),run['id']))
        db.execute('CREATE INDEX IF NOT EXISTS documents_workspace ON documents(workspace_id)')
        db.execute('CREATE INDEX IF NOT EXISTS runs_session ON runs(session_id)')

def workspace(db, wid):
    row=db.execute('SELECT * FROM workspaces WHERE id=? AND deleted=0',(wid,)).fetchone()
    if not row: raise ValueError('Workspace not found.')
    return dict(row)

def session(db, sid):
    row=db.execute('SELECT * FROM sessions WHERE id=? AND deleted=0',(sid,)).fetchone()
    if not row: raise ValueError('Session not found.')
    workspace(db,row['workspace_id'])
    return dict(row)

def create_session(db, wid, title='New session'):
    workspace(db,wid)
    sid=uuid.uuid4().hex[:12];now=time.time()
    db.execute('INSERT INTO sessions (id,workspace_id,title,created,updated,deleted) VALUES (?,?,?,?,?,0)',(sid,wid,title.strip()[:120] or 'New session',now,now))
    return sid

def validate_documents(db, wid, ids):
    if not ids: raise ValueError('Select at least one document.')
    rows=db.execute('SELECT id FROM documents WHERE workspace_id=? AND deleted=0',(wid,)).fetchall()
    allowed={r['id'] for r in rows}
    if not set(ids)<=allowed: raise ValueError('All selected documents must belong to this workspace.')

def validate_rows(columns, rows, seen):
    if not isinstance(columns,list) or not columns or not all(isinstance(c,str) for c in columns):
        raise ValueError('Columns must be a nonempty list of strings.')
    if not isinstance(rows,list): raise ValueError('Rows must be a list.')
    for row in rows:
        values=row.get('values')
        if not isinstance(values,list) or len(values)!=len(columns): raise ValueError('Each row must match the columns.')
        if any(isinstance(v,(dict,list)) for v in values): raise ValueError('Cell values must be scalar values or null.')
        cells=row.get('cell_references')
        if not isinstance(cells,list) or len(cells)!=len(columns): raise ValueError('Provide one cell_references array for each cell, in column order.')
        for value,refs in zip(values,cells):
            if not isinstance(refs,list) or not all(isinstance(r,str) and r in seen for r in refs): raise ValueError('Cell citations must refer to passages you have read.')
            if value is not None and not refs: raise ValueError('Every non-null cell must cite its own supporting source references.')
        row['references']=list(dict.fromkeys(r for refs in cells for r in refs))


def mark_interrupted(connection):
    # Only the serving process owns job recovery; importing/migrating must not stop live jobs.
    with connection() as db:
        db.execute("UPDATE runs SET status='error',error='The server restarted before this run finished.' WHERE status='running'")


def pin_session(db, sid, pinned):
    session(db, sid)
    if not isinstance(pinned, bool):
        raise ValueError('Pinned must be true or false.')
    db.execute('UPDATE sessions SET pinned=? WHERE id=?', (int(pinned), sid))


def update_item(db, kind, item_id, action, value=None, workspace_id=None):
    """Manage workspace/document metadata without changing source IDs or contents."""
    if kind == 'workspaces':
        workspace(db, item_id)
    elif kind == 'documents':
        workspace(db, workspace_id)
        row = db.execute('SELECT id FROM documents WHERE id=? AND workspace_id=? AND deleted=0', (item_id, workspace_id)).fetchone()
        if not row:
            raise ValueError('Document not found in this workspace.')
    else:
        raise ValueError('Unknown item type.')
    if action == 'pin':
        if not isinstance(value, bool):
            raise ValueError('Pinned must be true or false.')
        db.execute(f'UPDATE {kind} SET pinned=? WHERE id=?', (int(value), item_id))
    elif action == 'rename':
        if not isinstance(value, str) or not value.strip():
            raise ValueError('Enter a name.')
        db.execute(f'UPDATE {kind} SET name=? WHERE id=?', (value.strip()[:255 if kind == 'documents' else 100], item_id))
    elif action == 'delete':
        db.execute(f'UPDATE {kind} SET deleted=1 WHERE id=?', (item_id,))
    else:
        raise ValueError('Unknown action.')
