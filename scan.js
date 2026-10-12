// Reception scanner page logic.
(function () {
  const $ = (id) => document.getElementById(id);
  const S = KASE.store;
  const ROLL_RE = /^\d{2}QM[0-9A-Z]{6}$/;
  const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  const K = { token: 'kase_rec_token', queue: 'kase_queue', recent: 'kase_recent', device: 'kase_device', lastSync: 'kase_last_sync' };

  let token = S.get(K.token, null);
  let device = S.get(K.device, null);
  if (!device) { device = 'phone-' + KASE.uuid().slice(0, 6); S.set(K.device, device); }

  // ---------------- Screens ----------------
  function showLogin(message) {
    $('loginCard').hidden = false;
    $('scanCard').hidden = true;
    $('logoutBtn').hidden = true;
    $('status').hidden = true;
    stopCamera();
    const m = $('loginMsg');
    m.hidden = !message; m.className = 'msg warn'; m.textContent = message || '';
  }
  function showScanner() {
    $('loginCard').hidden = true;
    $('scanCard').hidden = false;
    $('logoutBtn').hidden = false;
    $('status').hidden = false;
    render();
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('loginBtn'), m = $('loginMsg');
    btn.disabled = true; btn.textContent = 'Logging in…'; m.hidden = true;
    try {
      const r = await KASE.api('login', { username: $('user').value.trim(), password: $('pass').value });
      if (r.role !== 'reception') throw new Error('Use the reception account on this page.');
      token = r.token; S.set(K.token, token);
      $('pass').value = '';
      showScanner();
      sync();
    } catch (err) {
      m.hidden = false; m.className = 'msg bad'; m.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Log in';
    }
  });

  $('logoutBtn').addEventListener('click', () => {
    const pending = queue().length;
    if (pending && !window.confirm(pending + ' scans have not synced yet. They stay on this phone and upload after the next login. Log out?')) return;
    token = null; S.del(K.token);
    showLogin();
  });

  // ---------------- Queue and sync ----------------
  const queue = () => S.get(K.queue, []);
  const recent = () => S.get(K.recent, []);

  function saveScan(roll) {
    const scan = { id: KASE.uuid(), roll: roll, ts: Date.now() };
    const q = queue(); q.push(scan);
    if (!S.set(K.queue, q)) { flash(false, 'Phone storage full', 'Sync before scanning more'); return false; }
    const r = recent(); r.unshift({ id: scan.id, roll: roll, ts: scan.ts, synced: false });
    S.set(K.recent, r.slice(0, 15));
    render();
    clearTimeout(saveScan.t); saveScan.t = setTimeout(sync, 1500);
    return true;
  }

  let syncing = false;
  async function sync() {
    if (syncing || !token) return;
    const q = queue();
    if (!q.length) { render(); return; }
    syncing = true; render();
    try {
      const r = await KASE.api('submitScans', { token: token, device: device, scans: q.slice(0, 200) }, 45000);
      const saved = new Set(r.saved);
      S.set(K.queue, queue().filter((s) => !saved.has(s.id)));
      S.set(K.recent, recent().map((x) => saved.has(x.id) ? Object.assign(x, { synced: true }) : x));
      S.set(K.lastSync, Date.now());
      if (queue().length) setTimeout(sync, 300);
    } catch (err) {
      if (err.code === 'AUTH') { token = null; S.del(K.token); showLogin('Please log in again. Saved scans are kept and will upload after login.'); }
    } finally {
      syncing = false; render();
    }
  }
  setInterval(sync, 30000);
  window.addEventListener('online', () => { render(); sync(); });
  window.addEventListener('offline', render);
  $('syncBtn').addEventListener('click', sync);

  function render() {
    const n = queue().length;
    const online = navigator.onLine;
    $('netDot').className = 'dot' + (online ? '' : ' off');
    $('pending').textContent = syncing ? 'Syncing…' : (n ? n + ' waiting to sync' : 'All synced');
    if (!online && n) $('pending').textContent = 'Offline · ' + n + ' saved';
    const last = S.get(K.lastSync, 0);
    $('syncInfo').textContent = last ? 'Last synced at ' + KASE.clock(last) + '.' : '';
    const list = recent();
    $('recentEmpty').hidden = list.length > 0;
    $('recent').innerHTML = '';
    list.slice(0, 10).forEach((x) => {
      const li = document.createElement('li');
      const a = document.createElement('span'); a.className = 'roll'; a.textContent = x.roll;
      const b = document.createElement('span'); b.className = 'st' + (x.synced ? ' synced' : '');
      b.textContent = KASE.clock(x.ts) + ' · ' + (x.synced ? 'Synced' : 'Saved on phone');
      li.append(a, b); $('recent').append(li);
    });
  }

  // ---------------- Feedback ----------------
  let audio = null;
  function beep(ok) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const tones = ok ? [[1046, 0, 0.12]] : [[220, 0, 0.15], [220, 0.2, 0.15]];
      tones.forEach(([f, at, len]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = f; o.type = ok ? 'sine' : 'square';
        g.gain.setValueAtTime(0.18, audio.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + at + len);
        o.connect(g).connect(audio.destination);
        o.start(audio.currentTime + at); o.stop(audio.currentTime + at + len + 0.02);
      });
    } catch (e) { /* sound unavailable */ }
    if (navigator.vibrate) navigator.vibrate(ok ? 80 : [120, 80, 120]);
  }
  function flash(ok, title, detail) {
    const el = $('result');
    el.className = 'result ' + (ok ? 'ok' : 'bad');
    el.innerHTML = '';
    el.append(document.createTextNode((ok ? '✓ ' : '✕ ') + title));
    if (detail) { const s = document.createElement('small'); s.textContent = detail; el.append(s); }
    beep(ok);
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { el.className = 'result'; el.textContent = 'Ready to scan'; }, ok ? 2500 : 3500);
  }

  // ---------------- Accepting a code ----------------
  const recentlyAccepted = {};
  function onCode(raw) {
    const code = String(raw || '').trim().toUpperCase();
    if (!code) return;
    // One read is enough: Code 128 has a built-in check digit, and the roll-number pattern is checked below.
    if (recentlyAccepted[code] && Date.now() - recentlyAccepted[code] < 20000) return;
    recentlyAccepted[code] = Date.now();
    if (!ROLL_RE.test(code)) { flash(false, 'Scan failed', 'Not a student ID barcode. Try again.'); return; }
    if (saveScan(code)) flash(true, 'Scan successful', code);
  }
  window.__kaseOnCode = onCode; // used by automated tests

  $('manualBtn').addEventListener('click', () => { $('manualForm').hidden = false; $('manualRoll').focus(); });
  $('manualCancel').addEventListener('click', () => { $('manualForm').hidden = true; });
  $('manualForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('manualRoll').value.replace(/\s+/g, '').toUpperCase();
    if (!ROLL_RE.test(code)) { flash(false, 'Check the roll number', 'It should look like 25QM1A0000.'); return; }
    if (saveScan(code)) flash(true, 'Saved', code);
    $('manualRoll').value = '';
    $('manualForm').hidden = true;
  });

  // ---------------- Camera and decoding ----------------
  let stream = null, running = false, detector = null, zx = null, canvas = null, wakeLock = null;

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  }

  async function getDecoder() {
    if (detector || zx) return;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.indexOf('code_128') >= 0) { detector = new window.BarcodeDetector({ formats: ['code_128'] }); return; }
      } catch (e) { /* fall back */ }
    }
    if (!window.ZXing) await loadScript(ZXING_URL);
    const Z = window.ZXing;
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_128]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    zx = new Z.MultiFormatReader(); zx.setHints(hints);
    canvas = document.createElement('canvas');
  }

  async function decodeFrame(video) {
    if (detector) {
      const codes = await detector.detect(video);
      return codes.length ? codes[0].rawValue : null;
    }
    const Z = window.ZXing;
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    // Look at the middle band of the picture, where the guide box is.
    const bandH = Math.round(h * 0.5), y0 = Math.round(h * 0.25);
    const scale = Math.min(1, 1000 / w);
    canvas.width = Math.round(w * scale); canvas.height = Math.round(bandH * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, y0, w, bandH, 0, 0, canvas.width, canvas.height);
    try {
      const lum = new Z.HTMLCanvasElementLuminanceSource(canvas);
      const r = zx.decodeWithState(new Z.BinaryBitmap(new Z.HybridBinarizer(lum)));
      return r.getText();
    } catch (e) { return null; }
  }

  async function startCamera() {
    const msg = $('camMsg');
    msg.textContent = 'Starting camera…';
    try {
      await getDecoder();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const v = $('video');
      v.srcObject = stream; await v.play();
      $('startPane').hidden = true; $('guide').hidden = false; $('guideText').hidden = false;
      setupControls(stream.getVideoTracks()[0]);
      running = true; loop();
      try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* optional */ }
    } catch (err) {
      stopCamera();
      msg.textContent = err && err.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access for this site in the browser settings, then tap Start again.'
        : 'Could not start the camera' + (navigator.onLine ? '.' : ' (the scanner needs internet the first time it is opened).') + ' You can still type roll numbers.';
    }
  }

  // Torch and zoom, on phones whose camera supports them.
  let torchOn = false;
  async function setupControls(track) {
    const caps = (track && track.getCapabilities) ? track.getCapabilities() : {};
    const apply = (c) => track.applyConstraints({ advanced: [c] }).catch(() => {});
    if (caps.focusMode && caps.focusMode.indexOf('continuous') >= 0) apply({ focusMode: 'continuous' });
    $('torchBtn').hidden = !caps.torch;
    torchOn = false; $('torchBtn').setAttribute('aria-pressed', 'false'); $('torchBtn').textContent = 'Torch off';
    if (caps.zoom && caps.zoom.max > caps.zoom.min) {
      const z = $('zoom');
      z.min = caps.zoom.min; z.max = Math.min(caps.zoom.max, caps.zoom.min * 5); z.step = caps.zoom.step || 0.1;
      const saved = Number(S.get('kase_zoom', 0));
      z.value = saved && saved >= z.min && saved <= z.max ? saved : (track.getSettings().zoom || caps.zoom.min);
      apply({ zoom: Number(z.value) });
      z.oninput = () => { apply({ zoom: Number(z.value) }); S.set('kase_zoom', Number(z.value)); };
      $('zoomWrap').hidden = false;
    } else $('zoomWrap').hidden = true;
    $('camCtl').hidden = $('torchBtn').hidden && $('zoomWrap').hidden;
    $('torchBtn').onclick = () => {
      torchOn = !torchOn;
      apply({ torch: torchOn });
      $('torchBtn').setAttribute('aria-pressed', String(torchOn));
      $('torchBtn').textContent = torchOn ? 'Torch on' : 'Torch off';
    };
  }

  function stopCamera() {
    $('camCtl').hidden = true;
    running = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    $('startPane').hidden = false; $('guide').hidden = true; $('guideText').hidden = true;
  }

  async function loop() {
    if (!running) return;
    const v = $('video');
    try {
      if (v.readyState >= 2) {
        const code = await decodeFrame(v);
        if (code) onCode(code);
      }
    } catch (e) { /* skip frame */ }
    setTimeout(loop, detector ? 80 : 120);
  }

  $('startBtn').addEventListener('click', () => {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { /* ignore */ }
    startCamera();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) { stopCamera(); $('camMsg').textContent = 'Camera paused. Tap Start scanning.'; }
    if (!document.hidden) sync();
  });

  // ---------------- Clock (helps spot a wrong phone time) ----------------
  function tick() { $('clock').textContent = 'Phone time ' + KASE.clock(Date.now()); }
  tick(); setInterval(tick, 15000);

  KASE.registerSW();
  if (token) { showScanner(); sync(); } else showLogin();
})();
