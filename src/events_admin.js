// events_admin.js ??æ´»å?ç®¡ç? subpage logic (with status + auto-refresh)
import {
  listEvents, createEvent, upsertEventMeta, deleteEvent,
  getEventInfo, saveEventInfo, setCurrentEventId
} from './core_firebase.js?v=20260521-jcdb';

const $ = (sel) => document.querySelector(sel);

function setStatus(msg, kind = 'info'){
  const s = $('#eaStatus');
  if(!s) return;
  s.textContent = msg || '';
  s.style.opacity = '1';
  s.style.color = (kind === 'error') ? '#ff5a67' : '';
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(()=>{ s.style.opacity = '0.7'; }, 1500);
}

function rowTemplate(ev){
  const listed = ev.listed !== false;
  return `
<tr data-id="${ev.id}">
  <td class="mono">${ev.id}</td>
  <td><input class="name" value="${ev.name || ''}"/></td>
  <td><input class="client" value="${ev.client || ''}"/></td>
  <td style="text-align:center"><input type="checkbox" class="listed" ${listed ? 'checked' : ''}/></td>
  <td class="actions">
    <button class="btn small open">?‹å?</button>
    <button class="btn small save">?²å?</button>
    <button class="btn small danger delete">?ªé™¤</button>
  </td>
</tr>`;
}

async function bindRowActions(tbody){
  tbody.querySelectorAll('tr').forEach((tr)=>{
    const id = tr.dataset.id;

    tr.querySelector('.open')?.addEventListener('click', ()=>{
      setCurrentEventId(id);
      $('#cmsNav .nav-item[data-target="pageEvent"]')?.click();
      window.scrollTo(0, 0);
    });

    tr.querySelector('.save')?.addEventListener('click', async ()=>{
      try{
        const name   = tr.querySelector('.name').value.trim();
        const client = tr.querySelector('.client').value.trim();
        const listed = tr.querySelector('.listed').checked;
        await upsertEventMeta(id, { name: name || '?°æ´»??, client, listed });

        // keep info.title in sync when blank/unchanged
        const info = (await getEventInfo(id)).info || {};
        if(!info.title || info.title === '' || info.title === tr.dataset.lastTitle){
          await saveEventInfo(id, { ...info, title: name || info.title || '?°æ´»?? });
        }

        tr.classList.add('saved');
        setTimeout(()=> tr.classList.remove('saved'), 700);
        setStatus('å·²å„²å­???);
        window.refreshCMS?.();            // auto-refresh CMS (left list, etc.)
      }catch(err){
        setStatus('?²å?å¤±æ?ï¼? + (err?.message || err), 'error');
      }
    });

    tr.querySelector('.delete')?.addEventListener('click', async ()=>{
      if(!confirm('ç¢ºå??ªé™¤?™å€‹æ´»?•ï?æ­¤æ?ä½œç„¡æ³•é??Ÿã€?)) return;
      try{
        await deleteEvent(id);
        setStatus('å·²åˆª????);
        await renderEventsAdmin();        // re-render admin table
        window.refreshCMS?.();            // refresh sidebar & tabs
      }catch(err){
        setStatus('?ªé™¤å¤±æ?ï¼? + (err?.message || err), 'error');
      }
    });
  });
}

export async function renderEventsAdmin(){
  const container = $('#eventsAdmin'); if(!container) return;

  container.innerHTML = `
<div class="card" style="margin-bottom:12px">
  <h4>?°å?æ´»å?</h4>
  <div class="bar" style="gap:8px; align-items:center">
    <input id="eaName" placeholder="æ´»å??ç¨±"/>
    <input id="eaClient" placeholder="å®¢æˆ¶?ç¨±"/>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="eaListed" checked/> é¡¯ç¤º?¼æ´»?•æ???/label>
    <button id="eaCreate" class="btn primary">+ å»ºç?</button>
    <span id="eaStatus" class="muted" style="font-size:12px;opacity:.7"></span>
  </div>
</div>

<div class="card">
  <h4>?¨éƒ¨æ´»å?</h4>
  <table class="fullwidth">
    <thead><tr><th>ID</th><th>?ç¨±</th><th>å®¢æˆ¶</th><th>?—å‡º</th><th>?•ä?</th></tr></thead>
    <tbody id="eaRows"></tbody>
  </table>
</div>`;

  // create
  const btn = $('#eaCreate');
  btn?.addEventListener('click', async ()=>{
    const name   = $('#eaName').value.trim();
    const client = $('#eaClient').value.trim();
    const listed = $('#eaListed').checked;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'å»ºç?æ´»å?ä¸­â€?;
    setStatus('å»ºç?æ´»å?ä¸­â€?);

    try{
      const id = await createEvent(name, client);
      if(listed === false){
        await upsertEventMeta(id, { listed: false });
      }
      setStatus('å·²å»ºç«???);
      await renderEventsAdmin();    // refresh admin table
      window.refreshCMS?.();        // refresh sidebar & tabs
    }catch(err){
      setStatus('å»ºç?å¤±æ?ï¼? + (err?.message || err), 'error');
    }finally{
      btn.disabled = false;
      btn.textContent = orig;
      $('#eaName').value = '';
      $('#eaClient').value = '';
      $('#eaListed').checked = true;
    }
  });

  // load rows
  const events = await listEvents();
  const tbody  = $('#eaRows');
  tbody.innerHTML = events.map(rowTemplate).join('');
  await bindRowActions(tbody);
}

export function bootEventsAdmin(){
  $('#cmsNav .nav-item[data-target="pageEventsManage"]')
    ?.addEventListener('click', renderEventsAdmin);
  renderEventsAdmin();
}
