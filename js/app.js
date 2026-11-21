/* Intro page, view switching (#tree) and sound controls. */
(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = s => s[(Math.random() * s.length) | 0];

  /* ---------- big character title ---------- */
  const FONT = {
    A: [' ## ', '#  #', '####', '#  #', '#  #'],
    S: [' ###', '#   ', ' ## ', '   #', '### '],
    C: [' ###', '#   ', '#   ', '#   ', ' ###'],
    I: ['###', ' # ', ' # ', ' # ', '###'],
    H: ['#  #', '#  #', '####', '#  #', '#  #'],
    R: ['### ', '#  #', '### ', '# # ', '#  #'],
    T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
    M: ['#   #', '## ##', '# # #', '#   #', '#   #'],
    ' ': ['  ', '  ', '  ', '  ', '  ']
  };
  const FILL = '@#$%&8B';
  const titleCells = [];
  function buildTitle() {
    const pre = $('title');
    const lines = ['ASCII', 'CHRISTMAS'];
    const width = Math.max(...lines.map(w => [...w].reduce((n, ch) => n + (FONT[ch][0].length + 1) * 2, 0)));
    const frag = document.createDocumentFragment();
    lines.forEach((word, li) => {
      const rows = ['', '', '', '', ''];
      // every font pixel becomes two characters wide, so the letters read as solid shapes
      for (const ch of word) for (let r = 0; r < 5; r++) rows[r] += (FONT[ch][r] + ' ').replace(/./g, c => c + c);
      rows.forEach((row, r) => {
        const pad = Math.floor((width - row.length) / 2);
        const full = ' '.repeat(pad) + row;
        [...full].forEach((c, ci) => {
          const span = document.createElement('span');
          if (c === '#') {
            span.textContent = pick(FILL);
            titleCells.push({ el: span, col: ci, row: li * 6 + r, ph: Math.random() * 6.28 });
          } else span.textContent = ' ';
          frag.appendChild(span);
        });
        frag.appendChild(document.createTextNode('\n'));
      });
      if (li === 0) frag.appendChild(document.createTextNode('\n'));
    });
    pre.appendChild(frag);
  }

  /* ---------- little tree on the card ---------- */
  const RAMP = '.,:;^~=*';
  const miniCells = [];
  function buildMini() {
    const pre = $('mini-tree'), H = 6;
    const lines = [];
    lines.push([{ ch: '*', k: 'star' }]);
    for (let i = 1; i <= H; i++) {
      const row = [{ ch: '/', k: 'edge' }];
      for (let j = 0; j < 2 * i - 1; j++) row.push(Math.random() < .22 ? { ch: 'o', k: 'bulb' } : { ch: '.', k: 'leaf' });
      row.push({ ch: '\\', k: 'edge' });
      lines.push(row);
    }
    lines.push([{ ch: '|', k: 'wood' }, { ch: '#', k: 'wood' }, { ch: '|', k: 'wood' }]);
    lines.push([{ ch: '[', k: 'box' }, { ch: '=', k: 'box' }, { ch: '=', k: 'box' }, { ch: '=', k: 'box' }, { ch: '=', k: 'box' }, { ch: '=', k: 'box' }, { ch: ']', k: 'box' }]);
    const width = 2 * H + 1;
    lines.forEach((row, r) => {
      pre.appendChild(document.createTextNode(' '.repeat(Math.floor((width - row.length) / 2))));
      row.forEach(cell => {
        const span = document.createElement('span');
        span.textContent = cell.ch;
        const colors = { star: '#ffc84a', edge: 'hsl(140 45% 34%)', wood: 'hsl(24 45% 40%)', box: 'hsl(28 50% 46%)' };
        if (colors[cell.k]) span.style.color = colors[cell.k];
        pre.appendChild(span);
        miniCells.push({ el: span, k: cell.k, row: r, ph: Math.random() * 6.28, s: Math.random() });
      });
      pre.appendChild(document.createTextNode('\n'));
    });
  }

  const soonCells = [];
  function buildSoon() {
    const pre = $('mini-soon');
    const art = [' .-------. ', ' |       | ', ' |  ? ?  | ', ' |   ?   | ', ' |  ? ?  | ', ' |       | ', " '-------' "];
    art.forEach(line => {
      [...line].forEach(c => {
        const span = document.createElement('span');
        span.textContent = c;
        span.style.color = c === '?' ? '#8a93b8' : 'rgba(160,175,230,.45)';
        pre.appendChild(span);
        if (c === '?') soonCells.push(span);
      });
      pre.appendChild(document.createTextNode('\n'));
    });
  }

  function tickIntro() {
    if (!$('intro').hidden) {
      const t = performance.now() / 1000;
      // title: glyphs swap and a colour wave rolls across the letters
      for (const c of titleCells) {
        if (Math.random() < .08) c.el.textContent = pick(FILL);
        const w = .5 + .5 * Math.sin(t * 1.6 - c.col * .18 + c.row * .25);
        const hue = 42 + 300 * (1 - w) * (c.row > 5 ? .4 : .12);
        c.el.style.color = `hsl(${hue % 360 | 0} ${70 + w * 30 | 0}% ${45 + w * 30 | 0}%)`;
      }
      for (const c of miniCells) {
        if (c.k === 'leaf') {
          const L = .5 + .5 * Math.sin(t * 2 + c.ph);
          if (Math.random() < .15) c.el.textContent = RAMP[(L * (RAMP.length - 1)) | 0];
          c.el.style.color = `hsl(${130 + c.s * 25 | 0} 60% ${22 + L * 30 | 0}%)`;
        } else if (c.k === 'bulb') {
          const b = .5 + .5 * Math.sin(t * 3 + c.ph);
          c.el.textContent = 'oO@0'[(Math.floor(t * 2.5 + c.s * 10)) % 4];
          c.el.style.color = `hsl(${(c.s * 360 + t * 70) % 360 | 0} 100% ${45 + b * 25 | 0}%)`;
          c.el.style.textShadow = `0 0 ${4 + b * 6}px currentColor`;
        } else if (c.k === 'star') {
          c.el.style.textShadow = `0 0 ${6 + 4 * Math.sin(t * 4)}px #ffc84a`;
        }
      }
      for (const s of soonCells) if (Math.random() < .2) s.textContent = pick('?!#%&*+=<>');
    }
    setTimeout(tickIntro, reduce ? 400 : 90);
  }

  function countdown() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let xmas = new Date(now.getFullYear(), 11, 25);
    if (today > xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);
    const days = Math.round((xmas - today) / 86400000);
    $('countdown').innerHTML = days === 0 ? '<strong>merry christmas</strong>'
      : `<strong>${days}</strong> ${days === 1 ? 'sleep' : 'sleeps'} until christmas`;
  }

  /* ---------- views and sound ---------- */
  let wantSound = true;
  try { wantSound = localStorage.getItem('ascii-xmas-sound') !== 'off'; } catch (e) {}
  const soundBtn = $('sound');
  function paintSound() {
    soundBtn.setAttribute('aria-pressed', String(wantSound));
    soundBtn.innerHTML = wantSound ? '[ &#9834; on ]' : '[ &#9834; off ]';
  }
  Carols.onSong(title => { $('now').textContent = title ? `♪ ${title.toLowerCase()}` : ''; });
  Scene.setPulse(() => Carols.pulse());

  // browsers only allow sound after a click or key press on the page
  function startSoundOnGesture() {
    const go = () => {
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('keydown', go, true);
      if (wantSound && location.hash === '#tree') Carols.start();
    };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }

  let current = '';
  function route() {
    const view = location.hash === '#tree' ? 'tree' : 'intro';
    if (view === current) return;
    current = view;
    const intro = $('intro'), hud = $('hud');
    if (view === 'tree') {
      intro.classList.add('fading');
      setTimeout(() => { if (current === 'tree') intro.hidden = true; }, 450);
      hud.hidden = false;
      document.body.classList.add('tree');
      document.title = 'Spinning Tree · ASCII Christmas';
      Scene.showTree();
      if (wantSound && !Carols.isOn()) startSoundOnGesture();
    } else {
      hud.hidden = true;
      document.body.classList.remove('tree');
      document.title = 'ASCII Christmas';
      Scene.hideTree();
      Carols.stop();
      intro.hidden = false;
      requestAnimationFrame(() => intro.classList.remove('fading'));
    }
  }

  $('go-tree').addEventListener('click', () => {
    if (wantSound) Carols.start();             // inside the click, so the browser allows it
    location.hash = 'tree';
  });
  $('back').addEventListener('click', () => { location.hash = ''; });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && current === 'tree') $('back').click(); });
  soundBtn.addEventListener('click', () => {
    wantSound = !wantSound;
    try { localStorage.setItem('ascii-xmas-sound', wantSound ? 'on' : 'off'); } catch (e) {}
    paintSound();
    wantSound ? Carols.start() : Carols.stop();
  });
  window.addEventListener('hashchange', route);

  buildTitle();
  buildMini();
  buildSoon();
  countdown();
  paintSound();
  route();
  tickIntro();
})();
