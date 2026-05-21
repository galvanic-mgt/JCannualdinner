import {
  listEvents, createEvent, upsertEventMeta, deleteEvent,
  getEventInfo, saveEventInfo, setCurrentEventId
} from './core_firebase.js';

const $ = (sel) => document.querySelector(sel);

function setStatus(msg, kind = 'info'){
  const s = $('#eaStatus');
  if (!s) return;
  s.textContent = msg || '';
  s.style.opacity = '1';
  s.style.color = kind === 'error' ? '#ff5a67' : '';
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => { s.style.opacity = '0.7'; }, 1500);
}

function rowTemplate(ev){
  const listed = ev.listed !== false;
  return `
<tr data-id="${ev.id}" data-last-title="${ev.name || ''}">
  <td class="mono">${ev.id}</td>
  <td><input class="name" value="${ev.name || ''}"></td>
  <td><input class="client" value="${ev.client || ''}"></td>
  <td style="text-align:center"><input type="checkbox" class="listed" ${listed ? 'checked' : ''}></td>
  <td class="actions">
    <button class="btn small open">開啟</button>
    <button class="btn small save">儲存</button>
    <button class="btn small danger delete">刪除</button>
  </td>
</tr>`;
}

async function bindRowActions(tbody){
  tbody.querySelectorAll('tr').forEach((tr) => {
    const id = tr.dataset.id;

    tr.querySelector('.open')?.addEventListener('click', () => {
      setCurrentEventId(id);
      $('#cmsNav .nav-item[data-target="pageEvent"]')?.click();
      window.scrollTo(0, 0);
    });

    tr.querySelector('.save')?.addEventListener('click', async () => {
      try {
        const name = tr.querySelector('.name').value.trim();
        const client = tr.querySelector('.client').value.trim();
        const listed = tr.querySelector('.listed').checked;
        await upsertEventMeta(id, { name: name || '活動', client, listed });

        const info = (await getEventInfo(id)).info || {};
        if (!info.title || info.title === '' || info.title === tr.dataset.lastTitle) {
          await saveEventInfo(id, { ...info, title: name || info.title || '活動' });
        }

        tr.classList.add('saved');
        setTimeout(() => tr.classList.remove('saved'), 700);
        setStatus('已儲存');
        window.refreshCMS?.();
      } catch (err) {
        setStatus('儲存失敗：' + (err?.message || err), 'error');
      }
    });

    tr.querySelector('.delete')?.addEventListener('click', async () => {
      if (!confirm('確定刪除此活動？此操作不能復原。')) return;
      try {
        await deleteEvent(id);
        setStatus('已刪除');
        await renderEventsAdmin();
        window.refreshCMS?.();
      } catch (err) {
        setStatus('刪除失敗：' + (err?.message || err), 'error');
      }
    });
  });
}

export async function renderEventsAdmin(){
  const container = $('#eventsAdmin');
  if (!container) return;

  container.innerHTML = `
<div class="card" style="margin-bottom:12px">
  <h4>新增活動</h4>
  <div class="bar" style="gap:8px; align-items:center">
    <input id="eaName" placeholder="活動名稱">
    <input id="eaClient" placeholder="客戶名稱">
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="eaListed" checked> 顯示於活動清單</label>
    <button id="eaCreate" class="btn primary">+ 建立</button>
    <span id="eaStatus" class="muted" style="font-size:12px;opacity:.7"></span>
  </div>
</div>

<div class="card">
  <h4>現有活動</h4>
  <table class="fullwidth">
    <thead><tr><th>ID</th><th>名稱</th><th>客戶</th><th>顯示</th><th>操作</th></tr></thead>
    <tbody id="eaRows"></tbody>
  </table>
</div>`;

  const btn = $('#eaCreate');
  btn?.addEventListener('click', async () => {
    const name = $('#eaName').value.trim();
    const client = $('#eaClient').value.trim();
    const listed = $('#eaListed').checked;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = '建立中...';
    setStatus('建立活動中...');

    try {
      const id = await createEvent(name, client);
      if (listed === false) {
        await upsertEventMeta(id, { listed: false });
      }
      setStatus('已建立');
      await renderEventsAdmin();
      window.refreshCMS?.();
    } catch (err) {
      setStatus('建立失敗：' + (err?.message || err), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
      $('#eaName').value = '';
      $('#eaClient').value = '';
      $('#eaListed').checked = true;
    }
  });

  const events = await listEvents();
  const tbody = $('#eaRows');
  tbody.innerHTML = events.map(rowTemplate).join('');
  await bindRowActions(tbody);
}

export function bootEventsAdmin(){
  $('#cmsNav .nav-item[data-target="pageEventsManage"]')?.addEventListener('click', renderEventsAdmin);
  renderEventsAdmin();
}
