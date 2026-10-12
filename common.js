// Shared helpers for the scanner and coordinator pages.
window.KASE = (function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  function err(message, code) { const e = new Error(message); e.code = code; return e; }

  async function api(action, data, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 25000);
    let res;
    try {
      res = await fetch(window.KASE_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(Object.assign({ action: action }, data || {})),
        redirect: 'follow',
        signal: ctrl.signal
      });
    } catch (e) {
      throw err('No internet connection.', 'NET');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw err('Server error (' + res.status + '). Try again.', 'NET');
    let body;
    try { body = await res.json(); } catch (e) {
      throw err('Unexpected reply from the server. Check the web app is deployed with access "Anyone".', 'SERVER');
    }
    if (!body.ok) throw err(body.error || 'Something went wrong.', body.code || 'ERROR');
    return body;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  // India time helpers
  const TZ = 'Asia/Kolkata';
  function todayIST() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function nowHHMM() {
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  }
  function time12(hhmm) {
    if (!hhmm) return '';
    let h = Number(hhmm.slice(0, 2)); const m = hhmm.slice(3, 5);
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return h + ':' + m + ' ' + ap;
  }
  function clock(ms) {
    return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms));
  }
  function niceDate(yyyyMMdd) {
    const d = new Date(yyyyMMdd + 'T12:00:00+05:30');
    return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  }

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline install unavailable */ });
    }
  }

  return { store: store, api: api, uuid: uuid, todayIST: todayIST, nowHHMM: nowHHMM, time12: time12,
    clock: clock, niceDate: niceDate, registerSW: registerSW };
})();
