const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const paths={panel:'M3 4h18v16H3z M14 4v16',folder:'M3 6h7l2 2h9v12H3z',chat:'M3 4h18v13H8l-5 4z M7 9h10 M7 13h6',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',files:'M8 3h8l4 4v14H8z M16 3v5h4 M4 17H3V3h2 M11 12h6 M11 16h6',history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v6l4 2',sliders:'M4 3v6m0 4v8 M12 3v11m0 4v3 M20 3v3m0 4v11 M1 9h6v4H1z M9 14h6v4H9z M17 6h6v4h-6z',terminal:'M3 4h18v16H3z M6 8l4 4-4 4 M13 16h5',shield:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',plus:'M12 5v14 M5 12h14',table:'M3 4h18v16H3z M3 9h18 M3 14h18 M9 4v16',cpu:'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',lock:'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4',upload:'M12 16V3 M7 8l5-5 5 5 M4 15v5h16v-5',info:'M12 11v6 M12 7v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',code:'M8 5l-7 7 7 7 M16 5l7 7-7 7 M14 3l-4 18',link:'M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-3 3 M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l3-3',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',sparkles:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z M20 2v4 M18 4h4',chevron:'M6 9l6 6 6-6',arrow:'M4 12h16 M14 6l6 6-6 6'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.files}"/></svg>`;
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={workspaces:[],workspaceId:null,sessions:[],sessionId:null,docs:[],selected:new Set(),turns:[],settings:{provider:'ollama',model:'qwen3:8b',ollama_url:'http://localhost:11434'},tabs:{},evidence:null,visualSelections:[]};
let toastTimer,loadVersion=0,pollTimer,pdfViewerToken=0,activityTimer;
function toast(message){$('#toast').textContent=diagnosticText(message);$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),5500)}
async function api(path,body){const r=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error ? diagnosticText(data.error) : t("Request failed")),{remoteTargets:r.status===409?data.remote_targets:null});return data}
function modal(title,html){if($('#modal').classList.contains('visual-picker-dialog'))disposeVisualPicker();$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
$('#close-modal').onclick=()=>$('#modal').close();$('#modal').onclick=e=>{if(e.target===$('#modal'))$('#modal').close()};
function statusIcon(status){return `<span class="step-icon ${status}" aria-label="${t(status)}"><span>${status==='error'?'×':status==='running'?'':'✓'}</span></span>`}
function activeRun(){return state.turns.find(t=>t.status==='running')}
function saveDraft(){if(state.sessionId)localStorage.setItem('draft:'+state.sessionId,$('#prompt').value)}
function clearEvidence(){++pdfViewerToken;state.evidence=null;$('#evidence-context').innerHTML='';$('#evidence-body').innerHTML=`<div class="evidence-empty"><div class="evidence-symbol">${icon('files')}</div><h3>${t("Every answer has a source.")}</h3><p>${t("Click a cell in the output table to inspect the supporting document here.")}</p><div class="evidence-guide"><span>1</span>${t("Select an extracted value")}</div><div class="evidence-guide"><span>2</span>${t("Review its highlighted source")}</div><div class="evidence-guide"><span>3</span>${t("Keep your conversation in view")}</div></div>`;$$('.cell-button.selected').forEach(b=>b.classList.remove('selected'))}
$('#clear-evidence').onclick=()=>{clearEvidence();if(matchMedia('(max-width:900px)').matches)panelLayout.setEvidenceOpen(false)};
function showEvidencePane(){panelLayout.setEvidenceOpen(true)}
function workspaceName(workspace){
 return workspace.id==='workspace-default'&&workspace.name==='Personal workspace'?t('Personal workspace'):workspace.name;
}
function sessionTitle(session){
 return !session?.title||session.title==='New session'?t('New session'):session.title;
}
function renderWorkspaceList(){
 const workspace=state.workspaces.find(w=>w.id===state.workspaceId);
 const name=workspace&&workspaceName(workspace);
 $('#workspace-current').textContent=name||t("Choose workspace");
 $('#workspace-select').title=name||t("Choose workspace");
 $('#workspace-name').textContent=name||t("Create a workspace");
 $('#new-session').disabled=!state.workspaceId;$('#add-doc').disabled=!state.workspaceId;$('#upload-zone').disabled=!state.workspaceId;
}
function renderSessions(){
 closeSessionActions();
 $('#session-count').textContent=state.sessions.length;
 $('#session-list').innerHTML=state.sessions.length?state.sessions.map(s=>`<div class="session-row ${s.id===state.sessionId?'active':''}"><button class="session-item" data-session="${esc(s.id)}" title="${esc(sessionTitle(s))}" ${s.id===state.sessionId?'aria-current="true"':''}>${icon('chat')}<span>${esc(sessionTitle(s))}</span>${s.pinned?`<span class="session-pin" aria-label="${t("Pinned")}" title="${t("Pinned")}">◆</span>`:''}</button><button class="icon-button session-more" data-session-menu="${esc(s.id)}" aria-label="${t("Options for {0}", esc(sessionTitle(s)))}" title="${t("Session options")}" aria-haspopup="menu" aria-expanded="false" aria-controls="session-actions">•••</button></div>`).join(''):`<div class="sidebar-empty">${t("Start a session to work with your documents.")}</div>`;
 $$('[data-session]').forEach(b=>b.onclick=()=>switchSession(b.dataset.session));
 $$('[data-session-menu]').forEach(b=>b.onclick=()=>openSessionActions(b));
 $('#session-title').textContent=sessionTitle(state.sessions.find(s=>s.id===state.sessionId));
}
function renderDocs(){closeItemActions();$('#document-count').textContent=state.docs.length;$('#document-list').innerHTML=state.docs.length?state.docs.map(d=>`<div class="document-item"><input class="doc-checkbox" type="checkbox" aria-label="${t("Select {0}", esc(d.name))}" data-doc="${esc(d.id)}" ${state.selected.has(d.id)?'checked':''}><span class="file-icon">${esc(d.kind.toUpperCase())}</span><div class="doc-info"><button class="doc-name" data-preview="${esc(d.id)}" title="${esc(d.name)}">${esc(d.name)}</button><div class="doc-meta">${t("{0} · {1} KB{2}", d.kind==='pdf'?t("{0} pages",d.units):t("{0} passages",d.chunk_count), Math.max(1,Math.round(d.size/1024)), d.warnings?.length?` · <span title="${esc(d.warnings.map(processingWarning).join(' · '))}">${t("⚠ Processing warnings")}</span>`:'')}</div></div>${d.pinned?`<span class="session-pin" aria-label="${t("Pinned")}">◆</span>`:''}<button class="icon-button session-more" data-document-menu="${esc(d.id)}" aria-label="${t("Options for document {0}", esc(d.name))}" aria-haspopup="menu" aria-expanded="false">•••</button></div>`).join(''):`<div class="sidebar-empty">${t("Add documents to this workspace to give the agent context.")}</div>`;$$('[data-doc]').forEach(b=>b.onchange=()=>{b.checked?state.selected.add(b.dataset.doc):state.selected.delete(b.dataset.doc);updateComposer()});$$('[data-preview]').forEach(b=>b.onclick=()=>previewDocument(b.dataset.preview));$$('[data-document-menu]').forEach(b=>b.onclick=()=>openItemActions('documents',state.docs.find(d=>d.id===b.dataset.documentMenu),b));updateComposer()}
function updateComposer(){renderOutputControls();renderVisualSelections();const run=activeRun();$('#run-btn').classList.toggle('is-running',!!run);$('#run-btn').innerHTML=run?'■':icon('arrow');$('#run-btn').title=run?t("Stop extraction"):t("Run extraction");$('#run-btn').setAttribute('aria-label',run?t("Stop extraction"):t("Run extraction"));$('#prompt').disabled=!!run;$('#context-count').textContent=t("{0} of {1} documents selected", state.selected.size, state.docs.length);$('#run-btn').disabled=!state.workspaceId;$('#composer-model-name').textContent=state.settings.model}
function renderSettings(){updateComposer()}
function activityElapsed(turn,now=Date.now()){
 const events=turn.events?.length?turn.events:turn.result?.events||[];
 const times=events.map(event=>event.time).filter(time=>Number.isFinite(time)&&time>0);
 const start=times[0]||turn.created;
 const end=turn.status==='running'?now/1000:times[times.length-1];
 if(!Number.isFinite(start)||!Number.isFinite(end))return null;
 return Math.max(0,Math.floor(end-start));
}
function formatElapsed(seconds){
 const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),remaining=seconds%60;
 return hours?t("{0}h {1}m {2}s",hours,minutes,remaining):minutes?t("{0}m {1}s",minutes,remaining):t("{0}s",remaining);
}
function activityTimerHTML(turn){
 const elapsed=activityElapsed(turn);
 if(elapsed===null)return '';
 return `<span class="activity-timer" data-timer-run="${esc(turn.id)}" role="timer" aria-label="${turn.status==='running'?t("Elapsed time"):t("Run duration")}">${formatElapsed(elapsed)}</span>`;
}
function refreshActivityTimers(){
 clearInterval(activityTimer);
 if(!activeRun())return;
 activityTimer=setInterval(()=>{
  $$('[data-timer-run]').forEach(el=>{
   const turn=state.turns.find(turn=>turn.id===el.dataset.timerRun);
   if(turn?.status!=='running')return;
   const elapsed=activityElapsed(turn);
   if(elapsed!==null)el.textContent=formatElapsed(elapsed);
  });
 },1000);
}
function activityHTML(turn){let events=turn.events?.length?turn.events:turn.result?.events||[];if(!events.length&&turn.status!=='running')return '';const status=turn.status;return `<div class="activity-frame"><details class="activity-block" ${status==='running'?'open':''}><summary>${statusIcon(status)}${status==='running'?t("Agent is working"):status==='error'?t("Run failed"):t("{0} steps completed", events.length)}</summary><div class="activity-list">${events.map((e,i)=>{let st=e.status||((e.title==='Run ended')?'error':'complete');if(status!=='running'&&st==='running')st=status==='error'?'error':'complete';return `<div class="activity-item">${statusIcon(st)}<div><strong>${esc(t(e.title))}</strong><small>${esc(activityDetail(e))}</small></div></div>`}).join('')}</div></details>${activityTimerHTML(turn)}</div>`}
function cellRefs(row,j){return row.cell_references?.[j]||row.references||[]}
function outputHTML(turn){const r=turn.result;if(!r?.columns)return '';const tab=state.tabs[turn.id]||'table',refs=Object.keys(r.references||{}),legacy=r.rows.some(row=>!row.cell_references);let content='';if(tab==='table'){content=`<div class="output-scroll"><table class="output-table"><thead><tr><th>#</th>${r.columns.map((c,j)=>`<th>${esc(c)}${r.output_mode==='mixed'&&j>=r.output_template.columns.length?` <small class="output-origin">${t("Added")}</small>`:''}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row,i)=>`<tr><td class="row-number">${i+1}${r.output_mode==='mixed'&&r.output_template.rows.length&&i>=r.output_template.rows.length?` <small class="output-origin">${t("Added")}</small>`:''}</td>${row.values.map((v,j)=>{const cr=cellRefs(row,j).filter(ref=>r.references[ref]);const fixed=r.output_template?.rows[i]?.[j]!=null;return `<td>${fixed?`<span class="null-cell">${esc(v)} <small class="output-origin">${t("Provided")}</small></span>`:v===null?`<span class="null-cell" title="${t("Not found in selected sources")}">—</span>`:cr.length?`<button class="cell-button ${state.evidence?.turn===turn.id&&state.evidence.row===i&&state.evidence.col===j?'selected':''}" data-cell-run="${esc(turn.id)}" data-row="${i}" data-col="${j}" title="${row.cell_references?t("View cell evidence"):t("View legacy row evidence")}"><span>${esc(v)}</span><span class="citation-number">${refs.indexOf(cr[0])+1}${cr.length>1?' +'+(cr.length-1):''}</span></button>`:`<span class="null-cell">${t("{0} · no source", esc(v))}</span>`}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}else if(tab==='json'){content=`<pre class="json-output">${esc(JSON.stringify(r,null,2))}</pre>`}else{content=`<div class="output-scroll">${refs.map((ref,i)=>{const source=r.references[ref];return `<article class="reference-card"><h4>${i+1}. ${esc(source.document)} · ${esc(sourceLocation(source.location))}</h4><button class="button" data-source-run="${esc(turn.id)}" data-ref="${esc(ref)}">${t("View evidence ↗")}</button><p>${esc(source.text)}</p></article>`}).join('')}</div>`}return `<div class="output-card"><div class="output-toolbar"><div class="output-tabs">${['table','json','references'].map(key=>`<button class="output-tab ${key===tab?'active':''}" data-tab-run="${esc(turn.id)}" data-tab="${key}">${{table:t("Table"),json:'JSON',references:t("Sources")}[key]}</button>`).join('')}</div><button class="button" data-export="${esc(turn.id)}">${icon('download')}${t("Export")}</button></div>${content}<div class="output-footer"><span>${t("{0} rows · {1} columns", r.rows.length, r.columns.length)}</span><span>${t("Click a value to inspect its source ↗")}</span></div>${legacy?`<div class="legacy-note">${t("Earlier extraction · citations are row-level. Run again to generate precise citations for each cell.")}</div>`:''}</div>`}
// Preserve each activity panel across polling renders, including collapsed panels.
function captureActivityState(container){
 const panels=new Map();
 container.querySelectorAll('.turn').forEach(turn=>{
  const details=turn.querySelector('.activity-block'),list=turn.querySelector('.activity-list');
  if(!details||!list)return;
  const position=details.open?{top:list.scrollTop,follow:list.scrollHeight-list.scrollTop-list.clientHeight<32}:list.activityPosition;
  panels.set(turn.dataset.id,{open:details.open,position});
 });
 return panels;
}
function restoreActivityState(container,panels){
 container.querySelectorAll('.turn').forEach(turn=>{
  const details=turn.querySelector('.activity-block'),list=turn.querySelector('.activity-list');
  if(!details||!list)return;
  const saved=panels.get(turn.dataset.id);
  if(saved)details.open=saved.open;
  list.activityPosition=saved?.position||{top:0,follow:true};
  const restore=()=>{
   if(!details.open)return;
   list.scrollTop=list.activityPosition.follow?list.scrollHeight:list.activityPosition.top;
  };
  list.addEventListener('scroll',()=>{
   if(details.open)list.activityPosition={top:list.scrollTop,follow:list.scrollHeight-list.scrollTop-list.clientHeight<32};
  });
  details.addEventListener('toggle',restore);
  restore();
 });
}
function renderConversation(){const el=$('#conversation'),nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<100,oldScroll=el.scrollTop;const activityState=captureActivityState(el);el.innerHTML=state.turns.length?state.turns.map(turn=>`<section class="turn" data-id="${esc(turn.id)}"><div class="user-message">${esc(turn.prompt||turn.title)}</div><div class="assistant-label">${icon('sparkles')}${t("Extraction agent")}<small>${esc(turn.result?.model||'')}</small></div>${activityHTML(turn)}${turn.status==='error'?`<div class="error-message">${esc(turn.error?diagnosticText(turn.error):t("This extraction could not finish."))}</div>`:''}${turn.result?.summary?`<p class="assistant-summary">${esc(turn.result.summary)}</p>`:''}${outputHTML(turn)}</section>`).join(''):`<section class="welcome"><div class="welcome-symbol">${icon('chat')}</div><h2>${t("Your documents. A conversation.")}</h2><p>${t("Ask a question, extract a table, or compare your sources.")}<br>${t("The agent does the work. You can inspect every answer.")}</p><div class="welcome-prompts"><button data-prompt="${t("Extract the key financial metrics from the selected documents. Cite each value separately.")}">${t("Extract financial data")} <span>↗</span></button><button data-prompt="${t("Compare the selected documents and show differences in a table, with a source for each cell.")}">${t("Compare documents")} <span>↗</span></button><button data-prompt="${t("Extract key parties, dates, and obligations from these contracts, with citations for each cell.")}">${t("Find contract terms")} <span>↗</span></button></div></section>`;restoreActivityState(el,activityState);refreshActivityTimers();$$('[data-prompt]').forEach(b=>b.onclick=()=>{$('#prompt').value=b.dataset.prompt;$('#prompt').focus();saveDraft()});$$('[data-tab-run]').forEach(b=>b.onclick=()=>{state.tabs[b.dataset.tabRun]=b.dataset.tab;renderConversation()});$$('[data-cell-run]').forEach(b=>b.onclick=()=>selectCell(b.dataset.cellRun,Number(b.dataset.row),Number(b.dataset.col)));$$('[data-source-run]').forEach(b=>b.onclick=()=>selectSource(b.dataset.sourceRun,b.dataset.ref));$$('[data-export]').forEach(b=>b.onclick=()=>exportTurn(b.dataset.export));el.scrollTop=nearBottom?el.scrollHeight:oldScroll;updateComposer()}
async function loadWorkspaces(){state.workspaces=await api('workspaces');renderWorkspaceList()}
async function switchWorkspace(wid){state.visualSelections=[];saveDraft();clearTimeout(pollTimer);const version=++loadVersion;state.workspaceId=wid||null;state.sessionId=null;state.turns=[];state.docs=[];state.sessions=[];state.selected=new Set();clearEvidence();renderWorkspaceList();renderSessions();renderDocs();renderConversation();$('#prompt').value='';if(!wid)return;localStorage.setItem('workspace',wid);try{const [docs,sessions]=await Promise.all([api('documents?workspace_id='+encodeURIComponent(wid)),api('sessions?workspace_id='+encodeURIComponent(wid))]);if(version!==loadVersion)return;state.docs=docs;state.sessions=sessions;state.selected=new Set(docs.map(d=>d.id));renderDocs();renderSessions();const last=localStorage.getItem('session:'+wid);if(sessions.length)await switchSession(sessions.some(s=>s.id===last)?last:sessions[0].id)}catch(e){toast(e.message)}}
async function switchSession(sid){state.visualSelections=[];saveDraft();clearTimeout(pollTimer);const version=++loadVersion;state.sessionId=sid;state.turns=[];clearEvidence();localStorage.setItem('session:'+state.workspaceId,sid);$('#prompt').value=localStorage.getItem('draft:'+sid)||'';renderSessions();renderConversation();try{const turns=await api('runs?session_id='+encodeURIComponent(sid));if(version!==loadVersion)return;state.turns=turns;renderConversation();$('#conversation').scrollTop=$('#conversation').scrollHeight;schedulePoll()}catch(e){toast(e.message)}}
function schedulePoll(){clearTimeout(pollTimer);if(activeRun())pollTimer=setTimeout(pollSession,1000)}
async function pollSession(){const sid=state.sessionId,version=loadVersion;try{const turns=await api('runs?session_id='+encodeURIComponent(sid));if(version!==loadVersion)return;state.turns=turns;renderConversation();schedulePoll()}catch(e){if(version===loadVersion){toast(t("Connection interrupted. Retrying session status…"));pollTimer=setTimeout(pollSession,3000)}}}

function createWorkspace(){modal(t("Create workspace"),`<p>${t("Keep documents and sessions together in a separate workspace.")}</p><label class="form-field">${t("Workspace name")}<input id="workspace-new-name" placeholder="${t("e.g. Financial reports")}" maxlength="100"></label><div class="modal-actions"><button class="button dark" id="workspace-create">${t("Create workspace")}</button></div>`);$('#workspace-new-name').focus();$('#workspace-create').onclick=async()=>{try{const {id}=await api('workspaces',{name:$('#workspace-new-name').value});$('#modal').close();await loadWorkspaces();await switchWorkspace(id);await createSession()}catch(e){toast(e.message)}};$('#workspace-new-name').onkeydown=e=>{if(e.key==='Enter')$('#workspace-create').click()}}
$('#new-workspace').onclick=createWorkspace;
async function manageWorkspaces(){
 try{
  const deleted=await api('workspaces?deleted=1');
  modal(t("Recently deleted workspaces"),`<p>${t("Restore a workspace with its documents and sessions.")}</p>${deleted.map(w=>`<div class="workspace-manage-row"><strong>${esc(workspaceName(w))}</strong><button class="button" data-restore-workspace="${esc(w.id)}">${t("Restore")}</button></div>`).join('')||`<p>${t("No deleted workspaces.")}</p>`}`);
  $$('[data-restore-workspace]').forEach(b=>b.onclick=async()=>{try{await api('workspaces/restore',{id:b.dataset.restoreWorkspace});await loadWorkspaces();if(!state.workspaceId)await switchWorkspace(b.dataset.restoreWorkspace);await manageWorkspaces()}catch(e){toast(e.message)}});
 }catch(e){toast(e.message)}
}

let itemMenuTrigger=null;
function closeItemActions(){const menu=$('#item-actions');if(menu.matches(':popover-open'))menu.hidePopover();itemMenuTrigger?.setAttribute('aria-expanded','false')}
$('#item-actions').addEventListener('toggle',e=>{if(e.newState==='closed')itemMenuTrigger?.setAttribute('aria-expanded','false')});
function closeWorkspaceList(){closeItemActions();const list=$('#workspace-list');if(list.matches(':popover-open'))list.hidePopover()}
$('#workspace-list').addEventListener('toggle',e=>$('#workspace-select').setAttribute('aria-expanded',String(e.newState==='open')));
function placePopup(popup,trigger){
 const rect=trigger.getBoundingClientRect();
 popup.style.left=Math.max(8,Math.min(rect.left,innerWidth-popup.offsetWidth-8))+'px';
 popup.style.top=(rect.bottom+popup.offsetHeight+8>innerHeight?Math.max(8,rect.top-popup.offsetHeight-4):rect.bottom+4)+'px';
}
function renderWorkspacePopup(){
 closeItemActions();
 // Keep the action popover outside the list while replacing its rows.
 document.body.append($('#item-actions'));
 const list=$('#workspace-list');
 list.innerHTML=`<div class="workspace-options">${state.workspaces.map(w=>`<div class="session-row ${w.id===state.workspaceId?'active':''}"><button class="workspace-choice" data-workspace="${esc(w.id)}" ${w.id===state.workspaceId?'aria-current="true"':''} title="${esc(workspaceName(w))}"><span>${esc(workspaceName(w))}</span>${w.pinned?`<span class="session-pin" aria-label="${t("Pinned")}">◆</span>`:''}</button><button class="icon-button session-more" data-workspace-menu="${esc(w.id)}" aria-label="${t("Options for workspace {0}", esc(workspaceName(w)))}" aria-haspopup="menu" aria-expanded="false">•••</button></div>`).join('')||`<p class="sidebar-empty">${t("No workspaces yet.")}</p>`}</div><button class="workspace-restore" id="recent-workspaces">${t("Recently deleted workspaces")}</button>`;
 $$('[data-workspace]').forEach(b=>b.onclick=()=>{closeWorkspaceList();switchWorkspace(b.dataset.workspace)});
 $$('[data-workspace-menu]').forEach(b=>b.onclick=()=>openItemActions('workspaces',state.workspaces.find(w=>w.id===b.dataset.workspaceMenu),b));
 $('#recent-workspaces').onclick=()=>{closeWorkspaceList();manageWorkspaces()};
 list.querySelector('.workspace-options').onscroll=closeItemActions;
 if(list.matches(':popover-open'))placePopup(list,$('#workspace-select'));
}
$('#workspace-select').onclick=()=>{
 const list=$('#workspace-list');if(list.matches(':popover-open')){closeWorkspaceList();return}
 renderWorkspacePopup();list.showPopover();placePopup(list,$('#workspace-select'));list.querySelector('button')?.focus();
};
window.addEventListener('resize',closeWorkspaceList);
$('#document-list').addEventListener('scroll',closeItemActions);
$('#collapse-explorer').addEventListener('click',()=>{closeWorkspaceList();closeSessionActions()});
$('#toggle-explorer').addEventListener('click',()=>{closeWorkspaceList();closeSessionActions()});
async function refreshItems(kind,wid){
 if(kind==='workspaces'){await loadWorkspaces();if($('#workspace-list').matches(':popover-open'))renderWorkspacePopup()}
 else {const docs=await api('documents?workspace_id='+encodeURIComponent(wid));if(state.workspaceId===wid){state.docs=docs;renderDocs()}}
}
function renameItem(kind,item,wid){
 closeWorkspaceList();
 modal(kind==='workspaces'?t("Rename workspace"):t("Rename document"),`<label class="form-field">${t("Name")}<input id="item-name" value="${esc(kind==='workspaces'?workspaceName(item):item.name)}" maxlength="${kind==='workspaces'?100:255}"></label><div class="modal-actions"><button class="button" id="item-cancel">${t("Cancel")}</button><button class="button dark" id="item-save">${t("Save name")}</button></div>`);
 const input=$('#item-name'), originalName=input.value;
 input.focus();input.select();
 $('#item-cancel').onclick=()=>$('#modal').close();
 $('#item-save').onclick=async()=>{try{await api(kind+'/rename',{id:item.id,name:input.value===originalName?item.name:input.value,workspace_id:wid});$('#modal').close();await refreshItems(kind,wid)}catch(e){toast(e.message)}};
 $('#item-name').onkeydown=e=>{if(e.key==='Enter')$('#item-save').click()};
}
function openItemActions(kind,item,trigger){
 if(!item)return;
 const menu=$('#item-actions'),wid=state.workspaceId,wasOpen=menu.matches(':popover-open')&&itemMenuTrigger===trigger;
 closeItemActions();if(wasOpen)return;
 itemMenuTrigger=trigger;
 // Nest workspace actions in the workspace popup so it remains open.
 (kind==='workspaces'?$('#workspace-list'):document.body).append(menu);
 menu.innerHTML=`<button role="menuitem" data-action="pin">${item.pinned?t("Unpin"):t("Pin")}</button><button role="menuitem" data-action="rename">${t("Rename")}</button><button role="menuitem" class="session-delete-action" data-action="delete">${t("Delete")}</button>`;
 menu.setAttribute('aria-label',kind==='workspaces'?t("Workspace actions"):t("Document actions"));
 menu.showPopover();placePopup(menu,trigger);trigger.setAttribute('aria-expanded','true');
 const buttons=[...menu.querySelectorAll('button')];buttons[0].focus();
 menu.onkeydown=e=>{
  const index=buttons.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus()}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeItemActions();trigger.focus()}
  if(e.key==='Tab')closeItemActions();
 };
 buttons.forEach(b=>b.onclick=async()=>{
  closeItemActions();trigger.focus();
  const action=b.dataset.action;
  if(action==='rename'){renameItem(kind,item,wid);return}
  try{
   if(kind==='documents'&&action==='delete'){await removeDocument(item.id,wid);return}
   await api(kind+'/'+action,{id:item.id,pinned:!item.pinned,workspace_id:wid});
   await refreshItems(kind,wid);
   if(kind==='workspaces'&&action==='delete'&&state.workspaceId===item.id){closeWorkspaceList();await switchWorkspace(state.workspaces[0]?.id)}
  }catch(e){toast(e.message)}
 });
}

async function createSession(){if(!state.workspaceId){createWorkspace();return}const wid=state.workspaceId;try{const {id}=await api('sessions',{workspace_id:wid});if(wid!==state.workspaceId)return;state.sessions=await api('sessions?workspace_id='+wid);await switchSession(id);$('#prompt').focus()}catch(e){toast(e.message)}}$('#new-session').onclick=createSession;
let sessionMenuTrigger=null;
function closeSessionActions(){
 const menu=$('#session-actions');
 if(menu.matches(':popover-open'))menu.hidePopover();
 sessionMenuTrigger?.setAttribute('aria-expanded','false');
}
$('#session-actions').addEventListener('toggle',e=>{if(e.newState==='closed')sessionMenuTrigger?.setAttribute('aria-expanded','false')});
window.addEventListener('resize',closeSessionActions);
$('#session-list').addEventListener('scroll',closeSessionActions);
async function refreshSessions(wid){
 const sessions=await api('sessions?workspace_id='+encodeURIComponent(wid));
 if(state.workspaceId!==wid)return;
 state.sessions=sessions;renderSessions();
}
function renameSession(s,wid){
 modal(t("Rename session"),`<label class="form-field">${t("Session name")}<input id="session-name-input" value="${esc(sessionTitle(s))}" maxlength="120"></label><div class="modal-actions"><button class="button" id="session-cancel">${t("Cancel")}</button><button class="button dark" id="session-save">${t("Save name")}</button></div>`);
 const input=$('#session-name-input'), originalTitle=input.value;
 input.focus();input.select();
 $('#session-cancel').onclick=()=>$('#modal').close();
 $('#session-save').onclick=async()=>{try{await api('sessions/rename',{id:s.id,title:input.value===originalTitle?s.title:input.value});$('#modal').close();await refreshSessions(wid)}catch(e){toast(e.message)}};
 $('#session-name-input').onkeydown=e=>{if(e.key==='Enter')$('#session-save').click()};
}
function openSessionActions(trigger){
 const menu=$('#session-actions'),s=state.sessions.find(s=>s.id===trigger.dataset.sessionMenu),wid=state.workspaceId;
 if(!s)return;
 const wasOpen=menu.matches(':popover-open')&&sessionMenuTrigger===trigger;
 closeSessionActions();if(wasOpen)return;
 sessionMenuTrigger=trigger;
 menu.innerHTML=`<button role="menuitem" data-session-action="pin">${s.pinned?t("Unpin"):t("Pin")}</button><button role="menuitem" data-session-action="rename">${t("Rename")}</button><button role="menuitem" class="session-delete-action" data-session-action="delete">${t("Delete")}</button>`;
 menu.showPopover();trigger.setAttribute('aria-expanded','true');
 const rect=trigger.getBoundingClientRect();
 menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,innerWidth-menu.offsetWidth-8))+'px';
 menu.style.top=(rect.bottom+menu.offsetHeight+8>innerHeight?Math.max(8,rect.top-menu.offsetHeight-4):rect.bottom+4)+'px';
 const items=[...menu.querySelectorAll('button')];items[0].focus();
 menu.onkeydown=e=>{
  const index=items.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}
  if(e.key==='Escape'){e.preventDefault();closeSessionActions();trigger.focus()}
  if(e.key==='Tab')closeSessionActions();
 };
 items.forEach(button=>button.onclick=async()=>{
  closeSessionActions();trigger.focus();
  if(button.dataset.sessionAction==='rename'){renameSession(s,wid);return}
  try{
   if(button.dataset.sessionAction==='pin')await api('sessions/pin',{id:s.id,pinned:!s.pinned});
   else await api('sessions/delete',{id:s.id});
   await refreshSessions(wid);
   if(state.workspaceId!==wid)return;
   if(button.dataset.sessionAction==='delete'&&state.sessionId===s.id){
    if(state.sessions.length)await switchSession(state.sessions[0].id);
    else await switchWorkspace(wid);
   }
  }catch(e){toast(e.message)}
 });
}

function selectFiles(){if(!state.workspaceId){createWorkspace();return}$('#file-input').click()}
['#add-doc','#attach-btn','#upload-zone'].forEach(id=>$(id).onclick=selectFiles);$('#file-input').onchange=async e=>{await upload(e.target.files);e.target.value=''};
$('#upload-zone').ondragover=e=>{e.preventDefault();$('#upload-zone').classList.add('dragging')};$('#upload-zone').ondragleave=()=>$('#upload-zone').classList.remove('dragging');$('#upload-zone').ondrop=e=>{e.preventDefault();$('#upload-zone').classList.remove('dragging');upload(e.dataTransfer.files)};
const readBase64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)});
async function upload(files){
 const wid=state.workspaceId;if(!wid){createWorkspace();return}
 const progress=document.createElement('div');progress.className='upload-progress';progress.setAttribute('role','status');$('#document-list').before(progress);
 let fileName,detail;
 const renderProgress=()=>{if(fileName)progress.textContent=detail===null?t("Uploading {0}…",fileName):fileName+' · '+uploadProgress(detail)};
 document.addEventListener('app-language-change',renderProgress);
 try{for(const file of files){
  if(file.size>25*1024*1024){toast(t("{0}: maximum size is 25 MB.", file.name));continue}
  fileName=file.name;
  detail=null;
  renderProgress();
  try{
   const data=await readBase64(file),started=await api('documents',{workspace_id:wid,name:file.name,data});let job;
   do{await new Promise(resolve=>setTimeout(resolve,700));job=await api('uploads/'+encodeURIComponent(started.upload_id)+'?workspace_id='+encodeURIComponent(wid));detail=job.detail;renderProgress()}while(job.status==='running');
   if(job.status==='error')throw new Error(diagnosticText(job.error));
   if(wid===state.workspaceId){state.docs=await api('documents?workspace_id='+wid);state.selected.add(job.document_id);renderDocs();const doc=state.docs.find(d=>d.id===job.document_id);if(doc?.warnings?.length)toast(t("{0} added with processing warnings. Open its preview to review them.", file.name));else toast(t("{0} added to the workspace.", file.name))}
  }catch(e){toast(file.name+': '+e.message)}
 }}finally{document.removeEventListener('app-language-change',renderProgress);progress.remove()}
}
async function removeDocument(id,wid=state.workspaceId){try{await api('documents/delete',{id,workspace_id:wid});if(state.workspaceId===wid){state.selected.delete(id);await refreshItems('documents',wid)}toast(t("Document removed from this workspace. Saved evidence is retained."))}catch(e){toast(e.message)}}
const outputDrafts=new Map();
const maxTemplateColumns=40, maxTemplateRows=200;
function outputDraftKey(){return state.sessionId||'new:'+state.workspaceId}
function outputDraft(){return outputDrafts.get(outputDraftKey())||{mode:'vibing',table:null}}
function renderOutputControls(){
 const {mode}=outputDraft();
 $$('#output-modes button').forEach(button=>button.setAttribute('aria-pressed',String(button.value===mode)));
 $('#edit-output-table').classList.toggle('hidden',mode==='vibing');
}
$('#output-modes').onclick=e=>{
 const button=e.target.closest('button');
 if(!button)return;
 const draft={...outputDraft(),mode:button.value};
 outputDrafts.set(outputDraftKey(),draft);
 renderOutputControls();
 clearStaleCloudConfirmation();
};
$('#edit-output-table').onclick=openOutputEditor;

function openOutputEditor(){
 const draft=outputDraft(), key=outputDraftKey();
 let {columns,rows}=structuredClone(draft.table||{columns:[''],rows:[]});
 modal(t("Edit output table"),`
  <p>${draft.mode==='strict'?t("The result uses these exact columns and any rows you add."):t("The result starts with this table and may append relevant rows or columns.")}</p>
  <p>${t("Enter fixed values such as years or labels, and leave cells blank for the model to fill. With headers only, the model creates rows for matching records.")}</p>
  <div class="template-tools">
   <button type="button" class="button" id="template-add-row">${t("Add row")}</button>
   <button type="button" class="button" id="template-add-column">${t("Add column")}</button>
   <button type="button" class="button" id="template-import-button">${t("Import CSV or XLSX")}</button>
   <input type="file" id="template-import-file" accept=".csv,.xlsx" hidden>
  </div>
  <div id="template-import-preview" hidden></div>
  <div id="template-grid" class="template-scroll"></div>
  <p id="template-status" role="status"></p>
  <div class="modal-actions"><button type="button" class="button" id="template-cancel">${t("Cancel")}</button><button type="button" class="button dark" id="template-save">${t("Use table")}</button></div>`);
 const grid=$('#template-grid'), status=$('#template-status'), preview=$('#template-import-preview');
 const render=()=>{
  grid.innerHTML=`<table><thead><tr><th scope="col">${t("Row")}</th>${columns.map((name,i)=>`<th scope="col"><div class="template-header"><input aria-label="${t("Column {0} name", i+1)}" data-header="${i}" maxlength="1000" placeholder="${t("Column name")}" value="${esc(name)}"><button type="button" class="icon-button" aria-label="${t("Remove column {0}", i+1)}" data-drop-column="${i}" ${columns.length===1?'disabled':''}>×</button></div></th>`).join('')}</tr></thead>
  <tbody>${rows.map((row,i)=>`<tr><th scope="row"><button type="button" class="icon-button" aria-label="${t("Remove row {0}", i+1)}" data-drop-row="${i}">×</button>${i+1}</th>${row.map((value,j)=>`<td><input aria-label="${t("Row {0}, column {1}", i+1, j+1)}" data-row="${i}" data-column="${j}" maxlength="1000" placeholder="${t("Fill from sources")}" value="${esc(value)}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('#template-add-column').disabled=columns.length>=maxTemplateColumns;
  $('#template-add-row').disabled=rows.length>=maxTemplateRows;
 };
 grid.oninput=e=>{
  const {header,row,column}=e.target.dataset;
  if(header!==undefined)columns[Number(header)]=e.target.value;
  if(row!==undefined)rows[Number(row)][Number(column)]=e.target.value||null;
  status.textContent='';
 };
 grid.onclick=e=>{
  const {dropColumn,dropRow}=e.target.dataset;
  if(dropColumn!==undefined){
   columns.splice(Number(dropColumn),1);
   rows.forEach(row=>row.splice(Number(dropColumn),1));
  }else if(dropRow!==undefined)rows.splice(Number(dropRow),1);
  else return;
  render();
 };
 $('#template-add-column').onclick=()=>{
  columns.push('');rows.forEach(row=>row.push(null));render();
  grid.querySelector(`[data-header="${columns.length-1}"]`).focus();
 };
 $('#template-add-row').onclick=()=>{
  rows.push(columns.map(()=>null));render();
  grid.querySelector(`[data-row="${rows.length-1}"]`).focus();
 };
 $('#template-import-button').onclick=()=>$('#template-import-file').click();
 $('#template-import-file').onchange=async e=>{
  const file=e.target.files[0];
  e.target.value='';
  if(!file)return;
  if(file.size>2*1024*1024){status.textContent=t("Choose a file up to 2 MB.");return}
  const button=$('#template-import-button');
  button.disabled=true;preview.hidden=true;status.textContent=t("Reading table…");
  try{
   const data=await readBase64(file);
   const {grid: imported}=await api('output-template/import',{name:file.name,data});
   if(!grid.isConnected||!$('#modal').open)return;
   status.textContent='';
   preview.hidden=false;
   preview.innerHTML=`<p><strong>${esc(file.name)}</strong>${file.name.toLowerCase().endsWith('.xlsx')?t(" · First worksheet"):''}</p>
    <label>${t("Header row")} <select id="template-import-header">${imported.map((row,i)=>row.some(value=>value.trim())?`<option value="${i}">${i+1}</option>`:'').join('')}</select></label>
    <label><input type="checkbox" id="template-import-fixed" checked> ${t("Keep populated cells as fixed values")}</label>
    <div class="template-scroll" id="template-import-grid"></div>
    <button type="button" class="button" id="template-import-apply">${t("Replace table with import")}</button>`;
   const header=$('#template-import-header');
   const renderPreview=()=>{
    const start=Number(header.value);
    $('#template-import-grid').innerHTML=`<table><thead><tr>${imported[start].map(value=>`<th>${esc(value)}</th>`).join('')}</tr></thead>
     <tbody>${imported.slice(start+1,start+6).map(row=>`<tr>${row.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
   };
   header.onchange=renderPreview;renderPreview();
   $('#template-import-apply').onclick=()=>{
    const start=Number(header.value), keep=$('#template-import-fixed').checked;
    const body=imported.slice(start+1).filter(row=>row.some(value=>value.trim()));
    const width=Math.max(imported[start].length,...body.map(row=>row.length));
    columns=Array.from({length:width},(_,i)=>imported[start][i]||'');
    rows=body.map(row=>columns.map((_,i)=>keep&&row[i]?row[i]:null));
    preview.hidden=true;render();
   };
  }catch(error){if(grid.isConnected)status.textContent=error.message||t("Could not read the table.")}
  finally{button.disabled=false}
 };
 $('#template-cancel').onclick=()=>$('#modal').close();
 $('#template-save').onclick=()=>{
  if(columns.some(name=>!name.trim())){status.textContent=t("Enter a name for every column.");return}
  if(new Set(columns.map(name=>name.trim().toLowerCase())).size!==columns.length){status.textContent=t("Use a different name for every column.");return}
  if(key!==outputDraftKey()){$('#modal').close();return}
  outputDrafts.set(key,{mode:draft.mode,table:{columns,rows}});
  clearStaleCloudConfirmation();
  $('#modal').close();
  $('#edit-output-table').focus();
 };
 render();
 grid.querySelector('input').focus();
}

let pendingCloudRun=null, submittingRun=false;
function extractionRequest(){
 const {mode,table}=outputDraft();
 const prompt=$('#prompt').value.trim();
 return {session_id:state.sessionId,prompt,document_ids:[...state.selected],
  processing_mode:$('#processing-mode').value,visual_selections:state.visualSelections.map(({document_id,asset_id,crop})=>({document_id,asset_id,crop})),
  output_mode:mode,output_template:mode==='vibing'?null:table};
}
function clearCloudConfirmation(){
 pendingCloudRun=null;
 $('#cloud-confirmation').hidden=true;
}
function clearStaleCloudConfirmation(){
 if(pendingCloudRun&&pendingCloudRun.snapshot!==JSON.stringify(extractionRequest()))clearCloudConfirmation();
}
function showCloudConfirmation(request,targets,focus=true){
 const panel=$('#cloud-confirmation');
 pendingCloudRun={snapshot:JSON.stringify(request),targets};
 panel.innerHTML=`<strong id="cloud-confirmation-title" tabindex="-1">${t("Confirm sending information to cloud or remote providers")}</strong>
  <ul>${targets.map(target=>`<li><strong>${target.kind==='text'?t("Text"):t("Vision")}</strong> · ${esc(target.name)} · ${esc(target.model)} (${esc(target.endpoint)})</li>`).join('')}</ul>
  <p>${t("Selected document text or images may leave this device. {0}", request.output_template?t("Confirm that the selected documents, your request, and your output table contain no sensitive or confidential information."):t("Confirm that the selected documents and your request contain no sensitive or confidential information."))}</p>
  <div class="cloud-confirmation-actions"><button type="button" class="button" id="cloud-cancel">${t("Cancel")}</button><button type="button" class="button dark" id="cloud-confirm">${t("Confirm and run")}</button></div>`;
 panel.hidden=false;
 if(focus)$('#cloud-confirmation-title').focus();
 $('#cloud-cancel').onclick=()=>{clearCloudConfirmation();$('#prompt').focus()};
 $('#cloud-confirm').onclick=()=>{
  clearStaleCloudConfirmation();
  if(!pendingCloudRun)return;
  const {targets}=pendingCloudRun;
  clearCloudConfirmation();
  submitExtraction(targets);
 };
}
async function submitExtraction(confirmedRemoteTargets){
 if(submittingRun)return;
 const request=extractionRequest(), draft=outputDraft();
 if(request.output_mode!=='vibing'&&!request.output_template){openOutputEditor();return}
 if(!request.prompt&&!request.output_template){toast(t("Describe what you want to extract."));return}
 if(!request.document_ids.length){toast(t("Add and select documents in the left panel first."));return}
 submittingRun=true;
 const workspace=state.workspaceId, visualSelections=state.visualSelections;
 try{
  if(!state.sessionId){
   await createSession();
   if(!state.sessionId||workspace!==state.workspaceId)return;
   state.visualSelections=visualSelections;
   outputDrafts.set(outputDraftKey(),draft);
   $('#prompt').value=request.prompt;
   updateComposer();
   request.session_id=state.sessionId;
  }
  const prompt=request.prompt||t("Fill the output table from the selected documents.");
  const {id}=await api('runs',{...request,prompt,confirmed_remote_targets:confirmedRemoteTargets});
  if(request.session_id!==state.sessionId)return;
  state.turns.push({id,prompt,status:'running',events:[{title:'Starting extraction',detail:'Retrieving selected source passages…',status:'running'}],result:{}});
  if($('#prompt').value.trim()===request.prompt)$('#prompt').value='';
  saveDraft();renderConversation();$('#conversation').scrollTop=$('#conversation').scrollHeight;
  schedulePoll();
  state.sessions=await api('sessions?workspace_id='+state.workspaceId);renderSessions();
 }catch(error){
  if(error.remoteTargets&&JSON.stringify(request)===JSON.stringify(extractionRequest())){
   showCloudConfirmation(request,error.remoteTargets);
  }else if(!error.remoteTargets)toast(error.message);
 }finally{submittingRun=false}
}
$('#prompt').oninput=()=>{saveDraft();clearStaleCloudConfirmation()};
$('#prompt').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#prompt-form').requestSubmit()}};
$('#prompt-form').onsubmit=async e=>{
 e.preventDefault();
 const run=activeRun();
 if(run){
  try{await api('runs/cancel',{id:run.id});toast(t("Stopping after the current provider request returns…"))}catch(error){toast(error.message)}
  return;
 }
 clearStaleCloudConfirmation();
 if(pendingCloudRun){$('#cloud-confirm').focus();return}
 submitExtraction();
};
function selectCell(turnId,rowIndex,colIndex){const turn=state.turns.find(t=>t.id===turnId),r=turn.result,row=r.rows[rowIndex],refs=cellRefs(row,colIndex).filter(ref=>r.references[ref]);if(!refs.length){toast(t("No source available for this cell."));return}state.evidence={turn:turnId,row:rowIndex,col:colIndex,refs,ref:refs[0],value:row.values[colIndex],label:r.columns[colIndex],legacy:!row.cell_references,result:r};$$('.cell-button').forEach(b=>b.classList.toggle('selected',b.dataset.cellRun===turnId&&Number(b.dataset.row)===rowIndex&&Number(b.dataset.col)===colIndex));openEvidenceReference(refs[0])}
function selectSource(turnId,ref){const r=state.turns.find(t=>t.id===turnId).result;state.evidence={turn:turnId,refs:[ref],ref,value:null,labelKey:'Source passage',legacy:false,result:r};openEvidenceReference(ref)}
function renderEvidenceContext(){const e=state.evidence,s=e.result.references[e.ref];$('#evidence-context').innerHTML=`<div class="evidence-context-card"><small>${esc(e.labelKey?t(e.labelKey):e.label)}${e.row!==undefined?t(" · row {0}", e.row+1):''}</small>${e.value!==null?`<div class="evidence-value">${esc(e.value)}</div>`:''}<div class="evidence-source-name" title="${esc(s.document)}">${esc(s.document)} · ${esc(sourceLocation(s.location))}</div>${e.refs.length>1?`<div class="evidence-ref-list">${e.refs.map((ref,i)=>`<button class="${ref===e.ref?'active':''}" data-evidence-ref="${esc(ref)}" title="${esc(e.result.references[ref]?.document)}">${t("Source {0}", i+1)}</button>`).join('')}</div>`:''}${e.legacy?`<div class="legacy-note">${t("Legacy row citation. This source may support another cell in the same row.")}</div>`:''}</div>`;$$('[data-evidence-ref]').forEach(b=>b.onclick=()=>openEvidenceReference(b.dataset.evidenceRef))}
function openEvidenceReference(ref,refresh=false){
 const evidence=state.evidence;
 if(!refresh){evidence.pdfPage=null;evidence.pdfZoom=100;showEvidencePane()}
 evidence.ref=ref;renderEvidenceContext();const source=state.evidence.result.references[ref],values=state.evidence.value===null?[]:[state.evidence.value];if(source.asset_id)openVisualSource(source,ref);else if(source.document.toLowerCase().endsWith('.pdf'))openPdfSource(source,ref,values,evidence.pdfPage);else openTextSource(source,ref,values[0])}
async function openTextSource(source,ref,value){const token=++pdfViewerToken;$('#evidence-body').innerHTML=`<div class="empty-state">${t("Opening source document…")}</div>`;try{const doc=await api('documents/'+encodeURIComponent(source.document_id||ref.split(':')[0]));if(token!==pdfViewerToken)return;$('#evidence-body').innerHTML=`<div class="pdf-caption">${t("Indexed document view · original paragraph or spreadsheet row")}</div><div class="source-text-document">${doc.chunks.map(c=>{const cited=c.id===(source.id||ref.split(':')[1]);let text=esc(c.text);if(cited&&value!==undefined&&value!==null&&String(value).length)text=text.split(esc(value)).join('<mark>'+esc(value)+'</mark>');return `<article class="${cited?'cited':''}" ${cited?'id="cited-text"':''}><h4>${esc(sourceLocation(c.location))}</h4><pre>${text}</pre>${c.asset_id?`<button class="button" data-visual-chunk="${esc(c.id)}">${t("View original image")}</button>`:''}</article>`}).join('')}</div>`;$$('[data-visual-chunk]').forEach(button=>button.onclick=()=>{const c=doc.chunks.find(item=>item.id===button.dataset.visualChunk);const visualRef=doc.id+':'+c.id;state.evidence={refs:[visualRef],ref:visualRef,value:null,labelKey:'Document image preview',result:{references:{[visualRef]:{...c,document:doc.name,document_id:doc.id}}}};openEvidenceReference(visualRef)});$('#cited-text')?.scrollIntoView({block:'center',behavior:'smooth'})}catch(e){if(token===pdfViewerToken)$('#evidence-body').innerHTML=`<div class="source-text-document"><article class="cited"><h4>${esc(sourceLocation(source.location))}</h4><pre>${esc(source.text)}</pre></article><p>${esc(e.message)}</p></div>`}}
async function previewDocument(id){try{const d=await api('documents/'+id);if(d.warnings){const warnings=typeof d.warnings==='string'?JSON.parse(d.warnings):d.warnings;if(warnings.length)toast(warnings.map(processingWarning).join(' · '))}const source={...d.chunks[0],document:d.name,document_id:d.id},ref=id+':'+source.id;state.evidence={refs:[ref],ref,value:null,labelKey:'Document preview',result:{references:{[ref]:source}}};openEvidenceReference(ref)}catch(e){toast(e.message)}}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportTurn(id){const r=state.turns.find(t=>t.id===id).result;modal(t("Export extraction"),`<p>${t("Download {0} rows. Each CSV field includes its source in an adjacent column.", r.rows.length)}</p><div class="modal-actions"><button class="button" id="download-json">JSON</button><button class="button dark" id="download-csv">CSV</button></div>`);$('#download-json').onclick=()=>{download('extraction.json',JSON.stringify(r,null,2),'application/json');$('#modal').close()};$('#download-csv').onclick=()=>{const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';const rows=[r.columns.flatMap(c=>[c,c+t(" · sources")]),...r.rows.map(row=>row.values.flatMap((v,j)=>[v,cellRefs(row,j).map(ref=>{const s=r.references[ref];return s?`${s.document} — ${sourceLocation(s.location)}${row.cell_references?'':t(" (legacy row citation)")}`:ref}).join('; ')]))];download('extraction.csv','\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');$('#modal').close()}}
function helpModal(){modal(t("Your document workspace"),`<p>${t("Create or choose a workspace on the left. Documents belong to that workspace and are shared with its sessions.")}</p><p>${t("Start a session, select documents, choose a tool-capable model, and ask for the data you need. Follow-up requests keep recent session context.")}</p><p>${t("Click any populated output cell to open its evidence on the right. PDF sources show original pages and highlight matches; DOCX and Excel show the indexed paragraph or row. Older extractions retain clearly labeled row-level citations.")}</p><p class="notice">${t("Documents and settings are stored locally. When you start a cloud-provider run, selected source passages are sent to that provider. Scans and embedded pictures are indexed locally with OCR when Tesseract is installed. Configure an image-capable vision model to inspect charts and diagrams during extraction. Selected images and nearby text are sent to that vision provider.")}</p>`)}$('#help-btn').onclick=helpModal;
function toolsModal(){modal(t("Agent tools"),`<div class="tool-card"><code>search_documents</code><p>${t("Search selected workspace documents with local keyword retrieval.")}</p></div><div class="tool-card"><code>read_document</code><p>${t("Read source passages with page, paragraph, and spreadsheet row locations.")}</p></div><div class="tool-card"><code>list_visuals / inspect_visual</code><p>${t("Find document images and ask the configured vision model targeted questions. Results include original-image evidence and distinguish estimates.")}</p></div><div class="tool-card"><code>submit_extraction</code><p>${t("Submit a table with a validated source list for every populated cell.")}</p></div><p>${t("Green checks show completed steps. Blue circles show work in progress. Red crosses show failures or tool corrections.")}</p>`)}$('#tools-nav').onclick=toolsModal;
$('#providers-nav').onclick=()=>settingsModal();$('#composer-model').onclick=()=>settingsModal();
async function init(){clearEvidence();renderConversation();try{state.settings=await api('settings');renderSettings();await loadWorkspaces();const saved=localStorage.getItem('workspace');await switchWorkspace(state.workspaces.some(w=>w.id===saved)?saved:state.workspaces[0]?.id)}catch(e){toast(t("Could not load workspace: {0}", e.message))}}

function settingsModal(){
 let chosen=state.settings.provider, view=0;
 const modelLists=new Map();
 const connectionSignature=p=>JSON.stringify([p.protocol,p.base_url,p.api_key||'',!!p.clear_key]);
 const modelOptions=(provider,value)=>{
  const cached=modelLists.get(provider?.id);
  const models=cached&&cached.signature===connectionSignature(provider)?cached.models:[];
  const names=[...new Set([value,...models].filter(Boolean))];
  return `<option value="">${t("Choose a model…")}</option>`+names.map(name=>`<option value="${esc(name)}" ${name===value?'selected':''}>${esc(name)}</option>`).join('')+`<option>${t("+ Add new model")}</option>`;
 };
 const modelField=(id,label,provider,value)=>`
  <div class="form-field model-field"><label for="${id}-model">${label}</label>
   <div class="model-field-controls">
    <select id="${id}-model" ${provider?'':'disabled'}>${modelOptions(provider,value)}</select>
    <button type="button" class="button" id="${id}-fetch" ${provider?'':'disabled'}>${t("Fetch models")}</button>
   </div>
   <p id="${id}-model-status" class="model-status" role="status"></p>
  </div>`;
 const processing={ocr_enabled:state.settings.ocr_enabled,ocr_languages:state.settings.ocr_languages,vision_provider:state.settings.vision_provider,vision_model:state.settings.vision_model};
 const drafts=Object.fromEntries(state.settings.providers.map(p=>[p.id,{...p}]));
 const capture=()=>{if($('#ocr-languages')){processing.ocr_enabled=$('#ocr-enabled').checked;processing.ocr_languages=$('#ocr-languages').value;processing.vision_provider=$('#vision-provider').value;processing.vision_model=$('#vision-model').value}const p=drafts[chosen];for(const field of ['name','model','base_url','protocol','api_key']){const input=$('#provider-'+field);if(input)p[field]=input.value}p.clear_key=$('#provider-clear-key')?.checked||false};
 const show=()=>{
  const p=drafts[chosen], currentView=++view;
  modal(t("Model providers"),`<p>${t("Choose a provider or add your own connection.")}</p><div class="provider-options" aria-label="${t("Providers")}">${Object.values(drafts).map(item=>`<button class="provider-option ${chosen===item.id?'selected':''}" data-provider="${esc(item.id)}" aria-pressed="${chosen===item.id}"><span>${esc(item.name||t("New custom provider"))}</span><small>${item.id===state.settings.provider?t("Active · "):''}${item.protocol==='ollama'?t("Local model"):t("Cloud / custom API")}</small></button>`).join('')}</div><button class="button" id="provider-add">${t("+ Add custom provider")}</button>
  <label class="form-field">${t("Provider name")}<input id="provider-name" value="${esc(p.name)}"></label>
  <label class="form-field">${t("API format")}<select id="provider-protocol">${[['openai',t("OpenAI compatible")],['anthropic','Anthropic (Claude)'],['ollama','Ollama']].map(([value,label])=>`<option value="${value}" ${p.protocol===value?'selected':''}>${label}</option>`).join('')}</select></label>
  <label class="form-field">${t("API base URL")}<input id="provider-base_url" value="${esc(p.base_url)}" placeholder="https://api.example.com/v1"></label>
  ${p.id==='qwen'?`<p>${t("Use the base URL for your Qwen workspace and region.")}</p>`:''}
  <label class="form-field">${t("API key {0}", p.key_set?t("· saved"):'')}<input id="provider-api_key" type="password" autocomplete="off" value="${esc(p.api_key||'')}" placeholder="${p.key_set?t("Leave blank to keep saved key"):t("Optional for servers without authentication")}"></label>
  ${p.key_set?`<label class="provider-clear"><input type="checkbox" id="provider-clear-key" ${p.clear_key?'checked':''}> ${t("Remove stored API key")}</label>`:''}
  ${modelField('provider',t("Available models"),p,p.model)}
  <fieldset class="processing-settings"><legend>${t("OCR and visual understanding")}</legend>
  <label class="provider-clear"><input type="checkbox" id="ocr-enabled" ${processing.ocr_enabled?'checked':''}> ${t("Read scanned text locally with OCR")}</label>
  <label class="form-field">${t("OCR languages")}<input id="ocr-languages" value="${esc(processing.ocr_languages||'eng')}" placeholder="eng+rus"></label>
  <p id="ocr-status" role="status">${t("Checking local OCR…")}</p><details id="ocr-language-details" hidden><summary>${t("Installed OCR languages")}</summary><p id="ocr-language-list"></p></details>
  <label class="form-field">${t("Vision provider")}<select id="vision-provider" aria-label="${t("Vision provider")}"><option value="">${t("Disabled")}</option>${Object.values(drafts).map(item=>`<option value="${esc(item.id)}" ${processing.vision_provider===item.id?'selected':''}>${esc(item.name||t("New custom provider"))}</option>`).join('')}</select></label>
  ${modelField('vision',t("Vision model"),drafts[processing.vision_provider],processing.vision_model)}
  <p>${t("The vision model is independent of your extraction model and uses the selected provider’s connection and key. Images and nearby text are sent only during extraction. OCR language changes apply to new uploads; re-upload older files to index their visuals.")}</p>
  </fieldset>
  <p class="notice">${t("Sessions, documents, and provider settings are saved on this PC. API keys are stored in the local database and are never returned to the browser. Selected source passages are sent to your chosen provider during extraction.")}</p>
  <div class="modal-actions"><button class="button" id="settings-cancel">${t("Cancel")}</button><button class="button dark" id="settings-save">${t("Save and use provider")}</button></div>`);
  api('ocr').then(status=>{if(view!==currentView||!$('#ocr-status'))return;$('#ocr-status').textContent=diagnosticText(status.message);$('#ocr-language-details').hidden=!status.languages.length;$('#ocr-language-list').textContent=status.languages.join(', ')}).catch(e=>{if($('#ocr-status'))$('#ocr-status').textContent=e.message});
  $$('[data-provider]').forEach(b=>b.onclick=()=>{capture();chosen=b.dataset.provider;show()});
  $('#provider-add').onclick=()=>{capture();drafts.new||={id:'new',name:'',protocol:'openai',base_url:'',model:''};chosen='new';show();$('#provider-name').focus()};
  $('#provider-protocol').onchange=()=>{capture();show()};
  $('#settings-cancel').onclick=()=>$('#modal').close();
  $('#settings-save').onclick=async()=>{capture();const button=$('#settings-save');button.disabled=true;try{await api('settings',{...drafts[chosen],...processing,provider:chosen});state.settings=await api('settings');clearCloudConfirmation();renderSettings();$('#modal').close();toast(t("Provider saved on this PC."))}catch(e){toast(e.message);button.disabled=false}};
  const refreshModels=()=>{
   $('#provider-model').innerHTML=modelOptions(p,p.model);
   $('#vision-model').innerHTML=modelOptions(drafts[processing.vision_provider],processing.vision_model);
  };
  for(const id of ['provider','vision']){
   const select=$('#'+id+'-model'), button=$('#'+id+'-fetch'), status=$('#'+id+'-model-status');
   const getProvider=()=>id==='provider'?p:drafts[processing.vision_provider];
   select.onchange=()=>{
    if(select.selectedIndex===select.options.length-1){
     const name=window.prompt(id==='vision'?t("Enter an image-capable model name"):t("Enter a tool-capable model name"))?.trim();
     if(id==='provider')p.model=name||p.model;
     else processing.vision_model=name||processing.vision_model;
     refreshModels();
    }
    capture();
   };
   button.onclick=async()=>{
    capture();
    const provider=getProvider(), signature=connectionSignature(provider);
    const stillCurrent=()=>view===currentView&&button.isConnected&&$('#modal').open;
    button.disabled=true;status.textContent=t("Loading models…");
    try{
     const models=await api('models',{...provider,provider:provider.id});
     if(!stillCurrent())return;
     capture();
     if(signature!==connectionSignature(provider)){
      status.textContent=t("Connection changed. Fetch models again.");
      return;
     }
     modelLists.set(provider.id,{signature,models});
     refreshModels();
     status.textContent=models.length?t("{0} models found.", models.length):t("No models returned. You can add a model manually.");
    }catch(error){if(stillCurrent())status.textContent=error.message}
    finally{button.disabled=false}
   };
  }
  $('#vision-provider').onchange=()=>{
   capture();
   processing.vision_model=processing.vision_provider===state.settings.vision_provider?state.settings.vision_model:'';
   show();
  };
  for(const field of ['base_url','api_key','clear-key']){
   const input=$('#provider-'+field);
   if(input)input.oninput=()=>{capture();refreshModels()};
  }
 };
 show();
}
async function openPdfSource(source,ref,values=[],page=null){
 const token=++pdfViewerToken,documentId=source.document_id||ref.split(':')[0],chunkId=source.id||ref.split(':')[1];
 $('#evidence-body').innerHTML=`<div class="empty-state">${t("Loading original PDF page…")}</div>`;
 try{
  const data=await api('pdf/source',{document_id:documentId,chunk_id:chunkId,values,page});
  if(token!==pdfViewerToken)return;
  if(data.missing_original){
   $('#evidence-body').innerHTML=`<div class="pdf-missing"><h3>${t("Attach the original PDF once")}</h3><p>${t("This document was uploaded before original files were saved. Attach the same PDF to view its actual pages with source highlights. Your existing extraction and references will be kept.")}</p><button class="button dark" id="attach-original">${t("Attach original PDF")}</button><input type="file" id="original-input" accept=".pdf" hidden></div>`;
   $('#attach-original').onclick=()=>$('#original-input').click();
   $('#original-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>25*1024*1024){toast(t("Maximum PDF size is 25 MB."));return}const button=$('#attach-original');button.disabled=true;button.textContent=t("Checking original…");try{const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});await api('pdf/attach',{document_id:documentId,data:base64});if(token===pdfViewerToken)openPdfSource(source,ref,values,page)}catch(error){toast(error.message);button.disabled=false;button.textContent=t("Attach original PDF")}};
   return;
  }
  state.evidence.pdfPage=data.page;
  let zoom=state.evidence.pdfZoom||100;
  $('#evidence-body').innerHTML=`<div class="pdf-toolbar"><div><button class="button" id="pdf-prev" aria-label="${t("Previous page")}" ${data.page===1?'disabled':''}>←</button><span>${t("Page {0} of {1}", data.page, data.pages)}</span><button class="button" id="pdf-next" aria-label="${t("Next page")}" ${data.page===data.pages?'disabled':''}>→</button></div><div><button class="button" id="pdf-minus" aria-label="${t("Zoom out")}">−</button><span id="pdf-zoom">${zoom}%</span><button class="button" id="pdf-plus" aria-label="${t("Zoom in")}">+</button><a class="button" href="/api/originals/${encodeURIComponent(documentId)}#page=${data.page}" target="_blank" rel="noopener">${t("Open PDF ↗")}</a></div></div><div class="pdf-caption"><span class="highlight-key"></span>${data.highlight_kind==='value'?t("Boxes mark exact extracted values found inside the cited passage."):data.highlight_kind==='passage'?t("Boxes mark the supporting source passage; an exact extracted value could not be located."):data.page!==data.cited_page?t("Browsing the original document. Return to the cited page to see source highlights."):t("No reliable text coordinates found. The original page is shown without a highlight.")}${data.page!==data.cited_page?`<button class="button" id="pdf-cited">${t("Go to cited page")}</button>`:''}</div><div class="pdf-scroll"><div class="pdf-page" style="aspect-ratio:${data.width}/${data.height};width:${zoom}%"><img id="pdf-image" alt="${t("Original PDF page {0}", data.page)}">${data.boxes.map((box,i)=>`<span class="pdf-highlight" title="${data.highlight_kind==='value'?t("Matched extracted value"):t("Supporting source passage")}" style="left:${box.x*100}%;top:${box.y*100}%;width:${box.width*100}%;height:${box.height*100}%" ${i===0?'id="first-highlight"':''}></span>`).join('')}</div></div><details class="pdf-excerpt"><summary>${t("Source text")}</summary><p>${esc(source.text||'')}</p></details>`;
  const img=$('#pdf-image');img.onload=()=>{const mark=$('#first-highlight'),scroller=$('.pdf-scroll');if(mark&&scroller)scroller.scrollTop=Math.max(0,mark.offsetTop-scroller.clientHeight*.3)};img.src=data.image;
  $('#pdf-prev').onclick=()=>openPdfSource(source,ref,values,data.page-1);$('#pdf-next').onclick=()=>openPdfSource(source,ref,values,data.page+1);
  if($('#pdf-cited'))$('#pdf-cited').onclick=()=>openPdfSource(source,ref,values,data.cited_page);
  const setZoom=delta=>{zoom=Math.max(50,Math.min(250,zoom+delta));state.evidence.pdfZoom=zoom;$('.pdf-page').style.width=zoom+'%';$('#pdf-zoom').textContent=zoom+'%'};
  $('#pdf-minus').onclick=()=>setZoom(-25);$('#pdf-plus').onclick=()=>setZoom(25);
 }catch(error){if(token===pdfViewerToken)$('#evidence-body').innerHTML=`<div class="empty-state"><h3>${t("Unable to open PDF")}</h3><p>${esc(error.message)}</p></div>`}
}


async function openVisualSource(source,ref){
 const token=++pdfViewerToken;$('#evidence-body').innerHTML=`<div class="empty-state">${t("Opening visual evidence…")}</div>`;
 try{
  const data=await api('visual/source',{workspace_id:state.workspaceId,document_id:source.document_id||ref.split(':')[0],asset_id:source.asset_id,source_type:source.source_type,passage:source.text,crop:source.crop});
  if(token!==pdfViewerToken)return;
  const label=source.source_type==='ocr'?t("OCR transcription · boxes mark recognized words"):source.source_type==='vision'?t("Visual interpretation · review the image; estimated values are approximate"):t("Original visual source · use extraction to inspect this image");
  $('#evidence-body').innerHTML=`<div class="pdf-caption">${esc(label)}${source.model?' · '+esc(source.model):''}</div><div class="pdf-scroll"><div class="pdf-page" style="aspect-ratio:${data.width}/${data.height}"><img id="visual-image" alt="${esc(sourceLocation(data.location))}">${data.boxes.map(box=>`<span class="pdf-highlight" style="left:${box.x*100}%;top:${box.y*100}%;width:${box.width*100}%;height:${box.height*100}%"></span>`).join('')}</div></div><div class="source-text-document"><article><h4>${esc(sourceLocation(source.location))}</h4>${source.question?`<p>${esc(source.question)}</p>`:''}<pre>${esc(source.text)}</pre></article></div>`;
  $('#visual-image').src=data.image;
 }catch(error){if(token===pdfViewerToken)$('#evidence-body').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}


function visualSelectionLabel(selection){
 return selection.document+' · '+sourceLocation(selection.location);
}

function renderVisualSelections(){
 const manual=$('#processing-mode').value==='manual';
 $('#select-visuals').classList.toggle('hidden',!manual);
 state.visualSelections=state.visualSelections.filter(s=>state.selected.has(s.document_id));
 clearStaleCloudConfirmation();
 $('#visual-selections').innerHTML=manual?state.visualSelections.map((s,i)=>`<span class="visual-chip"><button type="button" data-open-selection="${i}" title="${t("Review selection")}">${esc(visualSelectionLabel(s))}${s.crop?t(" · Region"):''}</button><button type="button" data-remove-selection="${i}" aria-label="${t("Remove {0}", esc(visualSelectionLabel(s)))}">×</button></span>`).join(''):'';
 $$('[data-remove-selection]').forEach(b=>b.onclick=()=>{state.visualSelections.splice(Number(b.dataset.removeSelection),1);renderVisualSelections()});
 $$('[data-open-selection]').forEach(b=>b.onclick=()=>openVisualPicker(state.visualSelections[Number(b.dataset.openSelection)]));
}
$('#processing-mode').onchange=renderVisualSelections;
$('#select-visuals').onclick=()=>openVisualPicker();
let disposeVisualPicker=()=>{};
async function openVisualPicker(selected){
 if(!state.selected.size){toast(t("Select documents first."));return}
 disposeVisualPicker();
 const workspaceId=state.workspaceId;
 try{
  const assets=await api('visual/list',{workspace_id:workspaceId,document_ids:[...state.selected]});
  if(workspaceId!==state.workspaceId)return;
  if(!assets.length){toast(t("These documents have no visual sources. Older uploads may need to be uploaded again."));return}
  const documents=[...new Map(assets.map(a=>[a.document_id,a.document])).entries()];
  modal(t("Select pages or regions"),`<p>${t("Scroll to browse. Select whole pages or use Select region to draw around a chart. Include titles, legends, and units.")}</p><div class="visual-document-tabs" role="tablist" aria-label="${t("Documents")}">${documents.map(([id,name])=>`<button type="button" class="button" role="tab" data-picker-document="${esc(id)}">${esc(name)}</button>`).join('')}</div><div class="visual-picker-toolbar"><div class="visual-tool-switch" role="group" aria-label="${t("Selection tool")}"><button type="button" class="button" id="visual-scroll-tool" aria-pressed="true">${t("Scroll")}</button><button type="button" class="button" id="visual-region-tool" aria-pressed="false">${t("Select region")}</button></div><label>${t("Page")} <input id="visual-page-jump" type="number" min="1" value="1" aria-label="${t("Jump to page")}"> <span id="visual-page-total"></span></label></div><div id="visual-picker-stage" tabindex="0" aria-label="${t("Scrollable document preview")}"></div><div id="visual-picker-status" role="status"></div><div id="visual-picker-tray" aria-label="${t("Selected visuals")}"></div><div class="modal-actions"><button type="button" class="button dark" id="visual-done">${t("Done")}</button></div>`);
  const dialog=$('#modal'),stage=$('#visual-picker-stage');dialog.classList.add('visual-picker-dialog');
  let alive=true,activeDocument=selected?.document_id||documents[0][0],pages=[],tool='scroll',space=false,observer=null,active=0,queue=[],generation=0;
  const same=(s,a)=>s.document_id===a.document_id&&s.asset_id===a.asset_id;
  function cleanup(){alive=false;stage.querySelectorAll('img').forEach(img=>img.removeAttribute('src'));generation++;observer?.disconnect();queue=[];dialog.classList.remove('visual-picker-dialog');dialog.removeEventListener('close',cleanup);dialog.removeEventListener('keydown',keydown);dialog.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);}
  disposeVisualPicker=cleanup;dialog.addEventListener('close',cleanup,{once:true});
  function setTool(){stage.classList.toggle('drawing',tool==='region'&&!space);$('#visual-scroll-tool').setAttribute('aria-pressed',String(tool==='scroll'));$('#visual-region-tool').setAttribute('aria-pressed',String(tool==='region'));}
  function keydown(e){if(e.code==='Space'&&!/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)){e.preventDefault();space=true;setTool()}}
  function keyup(e){if(e.code==='Space'){space=false;setTool()}}
  function blur(){space=false;if(alive)setTool()}
  dialog.addEventListener('keydown',keydown);dialog.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  $('#visual-scroll-tool').onclick=()=>{tool='scroll';setTool()};$('#visual-region-tool').onclick=()=>{tool='region';setTool()};
  $('#visual-done').onclick=()=>dialog.close();
  function update(){
   clearStaleCloudConfirmation();
   renderVisualSelections();
   $('#visual-picker-status').textContent=t("{0} of 30 selections · selections are saved as you go", state.visualSelections.length);
   pages.forEach((a,i)=>{
    const card=stage.children[i],selections=state.visualSelections.filter(s=>same(s,a));
    card.classList.toggle('has-selection',!!selections.length);
    card.querySelector('input').checked=selections.some(s=>!s.crop);
    card.querySelector('.saved-regions').innerHTML=selections.filter(s=>s.crop).map(s=>`<span class="region-box" style="left:${s.crop.x*100}%;top:${s.crop.y*100}%;width:${s.crop.width*100}%;height:${s.crop.height*100}%"></span>`).join('');
   });
   $('#visual-picker-tray').innerHTML=state.visualSelections.map((s,i)=>`<span class="visual-chip"><button type="button" data-picker-jump="${i}">${esc(visualSelectionLabel(s))}${s.crop?t(" · Region"):''}</button><button type="button" data-picker-remove="${i}" aria-label="${t("Remove selection {0}", i+1)}">×</button></span>`).join('');
   $$('[data-picker-remove]').forEach(b=>b.onclick=()=>{state.visualSelections.splice(Number(b.dataset.pickerRemove),1);update()});
   $$('[data-picker-jump]').forEach(b=>b.onclick=()=>{const selection=state.visualSelections[Number(b.dataset.pickerJump)];if(activeDocument!==selection.document_id)showDocument(selection.document_id);jump(pages.findIndex(a=>same(selection,a)))});
  }
  function add(a,crop){
   if(state.visualSelections.length>=30){toast(t("Select at most 30 pages or regions per request."));update();return}
   state.visualSelections.push({document_id:a.document_id,asset_id:a.asset_id,crop,document:a.document,location:a.location});update();
  }
  function jump(index){if(index>=0&&index<pages.length)stage.children[index].scrollIntoView({block:'start',behavior:'instant'})}
  $('#visual-page-jump').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#visual-page-jump').blur()}};
  $('#visual-page-jump').onchange=e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=pages.length)jump(n-1)};
  async function pump(){
   while(alive&&active<2&&queue.length){
    const card=queue.shift(),a=pages[Number(card.dataset.pageIndex)],epoch=generation;
    if(!card.isConnected||!card.near||card.loading||card.querySelector('img').hasAttribute('src'))continue;
    card.loading=true;active++;
    api('visual/source',{workspace_id:workspaceId,document_id:a.document_id,asset_id:a.asset_id}).then(data=>{
     if(!alive||epoch!==generation||!card.isConnected||!card.near)return;
     const surface=card.querySelector('.region-surface'),img=card.querySelector('img');
     surface.style.aspectRatio=`${data.width}/${data.height}`;
     img.onload=()=>{if(alive&&card.isConnected){card.ready=true;card.querySelector('.page-loading').hidden=true}};
     img.src=data.image;
    }).catch(error=>{
     if(alive&&epoch===generation&&card.isConnected){const message=card.querySelector('.page-loading');message.hidden=false;message.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.className='button';retry.textContent=t("Retry");retry.onclick=()=>{retry.remove();queue.push(card);pump()};message.append(retry)}
    }).finally(()=>{card.loading=false;active--;if(alive)pump()});
   }
  }
  function showDocument(id){
   generation++;observer?.disconnect();queue=[];activeDocument=id;pages=assets.filter(a=>a.document_id===id);
   $$('[data-picker-document]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.pickerDocument===id)));
   $('#visual-page-total').textContent=t("of {0}", pages.length);$('#visual-page-jump').max=pages.length;$('#visual-page-jump').value=1;
   stage.innerHTML=pages.map((a,i)=>`<article class="visual-page-card" data-page-index="${i}"><header><strong>${esc(sourceLocation(a.location))}</strong><label><input type="checkbox" aria-label="${t("Select {0}", esc(sourceLocation(a.location)))}"> ${a.location.startsWith('Page ')?t("Select whole page"):t("Select whole image")}</label></header><div class="region-surface" style="aspect-ratio:${a.width>0&&a.height>0?a.width+'/'+a.height:'0.707'}"><img alt="${esc(a.document)} · ${esc(sourceLocation(a.location))}" draggable="false"><div class="page-loading">${t("Preview loads as you scroll")}</div><div class="saved-regions"></div><span class="region-box draft-region hidden"></span></div></article>`).join('');
   stage.scrollTop=0;
   [...stage.children].forEach((card,i)=>{
    const a=pages[i],surface=card.querySelector('.region-surface'),box=card.querySelector('.draft-region');let start=null,crop=null;
    card.querySelector('input').onchange=e=>{if(e.target.checked)add(a,null);else{state.visualSelections=state.visualSelections.filter(s=>!same(s,a)||s.crop);update()}};
    const point=e=>{const r=surface.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
    const cancel=()=>{start=null;crop=null;box.classList.add('hidden')};
    surface.onpointerdown=e=>{if(tool!=='region'||space||!card.ready||e.button!==0)return;e.preventDefault();start=point(e);surface.setPointerCapture(e.pointerId)};
    surface.onpointermove=e=>{if(!start)return;const end=point(e);crop={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};box.classList.remove('hidden');Object.assign(box.style,{left:crop.x*100+'%',top:crop.y*100+'%',width:crop.width*100+'%',height:crop.height*100+'%'})};
    surface.onpointerup=()=>{if(crop&&crop.width>=.01&&crop.height>=.01)add(a,{...crop});cancel()};surface.onpointercancel=cancel;
   });
   observer=new IntersectionObserver(entries=>{
    for(const entry of entries){const card=entry.target;card.near=entry.isIntersecting;if(card.near){queue.push(card)}else{card.ready=false;card.querySelector('img').removeAttribute('src');card.querySelector('.page-loading').hidden=false}}
    pump();
   },{root:stage,rootMargin:'500px 0px'});
   [...stage.children].forEach(card=>observer.observe(card));update();
  }
  let scheduled=false;
  stage.onscroll=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(!alive)return;const top=stage.getBoundingClientRect().top;const cards=[...stage.children];let closest=0,distance=Infinity;cards.forEach((card,i)=>{const d=Math.abs(card.getBoundingClientRect().top-top);if(d<distance){distance=d;closest=i}});if(document.activeElement!==$('#visual-page-jump'))$('#visual-page-jump').value=closest+1})};
  $$('[data-picker-document]').forEach(b=>b.onclick=()=>showDocument(b.dataset.pickerDocument));
  showDocument(activeDocument);if(selected)jump(pages.findIndex(a=>same(selected,a)));setTool();stage.focus();
 }catch(error){toast(error.message)}
}

document.addEventListener('app-language-change',()=>{
 renderWorkspaceList();
 if($('#workspace-list').matches(':popover-open'))renderWorkspacePopup();
 renderSessions();
 renderDocs();
 renderConversation();
 if(state.evidence)openEvidenceReference(state.evidence.ref,true);
 else clearEvidence();
 clearStaleCloudConfirmation();
 if(pendingCloudRun)showCloudConfirmation(extractionRequest(),pendingCloudRun.targets,false);
 $('#toast').classList.add('hidden');
});

init();
