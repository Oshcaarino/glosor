(() => {
  const $ = id => document.getElementById(id);
  const ta = $('t'), gut = $('gut'), gutIn = gut.firstElementChild, pane = $('pane'),
    tint = $('tint'), split = $('split'), n1 = $('n1'), n2 = $('n2'), count = $('c'),
    warn = $('warn'), startBtn = $('start'), edit = $('edit'), study = $('study'),
    backBtn = $('back'), prog = $('prog'), modeSel = $('mode'), alang = $('alang'),
    swapBtn = $('swap'), shuffleBtn = $('shuffle'), card = $('card'), lab = $('lab'),
    face = $('face'), grade = $('grade'), noBtn = $('no'), yesBtn = $('yes'),
    spellBox = $('spell'), ans = $('ans'), checkBtn = $('check'), fb = $('fb'),
    fileIn = $('file'), uploadBtn = $('upload'), imgIn = $('img'), imgBtn = $('imgbtn'),
    centerBtn = $('centerBtn');

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
    const sb = ta.offsetHeight - ta.clientHeight;
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

  /* ---------- Centrera linjen automatisk ---------- */
  function centerLine() {
    const lines = ta.value.split('\n').filter(l => l.trim());
    if (!lines.length) {
      setCol(12);
      return;
    }

    let maxLeft = 0;
    let minRight = Infinity;

    lines.forEach(l => {
      let m = /^(\S.*?)\s{2,}(\S.*)$/.exec(l);
      if (!m) m = /^(\S+)\s+(\S.*)$/.exec(l);

      if (m) {
        const leftLen = m[1].length;
        const rightStart = l.length - m[2].length;
        maxLeft = Math.max(maxLeft, leftLen);
        minRight = Math.min(minRight, rightStart);
      }
    });

    if (maxLeft > 0 && minRight < Infinity && minRight > maxLeft) {
      setCol(Math.floor((maxLeft + minRight) / 2));
    } else if (maxLeft > 0) {
      setCol(maxLeft + 2);
    } else {
      setCol(12);
    }
  }

  if (centerBtn) {
    centerBtn.addEventListener('click', centerLine);
  }

  const expand = l => {
    let o = '';
    for (const ch of l) o += ch === '\t' ? ' '.repeat(8 - (o.length % 8)) : ch;
    return o;
  };

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
    return minR === Infinity ? null : Math.max(1, minR - 1);
  }

  ta.addEventListener('paste', e => {
    const raw = (e.clipboardData || window.clipboardData).getData('text');
    if (!raw) return;
    e.preventDefault();
    const wasEmpty = !ta.value.trim();
    let lines = raw.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
    if (lines.some(l => l.includes('\t'))) {
      const rows = lines.map(l => l.split('\t'));
      const w = Math.max(...rows.map(r => r[0].length));
      const start = wasEmpty || w >= col ? w + 3 : col + 1;
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
  const later = c => queue.splice(Math.min(queue.length, 4), 0, c);
  const focusMain = () => { if (spelling()) ans.focus(); else card.focus({ preventScroll: true }); };

  function render() {
    const cur = queue[0], sp = spelling();
    flipped = false; waiting = false;
    card.classList.remove('flipped');
    grade.hidden = sp; spellBox.hidden = !sp; alang.hidden = !sp;
    alang.value = String(1 - q);
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
    if (waiting) {
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

  document.addEventListener('keydown', e => {
    if (study.hidden || spelling() || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    if (e.key === 'Enter' && !/^(BUTTON|A|SELECT|INPUT|TEXTAREA)$/.test(tag)) {       e.preventDefault(); flip();     } else if ((e.key === 'ArrowRight' \vert{}\vert{} e.key === 'ArrowLeft') && !/^(INPUT\vert{}SELECT\vert{}TEXTAREA)$/.test(tag)) {
      e.preventDefault(); answer(e.key === 'ArrowRight');
    }
  });

  /* ---------- Ladda upp Excel (.xlsx) eller CSV ---------- */
  const fail = m => { throw Object.assign(new Error(m), { user: true }); };
  const tags = (el, name) => Array.from(el.querySelectorAll ? el.querySelectorAll(name) : el.getElementsByTagNameNS('*', name));
  const xml = s => new DOMParser().parseFromString(s, 'text/xml');
  const colNo = ref => ref.replace(/[^A-Za-z]/g, '').toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

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

  const decode = buf => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  };

  const HDR = /^(svenska|engelska|tyska|franska|spanska|italienska|latin|finska|danska|norska|isländska|ryska|polska|portugisiska|holländska|nederländska|grekiska|turkiska|arabiska|kinesiska|japanska|koreanska|swedish|english|german|french|spanish|italian|danish|norwegian|finnish|dutch|portuguese|russian|språk ?\d*|language ?\d*|ord|word|glosa|glosor|översättning|translation|fråga|svar|question|answer)$/i;

  function fromRows(raw, auto = true) {
    const rows = raw.map(r => Array.from(r || [], clean));
    const cols = [];
    rows.forEach(r => r.forEach((v, i) => { if (v && !cols.includes(i)) cols.push(i); }));
    cols.sort((x, y) => x - y);
    const [a, b] = cols;
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
    if (auto && !problem && pairs.length) begin();
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

  document.addEventListener('dragover', e => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (!f) return;
    e.preventDefault();
    study.hidden = true; edit.hidden = false;
    if (isImage(f)) loadImage(f); else loadFile(f);
  });

  /* ---------- Bildläsning (Tesseract.js) ---------- */
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const OCR_LANG = { svenska: 'swe', engelska: 'eng', tyska: 'deu', franska: 'fra', spanska: 'spa', italienska: 'ita', latin: 'lat', finska: 'fin', danska: 'dan', norska: 'nor', portugisiska: 'por', holländska: 'nld', nederländska: 'nld', polska: 'pol', ryska: 'rus', turkiska: 'tur' };
  const isImage = f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name);
  const busy = on => { uploadBtn.disabled = imgBtn.disabled = on; };
  const median = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };

  const loadScript = src => new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('script'));
    document.head.appendChild(s);
  });

  const loadPicture = f => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bild')); };
    im.src = url;
  });

  function skew(g, w, h) {
    const st = Math.max(1, Math.round(w / 700)), pts = [];
    for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st) if (g[y * w + x] < 110) pts.push(x / st, y / st);
    if (pts.length < 200) return 0;
    const off = Math.ceil(w / st) + 2, bins = new Int32Array(Math.ceil(h / st) + 2 * off);
    const score = a => {
      const sn = Math.sin(a * Math.PI / 180), cs = Math.cos(a * Math.PI / 180);
      bins.fill(0);
      for (let i = 0; i < pts.length; i += 2) bins[Math.round(pts[i + 1] * cs - pts[i] * sn) + off]++;
      let t = 0;
      for (let i = 0; i < bins.length; i++) t += bins[i] * bins[i];
      return t;
    };
    let best = 0, top = -1;
    for (let a = -6; a <= 6; a += 0.5) { const s = score(a); if (s > top) { top = s; best = a; } }
    for (let a = best - 0.5; a <= best + 0.5; a += 0.1) { const s = score(a); if (s > top) { top = s; best = a; } }
    return best;
  }

  function enhance(c) {
    const w = c.width, h = c.height, ctx = c.getContext('2d');
    const px = ctx.getImageData(0, 0, w, h), d = px.data, g = new Uint8ClampedArray(w * h);
    const small = document.createElement('canvas');
    small.width = Math.max(2, Math.round(w / 20)); small.height = Math.max(2, Math.round(h / 20));
    const sctx = small.getContext('2d');
    sctx.imageSmoothingQuality = 'high'; sctx.drawImage(c, 0, 0, small.width, small.height);
    const back = document.createElement('canvas');
    back.width = w; back.height = h;
    const bctx = back.getContext('2d');
    bctx.imageSmoothingQuality = 'high'; bctx.drawImage(small, 0, 0, w, h);
    const bg = bctx.getImageData(0, 0, w, h).data;
    for (let i = 0, j = 0; j < g.length; i += 4, j++) {
      const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8, paper = (bg[i] * 77 + bg[i + 1] * 150 + bg[i + 2] * 29) >> 8;
      g[j] = Math.min(255, lum * 255 / Math.max(40, paper));
    }
    for (let i = 0, j = 0; j < g.length; i += 4, j++) { d[i] = d[i + 1] = d[i + 2] = g[j]; d[i + 3] = 255; }
    ctx.putImageData(px, 0, 0);
    const a = skew(g, w, h);
    if (Math.abs(a) < 0.2) return c;
    const r = a * Math.PI / 180, W = Math.ceil(Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r))), H = Math.ceil(Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r)));
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const octx = out.getContext('2d');
    octx.fillStyle = '#fff'; octx.fillRect(0, 0, W, H);
    octx.translate(W / 2, H / 2); octx.rotate(-r); octx.drawImage(c, -w / 2, -h / 2);
    return out;
  }

  async function prepImage(f) {
    const im = await loadPicture(f);
    const longest = Math.max(im.naturalWidth, im.naturalHeight);
    const k = longest > 2000 ? 2000 / longest : longest < 1000 ? 1600 / longest : 1;
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return enhance(c);
  }

  const wordsOf = d => {
    if (d.words) return d.words;
    const out = [];
    (d.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => out.push(...(l.words || [])))));
    return out;
  };

  function rowsFromWords(raw) {
    const ws = raw.map(w => ({ t: clean(w.text), x0: w.bbox.x0, x1: w.bbox.x1, yc: (w.bbox.y0 + w.bbox.y1) / 2, h: w.bbox.y1 - w.bbox.y0, c: w.confidence }))
      .filter(w => w.t && w.c >= 30);
    if (!ws.length) fail('Hittade ingen text i bilden. Prova en skarpare bild med tryckt text.');
    const H = median(ws.map(w => w.h)), MIN = 0.7 * H;
    const lines = [];
    ws.sort((a, b) => a.yc - b.yc).forEach(w => {
      const l = lines[lines.length - 1];
      if (l && Math.abs(w.yc - l.yc) < 0.6 * H) { l.w.push(w); l.yc = l.w.reduce((s, x) => s + x.yc, 0) / l.w.length; }
      else lines.push({ yc: w.yc, w: [w] });
    });
    lines.forEach(l => {
      l.w.sort((a, b) => a.x0 - b.x0);
      if (l.w.length > 2 && /^[^\p{L}\p{N}]{1,3}$/u.test(l.w[0].t)) l.w.shift();
      if (l.w.length > 2 && /^\d{1,3}[.)]?$/.test(l.w[0].t)) l.w.shift();
    });
    const gapsOf = l => {
      const g = [];
      for (let i = 1; i < l.w.length; i++) if (l.w[i].x0 - l.w[i - 1].x1 >= MIN) g.push({ a: l.w[i - 1].x1, b: l.w[i].x0 });
      return g;
    };
    const all = lines.map(gapsOf);
    let best = null;
    all.flat().forEach(g => {
      const x = (g.a + g.b) / 2, cover = all.map(gs => gs.find(q => q.a < x && x < q.b)).filter(Boolean);
      const score = cover.length * 1e6 + cover.reduce((s, q) => s + q.b - q.a, 0);
      if (!best || score > best.score) best = { score, n: cover.length, x: (Math.max(...cover.map(q => q.a)) + Math.min(...cover.map(q => q.b))) / 2 };
    });
    const bx = best && best.n >= 2 && best.n >= 0.4 * lines.filter(l => l.w.length > 1).length ? best.x : null;
    const SEP = /^[-–—‒=:→|_~]+$/;
    const SYMW = /^[^\p{L}\p{N}]{1,3}$/u;
    const join = a => {
      const b = a.slice();
      while (b.length > 1 && SYMW.test(b[b.length - 1].t)) b.pop();
      while (b.length > 1 && SYMW.test(b[0].t)) b.shift();
      return b.map(w => w.t).join(' ');
    };
    const cuts = lines.map(l => {
      const i = l.w.findIndex(w => SEP.test(w.t));
      if (i > 0 && i < l.w.length - 1) return { i, sep: true };
      if (bx === null) return null;
      const k = l.w.findIndex((w, n) => n > 0 && l.w[n - 1].x1 < bx && bx < w.x0 && w.x0 - l.w[n - 1].x1 >= MIN);
      return k > 0 ? { i: k } : null;
    });
    const xR = median(cuts.map((c, n) => (c && !c.sep ? lines[n].w[c.i].x0 : null)).filter(x => x !== null));
    const rows = [];
    let skipped = 0;
    lines.forEach((l, n) => {
      let c = cuts[n];
      if (!c && bx !== null && xR) {
        const k = l.w.findIndex((w, m) => m > 0 && Math.abs(w.x0 - xR) <= 0.6 * H && w.x0 - l.w[m - 1].x1 >= 0.2 * H);
        if (k > 0) c = { i: k };
      }
      if (!c) { skipped++; return; }
      rows.push([join(l.w.slice(0, c.i)), join(l.w.slice(c.sep ? c.i + 1 : c.i))]);
    });
    if (rows.length < 2) fail('Hittade inte två kolumner i bilden. Beskär bilden så att bara gloslistan syns.');
    return { rows, skipped };
  }

  async function loadImage(f) {
    if (uploadBtn.disabled) return;
    busy(true);
    try {
      warn.textContent = 'Förbereder bilden…';
      let canvas;
      try { canvas = await prepImage(f); } catch (e) { fail('Kunde inte öppna bilden. Använd en JPG- eller PNG-bild.'); }
      warn.textContent = 'Hämtar textläsaren (första gången kan det ta en stund)…';
      try { await loadScript(TESS); } catch (e) { fail('Kunde inte hämta textläsaren. Bildläsning kräver internetanslutning.'); }
      const codes = [n1, n2].map(i => OCR_LANG[i.value.trim().toLowerCase()]);
      const langs = codes[0] && codes[1] && codes[0] !== codes[1] ? codes : ['swe', 'eng'];
      let worker;
      try {
        worker = await Tesseract.createWorker(langs, 1, {
          logger: m => { warn.textContent = m.status === 'recognizing text' ? 'Läser bilden… ' + Math.round((m.progress || 0) * 100) + ' %' : 'Hämtar språkdata…'; }
        });
      } catch (e) { fail('Kunde inte hämta språkdata. Bildläsning kräver internetanslutning.'); }
      let data;
      try { data = (await worker.recognize(canvas, {}, { blocks: true })).data; }
      finally { await worker.terminate(); }
      const { rows, skipped } = rowsFromWords(wordsOf(data));
      fromRows(rows, false);
      if (!warn.textContent) warn.textContent = 'Kontrollera glosorna (bildläsning kan göra fel) och tryck Börja plugga.' + (skipped ? ` ${skipped} ${skipped === 1 ? 'rad' : 'rader'} som inte såg ut som glosor hoppades över.` : '');
    } catch (e) {
      study.hidden = true; edit.hidden = false; update();
      warn.textContent = e.user ? e.message : 'Kunde inte läsa bilden. Prova en skarpare bild eller använd en Excelfil.';
    } finally { busy(false); }
  }

  imgBtn.addEventListener('click', () => imgIn.click());
  imgIn.addEventListener('change', () => {
    const f = imgIn.files[0];
    if (f) loadImage(f).finally(() => { imgIn.value = ''; });
  });

  update();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
})();
