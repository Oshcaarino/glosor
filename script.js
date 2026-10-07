(() => {
  const $ = id => document.getElementById(id);
  const t1 = $('t1'), t2 =$('t2'), n1 = $('n1'), n2 =$('n2'),
    count = $('c'), warn = $('warn'), startBtn =$('start'),
    edit = $('edit'), study = $('study'), backBtn =$('back'),
    prog = $('prog'), modeSel = $('mode'), alang =$('alang'),
    swapBtn = $('swap'), shuffleBtn = $('shuffle'), card =$('card'),
    lab = $('lab'), face = $('face'), grade =$('grade'),
    noBtn = $('no'), yesBtn = $('yes'), spellBox =$('spell'),
    ans = $('ans'), checkBtn = $('check'), fb =$('fb');

  const KEY = 'glosor_2rutor';
  let all = [], queue = [], total = 0;
  let q = 0; // 0 = språk 1 visas först
  let flipped = false, waiting = false;

  /* ---------- Spara och läsa ---------- */
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (s.t1) t1.value = s.t1;
    if (s.t2) t2.value = s.t2;
    if (s.n1) n1.value = s.n1;
    if (s.n2) n2.value = s.n2;
  } catch (e) {}

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        t1: t1.value, t2: t2.value, n1: n1.value, n2: n2.value
      }));
    } catch (e) {}
  };

  /* ---------- Läsa av glosor ---------- */
  function parse() {
    const lines1 = t1.value.split('\n');
    const lines2 = t2.value.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const pairs = [];
    let problem = '';

    for (let i = 0; i < maxLen; i++) {
      const v1 = (lines1[i] || '').trim();
      const v2 = (lines2[i] || '').trim();

      if (!v1 && !v2) continue;

      if (!v1 || !v2) {
        if (!problem) problem = `Rad ${i + 1} saknar ord på ena sidan`;
      } else {
        pairs.push([v1, v2]);
      }
    }

    return { pairs, problem };
  }

  function update() {
    const { pairs, problem } = parse();
    count.textContent = pairs.length ? `${pairs.length} ${pairs.length === 1 ? 'glosa' : 'glosor'}` : '';
    warn.textContent = problem;
    startBtn.disabled = !!problem || !pairs.length;
    save();
  }

  /* Autokoppling vid inklistring av tabell/två kolumner i vänstra rutan */
  t1.addEventListener('paste', e => {
    const raw = (e.clipboardData || window.clipboardData).getData('text');
    if (!raw) return;

    if (raw.includes('\t') || /\S\s{2,}\S/.test(raw)) {
      e.preventDefault();
      const rows1 = [], rows2 = [];
      raw.replace(/\r\n?/g, '\n').split('\n').forEach(line => {
        let parts = line.split('\t');
        if (parts.length < 2) {
          const m = /^(\S.*?)\s{2,}(\S.*)$/.exec(line.trim());
          if (m) parts = [m[1], m[2]];
        }
        if (parts.length >= 2) {
          rows1.push(parts[0].trim());
          rows2.push(parts.slice(1).join(' ').trim());
        } else {
          rows1.push(line.trim());
          rows2.push('');
        }
      });
      t1.value = rows1.join('\n');
      t2.value = rows2.join('\n');
      update();
    }
  });

  /* Synka scroll mellan rutorna */
  let isScrolling = false;
  t1.addEventListener('scroll', () => {
    if (!isScrolling) {
      isScrolling = true;
      t2.scrollTop = t1.scrollTop;
      setTimeout(() => isScrolling = false, 50);
    }
  });
  t2.addEventListener('scroll', () => {
    if (!isScrolling) {
      isScrolling = true;
      t1.scrollTop = t2.scrollTop;
      setTimeout(() => isScrolling = false, 50);
    }
  });

  [t1, t2, n1, n2].forEach(el => el.addEventListener('input', update));

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
})();
