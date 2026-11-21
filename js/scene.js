/* ASCII Christmas scene: a character-grid sky plus the spinning 3D tree.
   Exposes window.Scene with showTree(), hideTree() and setPulse(fn). */
window.Scene = (() => {
  const cv = document.getElementById('scene');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = matchMedia('(hover: none)').matches;
  const FONT = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const TAU = Math.PI * 2;
  const RAMP = '.,-~:;=!*#$@';            // dark -> bright
  const SCR = '!@#$%&*+=?<>/\\|{}[]~^';
  const BULB = 'oO@0*';
  const FLOORCH = ['.', ',', ':', "'", '`'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = s => s[(Math.random() * s.length) | 0];

  // light direction in view space (upper left, toward viewer)
  const LL = Math.hypot(-.5, .65, .75), LX = -.5 / LL, LY = .65 / LL, LZ = .75 / LL;
  const PITCH = .3, D = 3, YC = .66;

  // smooth value noise, used for bark, wood grain, mountains, clouds and grain
  function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const cP = Math.cos(PITCH), sP = Math.sin(PITCH);

  /* ---------- the 3D model: a cloud of points ---------- */
  // kinds: 0 leaf, 1 trunk, 2 floor, 3 garland, 4 bulb, 5 star
  const P = [];
  const add = (x, y, z, nx, ny, nz, k, h, extra) => P.push(Object.assign({ x, y, z, nx, ny, nz, k, h, s: Math.random() }, extra));
  const yTop = 1.34, yBase = .3;
  const radius = u => .42 * u * (.6 + .4 * ((u * 4) % 1)) + .004;  // four layered tiers

  function build() {
    P.length = 0;
    // foliage: lumpy branch clumps, tips that poke out and droop, gaps showing darker
    // needles inside, and snow resting on the top of the lower branches
    const LV = 210, K = .55;
    for (let i = 0; i <= LV; i++) {
      const u = i / LV, y = yTop - u * (yTop - yBase), base = radius(u);
      const tier = Math.floor(u * 4), f = (u * 4) % 1;
      const n = Math.max(6, Math.ceil(base * 1.25 * 650));
      for (let j = 0; j < n; j++) {
        const a = (j + Math.random() * .7) / n * TAU, c = Math.cos(a), s = Math.sin(a);
        const clump = 1 + .11 * Math.sin(a * 7 + u * 23 + tier) + .07 * Math.sin(a * 13 - u * 37 + tier * 2) + rnd(-.06, .06);
        const tip = .24 * Math.pow(Math.max(0, Math.sin(a * 9 + tier * 1.7 + u * 6)), 6) * f;
        const outer = Math.random() < .84;
        const r = base * (clump + tip) * (outer ? 1 : rnd(.55, .8));
        let nx = c + rnd(-.4, .4), ny = K + f * .25 + rnd(-.3, .3), nz = s + rnd(-.4, .4);
        const nl = Math.hypot(nx, ny, nz);
        const snowy = outer && f > .5 && Math.random() < .12 + tip * 2.2;
        add(r * c, y - tip * .06, r * s, nx / nl, ny / nl, nz / nl, snowy ? 6 : 0, u * .85,
            { hue: rnd(116, 162), sat: rnd(42, 76), dark: outer ? rnd(.85, 1.1) : rnd(.3, .5) });
      }
    }
    // garland (gold) and a string of bulbs, two helixes wound around the cone
    for (let i = 0; i < 1400; i++) {
      const u = .04 + i / 1400 * .94, y = yTop - u * (yTop - yBase), r = radius(u) * 1.05 + .008;
      const a = u * TAU * 3.3, c = Math.cos(a), s = Math.sin(a);
      add(r * c, y, r * s, c, .3, s, 3, u * .85, { u });
    }
    for (let i = 0; i < 46; i++) {
      const u = .06 + i / 46 * .92, y = yTop - u * (yTop - yBase), r = radius(u) * 1.06 + .01;
      const a = u * TAU * 3.3 + Math.PI, c = Math.cos(a), s = Math.sin(a);
      add(r * c, y, r * s, c, .3, s, 4, u * .85, { ph: rnd(0, TAU), sp: rnd(1.5, 4) });
    }
    // scattered ornaments
    for (let i = 0; i < 110; i++) {
      const u = rnd(.1, .98), y = yTop - u * (yTop - yBase), r = radius(u) * 1.04 + .008;
      const a = rnd(0, TAU), c = Math.cos(a), s = Math.sin(a);
      add(r * c, y, r * s, c, .3, s, 4, u * .85, { ph: rnd(0, TAU), sp: rnd(1.5, 4) });
    }
    // trunk: bark grain and knots, flaring into roots where it meets the soil
    const BH = .12, B = .2;
    for (let y = BH; y <= yBase + .06; y += .0045) {
      const flare = Math.max(0, 1 - (y - BH) / .07);
      for (let j = 0; j < 90; j++) {
        const a = j / 90 * TAU + rnd(0, .04), c = Math.cos(a), s = Math.sin(a);
        const root = flare * flare * .055 * Math.pow(Math.max(0, Math.sin(a * 5 + 1)), 2);
        const r = .072 + flare * .012 + root - (y - BH) * .05;
        const grain = .5 + .5 * Math.sin(a * 23 + Math.sin(y * 90 + a * 3) * 1.6);
        add(r * c, y, r * s, c, .15 * flare, s, 1, .86, { grain, knot: vnoise(a * 4, y * 28) > .78 });
      }
    }
    // wooden planter box: three planks per side, corner posts, a rim and soil
    const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    faces.forEach(([fx, fz], fi) => {
      for (let y = 0; y <= BH; y += .0045) for (let w = -B; w <= B; w += .0045) {
        const x = fx ? fx * B : w, z = fx ? w : fz * B;
        add(x, y, z, fx, 0, fz, 7, .9, {
          seam: (y % .04) < .0055 && y > .004,
          corner: Math.abs(w) > B - .014,
          grain: vnoise(w * 38 + fi * 9, y * 7 + fi * 3),
          nail: Math.abs(Math.abs(w) - (B - .03)) < .005 && Math.abs((y % .04) - .02) < .005
        });
      }
    });
    for (let x = -B; x <= B; x += .0045) for (let z = -B; z <= B; z += .0045) {
      const rim = Math.max(Math.abs(x), Math.abs(z)) > B - .022;
      add(x, rim ? BH + .004 : BH - .008, z, rnd(-.15, .15), 1, rnd(-.15, .15), rim ? 7 : 8, .9,
          rim ? { rim: true, grain: vnoise(x * 30, z * 30) } : {});
    }
    // presents: wrapped boxes with a ribbon cross and a bow, sitting around the planter
    const GIFTS = [
      { r: .42, a: .3,  w: .16, h: .12, d: .14, hue: 355, rib: 45,  pat: 'plain' },
      { r: .43, a: 1.45, w: .12, h: .17, d: .12, hue: 212, rib: 0,   pat: 'stripes' },
      { r: .45, a: 2.6, w: .19, h: .09, d: .15, hue: 275, rib: 45,  pat: 'dots' },
      { r: .42, a: 3.75, w: .13, h: .12, d: .13, hue: 42,  rib: 355, pat: 'plain' },
      { r: .45, a: 4.9, w: .15, h: .14, d: .12, hue: 188, rib: 0,   pat: 'stripes' },
      { r: .58, a: 4.25, w: .09, h: .07, d: .09, hue: 325, rib: 45,  pat: 'dots' },
      { r: .58, a: 1.0, w: .1,  h: .08, d: .08, hue: 15,  rib: 200, pat: 'plain' }
    ];
    const RB = .011, ST = .0038;
    for (const g of GIFTS) {
      const gx = g.r * Math.cos(g.a), gz = g.r * Math.sin(g.a), yaw = g.a + rnd(-.4, .4);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const put = (lx, ly, lz, nx, ny, nz, ribbon, extra) => {
        const pat = g.pat === 'stripes' ? (Math.floor((lx + lz + ly) * 45) & 1)
                  : g.pat === 'dots' ? ((Math.hypot((lx * 40) % 1 - .5, (ly * 40 + lz * 40) % 1 - .5) < .28) ? 1 : 0) : 0;
        add(gx + lx * cy - lz * sy, ly, gz + lx * sy + lz * cy, nx * cy - nz * sy, ny, nx * sy + nz * cy, 9, .9,
            Object.assign({ hue: g.hue, rib: g.rib, ribbon, pat }, extra));
      };
      const hw = g.w / 2, hd = g.d / 2;
      for (let ly = 0; ly <= g.h; ly += ST) {
        for (let lz = -hd; lz <= hd; lz += ST) { const rb = Math.abs(lz) < RB; put(hw, ly, lz, 1, 0, 0, rb, { side: 1 }); put(-hw, ly, lz, -1, 0, 0, rb, { side: 1 }); }
        for (let lx = -hw; lx <= hw; lx += ST) { const rb = Math.abs(lx) < RB; put(lx, ly, hd, 0, 0, 1, rb, { side: 1 }); put(lx, ly, -hd, 0, 0, -1, rb, { side: 1 }); }
      }
      for (let lx = -hw; lx <= hw; lx += ST) for (let lz = -hd; lz <= hd; lz += ST)
        put(lx, g.h, lz, 0, 1, 0, Math.abs(lx) < RB || Math.abs(lz) < RB, { top: 1 });
      // bow: two loops and a knot
      for (let k = 0; k < 260; k++) {
        const side = k & 1 ? 1 : -1, q = Math.random() * TAU, rr = .022;
        const lx = side * (.022 + Math.cos(q) * rr), ly = g.h + .012 + Math.sin(q) * rr * .8, lz = rnd(-.006, .006);
        put(lx, Math.max(g.h + .002, ly), lz, Math.cos(q) * side, Math.max(.2, Math.sin(q)), .3, true, { bow: 1 });
      }
    }

    // snowy floor disk
    for (let r = .1; r <= .86; r += .011) {
      const n = Math.ceil(r * 520);
      for (let j = 0; j < n; j++) {
        const a = (j + Math.random()) / n * TAU;
        add(r * Math.cos(a), 0, r * Math.sin(a), 0, 1, 0, 2, .88 + r * .12, { r });
      }
    }
    // five-point star on top, standing in the x-y plane so it turns with the tree
    const sy = yTop + .075, V = [];
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? .042 : .1;
      V.push([Math.cos(a) * rr, -Math.sin(a) * rr]);
    }
    for (let k = 0; k < 10; k++) {
      const [x1, y1] = V[k], [x2, y2] = V[(k + 1) % 10];
      for (let i = 0; i < 160; i++) {
        const f = Math.random(), g = Math.random() * (1 - f);
        add(x1 * f + x2 * g, sy + y1 * f + y2 * g, 0, 0, 0, 1, 5, -.02);
      }
    }
  }

  /* ---------- sizing ---------- */
  let W = 0, H = 0, dpr = 1, fs = 12, cw = 7, ch = 13, cols = 1, rows = 1, S = 100, cy = 0;
  let cz = new Float32Array(1), ci = new Int32Array(1), cy2 = new Float32Array(1);
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `100px ${FONT}`;
    const m = (ctx.measureText('M').width / 100) || .6;
    fs = Math.max(7, Math.min(13, Math.min(H / 80, W / 110)));
    cw = fs * m; ch = fs * 1.12;
    cols = Math.floor(W / cw); rows = Math.floor(H / ch);
    cz = new Float32Array(cols * rows); ci = new Int32Array(cols * rows);
    S = Math.min(H * .9 / 1.98, W * 1.04 / 2.2);
    cy = H * .48;
    initSky();
  }

  /* ---------- the sky: twinkling stars, a moon, shooting stars and slow snow ---------- */
  let stars = [], flakes = [], meteors = [], nextMeteor = 1.5, moon = null;
  let used = new Uint8Array(1), mtnCh = [], mtnCol = [], ridgeTop = [];
  // each star gets its own little family of glyphs, dim -> bright
  const STARSETS = [['.', ':', '+', 'x', 'X'], ['.', 'o', 'O', '0'], ['`', "'", '"', '^'],
                    ['.', '-', '=', '#'], ['.', ';', '%', '&'], [',', 'c', 'C', 'G'], ['.', 'v', 'V', 'W']];
  function initSky() {
    const R = Math.max(3 * ch, Math.min(W, H) * .07);
    moon = { x: Math.max(R * 1.6, W * .15), y: Math.max(R * 1.4, H * .15), R };
    used = new Uint8Array(cols * rows);

    // two jagged mountain ranges behind the tree, the far one darker, with snow on the peaks
    mtnCh = new Array(cols * rows).fill(null); mtnCol = new Array(cols * rows).fill(null);
    ridgeTop = new Array(cols).fill(rows);
    const layers = [{ base: .6, amp: .24, f: .03, seed: 3, hue: 230, L: 11 },
                    { base: .7, amp: .16, f: .055, seed: 11, hue: 222, L: 16 }];
    for (const ly of layers) {
      const hgt = c => Math.round(rows * (ly.base - ly.amp * (vnoise(c * ly.f, ly.seed) * .7 + vnoise(c * ly.f * 4.3, ly.seed + 7) * .3)));
      for (let c = 0; c < cols; c++) {
        const h = hgt(c), hl = hgt(c - 1), hr = hgt(c + 1);
        ridgeTop[c] = Math.min(ridgeTop[c], h);
        for (let r = Math.max(0, h); r < rows; r++) {
          const idx = r * cols + c, q = hash(c * 7 + ly.seed, r * 13);
          let chr, col;
          if (r === h) {
            chr = hl < h && hr < h ? '^' : hl < h ? '\\' : hr < h ? '/' : hl > h && hr > h ? 'A' : '_';
            col = `hsl(210 25% ${ly.L + 22}%)`;
          } else if (r < h + 2 + q * 2 && h < rows * ly.base - 2) {
            chr = "'.:`"[(q * 4) | 0]; col = `hsl(210 22% ${(ly.L + 14 + q * 10) | 0}%)`;
          } else {
            chr = '.:;!|%'[(q * 6) | 0]; col = `hsl(${ly.hue} 20% ${(ly.L + q * 6 - (r - h) * .08) | 0}%)`;
          }
          mtnCh[idx] = chr; mtnCol[idx] = col;
        }
      }
    }

    stars = [];
    const ns = Math.round(cols * rows * .03);
    for (let i = 0; i < ns; i++) {
      const c = (Math.random() * cols) | 0, r = (Math.random() * rows * .9) | 0;
      if (r >= ridgeTop[c] - 1) continue;
      if (Math.hypot(c * cw - moon.x, r * ch - moon.y) < R * 1.5) continue;
      stars.push({ c, r, s: Math.random(), sp: rnd(.4, 2.2), ph: rnd(0, TAU), set: pick(STARSETS),
                   hue: pick([210, 220, 200, 48, 0, 280, 160]) });
    }
    flakes = [];
    const nf = Math.round(cols * rows * .01);
    for (let i = 0; i < nf; i++) flakes.push(newFlake(false));
  }
  function newFlake(top) {
    return { x: Math.random() * W, y: top ? -rnd(0, ch * 4) : Math.random() * H,
             v: rnd(.6, 1.6) * ch, ph: rnd(0, TAU), s: Math.random() };
  }
  // put a character on the grid unless the tree is in front of that cell
  function sky(x, y, chr, col, a, glow) {
    const c = Math.floor(x / cw), r = Math.floor(y / ch), idx = r * cols + c;
    if (c < 0 || c >= cols || r < 0 || r >= rows || ci[idx] >= 0 || used[idx]) return;
    used[idx] = 1;
    ctx.globalAlpha = a; ctx.fillStyle = col;
    if (glow) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
    ctx.fillText(chr, c * cw, r * ch);
    if (glow) ctx.shadowBlur = 0;
  }
  function drawSky(t, el, dt) {
    // drawn front to back: the first thing to claim a cell keeps it
    used.fill(0);
    drawMeteors(el, dt);

    // stars: they twinkle, change colour and change shape
    for (const s of stars) {
      const tw = .5 + .5 * Math.sin(t * s.sp + s.ph);
      const chr = s.set[Math.min(s.set.length - 1, (tw * tw * s.set.length) | 0)];
      const col = `hsl(${s.hue} ${s.hue === 48 ? 90 : 55}% ${(30 + tw * 55) | 0}%)`;
      const x = s.c * cw, y = s.r * ch;
      sky(x, y, chr, col, .35 + tw * .6, tw > .9 ? fs * .8 : 0);
      if (s.s > .94 && tw > .8) {             // the brightest ones flare into a cross
        sky(x - cw, y, '-', col, .5); sky(x + cw, y, '-', col, .5);
        sky(x, y - ch, '|', col, .4); sky(x, y + ch, '|', col, .4);
      }
    }

    // moon: a lit sphere drawn with the same brightness ramp as the tree
    const m = moon;
    for (let r = Math.floor((m.y - m.R) / ch); r <= Math.ceil((m.y + m.R) / ch); r++) {
      for (let c = Math.floor((m.x - m.R) / cw); c <= Math.ceil((m.x + m.R) / cw); c++) {
        const dx = (c * cw + cw / 2 - m.x) / m.R, dy = (r * ch + ch / 2 - m.y) / m.R;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const crater = (Math.sin(c * 1.9 + r * 3.1) * Math.sin(c * .7 - r * 2.3)) > .55 ? .25 : 0;
        const lum = Math.max(0, dx * .75 - dy * .35 + nz * .55) - crater;
        if (lum < .05) continue;
        const L = Math.min(1, lum);
        sky(c * cw, r * ch, RAMP[(L * (RAMP.length - 1)) | 0], `hsl(48 70% ${(35 + L * 50) | 0}%)`, 1, L > .7 ? fs * .6 : 0);
      }
    }

    // slow snow drifting behind the tree
    for (const f of flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(t * .7 + f.ph) * 10 * dt;
      if (f.y > H) Object.assign(f, newFlake(true));
      const chr = f.s < .6 ? '.' : f.s < .88 ? '*' : '+';
      sky(f.x, f.y, chr, '#c9d4ff', .2 + f.s * .4);
    }

    // ragged clouds drifting across the upper sky
    const drift = t * .5;
    for (let r = 0; r < rows * .55; r++) {
      for (let c = 0; c < cols; c++) {
        if (r >= ridgeTop[c]) continue;
        const v = vnoise((c + drift) * .045, r * .16) * .7 + vnoise((c + drift * 1.6) * .14, r * .4 + 5) * .3;
        if (v < .6) continue;
        const k = (v - .6) / .4;
        const chr = k > .55 ? '%' : k > .35 ? '~' : k > .18 ? ':' : '.';
        sky(c * cw, r * ch, chr, `hsl(228 22% ${(14 + k * 22) | 0}%)`, .45 + k * .4);
      }
    }

    // mountains
    for (let idx = 0; idx < mtnCh.length; idx++) {
      if (!mtnCh[idx]) continue;
      sky((idx % cols) * cw, ((idx / cols) | 0) * ch, mtnCh[idx], mtnCol[idx], 1);
    }

    // rough grain: dim characters flickering across the whole sky
    const frameK = Math.floor(t * 5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = vnoise(c * .09, r * .17);
        const q = hash(c * 31 + r, frameK + ((hash(c, r) * 8) | 0));
        if (q > .05 + n * .16 + (r / rows) * .06) continue;
        sky(c * cw, r * ch, ".,'`:;-"[(q * 97 | 0) % 7], `hsl(${(222 + n * 20) | 0} 28% ${(10 + n * 12) | 0}%)`, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawMeteors(el, dt) {
    // shooting stars with character trails
    if (el > nextMeteor) {
      const dir = Math.random() < .5 ? -1 : 1, sp = rnd(550, 900);
      const ang = rnd(.38, .6);
      meteors.push({ x: dir < 0 ? rnd(W * .3, W * 1.1) : rnd(-W * .1, W * .7), y: rnd(-H * .05, H * .3),
                     vx: dir * Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: (rnd(10, 20)) | 0,
                     life: 0, max: rnd(.7, 1.3), hue: pick([195, 50, 300, 160]) });
      nextMeteor = el + rnd(.5, 2);
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const mt = meteors[i];
      mt.life += dt; mt.x += mt.vx * dt; mt.y += mt.vy * dt;
      if (mt.life > mt.max) { meteors.splice(i, 1); continue; }
      const fade = Math.min(1, mt.life * 6, (mt.max - mt.life) * 3);
      const sp = Math.hypot(mt.vx, mt.vy), ux = mt.vx / sp, uy = mt.vy / sp;
      const slash = mt.vx < 0 ? '/' : '\\';
      for (let k = mt.len; k >= 0; k--) {
        const x = mt.x - ux * k * cw * 1.1, y = mt.y - uy * k * cw * 1.1;
        const q = 1 - k / mt.len;
        const chr = k === 0 ? '@' : k < 2 ? '%' : k < 4 ? '=' : k > mt.len - 3 ? '.' : slash;
        const col = k < 2 ? 'hsl(50 100% 88%)' : `hsl(${mt.hue} 85% ${(35 + q * 40) | 0}%)`;
        sky(x, y, chr, col, fade * (.15 + q * .85), k === 0 ? fs * 1.4 : 0);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- spin ---------- */
  const OMEGA0 = reduce ? -.25 : -.65, OMEGA_MAX = 14;
  let theta = 0, omega = OMEGA0, touched = false;
  let treeOn = false, pulseFn = null;
  const start0 = performance.now() / 1000;

  /* ---------- render ---------- */
  let t0 = performance.now() / 1000, last = t0;
  if (reduce) t0 -= 100;

  function frame(nowMs) {
    const now = nowMs / 1000;
    const dt = Math.min(.05, now - last); last = now;
    const el = now - t0, skyEl = now - start0;
    const t = reduce ? now * .4 : now;
    const prog = Math.min(1.2, el / 2.4);

    omega += (OMEGA0 - omega) * Math.min(1, dt * .55);
    theta += omega * dt;
    const cT = Math.cos(theta), sT = Math.sin(theta);

    // project every point into the character grid, keeping the nearest per cell
    cz.fill(-1e9); ci.fill(-1);
    for (let i = 0, n = treeOn ? P.length : 0; i < n; i++) {
      const p = P[i];
      if (p.h > prog) continue;
      const xr = p.x * cT - p.z * sT, zr = p.x * sT + p.z * cT, yy = p.y - YC;
      const y2 = yy * cP - zr * sP, z2 = yy * sP + zr * cP;
      const ps = D / (D - z2);
      const col = ((W / 2 + xr * ps * S) / cw) | 0;
      const row = ((cy - (y2 * ps + .13) * S) / ch) | 0;
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const idx = row * cols + col;
      // bulbs and garland sit on top of the leaves they touch
      const z = z2 + (p.k >= 3 ? .02 : 0);
      if (z > cz[idx]) { cz[idx] = z; ci[idx] = i; }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${fs}px ${FONT}`;
    ctx.textBaseline = 'top';

    drawSky(t, skyEl, reduce ? dt * .4 : dt);

    const glows = [];
    const pulse = pulseFn ? pulseFn() : 0;   // flashes the lights on each note of the music
    for (let idx = 0; idx < ci.length; idx++) {
      const i = ci[idx];
      if (i < 0) continue;
      const p = P[i];
      const x = (idx % cols) * cw, y = ((idx / cols) | 0) * ch;

      if (p.h > prog - .05) {                       // building in: scrambled glyphs
        ctx.fillStyle = 'rgba(190,205,255,.6)';
        ctx.fillText(pick(SCR), x, y);
        continue;
      }
      const nxr = p.nx * cT - p.nz * sT, nzr = p.nx * sT + p.nz * cT;
      const ny2 = p.ny * cP - nzr * sP, nz2 = p.ny * sP + nzr * cP;
      const lum = Math.max(0, nxr * LX + ny2 * LY + nz2 * LZ);
      const depth = Math.min(1, Math.max(0, (cz[idx] + .7) / 1.4));

      switch (p.k) {
        case 0: { // leaf
          const L = Math.max(0, Math.min(1, (.08 + lum * .92 + .09 * Math.sin(t * 2.6 + p.s * 40)) * p.dark));
          const hue = p.hue + 16 * Math.sin(t * .7 + p.y * 5);
          ctx.fillStyle = `hsl(${hue | 0} ${p.sat | 0}% ${(8 + L * 52) | 0}%)`;
          ctx.fillText(RAMP[(L * (RAMP.length - 1)) | 0], x, y);
          break;
        }
        case 6: { // snow sitting on branches
          const L = Math.min(1, .3 + lum * .7 + .08 * Math.sin(t * 3 + p.s * 50));
          ctx.fillStyle = `hsl(${(200 + 20 * p.s) | 0} 35% ${(45 + L * 48) | 0}%)`;
          ctx.fillText(RAMP[(4 + L * (RAMP.length - 5)) | 0], x, y);
          break;
        }
        case 1: { // bark
          const L = Math.min(1, (.12 + lum * .88) * (.55 + .55 * p.grain) * (p.knot ? .45 : 1));
          const chr = p.knot ? 'o' : p.grain > .82 ? '|' : p.grain < .12 ? '(' : RAMP[(L * (RAMP.length - 1)) | 0];
          ctx.fillStyle = `hsl(${(20 + p.grain * 6) | 0} 42% ${(7 + L * 34) | 0}%)`;
          ctx.fillText(chr, x, y);
          break;
        }
        case 7: { // planter wood
          const L = Math.min(1, (.14 + lum * .86) * (.75 + .4 * p.grain) * (p.seam ? .4 : 1));
          let chr = RAMP[(L * (RAMP.length - 1)) | 0];
          if (p.seam) chr = '=';
          else if (p.nail) chr = 'o';
          else if (p.corner) chr = '#';
          else if (p.rim) chr = p.grain > .5 ? '=' : '-';
          else if (p.grain > .78) chr = '~';
          ctx.fillStyle = p.nail ? `hsl(40 10% ${(30 + L * 40) | 0}%)`
                                 : `hsl(${(24 + p.grain * 10) | 0} ${p.corner ? 38 : 52}% ${(8 + L * 42) | 0}%)`;
          ctx.fillText(chr, x, y);
          break;
        }
        case 9: { // presents
          const L = Math.min(1, .16 + lum * .84);
          if (p.ribbon) {
            const chr = p.bow ? (L > .6 ? '@' : '&') : p.top ? '+' : '|';
            const col = p.rib === 0 ? `hsl(0 0% ${(40 + L * 55) | 0}%)` : `hsl(${p.rib} 90% ${(25 + L * 50) | 0}%)`;
            if (p.bow && L > .55) glows.push([chr, x, y, col, .7]);
            else { ctx.fillStyle = col; ctx.fillText(chr, x, y); }
          } else {
            const LL = L * (p.pat ? .7 : 1);
            const chr = p.pat && p.side ? (p.hue % 2 ? 'o' : '/') : RAMP[(LL * (RAMP.length - 1)) | 0];
            ctx.fillStyle = `hsl(${p.hue} ${p.pat ? 55 : 72}% ${(10 + LL * 46) | 0}%)`;
            ctx.fillText(chr, x, y);
          }
          break;
        }
        case 8: { // soil
          ctx.fillStyle = `hsl(22 32% ${(6 + lum * 14 + p.s * 5) | 0}%)`;
          ctx.fillText(':.,;'[(p.s * 4) | 0], x, y);
          break;
        }
        case 2: { // snowy floor, warmer near the tree
          const near = 1 - p.r / .86;
          const b = (.18 + near * .5) * (.75 + .25 * Math.sin(t * 1.5 + p.s * 30));
          const hue = 215 - near * 170;
          ctx.fillStyle = `hsl(${hue | 0} ${(25 + near * 60) | 0}% ${(10 + b * 55) | 0}%)`;
          ctx.fillText(FLOORCH[(Math.floor(t * .8 + p.s * 7) + ((p.s * 5) | 0)) % 5], x, y);
          break;
        }
        case 3: { // gold garland with a light running along it
          const b = Math.min(1, .5 + .5 * Math.sin(t * 5 - p.u * 34) + pulse * .25) * (.35 + .65 * depth);
          const chr = b > .7 ? '*' : b > .4 ? '~' : '-';
          const col = `hsl(${(42 + 8 * Math.sin(t + p.u * 9)) | 0} 100% ${(30 + b * 45) | 0}%)`;
          if (b > .62) glows.push([chr, x, y, col, b]);
          else { ctx.fillStyle = col; ctx.fillText(chr, x, y); }
          break;
        }
        case 4: { // bulbs: they change colour and shape
          const tw = .5 + .5 * Math.sin(t * p.sp + p.ph);
          const b = Math.min(1, .3 + .7 * tw * tw + pulse * .45) * (.4 + .6 * depth);
          const hue = (p.s * 360 + t * 70) % 360;
          const chr = BULB[(Math.floor(t * 2.5 + p.s * 10)) % BULB.length];
          glows.push([chr, x, y, `hsl(${hue | 0} 100% ${(48 + b * 22) | 0}%)`, b]);
          break;
        }
        case 5: { // star
          const face = Math.abs(nz2);
          const b = .55 + .45 * face * (.8 + .2 * Math.sin(t * 6));
          glows.push([face > .5 ? '*' : face > .2 ? '+' : '|', x, y, `hsl(${(44 + 6 * Math.sin(t * 2)) | 0} 100% ${(55 + b * 25) | 0}%)`, b]);
          break;
        }
      }
    }

    for (const [chr, x, y, col, b] of glows) {
      ctx.globalAlpha = Math.min(1, b + .1);
      ctx.shadowColor = col; ctx.shadowBlur = fs * 1.1 * b;
      ctx.fillStyle = col; ctx.fillText(chr, x, y);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // a quiet hint until the first swoosh
    if (treeOn && el > 2.6 && !touched) {
      const hint = noHover ? 'swipe across the tree to spin it' : 'swoosh across the tree to spin it';
      const row = Math.min(rows - 2, Math.round((cy + .9 * S) / ch) + 2);
      const h0 = Math.floor(cols / 2 - hint.length / 2);
      ctx.globalAlpha = .3 + .25 * Math.sin(now * 2.4);
      ctx.fillStyle = '#8a93b8';
      for (let i = 0; i < hint.length; i++) ctx.fillText(hint[i], (h0 + i) * cw, row * ch);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }

  /* ---------- swoosh to spin ---------- */
  const lastX = new Map();
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left;
    const prev = lastX.get(e.pointerId);
    lastX.set(e.pointerId, x);
    if (prev === undefined || !treeOn) return;
    omega -= ((x - prev) / S) * 3.2;
    omega = Math.max(-OMEGA_MAX, Math.min(OMEGA_MAX, omega));
    if (Math.abs(x - prev) > 2) touched = true;
  });
  cv.addEventListener('pointerleave', e => lastX.delete(e.pointerId));
  cv.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') lastX.delete(e.pointerId); });
  cv.addEventListener('pointercancel', e => lastX.delete(e.pointerId));

  build();
  resize();
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  requestAnimationFrame(frame);

  return {
    showTree() {
      build();                                  // a fresh tree each visit
      t0 = performance.now() / 1000 - (reduce ? 100 : 0);
      theta = 0; omega = OMEGA0; touched = false; treeOn = true;
    },
    hideTree() { treeOn = false; },
    setPulse(fn) { pulseFn = fn; }
  };
})();
