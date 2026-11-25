(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function peso(n) { return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ---------- data ---------- */
  var LARGE = { 'Pinagbuhatan': 173576, 'Manggahan': 90884, 'Rosario': 80002, 'Santolan': 61308, 'Maybunga': 50069 };
  var BARANGAYS = ['Bagong Ilog', 'Bagong Katipunan', 'Bambang', 'Buting', 'Caniogan', 'Dela Paz', 'Kalawaan', 'Kapasigan', 'Kapitolyo', 'Malinao',
    'Manggahan', 'Maybunga', 'Oranbo', 'Palatiw', 'Pinagbuhatan', 'Pineda', 'Rosario', 'Sagad', 'San Antonio', 'San Joaquin',
    'San Jose', 'San Miguel', 'San Nicolas', 'Santa Cruz', 'Santa Lucia', 'Santa Rosa', 'Santo Tomas', 'Santolan', 'Sumilang', 'Ugong'];

  var CHECKLIST = [
    { g: 'Before filing', items: [
      ['elig', 'Confirm eligibility', 'Use the eligibility checker above (LGC Sec. 39 and 40).'],
      ['date', 'Confirm the 2028 election date and filing period', 'RA 12326 moved the BSKE to November 2028. Wait for the COMELEC calendar and implementing resolution.'],
      ['reg', 'Make sure you are a registered voter in your barangay', 'Check your registration with the COMELEC Pasig City Election Office. Watch for registration deadlines.'],
      ['res', 'Gather proof of one-year residency', 'For example a barangay certificate, lease or utility bills showing your address.'],
      ['terms', 'Check term limits if you are an incumbent', 'Ask COMELEC how consecutive terms are counted under RA 12232 and RA 12326.']
    ] },
    { g: 'Certificate of Candidacy (COC)', items: [
      ['form', 'Get the official COC form', 'Use the form prescribed by COMELEC for the barangay election.'],
      ['fill', 'Complete every field accurately', 'Errors or false statements in a COC can lead to cancellation or disqualification.'],
      ['notary', 'Have the COC sworn or notarized', 'The COC is under oath. Bring a valid government ID.'],
      ['ids', 'Prepare valid IDs and photos', 'Bring IDs and the number of copies and photos COMELEC requires.'],
      ['cona', 'No party nomination needed (CONA not applicable)', 'Barangay elections are non-partisan, so a Certificate of Nomination and Acceptance from a party is not used.'],
      ['file', 'File at the COMELEC Pasig City Election Office', 'File within the official period, and keep the receiving copy. Pasig has one legislative district, so there is a single filing office.']
    ] },
    { g: 'Campaign compliance', items: [
      ['limit', 'Compute your spending limit', 'RA 7166: ₱5.00 per registered voter for an unaffiliated candidate. Confirm in the current COMELEC resolution (use the calculator below).'],
      ['calendar', 'Follow the campaign period and rules', 'Campaign only within the period set by COMELEC; follow rules on posters, size, and where they may be placed.'],
      ['records', 'Keep receipts and records of every contribution and expense', 'You will need them for your SOCE.'],
      ['bank', 'Keep money and donations traceable', 'Record the name of every donor and the amount; follow rules on prohibited contributions.']
    ] },
    { g: 'After election day', items: [
      ['soce', 'File your SOCE within 30 days after election day', 'Statement of Contributions and Expenditures must be filed even if you spent nothing (file a zero-expense statement).'],
      ['copy', 'Keep copies of everything', 'Keep your filed COC, SOCE and receipts as proof of compliance.']
    ] }
  ];

  /* ---------- theme ---------- */
  var themeBtn = $('#theme-toggle');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#07131f' : '#0A2540');
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  themeBtn.addEventListener('click', function () {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t); try { localStorage.setItem('bcg-theme', t); } catch (e) {}
  });

  /* ---------- online status ---------- */
  var badge = $('#net-badge'), netText = $('#net-text');
  function setNet() {
    var on = navigator.onLine;
    badge.className = 'net-badge ' + (on ? 'online' : 'offline');
    netText.textContent = on ? 'Online' : 'Offline';
  }
  window.addEventListener('online', setNet); window.addEventListener('offline', setNet); setNet();

  /* ---------- barangay selects ---------- */
  var elB = $('#el-barangay'), calcB = $('#calc-brgy');
  BARANGAYS.forEach(function (b) {
    [elB, calcB].forEach(function (sel) { var o = document.createElement('option'); o.value = b; o.textContent = b; sel.appendChild(o); });
  });

  /* ---------- eligibility ---------- */
  function parseDate(v) { if (!v) return null; var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addYears(d, n) { var x = new Date(d.getTime()); x.setFullYear(x.getFullYear() + n); return x; }
  function fmt(d) { return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }); }

  $('#el-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var res = $('#el-result'), fails = [], warns = [], oks = [];
    var brgy = elB.value, elec = parseDate($('#el-election').value), dob = parseDate($('#el-dob').value), since = parseDate($('#el-since').value);
    if (!brgy || !elec || !dob || !since) {
      res.className = 'result maybe'; res.hidden = false;
      res.innerHTML = '<h3>Please complete the form</h3><p>Choose a barangay and fill in the three dates.</p>';
      res.focus(); return;
    }
    if ($('#el-citizen').checked) oks.push('Filipino citizen (Sec. 39).'); else fails.push('You must be a citizen of the Philippines.');
    if ($('#el-voter').checked) oks.push('Registered voter in ' + brgy + '. Confirm this with the COMELEC Pasig City Election Office.'); else fails.push('You must be a registered voter in ' + brgy + '. Register or transfer your registration during the next registration period.');
    if ($('#el-literate').checked) oks.push('Able to read and write Filipino or a local language/dialect.'); else fails.push('You must be able to read and write Filipino or another local language or dialect.');

    var eighteen = addYears(dob, 18);
    if (eighteen <= elec) oks.push('You will be at least 18 on ' + fmt(elec) + '.'); else fails.push('You turn 18 on ' + fmt(eighteen) + ', after the assumed election day (' + fmt(elec) + ').');

    var needBy = addYears(elec, -1);
    if (since <= needBy) oks.push('Residency: living in ' + brgy + ' since ' + fmt(since) + ' meets the one-year rule for ' + fmt(elec) + '.');
    else fails.push('You must have lived in ' + brgy + ' at least one year before election day. Your residency would need to start on or before ' + fmt(needBy) + '.');

    var dq = $$('.el-dq').filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    dq.forEach(function (d) { fails.push('Possible disqualification (Sec. 40): ' + d + '.'); });
    warns.push('The election date is provisional. Reports say the second Monday of November 2028 (Nov 13), but COMELEC has the final word.');
    warns.push('Incumbents: check how many consecutive terms you have served, since term limits apply.');
    warns.push('Omnibus Election Code grounds (such as certain election offenses) are not covered by this tool.');

    var cls = fails.length ? 'fail' : 'pass';
    var title = fails.length ? 'Not eligible on the information given' : 'You appear to meet the basic qualifications';
    var html = '<h3>' + title + '</h3>';
    if (fails.length) html += '<p><strong>Issues to resolve:</strong></p><ul>' + fails.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    if (oks.length) html += '<p><strong>Met:</strong></p><ul>' + oks.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    html += '<p><strong>Also check:</strong></p><ul>' + warns.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    html += '<p class="small muted">This is an informal screening tool, not a legal determination. COMELEC decides on a candidate\'s qualifications.</p>';
    if (!fails.length) html += '<p><a class="btn" href="#checklist">Go to the filing checklist</a></p>';
    res.className = 'result ' + cls; res.innerHTML = html; res.hidden = false; res.focus();
  });
  $('#el-reset').addEventListener('click', function () { $('#el-result').hidden = true; setTimeout(function () { $('#el-election').value = '2028-11-13'; }, 0); });

  /* ---------- checklist ---------- */
  var CK_KEY = 'bcg-checklist-v1';
  var ckState = store.get(CK_KEY, {});
  var ckTotal = 0;
  function renderChecklist() {
    var out = '';
    ckTotal = 0;
    CHECKLIST.forEach(function (grp, gi) {
      out += '<div class="ck-group"><h3>' + esc(grp.g) + '</h3>';
      grp.items.forEach(function (it) {
        ckTotal++;
        var id = 'ck-' + it[0];
        out += '<div class="ck-item"><label class="check" for="' + id + '"><input type="checkbox" id="' + id + '" data-k="' + it[0] + '"' + (ckState[it[0]] ? ' checked' : '') + '><span>' + esc(it[1]) + '</span></label><p class="note">' + esc(it[2]) + '</p></div>';
      });
      out += '</div>';
    });
    $('#ck-list').innerHTML = out;
    updateProgress();
  }
  function updateProgress() {
    var done = Object.keys(ckState).filter(function (k) { return ckState[k]; }).length;
    var pct = ckTotal ? Math.round(done / ckTotal * 100) : 0;
    $('#ck-fill').style.width = pct + '%';
    $('#ck-bar').setAttribute('aria-valuenow', pct);
    $('#ck-label').textContent = done + ' of ' + ckTotal + ' done (' + pct + '%)';
  }
  $('#ck-list').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    if (e.target.checked) ckState[k] = true; else delete ckState[k];
    store.set(CK_KEY, ckState); updateProgress();
  });
  $('#ck-reset').addEventListener('click', function () {
    if (window.confirm('Clear all checklist progress?')) { ckState = {}; store.del(CK_KEY); renderChecklist(); }
  });
  $('#ck-print').addEventListener('click', function () { window.print(); });
  $('#ck-json').addEventListener('click', function () {
    var data = { exportedAt: new Date().toISOString(), guide: 'Pasig Punong Barangay Guide (2028 BSKE)', items: [] };
    CHECKLIST.forEach(function (g) { g.items.forEach(function (it) { data.items.push({ group: g.g, task: it[1], done: !!ckState[it[0]] }); }); });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'punong-barangay-checklist.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  renderChecklist();

  /* ---------- calculator ---------- */
  var voters = $('#calc-voters');
  function calc() { var n = parseInt(voters.value, 10); $('#calc-out').textContent = peso(isFinite(n) && n > 0 ? n * 5 : 0); }
  voters.addEventListener('input', calc);
  calcB.addEventListener('change', function () { if (calcB.value) { $('#calc-voters').focus(); } });
  calc();

  /* ---------- directory ---------- */
  var SAVED_KEY = 'bcg-saved-v1';
  var saved = store.get(SAVED_KEY, []);
  var list = $('#dir-list');
  function renderDir() {
    var q = $('#dir-search').value.trim().toLowerCase();
    var f = $('#dir-filter').value, s = $('#dir-sort').value;
    var rows = BARANGAYS.filter(function (b) {
      if (q && b.toLowerCase().indexOf(q) === -1) return false;
      if (f === 'large' && !LARGE[b]) return false;
      if (f === 'saved' && saved.indexOf(b) === -1) return false;
      return true;
    });
    rows.sort(function (a, b) { return s === 'za' ? b.localeCompare(a) : a.localeCompare(b); });
    $('#dir-count').textContent = 'Showing ' + rows.length + ' of 30 barangays';
    list.innerHTML = rows.map(function (b) {
      var isSaved = saved.indexOf(b) !== -1;
      return '<li class="dir-card"><h3>' + esc(b) + '</h3>' +
        '<p class="meta">Pasig City &middot; lone congressional district</p>' +
        (LARGE[b] ? '<p class="meta"><span class="tag">Top 5</span> 2024 population: ' + LARGE[b].toLocaleString('en-PH') + '</p>' : '') +
        '<p class="meta">File your COC at the COMELEC Pasig City Election Office.</p>' +
        '<div class="row"><button type="button" class="btn btn-sm btn-outline" data-save="' + esc(b) + '" aria-pressed="' + isSaved + '">' + (isSaved ? 'Saved' : 'Save') + '</button>' +
        '<button type="button" class="btn btn-sm" data-calc="' + esc(b) + '">Spending limit</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-check="' + esc(b) + '">Check eligibility</button></div></li>';
    }).join('') || '<li class="muted">No barangays match your search.</li>';
  }
  list.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    var b;
    if ((b = t.getAttribute('data-save'))) {
      var i = saved.indexOf(b); if (i === -1) saved.push(b); else saved.splice(i, 1);
      store.set(SAVED_KEY, saved); renderDir();
    } else if ((b = t.getAttribute('data-calc'))) {
      calcB.value = b; location.hash = '#calc'; voters.focus();
    } else if ((b = t.getAttribute('data-check'))) {
      elB.value = b; location.hash = '#eligibility';
    }
  });
  ['input', 'change'].forEach(function (ev) { $('#dir-search').addEventListener(ev, renderDir); });
  $('#dir-filter').addEventListener('change', renderDir);
  $('#dir-sort').addEventListener('change', renderDir);
  renderDir();

  /* ---------- active nav link ---------- */
  if ('IntersectionObserver' in window) {
    var links = $$('.bottom-nav a');
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          var id = en.target.id;
          links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ---------- install prompt ---------- */
  var deferred = null, ib = $('#install-banner');
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (!standalone && !store.get('bcg-install-dismissed', false)) ib.hidden = false;
  });
  $('#install-btn').addEventListener('click', function () {
    if (!deferred) return; deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; ib.hidden = true; });
  });
  $('#install-dismiss').addEventListener('click', function () { ib.hidden = true; store.set('bcg-install-dismissed', true); });
  window.addEventListener('appinstalled', function () { ib.hidden = true; });

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  var iosModal = $('#ios-modal');
  if (isIOS && isSafari && !standalone && !store.get('bcg-ios-seen', false)) {
    setTimeout(function () { iosModal.hidden = false; $('#ios-close').focus(); }, 2500);
  }
  function closeIos() { iosModal.hidden = true; store.set('bcg-ios-seen', true); }
  $('#ios-close').addEventListener('click', closeIos);
  iosModal.addEventListener('click', function (e) { if (e.target === iosModal) closeIos(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !iosModal.hidden) closeIos(); });

  /* ---------- service worker + update banner ---------- */
  if ('serviceWorker' in navigator) {
    var reloading = false, ub = $('#update-banner');
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        function show(w) { ub.hidden = false; $('#update-btn').onclick = function () { w.postMessage({ type: 'SKIP_WAITING' }); }; }
        if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) show(nw);
          });
        });
      }).catch(function () {});
    });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return; reloading = true; window.location.reload();
    });
  }
})();
