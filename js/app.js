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
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function parseDate(v) { if (!v) return null; var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addYears(d, n) { var x = new Date(d.getTime()); x.setFullYear(x.getFullYear() + n); return x; }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function fmt(d) { return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }); }
  function toast(msg) {
    var t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'banner banner-update'; t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:95;border-radius:10px'; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 3000);
  }

  /* ---------- data ---------- */
  var ELECTION = new Date('2028-11-13T00:00:00+08:00');
  var D1 = ['Bagong Ilog', 'Bagong Katipunan', 'Bambang', 'Buting', 'Caniogan', 'Kalawaan', 'Kapasigan', 'Kapitolyo', 'Malinao', 'Oranbo', 'Palatiw', 'Pineda', 'Sagad', 'San Antonio', 'San Joaquin', 'San Jose', 'San Nicolas', 'Santa Cruz', 'Santa Rosa', 'Santo Tomas', 'Sumilang', 'Ugong'];
  var D2 = ['Dela Paz', 'Manggahan', 'Maybunga', 'Pinagbuhatan', 'Rosario', 'San Miguel', 'Santa Lucia', 'Santolan'];
  var BARANGAYS = D1.concat(D2).sort(function (a, b) { return a.localeCompare(b); });
  var LARGE = { 'Pinagbuhatan': 173576, 'Manggahan': 90884, 'Rosario': 80002, 'Santolan': 61308, 'Maybunga': 50069 };
  function districtOf(b) { return D2.indexOf(b) !== -1 ? 2 : 1; }

  var CHECKLIST = [
    { g: 'Before filing', items: [
      ['elig', 'Confirm eligibility and term limits', 'Use the checker above (LGC Sec. 39 and 40, RA 12326 Sec. 1 and 5).'],
      ['res', 'Be a resident of your barangay by November 13, 2027', 'At least one year immediately before election day. Keep proof such as a barangay certificate, lease or utility bills.'],
      ['regv', 'Register or update your voter registration in your barangay', 'Watch for the COMELEC registration period (dates to be announced).'],
      ['psa', 'Get a PSA Birth Certificate', 'Proof of age and citizenship; bring a clear copy.'],
      ['vcert', "Get a COMELEC Pasig Voter's Certification", 'Request it at the COMELEC Pasig City Election Office; it confirms you are a registered voter in the barangay.'],
      ['verify', 'Verify the COMELEC implementing resolutions', 'A motion for partial reconsideration on RA 12326 was filed on November 10, 2026.']
    ] },
    { g: 'Certificate of Candidacy (COC)', items: [
      ['form', 'Get the official COC form from COMELEC', 'Use the form prescribed for the barangay election.'],
      ['fill', 'Complete every field accurately', 'False statements can lead to cancellation of the COC or disqualification.'],
      ['notary', 'Have the COC notarized', 'The COC is under oath; bring your valid ID to the notary.'],
      ['ids', 'Prepare valid IDs and photos', 'Bring the number of copies and photos COMELEC requires.'],
      ['cona', 'No party CONA needed', 'Barangay elections are non-partisan, so a Certificate of Nomination and Acceptance is not required.'],
      ['file', 'File on time at the COMELEC Pasig City Election Office', 'File within the official period and keep the receiving copy.']
    ] },
    { g: 'Campaign', items: [
      ['limit', 'Compute your spending limit', 'RA 7166: ₱5.00 per registered voter. Use the budget calculator above.'],
      ['rules', 'Follow campaign period and propaganda rules', 'Campaign only during the period COMELEC sets, and follow rules on posters and where they may be displayed.'],
      ['watch', 'Attend poll watcher briefings', 'Brief and accredit your watchers, and know the counting and canvassing procedures.'],
      ['records', 'Keep receipts and a record of every contribution and expense', 'Use the itemized ledger above.']
    ] },
    { g: 'After election day', items: [
      ['soce', 'Submit your SOCE within 30 days after election day (by December 13, 2028)', 'File even if you spent nothing (a zero-expense statement).'],
      ['copy', 'Keep copies of your COC, SOCE and receipts', 'Proof of compliance.'],
      ['train', 'If elected, attend the DILG-led training', 'RA 12326 Sec. 4-B provides for continuing training with TESDA, COMELEC and SUCs.']
    ] }
  ];

  /* ---------- i18n (EN / FIL) ---------- */
  var FIL = {
    skip: 'Lumaktaw sa pangunahing nilalaman', updAvail: 'May bagong bersyon na.', updNow: 'I-update na',
    nCountdown: 'Countdown', nLegal: 'Batas', nEligible: 'Kwalipikasyon', nBudget: 'Badyet', nChecklist: 'Checklist', nBarangays: 'Mga Barangay', nPlaybook: 'Gabay',
    instMsg: 'I-install ang gabay na ito para magamit kahit offline.', instBtn: 'I-install', notNow: 'Mamaya na',
    eyebrow: 'Di-opisyal na gabay para sa mamamayan',
    h1: 'Gabay para sa Kandidato at Pamamahala ng Punong Barangay, Lungsod ng Pasig',
    scTitle: 'Paalala sa kalagayan sa Korte Suprema:',
    scBody: 'Inilipat ng Republic Act No. 12326 (nilagdaan noong Setyembre 24, 2026) ang Halalan sa Barangay at SK sa ikalawang Lunes ng Nobyembre 2028 at ginawang limang taon ang termino. Pinagtibay ng Korte Suprema ang RA 12326 noong Nobyembre 6, 2026, ngunit may mosyon para sa bahagyang rekonsiderasyon na inihain noong Nobyembre 10, 2026. Basahin ang pinal na resolusyon ng COMELEC bago kumilos.',
    lead: 'Bilangin ang araw hanggang halalan, alamin kung kwalipikado ka at ang limitasyon sa termino, planuhin ang badyet, sundan ang paghahain, at hanapin ang 30 barangay ng Pasig. Gumagana kahit offline kapag na-install.',
    ctaElig: 'Alamin kung kwalipikado ako', ctaBudget: 'Planuhin ang badyet',
    stBrgy: 'Mga Barangay', stDist: 'Distrito ng konsehal', stTerm: 'Termino (RA 12326)', stTermV: '5 taon', stElec: 'Araw ng halalan',
    cdH: 'Countdown hanggang Nobyembre 13, 2028', days: 'araw', hours: 'oras', mins: 'minuto', secs: 'segundo', msH: 'Mahahalagang petsa',
    lawH: 'Batas at balangkas ng halalan', elH: 'Tagasuri ng kwalipikasyon at limitasyon sa termino', assess: 'Suriin ang kwalipikasyon', reset: 'I-reset',
    bgH: 'Badyet sa kampanya at SOCE calculator', ckH: 'Checklist sa paghahain ng COC at pagkatapos ng halalan',
    dirH: 'Direktoryo ng mga barangay sa Pasig', pbH: 'Unang 100 araw at gabay sa Katarungang Pambarangay'
  };
  var lang = store.get('bcg-lang', 'en');
  function applyLang() {
    $$('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (el.getAttribute('data-en') === null) el.setAttribute('data-en', el.textContent);
      el.textContent = (lang === 'fil' && FIL[k]) ? FIL[k] : el.getAttribute('data-en');
    });
    document.documentElement.lang = lang === 'fil' ? 'fil' : 'en';
    var b = $('#lang-toggle');
    b.textContent = lang === 'fil' ? 'FIL' : 'EN';
    b.setAttribute('aria-label', lang === 'fil' ? 'Switch language to English' : 'Switch language to Filipino');
    setNet(); renderCountdown();
  }
  $('#lang-toggle').addEventListener('click', function () { lang = lang === 'fil' ? 'en' : 'fil'; store.set('bcg-lang', lang); applyLang(); });

  /* ---------- theme & font size ---------- */
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
    applyTheme(t); store.set('bcg-theme', t);
  });
  var fs = store.get('bcg-fs', 100);
  function setFs(v) { fs = Math.max(85, Math.min(140, v)); document.documentElement.style.fontSize = fs + '%'; store.set('bcg-fs', fs); }
  $('#fs-up').addEventListener('click', function () { setFs(fs + 10); });
  $('#fs-down').addEventListener('click', function () { setFs(fs - 10); });

  /* ---------- online status ---------- */
  var badge = $('#net-badge'), netText = $('#net-text'), swReady = false;
  function setNet() {
    var on = navigator.onLine;
    badge.className = 'net-badge ' + (on ? 'online' : 'offline');
    if (on) netText.textContent = swReady ? (lang === 'fil' ? 'Online · Handa offline' : 'Online · Offline ready') : 'Online';
    else netText.textContent = lang === 'fil' ? 'Offline (naka-save)' : 'Offline mode';
  }
  window.addEventListener('online', setNet); window.addEventListener('offline', setNet);

  /* ---------- countdown & milestones ---------- */
  function renderCountdown() {
    var ms = ELECTION.getTime() - Date.now();
    if (ms <= 0) { $('#cd-d').textContent = '0'; $('#cd-h2').textContent = '0'; $('#cd-m').textContent = '0'; $('#cd-s').textContent = '0'; $('#cd-note').textContent = 'The scheduled election day has arrived. Check COMELEC for results and deadlines.'; return; }
    var s = Math.floor(ms / 1000);
    $('#cd-d').textContent = Math.floor(s / 86400).toLocaleString('en-PH');
    $('#cd-h2').textContent = pad2(Math.floor(s % 86400 / 3600));
    $('#cd-m').textContent = pad2(Math.floor(s % 3600 / 60));
    $('#cd-s').textContent = pad2(s % 60);
  }
  setInterval(renderCountdown, 1000);

  function daysUntil(d) { return Math.ceil((d.getTime() - Date.now()) / 86400000); }
  function renderMilestones() {
    var cutoff = addYears(ELECTION, -1);
    var soce = addDays(ELECTION, 30);
    var items = [
      { d: cutoff, t: 'Residency cutoff', x: 'You must have lived in your barangay for at least one year immediately before election day, so your residency must start on or before this date.' },
      { d: null, w: 'TBA', t: 'Voter registration', x: 'Dates set by COMELEC. You must be a registered voter in the barangay where you run.' },
      { d: null, w: 'TBA', t: 'Filing of Certificates of Candidacy', x: 'File at the COMELEC Pasig City Election Office within the period COMELEC announces.' },
      { d: null, w: 'TBA', t: 'Non-partisan campaign period', x: 'Set by the COMELEC calendar. Campaigning outside the period can be penalized.' },
      { d: ELECTION, t: 'Election day', x: 'Second Monday of November 2028.' },
      { d: soce, t: 'SOCE deadline', x: 'Statement of Contributions and Expenditures is due 30 days after election day.' }
    ];
    $('#ms-list').innerHTML = items.map(function (it) {
      var past = it.d && it.d.getTime() < Date.now();
      var when = it.d ? fmt(it.d) : it.w;
      var left = it.d ? (past ? ' (passed)' : ' (in ' + daysUntil(it.d).toLocaleString('en-PH') + ' days)') : '';
      return '<li' + (past ? ' class="past"' : '') + '><span class="when">' + esc(when) + '</span>' + esc(left) + '<br><strong>' + esc(it.t) + '.</strong> ' + esc(it.x) + '</li>';
    }).join('');
  }

  /* ---------- barangay selects ---------- */
  var elB = $('#el-barangay'), calcB = $('#calc-brgy');
  BARANGAYS.forEach(function (b) {
    [elB, calcB].forEach(function (sel) { var o = document.createElement('option'); o.value = b; o.textContent = b; sel.appendChild(o); });
  });

  /* ---------- eligibility ---------- */
  $('#el-incumbent').addEventListener('change', function (e) { $('#el-inc-box').hidden = !e.target.checked; });
  $('#el-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var res = $('#el-result'), fails = [], oks = [], warns = [];
    var brgy = elB.value, dob = parseDate($('#el-dob').value), since = parseDate($('#el-since').value);
    if (!brgy || !dob || !since) {
      res.className = 'result maybe'; res.hidden = false;
      res.innerHTML = '<h3>Please complete the form</h3><p>Choose a barangay and fill in both dates.</p>'; res.focus(); return;
    }
    var elec = new Date(2028, 10, 13);
    if ($('#el-citizen').checked) oks.push('Filipino citizen (Sec. 39).'); else fails.push('You must be a citizen of the Philippines.');
    if ($('#el-voter').checked) oks.push('Registered voter in ' + brgy + ' (confirm with COMELEC Pasig).'); else fails.push('You must be a registered voter in ' + brgy + '.');
    if ($('#el-literate').checked) oks.push('Able to read and write Filipino or a local language/dialect.'); else fails.push('You must be able to read and write Filipino or another local language or dialect.');
    var eighteen = addYears(dob, 18);
    if (eighteen <= elec) oks.push('You will be at least 18 on ' + fmt(elec) + '.'); else fails.push('You turn 18 on ' + fmt(eighteen) + ', after election day (' + fmt(elec) + ').');
    var needBy = addYears(elec, -1);
    if (since <= needBy) oks.push('Residency since ' + fmt(since) + ' meets the one-year rule (cutoff ' + fmt(needBy) + ').');
    else fails.push('Your residency in ' + brgy + ' must start on or before ' + fmt(needBy) + ' (one year before election day).');
    $$('.el-dq').filter(function (c) { return c.checked; }).forEach(function (c) { fails.push('Possible disqualification (Sec. 40): ' + c.value + '.'); });

    if ($('#el-incumbent').checked) {
      var prior = parseInt($('#el-terms').value, 10);
      var consecutive = prior + 1; /* RA 12326 Sec. 5: the extended current term counts as a completed term */
      if (consecutive >= 2) fails.push('Term limit: with your current extended term counted as completed, you reach the two-consecutive-term cap (RA 12326 Sec. 1 and 5) and cannot run for the same position in November 2028. You may still be able to run for a different position.');
      else oks.push('Term limit: counting your current extended term, you would be seeking your second consecutive term, which the two-term cap allows.');
      warns.push('How earlier terms are counted can depend on COMELEC rulings. Ask COMELEC or a lawyer to confirm your count.');
    }
    warns.push('Election day assumed: November 13, 2028 (second Monday of November 2028).');
    warns.push('A motion for partial reconsideration of the Supreme Court ruling on RA 12326 was filed on November 10, 2026. Verify the final COMELEC resolutions.');
    warns.push('Omnibus Election Code grounds are not covered by this tool.');

    var html = '<h3>' + (fails.length ? 'Not eligible on the information given' : 'You appear to meet the basic qualifications') + '</h3>';
    if (fails.length) html += '<p><strong>Issues to resolve:</strong></p><ul>' + fails.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    if (oks.length) html += '<p><strong>Met:</strong></p><ul>' + oks.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    html += '<p><strong>Also check:</strong></p><ul>' + warns.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    html += '<p class="small muted">An informal screening tool, not a legal determination. COMELEC decides on qualifications.</p>';
    if (!fails.length) html += '<p><a class="btn" href="#checklist">Go to the filing checklist</a></p>';
    res.className = 'result ' + (fails.length ? 'fail' : 'pass'); res.innerHTML = html; res.hidden = false; res.focus();
  });
  $('#el-reset').addEventListener('click', function () { $('#el-result').hidden = true; $('#el-inc-box').hidden = true; });

  /* ---------- budget & SOCE ledger ---------- */
  var voters = $('#calc-voters');
  var ledger = store.get('bcg-ledger-v1', []);
  voters.value = store.get('bcg-voters', '') || '';
  function vcount() { var n = parseInt(voters.value, 10); return isFinite(n) && n > 0 ? n : 0; }
  function totals() {
    var spent = 0, contrib = 0;
    ledger.forEach(function (t) { if (t.type === 'expense') spent += t.amt; else contrib += t.amt; });
    return { spent: spent, contrib: contrib, limit: vcount() * 5 };
  }
  function renderBudget() {
    var t = totals(), left = t.limit - t.spent;
    $('#b-limit').textContent = peso(t.limit); $('#b-spent').textContent = peso(t.spent);
    $('#b-left').textContent = peso(left); $('#b-contrib').textContent = peso(t.contrib);
    var pct = t.limit > 0 ? Math.min(100, Math.round(t.spent / t.limit * 100)) : 0;
    $('#b-fill').style.width = pct + '%'; $('#b-bar').setAttribute('aria-valuenow', pct);
    var msg = $('#b-msg');
    if (!t.limit) msg.textContent = 'Enter the number of registered voters to see your spending limit.';
    else if (left < 0) msg.textContent = 'Warning: your recorded expenses exceed the ₱5.00-per-voter limit by ' + peso(-left) + '.';
    else msg.textContent = pct + '% of your limit used.';
    $('#b-fill').style.background = left < 0 ? 'var(--bad)' : '';
    $('#tx-body').innerHTML = ledger.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (t2) {
      return '<tr><td>' + esc(t2.date) + '</td><td>' + (t2.type === 'expense' ? 'Expense' : 'Contribution') + '</td><td>' + esc(t2.desc) + '</td><td class="num">' + peso(t2.amt) + '</td><td class="no-print"><button type="button" class="rm" data-id="' + esc(t2.id) + '" aria-label="Remove ' + esc(t2.desc) + '">✕</button></td></tr>';
    }).join('');
    $('#tx-empty').hidden = ledger.length > 0; $('#tx-table').hidden = ledger.length === 0;
  }
  voters.addEventListener('input', function () { store.set('bcg-voters', voters.value); renderBudget(); });
  $$('.chip').forEach(function (c) { c.addEventListener('click', function () { voters.value = c.getAttribute('data-voters'); calcB.value = ''; store.set('bcg-voters', voters.value); renderBudget(); }); });
  calcB.addEventListener('change', function () { if (calcB.value) voters.focus(); });
  $('#tx-date').value = (function () { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); })();
  $('#tx-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#tx-err'), desc = $('#tx-desc').value.trim(), amt = parseFloat($('#tx-amt').value), date = $('#tx-date').value;
    if (!date || !desc || !isFinite(amt) || amt <= 0) { err.textContent = 'Enter a date, a description and an amount above zero.'; err.hidden = false; return; }
    err.hidden = true;
    ledger.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: $('#tx-type').value, date: date, desc: desc.slice(0, 120), amt: Math.round(amt * 100) / 100 });
    store.set('bcg-ledger-v1', ledger); $('#tx-desc').value = ''; $('#tx-amt').value = ''; renderBudget(); $('#tx-desc').focus();
  });
  $('#tx-body').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-id]'); if (!b) return;
    ledger = ledger.filter(function (t) { return t.id !== b.getAttribute('data-id'); }); store.set('bcg-ledger-v1', ledger); renderBudget();
  });
  $('#tx-clear').addEventListener('click', function () { if (ledger.length && window.confirm('Delete all ledger entries?')) { ledger = []; store.del('bcg-ledger-v1'); renderBudget(); } });
  function csvCell(v) { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  $('#tx-csv').addEventListener('click', function () {
    var rows = [['Date', 'Type', 'Description', 'Amount (PHP)']].concat(ledger.map(function (t) { return [t.date, t.type, t.desc, t.amt.toFixed(2)]; }));
    download('soce-ledger.csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'), 'text/csv');
  });
  $('#tx-print').addEventListener('click', function () {
    var t = totals(), box = $('#soce-print');
    if (!box) { box = document.createElement('div'); box.id = 'soce-print'; box.className = 'print-only'; document.body.appendChild(box); }
    box.innerHTML = '<h1>SOCE Expense Summary (worksheet)</h1><p>Pasig City Punong Barangay candidate &middot; 2028 BSKE &middot; Generated ' + esc(fmt(new Date())) + '</p>' +
      '<p>Registered voters: <strong>' + vcount().toLocaleString('en-PH') + '</strong> &middot; Spending limit (₱5.00 per voter): <strong>' + peso(t.limit) + '</strong></p>' +
      '<p>Total expenses: <strong>' + peso(t.spent) + '</strong> &middot; Total contributions: <strong>' + peso(t.contrib) + '</strong> &middot; Remaining: <strong>' + peso(t.limit - t.spent) + '</strong></p>' +
      '<table class="tx-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>' +
      ledger.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return '<tr><td>' + esc(x.date) + '</td><td>' + (x.type === 'expense' ? 'Expense' : 'Contribution') + '</td><td>' + esc(x.desc) + '</td><td class="num">' + peso(x.amt) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="small">Personal worksheet only. File the official SOCE with COMELEC within 30 days after election day.</p>';
    document.body.classList.add('print-soce'); window.print();
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-soce'); });

  /* ---------- checklist ---------- */
  var CK_KEY = 'bcg-checklist-v2', ckState = store.get(CK_KEY, {}), ckTotal = 0;
  function renderChecklist() {
    var out = ''; ckTotal = 0;
    CHECKLIST.forEach(function (grp) {
      out += '<div class="ck-group"><h3>' + esc(grp.g) + '</h3>';
      grp.items.forEach(function (it) {
        ckTotal++;
        out += '<div class="ck-item"><label class="check" for="ck-' + it[0] + '"><input type="checkbox" id="ck-' + it[0] + '" data-k="' + it[0] + '"' + (ckState[it[0]] ? ' checked' : '') + '><span>' + esc(it[1]) + '</span></label><p class="note">' + esc(it[2]) + '</p></div>';
      });
      out += '</div>';
    });
    $('#ck-list').innerHTML = out; updateProgress();
  }
  function updateProgress() {
    var done = Object.keys(ckState).filter(function (k) { return ckState[k]; }).length;
    var pct = ckTotal ? Math.round(done / ckTotal * 100) : 0;
    $('#ck-fill').style.width = pct + '%'; $('#ck-bar').setAttribute('aria-valuenow', pct);
    $('#ck-label').textContent = done + ' of ' + ckTotal + ' done (' + pct + '%)';
  }
  $('#ck-list').addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    if (e.target.checked) ckState[k] = true; else delete ckState[k];
    store.set(CK_KEY, ckState); updateProgress();
  });
  $('#ck-reset').addEventListener('click', function () { if (window.confirm('Clear all checklist progress?')) { ckState = {}; store.del(CK_KEY); renderChecklist(); } });
  $('#ck-print').addEventListener('click', function () { document.body.classList.remove('print-soce'); window.print(); });
  $('#ck-json').addEventListener('click', function () {
    var data = { exportedAt: new Date().toISOString(), guide: 'Pasig Punong Barangay Guide (2028 BSKE)', items: [] };
    CHECKLIST.forEach(function (g) { g.items.forEach(function (it) { data.items.push({ group: g.g, task: it[1], done: !!ckState[it[0]] }); }); });
    download('punong-barangay-checklist.json', JSON.stringify(data, null, 2), 'application/json');
  });

  /* ---------- directory + share ---------- */
  var SAVED_KEY = 'bcg-saved-v1', saved = store.get(SAVED_KEY, []), list = $('#dir-list');
  var GUIDE_URL = 'https://githubbest729.github.io/barangaycaptainguide/';
  function share(title, text, url) {
    if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
    var all = text + ' ' + url;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(all).then(function () { toast('Copied to clipboard. Paste it in Messenger, Viber or SMS.'); }, function () { toast('Sharing is not supported on this browser.'); });
    else toast('Sharing is not supported on this browser.');
  }
  function renderDir() {
    var q = $('#dir-search').value.trim().toLowerCase(), f = $('#dir-filter').value;
    var rows = BARANGAYS.filter(function (b) {
      if (q && b.toLowerCase().indexOf(q) === -1) return false;
      if (f === '1' && districtOf(b) !== 1) return false;
      if (f === '2' && districtOf(b) !== 2) return false;
      if (f === 'saved' && saved.indexOf(b) === -1) return false;
      return true;
    });
    $('#dir-count').textContent = 'Showing ' + rows.length + ' of 30 barangays';
    list.innerHTML = rows.map(function (b) {
      var d = districtOf(b), isSaved = saved.indexOf(b) !== -1;
      return '<li class="dir-card"><h3>' + esc(b) + '</h3>' +
        '<p class="meta"><span class="tag' + (d === 2 ? ' d2' : '') + '">District ' + d + '</span> Sangguniang Panlungsod</p>' +
        (LARGE[b] ? '<p class="meta">Major barangay &middot; 2024 population: ' + LARGE[b].toLocaleString('en-PH') + '</p>' : '') +
        '<p class="meta">Pasig City &middot; one congressional district</p>' +
        '<div class="row"><button type="button" class="btn btn-sm btn-outline" data-save="' + esc(b) + '" aria-pressed="' + isSaved + '">' + (isSaved ? 'Saved' : 'Save') + '</button>' +
        '<button type="button" class="btn btn-sm" data-share="' + esc(b) + '">Share</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-check="' + esc(b) + '">Check eligibility</button></div></li>';
    }).join('') || '<li class="muted">No barangays match.</li>';
  }
  list.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return; var b;
    if ((b = t.getAttribute('data-save'))) { var i = saved.indexOf(b); if (i === -1) saved.push(b); else saved.splice(i, 1); store.set(SAVED_KEY, saved); renderDir(); }
    else if ((b = t.getAttribute('data-share'))) share('Brgy. ' + b + ', Pasig City', 'Brgy. ' + b + ' is in District ' + districtOf(b) + ' of Pasig City (Sangguniang Panlungsod). 2028 BSKE guide for Punong Barangay candidates:', GUIDE_URL + '#directory');
    else if ((b = t.getAttribute('data-check'))) { elB.value = b; location.hash = '#eligibility'; }
  });
  $('#dir-search').addEventListener('input', renderDir);
  $('#dir-filter').addEventListener('change', renderDir);
  $('#share-guide').addEventListener('click', function () { share('Pasig Punong Barangay Candidate & Governance Guide', 'Countdown, eligibility checker, budget calculator and 30-barangay directory for the 2028 BSKE in Pasig City.', GUIDE_URL); });

  /* ---------- active nav ---------- */
  if ('IntersectionObserver' in window) {
    var links = $$('.bottom-nav a');
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); }); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ---------- install prompt ---------- */
  var deferred = null, ib = $('#install-banner');
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (!standalone && !store.get('bcg-install-dismissed', false)) ib.hidden = false; });
  $('#install-btn').addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; ib.hidden = true; }); });
  $('#install-dismiss').addEventListener('click', function () { ib.hidden = true; store.set('bcg-install-dismissed', true); });
  window.addEventListener('appinstalled', function () { ib.hidden = true; });
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  var iosModal = $('#ios-modal');
  if (isIOS && isSafari && !standalone && !store.get('bcg-ios-seen', false)) setTimeout(function () { iosModal.hidden = false; $('#ios-close').focus(); }, 2500);
  function closeIos() { iosModal.hidden = true; store.set('bcg-ios-seen', true); }
  $('#ios-close').addEventListener('click', closeIos);
  iosModal.addEventListener('click', function (e) { if (e.target === iosModal) closeIos(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !iosModal.hidden) closeIos(); });

  /* ---------- service worker + update toast ---------- */
  if ('serviceWorker' in navigator) {
    var reloading = false, ub = $('#update-banner');
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        function show(w) { ub.hidden = false; $('#update-btn').onclick = function () { w.postMessage({ type: 'SKIP_WAITING' }); }; }
        if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', function () { if (nw.state === 'installed' && navigator.serviceWorker.controller) show(nw); });
        });
      }).catch(function () {});
      navigator.serviceWorker.ready.then(function () { swReady = true; setNet(); }).catch(function () {});
    });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloading) return; reloading = true; window.location.reload(); });
  }

  /* ---------- init ---------- */
  renderMilestones(); renderChecklist(); renderBudget(); renderDir(); applyLang();
})();
