/* Carols, synthesised live with the Web Audio API: no audio files to host.
   Every melody here is public domain. Chords are worked out automatically
   from the melody, using the I, IV, V, vi and ii chords of each song's key.
   Exposes window.Carols: start(), stop(), isOn(), pulse(), onSong(cb). */
window.Carols = (() => {
  const SONGS = [
    {
      title: 'Jingle Bells', key: 0, beat: .3, step: 2, transpose: 0, sleigh: true, repeat: 2,
      notes: 'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:.5 E5:4 ' +
             'F5:1 F5:1 F5:1.5 F5:.5 F5:1 E5:1 E5:1 E5:.5 E5:.5 E5:1 D5:1 D5:1 E5:1 D5:2 G5:2 ' +
             'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:.5 E5:4 ' +
             'F5:1 F5:1 F5:1.5 F5:.5 F5:1 E5:1 E5:1 E5:.5 E5:.5 G5:1 G5:1 F5:1 D5:1 C5:4'
    },
    {
      title: 'Silent Night', key: 0, beat: .3, step: 3, transpose: 12, sleigh: false, repeat: 1, soft: true,
      notes: 'G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 ' +
             'A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 ' +
             'D5:2 D5:1 F5:1.5 D5:.5 B4:1 C5:3 E5:3 C5:1.5 G4:.5 E4:1 G4:1.5 F4:.5 D4:1 C4:6'
    },
    {
      title: 'We Wish You a Merry Christmas', key: 7, beat: .34, step: 3, transpose: 12, sleigh: true, repeat: 2,
      notes: 'D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:1 ' +
             'B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:2 R:1'
    },
    {
      title: 'Joy to the World', key: 0, beat: .4, step: 2, transpose: 12, sleigh: false, repeat: 1,
      notes: 'C5:1 B4:.75 A4:.25 G4:1.5 F4:.5 E4:1 D4:1 C4:1.5 G4:.5 A4:1.5 A4:.5 B4:1.5 B4:.5 C5:2.5 ' +
             'C5:.5 C5:.5 B4:.5 A4:.5 G4:.5 G4:.75 F4:.25 E4:.5 C5:.5 C5:.5 B4:.5 A4:.5 G4:.5 G4:.75 F4:.25 E4:.5 ' +
             'E4:.5 E4:.5 E4:.5 E4:.5 E4:.25 F4:.25 G4:1.5 F4:.25 E4:.25 D4:.5 D4:.5 D4:.5 D4:.25 E4:.25 F4:1.5 ' +
             'E4:.25 D4:.25 C4:.5 C5:1 A4:.5 G4:.75 F4:.25 E4:.5 F4:.5 E4:1 D4:1 C4:2'
    }
  ];

  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = n => {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n);
    return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  };
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  // chords as scale-degree triads, in order of preference
  const CHORDS = [[0, 4, 7], [7, 11, 2], [5, 9, 0], [9, 0, 4], [2, 5, 9]];

  function prepare(song) {
    const mel = [];
    let beat = 0;
    for (let r = 0; r < song.repeat; r++) {
      for (const tok of song.notes.trim().split(/\s+/)) {
        const [n, d] = tok.split(':'); const dur = +d;
        if (n !== 'R') mel.push({ beat, dur, m: midi(n) + song.transpose });
        beat += dur;
      }
    }
    const total = beat;
    // pick a chord for each window: the one that covers the most melody time
    const harm = [];
    let prev = 0;
    for (let w = 0; w < total; w += song.step) {
      const score = CHORDS.map((ch, ci) => {
        let s = ci === prev ? .3 : 0;
        for (const e of mel) {
          const overlap = Math.min(e.beat + e.dur, w + song.step) - Math.max(e.beat, w);
          if (overlap > 0 && ch.includes(((e.m - song.key) % 12 + 12) % 12)) s += overlap;
        }
        return s - ci * .05;
      });
      const best = score.indexOf(Math.max(...score));
      harm.push({ beat: w, len: Math.min(song.step, total - w), tri: CHORDS[best].map(x => (x + song.key) % 12) });
      prev = best;
    }
    return { ...song, mel, harm, total };
  }
  const LIST = SONGS.map(prepare);

  let ac = null, master = null, dry = null, wet = null, noise = null;
  let on = false, timer = 0, songIdx = 0, songStart = 0, mi = 0, hi = 0, nextJingle = 0;
  let noteTimes = [], songCb = null;

  function setup() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    dry = ac.createGain(); dry.gain.value = .85; dry.connect(master);
    // small hall reverb from a decaying noise impulse
    const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = ac.createConvolver(); conv.buffer = ir;
    wet = ac.createGain(); wet.gain.value = .32;
    dry.connect(conv); conv.connect(wet); wet.connect(master);
    const nl = ac.sampleRate * .25;
    noise = ac.createBuffer(1, nl, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
  }
  function bell(f, t, vol) {
    const parts = [[1, 1, 1.6], [2.756, .3, .55], [5.404, .1, .25], [2, .18, .9]];
    for (const [mul, amp, dec] of parts) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * mul;
      env(g, t, vol * amp, .004, dec);
      o.connect(g); g.connect(dry); o.start(t); o.stop(t + dec + .05);
    }
  }
  function bass(f, t, dur, vol) {
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f;
    lp.type = 'lowpass'; lp.frequency.value = 600;
    env(g, t, vol, .01, Math.max(.3, dur * .9));
    o.connect(lp); lp.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + .1);
  }
  function pad(tri, t, dur, vol) {
    for (const pc of tri) {
      const m = 60 + pc, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq(m);
      o.detune.value = (Math.random() - .5) * 8;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(.25, dur * .3));
      g.gain.setValueAtTime(vol, t + dur * .8);
      g.gain.linearRampToValueAtTime(0, t + dur + .15);
      o.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + .2);
    }
  }
  function sleigh(t, vol) {
    const s = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 6500;
    env(g, t, vol, .002, .1);
    s.connect(hp); hp.connect(g); g.connect(dry); s.start(t); s.stop(t + .15);
  }

  function beginSong(idx, at) {
    songIdx = idx; songStart = at; mi = 0; hi = 0; nextJingle = at;
    const title = LIST[idx].title;
    setTimeout(() => { if (on && songCb) songCb(title); }, Math.max(0, (at - ac.currentTime) * 1000));
  }

  function schedule() {
    const horizon = ac.currentTime + .3;
    const s = LIST[songIdx], B = s.beat;
    while (mi < s.mel.length && songStart + s.mel[mi].beat * B < horizon) {
      const e = s.mel[mi++], t = songStart + e.beat * B;
      bell(freq(e.m), t, s.soft ? .11 : .14);
      noteTimes.push(t);
    }
    while (hi < s.harm.length && songStart + s.harm[hi].beat * B < horizon) {
      const h = s.harm[hi++], t = songStart + h.beat * B, dur = h.len * B;
      const root = h.tri[0], rm = 36 + root + (root > 7 ? -12 : 0) + 12;
      bass(freq(rm), t, dur * (h.len > 2 ? .5 : 1), .16);
      if (h.len > 2) bass(freq(rm + 7), t + dur * .5, dur * .5, .1);
      pad(h.tri, t, dur, s.soft ? .028 : .022);
    }
    const end = songStart + s.total * B;
    if (s.sleigh) {
      while (nextJingle < Math.min(horizon, end)) {
        sleigh(nextJingle, .045); sleigh(nextJingle + B / 2, .02);
        nextJingle += B;
      }
    }
    if (mi >= s.mel.length && hi >= s.harm.length && ac.currentTime > end - .3) {
      beginSong((songIdx + 1) % LIST.length, end + 1.6);
    }
  }

  return {
    async start() {
      if (on || !setup()) return;
      on = true;
      try { await ac.resume(); } catch (e) {}
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(.9, t + .6);
      noteTimes = [];
      beginSong(songIdx, t + .15);
      clearInterval(timer);
      timer = setInterval(schedule, 80);
      schedule();
    },
    stop() {
      if (!on) return;
      on = false;
      clearInterval(timer);
      if (songCb) songCb('');
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + .5);
      // the next start picks up with the following carol
      songIdx = (songIdx + 1) % LIST.length;
      setTimeout(() => { if (!on) ac.suspend(); }, 700);
    },
    isOn: () => on,
    onSong(cb) { songCb = cb; },
    // 1 right on a note, fading to 0; used to flash the tree lights in time
    pulse() {
      if (!on || !ac) return 0;
      const ct = ac.currentTime;
      while (noteTimes.length > 1 && noteTimes[1] <= ct) noteTimes.shift();
      return noteTimes.length && noteTimes[0] <= ct ? Math.exp(-(ct - noteTimes[0]) * 5) : 0;
    }
  };
})();
