(() => {
  const $ = id => document.getElementById(id);
  const ta = $('t'), gut = $('gut'), gutIn = gut.firstElementChild, pane = $('pane'),
    tint = $('tint'), split = $('split'), n1 = $('n1'), n2 = $('n2'), count = $('c'),
    warn = $('warn'), startBtn = $('start'), edit = $('edit'), study = $('study'),
    backBtn = $('back'), prog = $('prog'), modeSel = $('mode'), alang = $('alang'),
    swapBtn = $('swap'), shuffleBtn = $('shuffle'), card = $('card'), lab = $('lab'),
    face = $('face'), grade = $('grade'), noBtn = $('no'), yesBtn = $('yes'),
    spellBox = $('spell'), ans = $('ans'), checkBtn = $('check'), fb = $('fb');

  const KEY = 'glosor', PAD = 12;
  let col = 12;                       // linjens läge, i tecken från vänsterkanten
  let all = [], queue = [], total = 0;
  let q = 0;                          // vilket språk som visas först (0 = vänster)
  let flipped = false, waiting = false;

  /* ---------- Spara och läsa ---------- */
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof s.text === 'string') ta.value = s.text;
    if (Number.isInteger(s.col) && s.col > 0) col = s.col;
    if (s.n1) n1.value = s.n1;
    if (s.n2) n2.value = s.n2;
  } catch (e) {}

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ text: ta.value, col, n1: n1.value, n2: n2.value })); } catch (e) {}
  };

  /* ---------- Rutan med linjen ---------- */
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none';
  pane.appendChild(probe);
  const charW = () => {
    const cs = getComputedStyle(ta);
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.textContent = '0'.repeat(100);
    return probe.getBoundingClientRect().width / 100 || 9;
  };
  const maxCol = () => ta.value.split('\n').reduce((m, l) => Math.max(m, l.length + 10), 30);

  function parse() {
    const pairs = [];
    let problem = '';
    ta.value.split('\n').forEach((raw, i) => {
      const line = raw.replace(/\r$/, '');
      if (!line.trim()) return;
      const l = line.slice(0, col).trim(), r = line.slice(col).trim();
      if (!problem) {
        if (!l || !r) problem = `Rad ${i + 1} saknar ord på ena sidan`;
        else if (/\S/.test(line[col - 1] || '') && /\S/.test(line[col] || '')) problem = `Rad ${i + 1}: linjen går genom ett ord`;
      }
      if (l && r) pairs.push([l, r]);
    });
    return { pairs, problem };
  }

  function place() {
    const x = PAD + col * charW() - ta.scrollLeft;
    split.style.left = x + 'px';
    tint.style.left = Math.max(0, x) + 'px';
    split.setAttribute('aria-valuemin', 1);
    split.setAttribute('aria-valuemax', maxCol());
    split.setAttribute('aria-valuenow', col);
  }

  function update() {
    const n = ta.value.split('\n').length;
    gutIn.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
    const sb = ta.offsetHeight - ta.clientHeight;   // höjden på sidledsrullningslisten
    pane.style.setProperty('--sb', sb + 'px');
    gutIn.style.paddingBottom = PAD + sb + 'px';
    gut.scrollTop = ta.scrollTop;
    place();
    const { pairs, problem } = parse();
    count.textContent = pairs.length ? `${pairs.length} ${pairs.length === 1 ? 'glosa' : 'glosor'}` : '';
    warn.textContent = problem;
    startBtn.disabled = !!problem || !pairs.length;
    save();
  }

  function setCol(c) {
    c = Math.min(Math.max(1, c), maxCol());
    if (c !== col) { col = c; update(); }
  }

  const expand = l => {
    let o = '';
    for (const ch of l) o += ch === '\t' ? ' '.repeat(8 - (o.length % 8)) : ch;
    return o;
  };

  // Gissar var linjen ska sitta när man klistrar in i en tom ruta
  function guess(lines) {
    let minR = Infinity;
    for (const l of lines) {
      const m = /^(\s*\S.*?)(\s{2,})\S/.exec(l);
      if (m) minR = Math.min(minR, m[1].length + m[2].length);
    }
    if (minR === Infinity) {
      for (const l of lines) {
        const m = /^(\s*\S+)(\s+)\S+$/.exec(l);
        if (m) minR = Math.min(minR, m[1].length + m[2].length);
      }
    }
    return minR === Infinity ? null : Math.max(1, minR - 1);   // linjen i mellanrummet, strax före högerspråket
  }

  ta.addEventListener('paste', e => {
    const raw = (e.clipboardData || window.clipboardData).getData('text');
    if (!raw) return;
    e.preventDefault();
    const wasEmpty = !ta.value.trim();
    let lines = raw.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
    if (lines.some(l => l.includes('\t'))) {          // Excel, Kalkylark: tabbar mellan kolumnerna
      const rows = lines.map(l => l.split('\t'));
      const w = Math.max(...rows.map(r => r[0].length));
      const start = wasEmpty || w >= col ? w + 3 : col + 1;   // högerspråket börjar strax efter linjen
      lines = rows.map(r => (r.length < 2 ? r[0] : r[0].padEnd(start) + r.slice(1).join(' ').trim()));
      if (wasEmpty) col = start - 1;
    } else {
      lines = lines.map(expand);
      if (wasEmpty) { const g = guess(lines); if (g) col = g; }
    }
    const text = lines.join('\n');
    ta.focus();
    if (!document.execCommand || !document.execCommand('insertText', false, text)) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    }
    update();
  });

  ta.addEventListener('input', update);
  ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; place(); });
  [n1, n2].forEach(i => i.addEventListener('input', save));
  window.addEventListener('resize', update);

  // Dra linjen med mus eller finger
  const endDrag = () => split.classList.remove('drag');
  split.addEventListener('pointerdown', e => {
    e.preventDefault();
    split.setPointerCapture(e.pointerId);
    split.classList.add('drag');
    split.focus();
  });
  split.addEventListener('pointermove', e => {
    if (!split.classList.contains('drag')) return;
    const x = e.clientX - pane.getBoundingClientRect().left;
    setCol(Math.round((x + ta.scrollLeft - PAD) / charW()));
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => split.addEventListener(t, endDrag));
  // Flytta linjen med piltangenterna
  split.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setCol(col - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setCol(col + 1); }
  });

  /* ---------- Plugga ---------- */
  const nm = i => (i ? n2 : n1).value.trim() || `Språk ${i + 1}`;
  const norm = s => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  const spelling = () => modeSel.value === 'spell';
  const shuffleArr = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const deal = () => { queue = shuffleArr(all.slice()); total = queue.length; };
  const later = c => queue.splice(Math.min(queue.length, 4), 0, c);   // kortet kommer tillbaka lite senare
  const focusMain = () => { if (spelling()) ans.focus(); else card.focus({ preventScroll: true }); };

  function render() {
    const cur = queue[0], sp = spelling();
    flipped = false; waiting = false;
    card.classList.remove('flipped');
    grade.hidden = sp; spellBox.hidden = !sp; alang.hidden = !sp;
    alang.value = String(1 - q);                       // språket man skriver på
    prog.textContent = `${queue.length} kvar av ${total}`;
    yesBtn.disabled = noBtn.disabled = !cur;
    ans.value = ''; ans.readOnly = false; ans.disabled = !cur;
    checkBtn.disabled = !cur; checkBtn.textContent = 'Kontrollera';
    fb.textContent = ''; fb.className = '';
    if (!cur) { lab.textContent = 'Klart!'; face.textContent = 'Alla glosor klara'; return; }
    lab.textContent = sp ? `${nm(q)} – skriv på ${nm(1 - q).toLowerCase()}` : nm(q);
    face.textContent = cur[q];
  }

  function begin() {
    const { pairs, problem } = parse();
    if (problem || !pairs.length) return;
    all = pairs;
    deal();
    alang.innerHTML = '';
    [0, 1].forEach(i => alang.add(new Option(nm(i), i)));
    edit.hidden = true; study.hidden = false;
    window.scrollTo(0, 0);
    render(); focusMain();
  }

  function flip() {
    if (spelling() || !queue.length) return;
    flipped = !flipped;
    const side = flipped ? 1 - q : q;
    card.classList.toggle('flipped', flipped);
    lab.textContent = nm(side);
    face.textContent = queue[0][side];
  }

  function answer(ok) {
    if (spelling() || !queue.length) return;
    const c = queue.shift();
    if (!ok) later(c);
    render(); focusMain();
  }

  function submit() {
    if (!spelling() || !queue.length) return;
    if (waiting) {                                      // visade rätt svar, gå vidare
      later(queue.shift());
      render(); ans.focus();
      return;
    }
    const right = queue[0][1 - q], typed = norm(ans.value);
    const options = right.split(/[;/]/).map(norm).filter(Boolean);
    if (typed && (typed === norm(right) || options.includes(typed))) {
      queue.shift();
      render();
      fb.textContent = 'Rätt!'; fb.className = 'ok';
      ans.focus();
    } else {
      waiting = true;
      fb.textContent = `Fel. Rätt svar: ${right}`; fb.className = 'bad';
      ans.readOnly = true; checkBtn.textContent = 'Nästa';
      ans.focus();
    }
  }

  startBtn.addEventListener('click', begin);
  backBtn.addEventListener('click', () => { study.hidden = true; edit.hidden = false; update(); });
  modeSel.addEventListener('change', () => { render(); focusMain(); });
  alang.addEventListener('change', () => { q = 1 - Number(alang.value); render(); focusMain(); });
  swapBtn.addEventListener('click', () => { q = 1 - q; render(); focusMain(); });
  shuffleBtn.addEventListener('click', () => { deal(); render(); focusMain(); });
  card.addEventListener('click', () => { if (spelling()) ans.focus(); else flip(); });
  yesBtn.addEventListener('click', () => answer(true));
  noBtn.addEventListener('click', () => answer(false));
  checkBtn.addEventListener('click', submit);
  ans.addEventListener('input', () => { fb.textContent = ''; fb.className = ''; });
  ans.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); }
  });

  // Enter vänder kortet, pilarna svarar. Knappar och fält sköter Enter själva.
  document.addEventListener('keydown', e => {
    if (study.hidden || spelling() || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    if (e.key === 'Enter' && !/^(BUTTON|A|SELECT|INPUT|TEXTAREA)$/.test(tag)) {
      e.preventDefault(); flip();
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
      e.preventDefault(); answer(e.key === 'ArrowRight');
    }
  });

  /* ---------- Ladda upp Excel (.xlsx) eller CSV ---------- */
  // Filen läses helt i webbläsaren och skickas inte någonstans.
  const fileIn = $('file'), uploadBtn = $('upload');
  const fail = m => { throw Object.assign(new Error(m), { user: true }); };
  const tags = (el, name) => Array.from(el.getElementsByTagNameNS('*', name));
  const xml = s => new DOMParser().parseFromString(s, 'text/xml');
  const colNo = ref => ref.replace(/[^A-Za-z]/g, '').toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

  // En .xlsx är en zip-fil: läs filkatalogen och packa upp det som behövs
  function unzip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), files = {};
    let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('zip');
    let p = dv.getUint32(e + 16, true);
    for (let i = 0, n = dv.getUint16(e + 10, true); i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip');
      const nl = dv.getUint16(p + 28, true);
      files[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl))] = {
        method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true)
      };
      p += 46 + nl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    }
    return async name => {
      const f = files[name];
      if (!f) return null;
      const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
      const data = u8.subarray(start, start + f.size);
      if (f.method === 0) return new TextDecoder().decode(data);
      if (typeof DecompressionStream === 'undefined') fail('Din webbläsare kan inte öppna .xlsx. Spara filen som .csv i stället.');
      const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
      return new TextDecoder().decode(out);
    };
  }

  // Första bladet i arbetsboken, som rader av celler
  async function readXlsx(buf) {
    const read = unzip(buf);
    const wb = await read('xl/workbook.xml');
    if (!wb) throw new Error('inte xlsx');
    const sheet = tags(xml(wb), 'sheet')[0];
    const rid = sheet && sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const relsTxt = await read('xl/_rels/workbook.xml.rels');
    let path = 'xl/worksheets/sheet1.xml';
    if (rid && relsTxt) {
      const rel = tags(xml(relsTxt), 'Relationship').find(r => r.getAttribute('Id') === rid);
      if (rel) { const t = rel.getAttribute('Target'); path = t.startsWith('/') ? t.slice(1) : 'xl/' + t; }
    }
    const sheetTxt = await read(path);
    if (!sheetTxt) throw new Error('inget blad');
    const ssTxt = await read('xl/sharedStrings.xml');
    const ss = ssTxt ? tags(xml(ssTxt), 'si').map(si => tags(si, 't').filter(t => t.parentNode.localName !== 'rPh').map(t => t.textContent).join('')) : [];
    const rows = [];
    tags(xml(sheetTxt), 'row').forEach((row, ri) => {
      const r = (parseInt(row.getAttribute('r'), 10) || ri + 1) - 1;
      tags(row, 'c').forEach((c, ci) => {
        const ref = c.getAttribute('r'), t = c.getAttribute('t');
        const v = tags(c, 'v')[0];
        let val = '';
        if (t === 'inlineStr') val = tags(c, 't').map(x => x.textContent).join('');
        else if (v && t === 's') val = ss[parseInt(v.textContent, 10)] || '';
        else if (v && t === 'b') val = v.textContent === '1' ? 'SANT' : 'FALSKT';
        else if (v && t !== 'e') val = v.textContent;
        (rows[r] = rows[r] || [])[ref ? colNo(ref) : ci] = val;
      });
    });
    return Array.from(rows, r => r || []);
  }

  // CSV/TSV med citattecken; avgränsaren (; tabb eller ,) gissas från första raden
  function readCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/, 1)[0];
    const d = [';', '\t', ','].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = [];
    let row = [], cur = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch !== '"') cur += ch;
        else if (text[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else if (ch === '"') quoted = true;
      else if (ch === d) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      } else cur += ch;
    }
    row.push(cur); rows.push(row);
    return rows;
  }

  // Excel-csv från svenska Windows är ofta ANSI (windows-1252), inte UTF-8
  const decode = buf => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  };

  // Första raden räknas som rubriker om båda cellerna ser ut som språknamn
  const HDR = /^(svenska|engelska|tyska|franska|spanska|italienska|latin|finska|danska|norska|isländska|ryska|polska|portugisiska|holländska|nederländska|grekiska|turkiska|arabiska|kinesiska|japanska|koreanska|swedish|english|german|french|spanish|italian|danish|norwegian|finnish|dutch|portuguese|russian|språk ?\d*|language ?\d*|ord|word|glosa|glosor|översättning|translation|fråga|svar|question|answer)$/i;

  function fromRows(raw) {
    const rows = raw.map(r => Array.from(r || [], clean));
    const cols = [];
    rows.forEach(r => r.forEach((v, i) => { if (v && !cols.includes(i)) cols.push(i); }));
    cols.sort((x, y) => x - y);
    const [a, b] = cols;                              // de två första kolumnerna med innehåll
    const data = rows.map(r => [r[a] || '', b === undefined ? '' : r[b] || '']).filter(r => r[0] || r[1]);
    if (data.length && HDR.test(data[0][0]) && HDR.test(data[0][1])) {
      const h = data.shift();
      n1.value = h[0]; n2.value = h[1];
    }
    if (!data.length) fail('Hittade inga glosor i filen.');
    const start = data.reduce((m, r) => Math.max(m, r[0].length), 0) + 3;
    col = start - 1;
    ta.value = data.map(([x, y]) => (y ? x.padEnd(start) + y : x)).join('\n');
    ta.scrollTop = ta.scrollLeft = 0;
    update();
    const { pairs, problem } = parse();
    if (!problem && pairs.length) begin();            // inga fel: starta förhöret direkt
  }

  async function loadFile(f) {
    try {
      if (f.size > 5e6) fail('Filen är för stor (högst 5 MB).');
      const buf = await f.arrayBuffer(), u8 = new Uint8Array(buf);
      if (u8[0] === 0x50 && u8[1] === 0x4b) fromRows(await readXlsx(buf));
      else if (u8[0] === 0xd0 && u8[1] === 0xcf) fail('Gamla .xls-filer kan inte läsas. Öppna filen i Excel och spara som .xlsx eller .csv.');
      else fromRows(readCsv(decode(buf)));
    } catch (e) {
      study.hidden = true; edit.hidden = false; update();
      warn.textContent = e.user ? e.message : 'Kunde inte läsa filen. Spara den som .xlsx eller .csv och försök igen.';
    }
  }

  uploadBtn.addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    const f = fileIn.files[0];
    if (f) loadFile(f).finally(() => { fileIn.value = ''; });
  });
  // Dra en fil och släpp den var som helst på sidan
  document.addEventListener('dragover', e => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (!f) return;
    e.preventDefault();
    study.hidden = true; edit.hidden = false;
    loadFile(f);
  });

  update();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
})();
