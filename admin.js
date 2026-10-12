// Class scheduler page logic.
(function () {
  const $ = (id) => document.getElementById(id);
  const S = KASE.store;
  const TK = 'kase_coord_token';
  let token = S.get(TK, null);
  let classes = [];
  let editing = null;          // class being edited
  let confirmId = null;        // class awaiting cancel confirmation
  let filter = 'All';
  const form = { batch: null, type: 'Class' };

  function toast(text) {
    const t = $('toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3500);
  }
  function formMsg(text, kind) { const m = $('formMsg'); m.hidden = !text; m.className = 'msg ' + (kind || 'bad'); m.textContent = text || ''; }

  // ---------------- Login ----------------
  function showLogin(message) {
    $('loginCard').hidden = false; $('app').hidden = true; $('logoutBtn').hidden = true;
    const m = $('loginMsg'); m.hidden = !message; m.className = 'msg warn'; m.textContent = message || '';
  }
  function showApp() { $('loginCard').hidden = true; $('app').hidden = false; $('logoutBtn').hidden = false; load(); }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('loginBtn'), m = $('loginMsg');
    btn.disabled = true; btn.textContent = 'Logging in…'; m.hidden = true;
    try {
      const r = await KASE.api('login', { username: $('user').value.trim(), password: $('pass').value });
      if (r.role !== 'coordinator') throw new Error('Use the coordinator account on this page.');
      token = r.token; S.set(TK, token); $('pass').value = '';
      showApp();
    } catch (err) { m.hidden = false; m.className = 'msg bad'; m.textContent = err.message; }
    finally { btn.disabled = false; btn.textContent = 'Log in'; }
  });
  $('logoutBtn').addEventListener('click', () => { token = null; S.del(TK); showLogin(); });

  async function call(action, data) {
    try { return await KASE.api(action, Object.assign({ token: token }, data || {})); }
    catch (err) {
      if (err.code === 'AUTH') { token = null; S.del(TK); showLogin('Your session ended. Please log in again.'); }
      throw err;
    }
  }

  // ---------------- Form ----------------
  function setSeg(id, value) {
    document.querySelectorAll('#' + id + ' button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === value)));
  }
  function updateTypeUI() {
    const field = form.type === 'Field';
    $('startWrap').hidden = field;
    $('start').required = !field;
    $('typeHint').textContent = field
      ? 'Field day: scans from 8:50 AM to 2:00 PM mark FN, and scans from 2:00 PM to 4:00 PM mark AN. Both can also be typed by hand in the sheet.'
      : 'The class runs 2 hours from the start time. Scans count from 20 minutes before the start.';
  }
  document.querySelectorAll('#batchSeg button').forEach((b) => b.addEventListener('click', () => { form.batch = b.dataset.v; setSeg('batchSeg', form.batch); }));
  document.querySelectorAll('#typeSeg button').forEach((b) => b.addEventListener('click', () => { form.type = b.dataset.v; setSeg('typeSeg', form.type); updateTypeUI(); }));

  function resetForm() {
    editing = null;
    form.batch = null; form.type = 'Class';
    setSeg('batchSeg', null); setSeg('typeSeg', 'Class');
    $('date').value = KASE.todayIST(); $('start').value = '';
    $('formTitle').textContent = 'Schedule a class'; $('saveBtn').textContent = 'Create class';
    $('stopEdit').hidden = true; $('editBanner').hidden = true;
    formMsg(''); updateTypeUI();
  }
  function startEdit(c) {
    editing = c; confirmId = null;
    form.batch = c.batch; form.type = c.type;
    setSeg('batchSeg', c.batch); setSeg('typeSeg', c.type);
    $('date').value = c.date; $('start').value = c.type === 'Class' ? c.start : '';
    $('formTitle').textContent = 'Edit class'; $('saveBtn').textContent = 'Save changes';
    $('stopEdit').hidden = false;
    $('editBanner').hidden = false;
    $('editBanner').textContent = 'Editing ' + c.batch + ' · ' + KASE.niceDate(c.date) + (c.type === 'Field' ? ' · Field day' : ' · ' + KASE.time12(c.start)) +
      '. Attendance is recalculated from the scans after you save.';
    formMsg(''); updateTypeUI(); renderList();
    $('formCard').scrollIntoView({ behavior: 'smooth' });
  }
  $('stopEdit').addEventListener('click', () => { resetForm(); renderList(); });

  $('clsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.batch) { formMsg('Choose a batch.'); return; }
    if (!$('date').value) { formMsg('Choose a date.'); return; }
    if (form.type === 'Class' && !$('start').value) { formMsg('Choose a start time.'); return; }
    const cls = { batch: form.batch, type: form.type, date: $('date').value, start: $('start').value };
    const btn = $('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…'; formMsg('');
    try {
      let r;
      if (editing) { cls.id = editing.id; r = await call('updateClass', { cls: cls }); }
      else r = await call('createClass', { cls: cls });
      const what = r.cls.batch + ' · ' + KASE.niceDate(r.cls.date) + (r.cls.type === 'Field' ? ' · Field day' : ' · ' + KASE.time12(r.cls.start));
      toast((editing ? 'Saved: ' : 'Created: ') + what + (r.marked ? ' · ' + r.marked + ' already marked present' : ''));
      resetForm();
      await load();
    } catch (err) {
      if (err.code !== 'AUTH') formMsg(err.message);
    } finally { btn.disabled = false; btn.textContent = editing ? 'Save changes' : 'Create class'; }
  });

  // ---------------- List ----------------
  async function load() {
    try { classes = (await call('listClasses')).classes; renderList(); }
    catch (err) { if (err.code !== 'AUTH') $('list').innerHTML = '<p class="msg bad">' + escapeHtml(err.message) + '</p>'; }
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  document.querySelectorAll('#filters .chip').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.f;
    document.querySelectorAll('#filters .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderList();
  }));
  $('showPast').addEventListener('change', renderList);

  function renderList() {
    const today = KASE.todayIST(), now = KASE.nowHHMM();
    const isPast = (c) => c.date < today || (c.date === today && c.end <= now);
    const showPast = $('showPast').checked;
    const items = classes.filter((c) => filter === 'All' || c.batch === filter);
    const upcoming = items.filter((c) => c.status === 'Active' && !isPast(c)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const past = items.filter((c) => c.status !== 'Active' || isPast(c)).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const list = $('list'); list.innerHTML = '';
    const group = (title, arr) => {
      const h = document.createElement('div'); h.className = 'group-title'; h.textContent = title; list.append(h);
      if (!arr.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'None.'; list.append(p); }
      arr.forEach((c) => list.append(row(c)));
    };
    group('Today and upcoming', upcoming);
    if (showPast) group('Past and cancelled', past);
  }

  function row(c) {
    const wrap = document.createElement('div');
    const el = document.createElement('div');
    el.className = 'cls' + (c.status !== 'Active' ? ' cancelled' : '');
    const when = document.createElement('div'); when.className = 'when';
    const b = document.createElement('b'); b.textContent = KASE.niceDate(c.date);
    const s = document.createElement('span');
    s.textContent = c.type === 'Field' ? 'Field day · FN and AN' : KASE.time12(c.start) + ' – ' + KASE.time12(c.end);
    if (c.status !== 'Active') s.textContent += ' · Cancelled';
    when.append(b, s);
    const badge = document.createElement('span'); badge.className = 'badge ' + (c.status === 'Active' ? 'b-' + c.batch : 'b-cancel'); badge.textContent = c.batch;
    el.append(badge, when);
    if (c.status === 'Active') {
      const ed = document.createElement('button'); ed.className = 'btn secondary small'; ed.textContent = 'Edit';
      ed.addEventListener('click', () => startEdit(c));
      const cx = document.createElement('button'); cx.className = 'btn secondary small'; cx.textContent = 'Cancel';
      cx.addEventListener('click', () => { confirmId = c.id; renderList(); });
      el.append(ed, cx);
    }
    wrap.append(el);
    if (confirmId === c.id) {
      const box = document.createElement('div'); box.className = 'confirm';
      box.textContent = 'Cancel this class? Its attendance column will be removed from the sheet.';
      const acts = document.createElement('div'); acts.className = 'actions';
      const yes = document.createElement('button'); yes.className = 'btn danger small'; yes.textContent = 'Yes, cancel class';
      const no = document.createElement('button'); no.className = 'btn secondary small'; no.textContent = 'Keep it';
      no.addEventListener('click', () => { confirmId = null; renderList(); });
      yes.addEventListener('click', async () => {
        yes.disabled = true; yes.textContent = 'Cancelling…';
        try { await call('cancelClass', { id: c.id }); confirmId = null; if (editing && editing.id === c.id) resetForm(); toast('Class cancelled.'); await load(); }
        catch (err) { if (err.code !== 'AUTH') { toast(err.message); yes.disabled = false; yes.textContent = 'Yes, cancel class'; } }
      });
      acts.append(yes, no); box.append(acts); wrap.append(box);
    }
    return wrap;
  }

  resetForm();
  if (token) showApp(); else showLogin();
})();
