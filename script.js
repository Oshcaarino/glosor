(() => {
  const $ = id => document.getElementById(id);
  const ta = $('t'), gut = $('gut'), gutIn = gut.firstElementChild, pane =$('pane'),
    tint = $('tint'), split = $('split'), n1 =$('n1'), n2 = $('n2'), count =$('c'),
    warn = $('warn'), startBtn =$('start'), edit = $('edit'), study =$('study'),
    backBtn = $('back'), prog =$('prog'), modeSel = $('mode'), alang =$('alang'),
    swapBtn = $('swap'), shuffleBtn =$('shuffle'), card = $('card'), lab =$('lab'),
    face = $('face'), grade =$('grade'), noBtn = $('no'), yesBtn =$('yes'),
    spellBox = $('spell'), ans =$('ans'), checkBtn = $('check'), fb =$('fb'),
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

  /* ---------- Dra linjen med mus, touch eller penna ---------- */
  let isDragging = false;

  const startDrag = e => {
    e.preventDefault();
    isDragging = true;
    split.classList.add('drag');
    split.focus();
    if (e.pointerId !== undefined && split.setPointerCapture) {
      try { split.setPointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const moveDrag = e => {
    if (!isDragging) return;
    const rect = pane.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setCol(Math.round((x + ta.scrollLeft - PAD) / charW()));
  };

  const stopDrag = e => {
    if (!isDragging) return;
    isDragging = false;
    split.classList.remove('drag');
    if (e.pointerId !== undefined && split.releasePointerCapture) {
      try { split.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  };

  split.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);

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

  update();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
})();
