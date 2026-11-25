(() => {
  'use strict';

  /* =========================================================
     Utilities
     ========================================================= */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fmt = (v, dec = 0) => Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtPrice = p => (p >= 1000 ? fmt(p, 2) : p >= 1 ? fmt(p, 2) : p.toFixed(4));
  const short = h => `0x${h.slice(0, 8)}…${h.slice(-6)}`;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = !!(G && ST) && !reduce;
  if (G && ST) G.registerPlugin(ST);

  /* =========================================================
     SHA-256 (synchronous, so mining can run many hashes per frame)
     ========================================================= */
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const W64 = new Uint32Array(64);
  const enc = new TextEncoder();
  function sha256(str) {
    const bytes = enc.encode(str);
    const len = bytes.length;
    const total = ((len + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total);
    m.set(bytes); m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, (len * 8) >>> 0);
    dv.setUint32(total - 8, Math.floor(len / 0x20000000));
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
        h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = W64;
    for (let o = 0; o < total; o += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(o + t * 4);
      for (let t = 16; t < 64; t++) {
        const x = w[t - 15], y = w[t - 2];
        const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  window.sha256 = sha256; // handy for the curious in DevTools

  /* =========================================================
     Sound (opt-in, synthesised with Web Audio)
     ========================================================= */
  const Sound = (() => {
    const btn = $('#soundToggle');
    let on = false, ctx = null;
    try { on = localStorage.getItem('ll-sound') === '1'; } catch (e) { /* storage blocked */ }
    const sync = () => { btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); };
    const ensure = () => {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const tone = (f, d = .12, delay = 0, type = 'sine', g = .05) => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + .01);
      a.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(a).connect(ctx.destination);
      o.start(t); o.stop(t + d + .03);
    };
    sync();
    btn.addEventListener('click', () => {
      on = !on;
      try { localStorage.setItem('ll-sound', on ? '1' : '0'); } catch (e) { /* ignore */ }
      sync();
      if (on) { tone(660, .08); tone(990, .14, .06); }
    });
    return {
      chime() { tone(880, .14); tone(1320, .24, .07); },
      found() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .28, i * .07, 'triangle', .045)); },
      error() { tone(240, .16, 0, 'sawtooth', .025); tone(170, .26, .08, 'sawtooth', .025); },
      tick() { tone(1800, .03, 0, 'square', .006); },
      boom() {
        if (!on || !ensure()) return;
        const t = ctx.currentTime, o = ctx.createOscillator(), a = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(32, t + .7);
        a.gain.setValueAtTime(.18, t); a.gain.exponentialRampToValueAtTime(.0001, t + .8);
        o.connect(a).connect(ctx.destination); o.start(t); o.stop(t + .85);
        tone(1400, .3, .02, 'triangle', .03);
      },
      whoosh() {
        if (!on || !ensure()) return;
        const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), a = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.1);
        f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(4000, t + 1.1);
        a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(.04, t + .4); a.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
        o.connect(f).connect(a).connect(ctx.destination); o.start(t); o.stop(t + 1.5);
      },
    };
  })();

  /* =========================================================
     FX canvas: spark bursts and shockwave rings
     ========================================================= */
  const FX = (() => {
    const c = $('#fx'), x = c.getContext('2d');
    let w = 0, h = 0, running = false;
    const parts = [], rings = [];
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); addEventListener('resize', size);
    const hex = (px, py, r, rot) => {
      x.beginPath();
      for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; x.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r); }
      x.closePath();
    };
    const loop = () => {
      x.clearRect(0, 0, w, h);
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.r += (r.max - r.r) * .1; r.life -= .028;
        if (r.life <= 0) { rings.splice(i, 1); continue; }
        x.globalAlpha = r.life; x.strokeStyle = r.c; x.lineWidth = 2 * r.life + .5;
        x.beginPath(); x.arc(r.x, r.y, r.r, 0, Math.PI * 2); x.stroke();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vx *= .965; p.vy = p.vy * .965 + .16; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        x.globalAlpha = Math.min(1, p.life * 1.6);
        if (p.hex) { hex(p.x, p.y, p.s, p.rot); x.strokeStyle = p.c; x.lineWidth = 1.3; x.stroke(); }
        else { x.fillStyle = p.c; x.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
      }
      x.globalAlpha = 1;
      if (parts.length || rings.length) requestAnimationFrame(loop);
      else { running = false; x.clearRect(0, 0, w, h); }
    };
    const burst = (bx, by, n = 70, colors = ['#3CFFB4', '#E9FFF6', '#3CFFB4', '#9C8CFF']) => {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = rand(2, 10), isHex = Math.random() < .35;
        parts.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: 1, decay: rand(.012, .024), s: isHex ? rand(4, 8) : rand(2, 4.5), c: colors[i % colors.length], hex: isHex, rot: Math.random() * 6, vr: rand(-.2, .2) });
      }
      rings.push({ x: bx, y: by, r: 6, max: 160, life: 1, c: '#3CFFB4' }, { x: bx, y: by, r: 3, max: 90, life: .8, c: '#E9FFF6' });
      if (!running) { running = true; requestAnimationFrame(loop); }
    };
    const at = (el, n, colors) => { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n, colors); };
    return { burst, at };
  })();

  /* =========================================================
     Discoveries (achievements): 10 things to find, +10 HEX each.
     Progress is a per-viewer convenience kept in localStorage.
     ========================================================= */
  const Ach = (() => {
    const LIST = [
      ['warp', 'Warp drive', 'Jumped through the chain'],
      ['miner', 'Proof of work', 'Mined a block yourself'],
      ['tamper', 'Bad actor', 'Broke the chain'],
      ['reader', 'Chart reader', 'Read the market'],
      ['hodl', 'HODL', 'Filled the vault with every token'],
      ['keys', 'Self-custody', 'Generated your own keypair'],
      ['pass', 'Genesis pass', 'Took your pass home'],
      ['console', 'Root access', 'Opened the chain console'],
      ['bigbang', 'Big bang', 'Exploded the genesis block'],
      ['matrix', 'Follow the white rabbit', 'Found the hash rain', true],
    ];
    let got = new Set();
    try { got = new Set(JSON.parse(localStorage.getItem('ll-ach') || '[]')); } catch (e) { /* storage blocked */ }
    const save = () => { try { localStorage.setItem('ll-ach', JSON.stringify([...got])); } catch (e) { /* ignore */ } };
    const btn = $('#achBtn'), pop = $('#achPop'), countEl = $('#achCount'), listEl = $('#achList');
    const render = () => {
      countEl.textContent = `${got.size}/${LIST.length}`;
      listEl.innerHTML = LIST.map(([id, t, d, secret]) => {
        const on = got.has(id), show = on || !secret;
        return `<li class="${on ? 'on' : ''}"><i></i><div><b>${show ? t : '???'}</b><span>${show ? d : 'Hidden. Try typing something…'}</span></div><em>${on ? '+10' : ''}</em></li>`;
      }).join('');
    };
    const toastAch = (title, desc, reward = '+10 HEX') => {
      const el = document.createElement('div');
      el.className = 'ach-toast glass';
      el.innerHTML = `<span class="ach-hex"></span><div><p>Achievement unlocked</p><b>${title}</b><span>${desc}</span></div><em>${reward}</em>`;
      $('.ach-toasts').appendChild(el);
      Sound.found();
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
      if (motion) {
        G.fromTo(el, { y: -30, opacity: 0, scale: .9 }, { y: 0, opacity: 1, scale: 1, duration: .6, ease: 'back.out(1.6)' });
        G.to(el, { y: -20, opacity: 0, duration: .4, delay: 3.6, ease: 'power2.in', onComplete: () => el.remove() });
      } else setTimeout(() => el.remove(), 4000);
    };
    const api = {
      onReward: null,
      unlock(id) {
        if (got.has(id)) return;
        const a = LIST.find(x => x[0] === id);
        if (!a) return;
        got.add(id); save(); render();
        toastAch(a[1], a[2]);
        if (api.onReward) api.onReward(10, a[1]);
        if (got.size === LIST.length) {
          setTimeout(() => { toastAch('Chain master', 'You found every discovery. Respect.', '10/10'); FX.burst(innerWidth / 2, innerHeight / 3, 220); }, 2000);
        }
      },
      list: () => LIST.map(([id, t, d, s]) => ({ id, t, d, s, on: got.has(id) })),
      reset() { got.clear(); save(); render(); },
    };
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = pop.hidden;
      pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open && motion) G.fromTo(pop, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: 'power3.out' });
    });
    document.addEventListener('click', e => { if (!pop.hidden && !e.target.closest('.ach-wrap')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); } });
    render();
    return api;
  })();

  /* =========================================================
     Particle sculpture: ~1500 points that morph per section
     ========================================================= */
  const Field = (() => {
    const c = $('#bg'), ctx = c.getContext('2d');
    const small = innerWidth < 760;
    const N = small ? 700 : 1500;
    const TAU = Math.PI * 2;
    const pos = new Float32Array(N * 3), tgt = new Float32Array(N * 3), spd = new Float32Array(N);
    for (let i = 0; i < N; i++) spd[i] = rand(.022, .07);

    const gens = {
      orbit(i) {
        if (i % 10 < 7) {
          const a = Math.random() * TAU, r = 1.3 + rand(-.06, .06);
          const x = Math.cos(a) * r, y = rand(-.035, .035), z = Math.sin(a) * r, t = .42;
          return [x, y * Math.cos(t) - z * Math.sin(t), y * Math.sin(t) + z * Math.cos(t)];
        }
        const u = Math.random() * 2 - 1, a = Math.random() * TAU, r = rand(1.7, 2.5), s = Math.sqrt(1 - u * u);
        return [Math.cos(a) * s * r, u * r, Math.sin(a) * s * r];
      },
      chain(i) {
        const k = i % 5, h = .3, cx = (k - 2) * .95;
        if (i % 8 === 0) return [k === 4 ? cx - rand(h, .95 - h) : cx + rand(h, .95 - h), 0, 0];
        const ax = (Math.random() * 3) | 0;
        const p = [Math.random() < .5 ? -h : h, Math.random() < .5 ? -h : h, Math.random() < .5 ? -h : h];
        p[ax] = rand(-h, h);
        return [p[0] + cx, p[1], p[2]];
      },
      sphere(i) {
        const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), ph = i * 2.399963;
        const R = 1.15 + (i % 6 === 0 ? rand(.15, .6) : 0);
        return [Math.cos(ph) * r * R, y * R, Math.sin(ph) * r * R];
      },
      wave(i) {
        const cols = Math.ceil(Math.sqrt(N * 1.6)), rows = Math.ceil(N / cols);
        return [(i % cols) / (cols - 1) * 4.6 - 2.3, 0, ((i / cols) | 0) / Math.max(1, rows - 1) * 2.6 - 1.3];
      },
      coin(i) {
        const m = i % 20; let p;
        if (m < 8) { const a = Math.random() * TAU; p = [Math.cos(a), Math.sin(a), m < 4 ? .13 : -.13]; }
        else if (m < 11) { const a = Math.random() * TAU; p = [Math.cos(a), Math.sin(a), rand(-.13, .13)]; }
        else if (m < 17) {
          const k = (Math.random() * 6) | 0, t = Math.random(), a0 = k * Math.PI / 3 + Math.PI / 6, a1 = a0 + Math.PI / 3;
          p = [(Math.cos(a0) * (1 - t) + Math.cos(a1) * t) * .55, (Math.sin(a0) * (1 - t) + Math.sin(a1) * t) * .55, .15];
        } else { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * .9; p = [Math.cos(a) * r, Math.sin(a) * r, .13]; }
        return [p[0] * 1.15, p[1] * 1.15, p[2] * 1.15];
      },
      helix(i) {
        if (i % 7 === 0) {
          const t = ((Math.random() * 26) | 0) / 26, a = t * Math.PI * 8, u = 1 - 2 * Math.random();
          return [t * 4.8 - 2.4, Math.cos(a) * .55 * u, Math.sin(a) * .55 * u];
        }
        const t = Math.random(), a = t * Math.PI * 8 + (i % 2) * Math.PI;
        return [t * 4.8 - 2.4, Math.cos(a) * .55, Math.sin(a) * .55];
      },
      lattice() {
        // a crystal cage: points along the lines of a 4×4×4 lattice
        const L = [-1, -1 / 3, 1 / 3, 1];
        const ax = (Math.random() * 3) | 0;
        const p = [L[(Math.random() * 4) | 0], L[(Math.random() * 4) | 0], L[(Math.random() * 4) | 0]];
        p[ax] = rand(-1, 1);
        return p;
      },
      galaxy(i) {
        const arm = i % 3, r = Math.pow(Math.random(), .7) * 2.3;
        const a = r * 2.1 + arm * TAU / 3 + rand(-.35, .35) * (1.2 - r / 2.3);
        return [Math.cos(a) * r, rand(-.07, .07) * (2.4 - r), Math.sin(a) * r];
      },
    };
    const CFG = {
      orbit:  { scale: .3,  alpha: 1,   tilt: -.12, spinY: .12 },
      chain:  { scale: .2,  alpha: .45, tilt: -.3,  spinY: 0, spinX: .35 },
      sphere: { scale: .27, alpha: .5,  tilt: -.2,  spinY: .12 },
      wave:   { scale: .24, alpha: .45, tilt: -.6,  spinY: .03, dyn: true },
      coin:   { scale: .27, alpha: .5,  tilt: -.05, spinY: .7 },
      helix:  { scale: .21, alpha: .5,  tilt: -.15, spinY: 0, spinX: .5 },
      galaxy: { scale: .27, alpha: .95, tilt: -.5,  spinY: .08 },
      lattice: { scale: .27, alpha: .45, tilt: -.4, spinY: .14, spinX: .04 },
    };
    const cache = {};
    const shape = name => {
      if (!cache[name]) {
        const a = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) { const p = gens[name](i); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; }
        cache[name] = a;
      }
      return cache[name];
    };

    let W = 0, H = 0, cfg = CFG.orbit, current = '', anchor = null;
    const view = { cx: 0, cy: 0, R: 1, a: 0 };
    const goal = { cx: 0, cy: 0, R: 1, a: 0 };
    const mouse = { x: -9999, y: -9999, nx: 0, ny: 0, sx: 0, sy: 0 };
    let t = 0;

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!motion) draw();
    };
    const updateGoal = () => {
      const base = Math.min(W, H * 1.25);
      goal.R = base * cfg.scale;
      goal.a = cfg.alpha;
      if (anchor) {
        const r = anchor.getBoundingClientRect();
        goal.cx = r.left + r.width / 2; goal.cy = r.top + r.height / 2;
        if (small) goal.R = base * cfg.scale * .9;
      } else { goal.cx = W / 2; goal.cy = H / 2; }
    };

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const ax = (cfg.spinX || 0) * t;
      const ay = (cfg.spinY || 0) * t + mouse.sx * .5;
      const tx = cfg.tilt + mouse.sy * .25;
      const cA = Math.cos(ax), sA = Math.sin(ax), cB = Math.cos(ay), sB = Math.sin(ay), cC = Math.cos(tx), sC = Math.sin(tx);
      const { cx, cy, R, a: alpha } = view;
      const lens = 130, lens2 = lens * lens;
      ctx.globalCompositeOperation = 'lighter';
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? '#E9FFF6' : '#3CFFB4';
        for (let i = 0; i < N; i++) {
          if ((i % 9 === 0) !== (pass === 1)) continue;
          const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
          const y1 = y * cA - z * sA, z1 = y * sA + z * cA;
          const x2 = x * cB + z1 * sB, z2 = -x * sB + z1 * cB;
          const y3 = y1 * cC - z2 * sC, z3 = y1 * sC + z2 * cC;
          const s = 3.4 / (3.4 + z3);
          let px = cx + x2 * s * R, py = cy + y3 * s * R;
          const dx = px - mouse.x, dy = py - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < lens2 && d2 > .01) { const d = Math.sqrt(d2), f = (1 - d / lens) * 34; px += dx / d * f; py += dy / d * f; }
          if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
          ctx.globalAlpha = alpha * clamp((s - .55) * 1.35, .05, 1);
          const sz = s * (small ? 1.35 : 1.55);
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function step(dt) {
      t += dt;
      updateGoal();
      const k = 1 - Math.pow(.92, dt * 60);
      view.cx += (goal.cx - view.cx) * k; view.cy += (goal.cy - view.cy) * k;
      view.R += (goal.R - view.R) * k; view.a += (goal.a - view.a) * k * .6;
      mouse.sx += (mouse.nx - mouse.sx) * .05; mouse.sy += (mouse.ny - mouse.sy) * .05;
      if (cfg.dyn) {
        const src = shape(current);
        for (let i = 0; i < N; i++) {
          const x = src[i * 3], z = src[i * 3 + 2];
          tgt[i * 3 + 1] = Math.sin(x * 1.7 + t * 1.2) * .22 + Math.cos(z * 2.2 + t * .9) * .16;
        }
      }
      for (let i = 0; i < N * 3; i++) pos[i] += (tgt[i] - pos[i]) * spd[(i / 3) | 0];
      draw();
    }

    function set(name, anchorSel) {
      if (name === current || !gens[name]) return;
      current = name; cfg = CFG[name];
      anchor = anchorSel ? $(anchorSel) : null;
      tgt.set(shape(name));
      if (!motion) {
        pos.set(tgt); updateGoal(); Object.assign(view, goal); draw();
        return;
      }
      for (let i = 0; i < N * 3; i++) pos[i] += rand(-.35, .35); // scatter, then re-form
    }

    // init
    size();
    addEventListener('resize', size);
    const first = shape('orbit');
    for (let i = 0; i < N * 3; i++) pos[i] = first[i] * rand(2.5, 4); // starts exploded, then assembles
    if (finePointer && motion) {
      addEventListener('pointermove', e => {
        mouse.x = e.clientX; mouse.y = e.clientY;
        mouse.nx = e.clientX / innerWidth - .5; mouse.ny = e.clientY / innerHeight - .5;
      });
      document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }
    let last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!document.hidden) step(dt);
    };
    if (motion) G.ticker.add(tick);
    else if (!reduce) { const loop = () => { tick(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    // Blast every point outward; the normal easing pulls them back into shape.
    const explode = (power = 4) => { if (!motion) return; for (let i = 0; i < N * 3; i++) pos[i] *= rand(1.5, power); };
    return { set, explode };
  })();

  /* =========================================================
     Chain lab: real SHA-256 proof of work
     ========================================================= */
  const DIFF = '000';
  const ZERO = '0'.repeat(64);
  const lab = {
    blocks: ['Genesis → 50 HEX to the network', 'Ana pays Ben 4.20 HEX', 'Ben pays Cleo 1.50 HEX', 'Cleo pays Dev 0.75 HEX']
      .map(data => ({ data, nonce: 0, prev: ZERO, hash: ZERO, mining: false })),
  };
  const header = (i, b, n = b.nonce) => `${i + 1}|${n}|${b.data}|${b.prev}`;
  const rehash = i => { const b = lab.blocks[i]; b.prev = i ? lab.blocks[i - 1].hash : ZERO; b.hash = sha256(header(i, b)); };
  const rehashFrom = i => { for (let k = i; k < lab.blocks.length; k++) rehash(k); };
  const isValid = i => lab.blocks[i].hash.startsWith(DIFF);

  function mine(i, perFrame, onStep) {
    return new Promise(resolve => {
      const b = lab.blocks[i];
      b.prev = i ? lab.blocks[i - 1].hash : ZERO;
      let n = 0;
      const run = () => {
        let h = '';
        for (let k = 0; k < perFrame; k++, n++) {
          h = sha256(header(i, b, n));
          if (h.startsWith(DIFF)) {
            b.nonce = n; b.hash = h;
            if (onStep) onStep(n, h, true);
            return resolve(n);
          }
        }
        if (onStep) onStep(n, h, false);
        requestAnimationFrame(run);
      };
      run();
    });
  }

  const labEl = $('#labBlocks');
  lab.blocks.forEach((b, i) => {
    const li = document.createElement('li');
    li.className = 'lblock glass';
    li.innerHTML = `
      <div class="lb-top"><b>#${i + 1}</b><span class="lstate">valid</span></div>
      <div class="lb-field"><span>Nonce</span><output class="lb-nonce">0</output></div>
      <div class="lb-field"><label for="lbData${i}">Data</label><textarea id="lbData${i}" rows="2" spellcheck="false" maxlength="80">${b.data}</textarea></div>
      <div class="lb-field"><span>Prev hash</span><code class="lb-prev"></code></div>
      <div class="lb-field"><span>Hash</span><code class="lb-hash"></code></div>
      <button class="btn btn-ghost lb-mine" type="button" data-cursor="mine"><span>Mine</span></button>`;
    labEl.appendChild(li);
  });
  const lis = $$('.lblock', labEl);
  const hashHTML = h => `<em>${h.slice(0, 3)}</em>${h.slice(3)}`;
  let wasValid = true;

  function renderBlock(i) {
    const b = lab.blocks[i], li = lis[i], ok = isValid(i);
    li.classList.toggle('bad', !ok && !b.mining);
    $('.lstate', li).textContent = b.mining ? 'mining' : ok ? 'valid' : 'invalid';
    $('.lb-nonce', li).textContent = fmt(b.nonce);
    $('.lb-prev', li).textContent = b.prev;
    $('.lb-hash', li).innerHTML = hashHTML(b.hash);
  }
  function renderLab() {
    lab.blocks.forEach((_, i) => renderBlock(i));
    const bad = lab.blocks.findIndex((_, i) => !isValid(i));
    const st = $('#labStatus');
    const validCount = lab.blocks.filter((_, i) => isValid(i)).length;
    st.classList.toggle('bad', bad >= 0);
    $('span:last-child', st).textContent = bad < 0
      ? `Chain valid · ${validCount} / ${lab.blocks.length} blocks`
      : `Chain broken at block #${bad + 1} · mine it to repair`;
    if (wasValid && bad >= 0) { Sound.error(); Ach.unlock('tamper'); }
    wasValid = bad < 0;
  }

  lis.forEach((li, i) => {
    const ta = $('textarea', li);
    ta.addEventListener('input', () => {
      lab.blocks[i].data = ta.value;
      rehashFrom(i);
      renderLab();
    });
    $('.lb-mine', li).addEventListener('click', async () => {
      const b = lab.blocks[i];
      if (b.mining) return;
      b.mining = true;
      li.classList.add('mining'); li.classList.remove('bad');
      const btn = $('.lb-mine', li); btn.disabled = true; $('span', btn).textContent = 'Mining…';
      ta.disabled = true;
      renderBlock(i);
      let frames = 0;
      await mine(i, reduce ? 1e6 : 45, (n, h, ok) => {
        $('.lb-nonce', li).textContent = fmt(n);
        $('.lb-hash', li).innerHTML = ok ? hashHTML(h) : h;
        if (!ok && ++frames % 4 === 0) Sound.tick();
      });
      b.mining = false;
      li.classList.remove('mining');
      btn.disabled = false; $('span', btn).textContent = 'Mine';
      ta.disabled = false;
      rehashFrom(i + 1);
      renderLab();
      li.classList.remove('found'); void li.offsetWidth; li.classList.add('found');
      FX.at(li, 60);
      Sound.found();
      Ach.unlock('miner');
    });
  });

  $('#tamper').addEventListener('click', () => {
    const ta = $('#lbData1');
    ta.value = `Ana pays Ben ${fmt(rand(400, 9000), 2)} HEX`;
    ta.dispatchEvent(new Event('input'));
    lis[1].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: reduce ? 1 : 400 });
    ta.focus({ preventScroll: true });
  });

  /* =========================================================
     Hero: live block card (mined on the fly)
     ========================================================= */
  let height = 8402117, mintedAt = Date.now();
  const mineHeroBlock = () => {
    const seed = Math.random().toString(36).slice(2);
    let n = 0, h = '';
    do { h = sha256(`${height}|${seed}|${n++}`); } while (!h.startsWith(DIFF) && n < 60000);
    return h;
  };
  const showLive = h => {
    $('#liveHeight').textContent = `#${fmt(height)}`;
    $('#blockHeight').textContent = `#${fmt(height)}`;
    $('#liveHash').innerHTML = `0x<span class="accent">${h.slice(0, 3)}</span>${h.slice(3, 12)}…${h.slice(-4)}`;
    mintedAt = Date.now();
  };
  showLive(mineHeroBlock());
  setInterval(() => { $('#liveAgo').textContent = Math.round((Date.now() - mintedAt) / 1000); }, 1000);
  setInterval(() => {
    height += 1;
    showLive(mineHeroBlock());
    const card = $('.live-card'); card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
  }, 9000);

  /* =========================================================
     Market: live prices from CoinGecko, simulated fallback
     ========================================================= */
  const fetchJSON = async (url, ms = 6000) => {
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), ms);
    try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(tm); }
  };
  const COINS = [['bitcoin', 'BTC', 64000], ['ethereum', 'ETH', 3200], ['solana', 'SOL', 150], ['cardano', 'ADA', .45], ['avalanche-2', 'AVAX', 28], ['chainlink', 'LINK', 14], ['polkadot', 'DOT', 6], ['dogecoin', 'DOGE', .12]];
  // The note describes the chart on screen; the ticker carries its own Live/Demo badge.
  let tickerLive = false, chartLive = null;
  const PRICES = {};
  const setSource = () => {
    const note = $('#srcNote');
    const live = chartLive === null ? tickerLive : chartLive;
    note.classList.toggle('demo', !live);
    note.lastChild.textContent = chartLive === null
      ? (tickerLive ? 'Live prices · CoinGecko' : 'Connecting…')
      : chartLive ? 'Live chart · CoinGecko'
      : tickerLive ? 'Chart simulated · live data rate-limited' : 'Offline · showing simulated data';
  };
  (async function loadTicker() {
    let items, live = false;
    try {
      const d = await fetchJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${COINS.map(c => c[0]).join(',')}&vs_currencies=usd&include_24hr_change=true`);
      items = COINS.map(([id, s]) => ({ s, p: d[id].usd, ch: d[id].usd_24h_change || 0 }));
      live = true;
    } catch (e) {
      items = COINS.map(([, s, b]) => ({ s, p: b * rand(.97, 1.03), ch: rand(-4, 7) }));
    }
    items.forEach(it => { PRICES[it.s] = { ...it, live }; });
    const html = items.map(({ s, p, ch }) => `<span class="ticker-item"><b>${s}</b>$${fmtPrice(p)} <span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(2)}%</span></span>`).join('');
    $('.ticker-track').innerHTML = html + html;
    const src = $('#tickerSrc'); src.textContent = live ? 'Live' : 'Demo'; src.classList.toggle('live', live);
    tickerLive = live;
    setSource();
  })();

  const ASSET = { BTC: ['bitcoin', 64000], ETH: ['ethereum', 3200], SOL: ['solana', 150] };
  const chart = { asset: 'BTC', days: 30, cache: {}, s: null, xy: [] };
  const CW = 600, CH = 220;
  const mulberry = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  async function series(asset, days) {
    const key = asset + days;
    if (chart.cache[key]) return chart.cache[key];
    let out;
    try {
      const d = await fetchJSON(`https://api.coingecko.com/api/v3/coins/${ASSET[asset][0]}/market_chart?vs_currency=usd&days=${days}`);
      let pts = d.prices;
      if (!pts || pts.length < 5) throw new Error('empty');
      const stepN = Math.max(1, Math.floor(pts.length / 140));
      pts = pts.filter((_, i) => i % stepN === 0 || i === pts.length - 1);
      out = { live: true, t: pts.map(p => p[0]), v: pts.map(p => p[1]) };
    } catch (e) {
      const rnd = mulberry([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
      const n = Math.min(140, days * 4 + 1), now = Date.now();
      let v = ASSET[asset][1] * (0.85 + rnd() * .2);
      const vals = [], ts = [];
      for (let i = 0; i < n; i++) { v *= 1 + (rnd() - .47) * .03; vals.push(v); ts.push(now - (n - 1 - i) * (days * 864e5 / (n - 1))); }
      out = { live: false, t: ts, v: vals };
    }
    if (out.live) chart.cache[key] = out; // simulated data is not cached, so the next view retries live
    return out;
  }

  const svg = $('.chart'), wrap = $('.chart-wrap'), dotEl = $('.chart-dot'), tip = $('.chart-tip');
  const clipRect = $('.chart-clip');
  $('.chart-grid').innerHTML = [1, 2, 3].map(k => `<line x1="0" x2="${CW}" y1="${(CH / 4) * k}" y2="${(CH / 4) * k}"/>`).join('');
  const readout = i => {
    const s = chart.s; if (!s) return;
    const i0 = Math.floor(i), i1 = Math.min(s.v.length - 1, i0 + 1), f = i - i0;
    const p = s.v[i0] + (s.v[i1] - s.v[i0]) * f;
    $('#chartPrice').textContent = fmtPrice(p);
    const pct = (p - s.v[0]) / s.v[0] * 100;
    const ch = $('#chartChange');
    ch.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    ch.classList.toggle('neg', pct < 0);
    return p;
  };
  const placeDot = i => {
    const xy = chart.xy; if (!xy.length) return [0, 0];
    const i0 = Math.floor(i), i1 = Math.min(xy.length - 1, i0 + 1), f = i - i0;
    const x = xy[i0][0] + (xy[i1][0] - xy[i0][0]) * f, y = xy[i0][1] + (xy[i1][1] - xy[i0][1]) * f;
    const px = x / CW * svg.clientWidth, py = y / CH * svg.clientHeight;
    dotEl.style.transform = `translate(${px}px, ${py}px)`;
    return [px, py, x];
  };
  function drawChart(s, animate) {
    chart.s = s;
    chartLive = s.live; setSource();
    const n = s.v.length, mn = Math.min(...s.v), mx = Math.max(...s.v), pad = (mx - mn) * .14 || 1;
    chart.xy = s.v.map((v, i) => [i / (n - 1) * CW, CH - (v - (mn - pad)) / ((mx + pad) - (mn - pad)) * CH]);
    const line = chart.xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    $('.chart-path').setAttribute('d', line);
    $('.chart-fill').setAttribute('d', `${line} L${CW} ${CH} L0 ${CH} Z`);
    if (animate && motion) {
      const o = { p: 0 };
      G.killTweensOf(clipRect); G.killTweensOf(chart);
      G.fromTo(clipRect, { attr: { width: 0 } }, { attr: { width: CW + 20 }, duration: 1.6, ease: 'power2.inOut' });
      G.to(o, { p: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { const idx = o.p * (n - 1); readout(idx); placeDot(idx); } });
    } else {
      clipRect.setAttribute('width', CW + 20);
      readout(n - 1); placeDot(n - 1);
    }
  }
  async function loadChart(animate = true) {
    wrap.style.opacity = '.45';
    const s = await series(chart.asset, chart.days);
    wrap.style.opacity = '';
    drawChart(s, animate);
  }
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    $$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b));
    if (b.dataset.asset) chart.asset = b.dataset.asset;
    if (b.dataset.days) chart.days = +b.dataset.days;
    loadChart(true);
    Ach.unlock('reader');
  }));
  let hoverReads = 0;
  wrap.addEventListener('pointermove', e => {
    const s = chart.s; if (!s) return;
    const r = svg.getBoundingClientRect();
    const idx = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (s.v.length - 1));
    const p = readout(idx);
    const [px, py, x] = placeDot(idx);
    $('.chart-x').setAttribute('x1', x); $('.chart-x').setAttribute('x2', x);
    $('b', tip).textContent = `$${fmtPrice(p)}`;
    const d = new Date(s.t[idx]);
    $('span', tip).textContent = d.toLocaleDateString('en-GB', chart.days <= 7 ? { weekday: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
    tip.style.left = `${clamp(px, 70, r.width - 70)}px`; tip.style.top = `${py}px`;
    wrap.classList.add('hovering');
    if (++hoverReads === 40) Ach.unlock('reader');
  });
  wrap.addEventListener('pointerleave', () => {
    wrap.classList.remove('hovering');
    if (chart.s) { readout(chart.s.v.length - 1); placeDot(chart.s.v.length - 1); }
  });
  addEventListener('resize', () => { if (chart.s) placeDot(chart.s.v.length - 1); });
  new IntersectionObserver((entries, io) => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); loadChart(true); }
  }, { rootMargin: '0px 0px -20% 0px' }).observe($('.chart-card'));

  /* =========================================================
     Wallet: drag tokens into the vault
     ========================================================= */
  const HEX_USD = 42.18;
  const tokenValues = [0.25, 1, 2.5, 5];
  const tokensEl = $('.tokens');
  tokenValues.forEach(val => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'token'; b.dataset.value = val; b.dataset.cursor = 'drag';
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', `Deposit ${val} HEX token`);
    b.innerHTML = `<img src="images/token.png" alt="" width="1024" height="1024" draggable="false"><span class="token-val">${val} HEX</span>`;
    tokensEl.appendChild(b);
  });
  const vault = $('#vault'), ledger = $('#ledger');
  const state = { balance: 0, tx: 0 }, shown = { balance: 0 };
  const emptyLedger = ledger.innerHTML;

  const toast = (val, h) => {
    const t = document.createElement('div');
    t.className = 'toast glass';
    t.innerHTML = `<b><span class="dot"></span>Transaction confirmed</b><span>+${val} HEX · ${short(h)}</span>`;
    $('.toasts').appendChild(t);
    if (motion) G.from(t, { y: 20, opacity: 0, duration: .4, ease: 'power3.out' });
    setTimeout(() => { if (motion) G.to(t, { opacity: 0, x: 30, duration: .3, onComplete: () => t.remove() }); else t.remove(); }, 3200);
  };
  const renderBalance = () => {
    const out = () => { $('#balance').textContent = fmt(shown.balance, 2); $('#balanceUsd').textContent = fmt(shown.balance * HEX_USD, 2); };
    if (motion) G.to(shown, { balance: state.balance, duration: .9, ease: 'power2.out', onUpdate: out });
    else { shown.balance = state.balance; out(); }
    $('#txCount').textContent = state.tx;
  };
  const addLedger = (val, h, label = '') => {
    const empty = $('.ledger-empty', ledger);
    if (empty) empty.remove();
    const li = document.createElement('li');
    li.innerHTML = `<span class="amt">+${val} HEX</span><code>${label ? `${label} · ` : ''}0x${h}</code><time>${new Date().toLocaleTimeString('en-GB')}</time>`;
    ledger.prepend(li);
    if (motion) G.from(li, { opacity: 0, x: -20, duration: .5, ease: 'power3.out' });
  };
  // Discoveries pay out into the vault
  Ach.onReward = (val, title) => {
    state.balance += val; state.tx += 1;
    renderBalance();
    addLedger(val, sha256(`reward|${title}|${Date.now()}`), `Reward: ${title}`);
  };
  const deposit = token => {
    if (token.classList.contains('spent')) return;
    const val = parseFloat(token.dataset.value);
    const finish = () => {
      token.classList.add('spent');
      state.balance += val; state.tx += 1;
      const h = sha256(`${Date.now()}|${val}|${state.tx}|${Math.random()}`);
      renderBalance();
      toast(val, h);
      addLedger(val, h);
      vault.classList.add('pop'); setTimeout(() => vault.classList.remove('pop'), 500);
      const img = $('.vault-img');
      FX.at(img, 80);
      if (motion) G.fromTo(vault, { rotation: -3 }, { rotation: 0, duration: .6, ease: 'elastic.out(1.2, .3)' });
      Sound.chime();
      if (!$$('.token:not(.spent)').length) setTimeout(() => Ach.unlock('hodl'), 700);
      const next = $$('.token:not(.spent)')[0];
      if (document.activeElement === token) (next || $('#resetWallet')).focus({ preventScroll: true });
    };
    if (motion) {
      const tr = token.getBoundingClientRect(), vr = $('.vault-img').getBoundingClientRect();
      const dx = vr.left + vr.width / 2 - (tr.left + tr.width / 2);
      const dy = vr.top + vr.height * .3 - (tr.top + tr.height / 2);
      G.to(token, { x: `+=${dx}`, y: `+=${dy}`, scale: .2, rotation: 120, opacity: 0, duration: .5, ease: 'power3.in', onComplete: finish });
    } else finish();
  };
  $('#resetWallet').addEventListener('click', () => {
    state.balance = 0; state.tx = 0;
    renderBalance();
    ledger.innerHTML = emptyLedger;
    $$('.token').forEach((t, i) => {
      t.classList.remove('spent');
      if (G) G.fromTo(t, { x: 0, y: 0, rotation: 0, scale: .4, opacity: 0 }, { scale: 1, opacity: 1, duration: motion ? .5 : 0, delay: motion ? i * .06 : 0, ease: 'back.out(2)' });
      else t.style.cssText = '';
    });
  });
  // Pointer drag: 5px dead zone, then pointer capture; tap or Enter deposits directly.
  $$('.token').forEach(token => {
    let sx = 0, sy = 0, dragging = false, moved = false, pid = null;
    const overVault = (x, y) => { const r = $('.vault-img').getBoundingClientRect(); return x > r.left && x < r.right && y > r.top - 40 && y < r.bottom; };
    token.addEventListener('pointerdown', e => {
      if (e.button !== 0 || token.classList.contains('spent')) return;
      pid = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false; dragging = false;
    });
    token.addEventListener('pointermove', e => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 5) return;
        dragging = moved = true;
        token.setPointerCapture(pid);
        token.classList.add('dragging');
        if (G) G.killTweensOf(token);
      }
      if (G) G.set(token, { x: dx, y: dy, rotation: clamp(dx * .05, -25, 25), scale: 1.1 });
      else token.style.transform = `translate(${dx}px, ${dy}px)`;
      vault.classList.toggle('over', overVault(e.clientX, e.clientY));
    });
    const end = e => {
      if (pid !== e.pointerId) return;
      pid = null;
      if (!dragging) return;
      dragging = false;
      token.classList.remove('dragging');
      const hit = overVault(e.clientX, e.clientY);
      vault.classList.remove('over');
      if (hit && e.type === 'pointerup') deposit(token);
      else if (G) G.to(token, { x: 0, y: 0, rotation: 0, scale: 1, duration: .8, ease: 'elastic.out(1, .45)' });
      else token.style.transform = '';
    };
    token.addEventListener('pointerup', end);
    token.addEventListener('pointercancel', end);
    token.addEventListener('click', () => { if (!moved) deposit(token); moved = false; });
  });

  /* =========================================================
     Text splitting (headings + CTA letters)
     ========================================================= */
  $$('h2.split').forEach(h => {
    h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="w"><span class="wi">${w}</span></span>`).join(' ');
  });
  const ctaTitle = $('.cta-title');
  ctaTitle.innerHTML = [...ctaTitle.textContent].map(ch => (ch === ' ' ? ' ' : `<span class="ch" aria-hidden="true">${ch}</span>`)).join('');
  const chars = $$('.ch', ctaTitle);

  /* =========================================================
     Pointer polish (mouse only)
     ========================================================= */
  if (finePointer && G) {
    // Cursor ring with contextual labels
    const cur = $('.cursor'), label = $('.cursor-label');
    const cx = G.quickTo(cur, 'x', { duration: .22, ease: 'power3' });
    const cy = G.quickTo(cur, 'y', { duration: .22, ease: 'power3' });
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; cur.classList.add('on'); cx(e.clientX); cy(e.clientY); });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
    document.addEventListener('pointerover', e => {
      const lab = e.target.closest('[data-cursor]');
      const btn = !lab && e.target.closest('a, button, textarea, .holo');
      cur.classList.toggle('labeled', !!lab);
      cur.classList.toggle('hover', !!btn);
      if (lab) label.textContent = lab.dataset.cursor;
    });

    // Hero cube tilts toward the cursor
    const cube = $('.hero-cube');
    const rx = G.quickTo(cube, 'rotationX', { duration: .9, ease: 'power3' });
    const ry = G.quickTo(cube, 'rotationY', { duration: .9, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => { ry((e.clientX / innerWidth - .5) * 26); rx(-(e.clientY / innerHeight - .5) * 20); });
    $('.hero').addEventListener('pointerleave', () => { rx(0); ry(0); });

    // Holographic tilt cards
    $$('.holo, .holo-pass').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`); card.style.setProperty('--my', `${py * 100}%`);
        G.to(card, { rotationY: (px - .5) * 16, rotationX: (.5 - py) * 12, transformPerspective: 1100, duration: .4, ease: 'power2.out' });
      });
      card.addEventListener('pointerleave', () => G.to(card, { rotationX: 0, rotationY: 0, duration: .9, ease: 'elastic.out(1, .5)' }));
    });

    // Magnetic buttons
    $$('.magnetic').forEach(btn => {
      const inner = $('span', btn);
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
        G.to(btn, { x: dx * .3, y: dy * .4, duration: .5, ease: 'power3' });
        G.to(inner, { x: dx * .15, y: dy * .2, duration: .5, ease: 'power3' });
      });
      btn.addEventListener('pointerleave', () => G.to([btn, inner], { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
    });

    // CTA letters gain weight and colour near the cursor
    const cta = $('.cta');
    cta.addEventListener('pointermove', e => {
      chars.forEach(ch => {
        const r = ch.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        ch.style.setProperty('--k', Math.pow(clamp(1 - d / 300, 0, 1), 1.4).toFixed(3));
      });
    });
    cta.addEventListener('pointerleave', () => chars.forEach(ch => ch.style.setProperty('--k', 0)));
  }

  /* =========================================================
     Scroll: Lenis on the GSAP ticker + scenes
     ========================================================= */
  let lenis = null, intro = null;
  const scenes = $$('.scene');
  const railBlocks = $$('.rail-blocks i');
  const navLinks = $$('.nav-links a');
  const activate = idx => {
    const s = scenes[idx];
    Field.set(s.dataset.shape, s.dataset.anchor);
    railBlocks.forEach((b, i) => b.classList.toggle('on', i <= idx));
    $('#railCount').textContent = idx + 1;
    navLinks.forEach(a => a.classList.toggle('active', s.id && a.getAttribute('href') === `#${s.id}`));
  };
  activate(0);

  if (motion) {
    if (window.Lenis) {
      lenis = new Lenis({ autoRaf: false, lerp: .1 });
      window.lenis = lenis;
      lenis.on('scroll', ST.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    }

    const mm = G.matchMedia();

    // Roadmap pin first, so later triggers account for its spacing.
    const milestones = $$('.milestone'), roadFill = $('.road-line span');
    mm.add('(min-width: 901px)', () => {
      const list = $('.milestones');
      const dist = () => Math.max(0, list.scrollWidth - list.parentElement.clientWidth + 40);
      const light = () => { const mid = innerWidth * .62; milestones.forEach(m => m.classList.toggle('lit', m.getBoundingClientRect().left < mid)); };
      G.to(list, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.roadmap', start: 'top top', end: () => `+=${dist() + innerHeight * .6}`,
          pin: true, scrub: .6, invalidateOnRefresh: true,
          onUpdate: self => { roadFill.style.width = `${self.progress * 100}%`; light(); },
        },
      });
      light();
      return () => { roadFill.style.width = ''; };
    });
    mm.add('(max-width: 900px)', () => {
      G.fromTo(roadFill, { height: '0%' }, { height: '100%', ease: 'none', scrollTrigger: { trigger: '.road-track', start: 'top 70%', end: 'bottom 60%', scrub: true } });
      milestones.forEach(m => ST.create({ trigger: m, start: 'top 72%', end: 'max', onToggle: s => m.classList.toggle('lit', s.isActive) }));
      return () => { roadFill.style.height = ''; };
    });

    // Scene switching (particle shape, rail, nav): the last scene whose top has crossed 55% of the viewport.
    // Measured from live rects so pinned sections are handled correctly.
    let activeIdx = 0;
    const pickScene = () => {
      const line = innerHeight * .55;
      let idx = 0;
      scenes.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) idx = i; });
      if (idx !== activeIdx) { activeIdx = idx; activate(idx); }
    };
    addEventListener('scroll', pickScene, { passive: true });
    addEventListener('resize', pickScene);

    // Progress bar
    G.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

    // Rotating hero slogans: letters roll out of a clipped line and the next slogan rolls in
    const SLOGANS = [
      { tag: 'Block 0 · Genesis', a: 'Value,', b: 'made visible.' },
      { tag: 'Block 1 · Trust', a: 'Trust,', b: 'written in code.' },
      { tag: 'Block 2 · Proof', a: 'Every block,', b: 'a promise kept.' },
      { tag: 'Block 3 · Freedom', a: 'No middlemen.', b: 'Just maths.' },
    ];
    const Slogans = (() => {
      const title = $('.hero-title'), l1 = $('.l1', title), l2 = $('.l2', title);
      const tag = $('#sloganTag'), count = $('#sloganCount'), meter = $('.slogan-meter i');
      const HOLD = 4.2;
      const IN = { yPercent: 0, rotationX: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'expo.out', stagger: .032 };
      const OUT = { yPercent: -120, rotationX: 80, opacity: 0, filter: 'blur(8px)', duration: .55, ease: 'power3.in', stagger: .018 };
      const FROM = { yPercent: 120, rotationX: -80, opacity: 0, filter: 'blur(8px)' };
      let i = 0, meterTw = null, visible = true, started = false;
      const split = (el, text) => { el.innerHTML = [...text].map(c => `<span class="c">${c}</span>`).join(''); return $$('.c', el); };
      const show = () => {
        const s = SLOGANS[i];
        title.setAttribute('aria-label', `${s.a} ${s.b}`);
        tag.textContent = s.tag;
        count.textContent = `0${i + 1} / 0${SLOGANS.length}`;
        const tl = G.timeline();
        tl.fromTo(split(l1, s.a), FROM, IN)
          .fromTo(split(l2, s.b), FROM, IN, .14)
          .fromTo(tag, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, .1);
        return tl;
      };
      const hide = () => G.timeline()
        .to($$('.c', l1), OUT)
        .to($$('.c', l2), OUT, .08)
        .to(tag, { opacity: 0, y: -8, duration: .3, ease: 'power2.in' }, 0);
      const loop = () => {
        meterTw = G.fromTo(meter, { scaleX: 0 }, {
          scaleX: 1, duration: HOLD, ease: 'none', paused: !visible || document.hidden,
          onComplete: () => hide().eventCallback('onComplete', () => { i = (i + 1) % SLOGANS.length; show(); loop(); }),
        });
      };
      const sync = () => { if (meterTw) { if (visible && !document.hidden) meterTw.resume(); else meterTw.pause(); } };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: .2 }).observe(title);
      document.addEventListener('visibilitychange', sync);
      return { start() { if (started) return; started = true; show(); loop(); } };
    })();

    // Hero intro (played when the loader lifts)
    intro = G.timeline({ paused: true });
    intro.from('.slogan-meter, .slogan-count', { y: 20, opacity: 0, duration: .8, ease: 'power3.out' })
      .from('.hero-visual', { scale: .8, opacity: 0, duration: 1.6, ease: 'expo.out' }, 0)
      .from('.hero-sub, .hero-actions, .hero-stats', { y: 26, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out' }, .5)
      .from('.live-card', { x: 30, opacity: 0, duration: .9, ease: 'power3.out' }, .9)
      .from('.nav', { y: -30, opacity: 0, duration: .9, ease: 'power3.out' }, .2)
      .add(() => {
        Slogans.start();
        $$('.count').forEach(el => {
          const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), o = { v: 0 };
          G.to(o, { v: to, duration: 2, delay: .3, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v, dec); } });
        });
      }, 0);
    G.to('.hero-visual', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    G.to('.hero-copy', { yPercent: -10, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true } });

    // Heading word reveals + section content
    $$('h2.split').forEach(h => G.from($$('.wi', h), { yPercent: 115, rotation: 4, duration: 1.1, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
    $$('.section-head .eyebrow, .section-head .lead, .src-note, .lab-side').forEach(el => G.from(el, { y: 24, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
    G.from('.lblock', { y: 80, opacity: 0, rotationX: -20, transformPerspective: 900, duration: 1.1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.lab-blocks', start: 'top 82%' } });
    G.from('.pillar', { y: 90, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.pillar-grid', start: 'top 82%' } });
    G.from('.chart-card', { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.chart-card', start: 'top 85%' } });
    G.from('.token', { scale: 0, opacity: 0, duration: .9, stagger: .08, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.wallet-stage', start: 'top 75%' } });
    G.from('.vault', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.wallet-stage', start: 'top 75%' } });
    G.from('.ledger', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.ledger', start: 'top 92%' } });
    G.from('.id-step', { y: 50, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.id-steps', start: 'top 85%' } });
    G.from('.id-right', { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.id-right', start: 'top 85%' } });
    G.from(chars, { yPercent: 100, opacity: 0, duration: 1.2, stagger: .035, ease: 'expo.out', scrollTrigger: { trigger: '.cta-title', start: 'top 85%' } });
    G.from('.cta-sub, .cta .btn', { y: 30, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '.cta-title', start: 'top 80%' } });

    // Velocity-reactive outline bands
    const bands = $$('.band-track').map((el, i) => {
      el.innerHTML += el.innerHTML;
      return { el, x: 0, dir: i % 2 ? 1 : -1, skew: 0 };
    });
    let scrollDir = 1;
    G.ticker.add(() => {
      const v = lenis ? lenis.velocity : 0;
      if (v > .5) scrollDir = 1; else if (v < -.5) scrollDir = -1;
      bands.forEach(b => {
        const w = b.el.scrollWidth / 2;
        b.x += b.dir * scrollDir * (.7 + Math.min(Math.abs(v), 60) * .35);
        if (b.x <= -w) b.x += w; else if (b.x > 0) b.x -= w;
        b.skew += (clamp(v * .35, -14, 14) - b.skew) * .1;
        b.el.style.transform = `translate3d(${b.x}px,0,0) skewX(${-b.skew}deg)`;
      });
    });

    ST.sort();
  }

  /* =========================================================
     Warp: in-page navigation as a jump through the chain.
     Blocks flip in from the click point, hyperspace streaks rush past,
     the page jumps while covered, then blocks fall away from the centre.
     ========================================================= */
  const Warp = (() => {
    const root = $('.warp'), grid = $('.warp-grid'), cv = $('.warp-canvas'), c2 = cv.getContext('2d');
    const labelEl = $('.warp-label'), titleEl = $('.warp-title'), numEl = $('.warp-num'), hashEl = $('.warp-hash');
    let cells = [], cols = 0, rows = 0, busy = false;
    const build = () => {
      const size = innerWidth < 640 ? 78 : 96;
      cols = Math.ceil(innerWidth / size); rows = Math.ceil(innerHeight / size);
      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      grid.innerHTML = '<div class="warp-cell"></div>'.repeat(cols * rows);
      cells = $$('.warp-cell', grid);
    };
    build();
    addEventListener('resize', () => { if (!busy) build(); });

    // Hyperspace streaks
    let stars = [], streaking = false, speed = 0, W = 0, H = 0;
    const prep = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const maxR = Math.hypot(W, H) / 2;
      stars = Array.from({ length: W < 640 ? 140 : 280 }, () => ({
        a: Math.random() * Math.PI * 2, r: rand(10, maxR), v: rand(.5, 1.6), w: rand(.6, 2),
        c: Math.random() < .78 ? '60,255,180' : '233,255,246',
      }));
    };
    const streak = () => {
      if (!streaking) return;
      c2.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, maxR = Math.hypot(W, H) / 2;
      for (const s of stars) {
        s.r += s.v * speed;
        if (s.r > maxR) { s.r = rand(4, 50); continue; }
        const len = Math.min(s.r * .6, speed * s.v * 6 + 3);
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        c2.strokeStyle = `rgba(${s.c},${Math.min(1, (s.r / maxR) * 1.8)})`;
        c2.lineWidth = s.w * (.6 + s.r / maxR);
        c2.beginPath();
        c2.moveTo(cx + ca * (s.r - len), cy + sa * (s.r - len));
        c2.lineTo(cx + ca * s.r, cy + sa * s.r);
        c2.stroke();
      }
      requestAnimationFrame(streak);
    };

    const scrollNow = target => {
      const margin = target === 0 ? 0 : parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true, offset: -margin });
      else if (target === 0) scrollTo(0, 0);
      else target.scrollIntoView();
      if (ST) ST.update();
    };

    const go = (target, origin) => {
      const scene = target === 0 ? scenes[0] : (target.closest('.scene') || target);
      if (!motion) { scrollNow(target); return; }
      if (busy) return;
      busy = true;
      setTimeout(() => Ach.unlock('warp'), 1700);
      prep();
      const idx = scenes.indexOf(scene);
      titleEl.textContent = scene.dataset.name || 'Next block';
      numEl.textContent = `block ${String(idx <= 0 ? 0 : idx + 1).padStart(2, '0')}`;
      const h = mineHeroBlock();
      hashEl.innerHTML = `nonce found · 0x<em>${h.slice(0, 3)}</em>${h.slice(3, 22)}…`;
      const oc = clamp(Math.floor(origin[0] / innerWidth * cols), 0, cols - 1);
      const orow = clamp(Math.floor(origin[1] / innerHeight * rows), 0, rows - 1);
      const from = orow * cols + oc;
      const parts = [...scene.children].filter(el => !el.matches('.hero-grid, .roadmap-bg, .cta-bg, .toasts'));

      root.classList.add('on');
      if (lenis) lenis.stop();
      Sound.whoosh();

      G.timeline({
        onComplete: () => {
          root.classList.remove('on'); streaking = false; busy = false;
          c2.clearRect(0, 0, W, H);
          G.set(cells, { clearProps: 'all' });
          G.set(parts, { clearProps: 'filter' });
        },
      })
        // 1. blocks flip in, rippling out from the click
        .fromTo(cells, { opacity: 0, scale: .2, rotationY: -100, rotationX: 30 },
          { opacity: 1, scale: 1.02, rotationY: 0, rotationX: 0, duration: .5, ease: 'power3.out', stagger: { grid: [rows, cols], from, amount: .38 } })
        // 2. hyperspace
        .add(() => { streaking = true; speed = 1; streak(); }, .28)
        .to(cv, { opacity: 1, duration: .3 }, .28)
        .to({ p: 0 }, { p: 1, duration: 1, ease: 'power2.in', onUpdate() { speed = 1 + this.targets()[0].p * 55; } }, .28)
        .fromTo(labelEl, { opacity: 0, scale: .86, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .45, ease: 'expo.out' }, .42)
        // 3. jump while covered
        .add(() => scrollNow(target), .8)
        // 4. punch through
        .to(labelEl, { opacity: 0, scale: 1.25, filter: 'blur(14px)', duration: .35, ease: 'power2.in' }, 1.1)
        .to(cv, { opacity: 0, duration: .3 }, 1.2)
        .to(cells, { opacity: 0, scale: .2, rotationY: 100, rotationX: -30, duration: .5, ease: 'power3.in', stagger: { grid: [rows, cols], from: 'center', amount: .32 } }, 1.2)
        .add(() => { if (lenis) lenis.start(); }, 1.3)
        .fromTo(parts, { scale: 1.1, filter: 'blur(10px)' }, { scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: .05 }, 1.3);
    };
    return { go };
  })();

  // In-page links warp instead of scrolling
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    const target = href === '#top' ? 0 : $(href);
    if (target === null) return;
    e.preventDefault();
    const origin = e.detail === 0 ? [innerWidth / 2, innerHeight / 2] : [e.clientX, e.clientY];
    Warp.go(target, origin);
    if (target !== 0 && e.detail === 0) setTimeout(() => target.focus?.({ preventScroll: true }), 1400);
  }));

  /* =========================================================
     Identity: real ECDSA P-256 keys, signatures, and a Genesis Pass
     drawn on a canvas (procedural only, so it never taints and can export)
     ========================================================= */
  const Identity = (() => {
    const toHex = u8 => [...u8].map(b => b.toString(16).padStart(2, '0')).join('');
    const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
    const canCrypto = !!(window.crypto && crypto.subtle && window.isSecureContext !== false);
    const cv = $('#passCanvas'), x = cv.getContext('2d'), PW = 1080, PH = 1350;
    const els = {
      gen: $('#genKeys'), sign: $('#signMsg'), msg: $('#idMsg'), addr: $('#idAddress'), pub: $('#idPub'), priv: $('#idPriv'),
      reveal: $('#revealPriv'), sig: $('#idSig'), verify: $('#idVerify'), dl: $('#downloadPass'), share: $('#sharePass'), wrap: $('#passWrap'),
    };
    const st = { kp: null, pubHex: '', privHex: '', address: '', sig: null, sigHex: '', signedMsg: '', minted: false, revealed: false, valid: false };
    const PALS = [['#3CFFB4', '#9C8CFF'], ['#3CFFB4', '#5CC8FF'], ['#9C8CFF', '#3CFFB4'], ['#5CC8FF', '#9C8CFF'], ['#3CFFB4', '#E9FFF6']];
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    const hexPath = (cx, cy, r, rot = Math.PI / 6) => {
      x.beginPath();
      for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      x.closePath();
    };
    const rr = (X, Y, w, h, r) => {
      x.beginPath(); x.moveTo(X + r, Y);
      x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
      x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
    };

    function drawPass(seed, minted) {
      const h = sha256(seed), bytes = (h + sha256(h)).match(/../g).map(b => parseInt(b, 16));
      const bit = k => (bytes[k >> 3] >> (k & 7)) & 1;
      const [c1, c2] = minted ? PALS[bytes[0] % PALS.length] : ['#59626C', '#3A4048'];
      x.fillStyle = '#07080B'; x.fillRect(0, 0, PW, PH);
      let g = x.createRadialGradient(180, 140, 0, 180, 140, 950);
      g.addColorStop(0, hexA(c1, .26)); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
      g = x.createRadialGradient(PW - 120, PH - 180, 0, PW - 120, PH - 180, 950);
      g.addColorStop(0, hexA(c2, .22)); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
      x.strokeStyle = 'rgba(255,255,255,.045)'; x.lineWidth = 1;
      for (let i = 60; i < PW; i += 60) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, PH); x.stroke(); }
      for (let j = 60; j < PH; j += 60) { x.beginPath(); x.moveTo(0, j); x.lineTo(PW, j); x.stroke(); }
      rr(36, 36, PW - 72, PH - 72, 44); x.strokeStyle = hexA(c1, .55); x.lineWidth = 2; x.stroke();

      x.font = '500 32px "JetBrains Mono", monospace'; x.fillStyle = '#E9EEF2'; x.textAlign = 'left';
      x.fillText('LEDGER/LIGHT', 96, 132);
      x.fillStyle = c1; x.textAlign = 'right';
      x.fillText(minted ? `GENESIS PASS #${String(parseInt(h.slice(0, 6), 16) % 10000).padStart(4, '0')}` : 'GENESIS PASS · UNMINTED', PW - 96, 132);

      // Identicon: a mirrored hex grid inside a glowing hexagon, every cell decided by the key's hash
      const cx = PW / 2, cy = 560, size = 38;
      hexPath(cx, cy, 340); x.strokeStyle = hexA(c1, .8); x.lineWidth = 3; x.shadowColor = c1; x.shadowBlur = minted ? 40 : 0; x.stroke(); x.shadowBlur = 0;
      hexPath(cx, cy, 318); x.strokeStyle = hexA(c1, .18); x.lineWidth = 1.5; x.stroke();
      for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
        if (Math.abs(q + r) > 4) continue;
        const key = Math.abs(2 * q + r) * 9 + (r + 4); // same key for mirrored cells → symmetric art
        const px = cx + size * Math.sqrt(3) * (q + r / 2), py = cy + size * 1.5 * r;
        hexPath(px, py, size * .86);
        if (bit(key)) {
          x.fillStyle = key % 3 === 0 ? c2 : c1; x.globalAlpha = minted ? .92 : .3;
          x.shadowColor = x.fillStyle; x.shadowBlur = minted ? 18 : 0; x.fill(); x.shadowBlur = 0; x.globalAlpha = 1;
        } else { x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = 1.5; x.stroke(); }
      }

      x.textAlign = 'center';
      x.font = '600 68px "Space Grotesk", sans-serif'; x.fillStyle = '#E9EEF2';
      x.fillText(minted ? `${st.address.slice(0, 8)}…${st.address.slice(-6)}` : 'Unminted pass', cx, 1000);
      x.font = '400 24px "JetBrains Mono", monospace'; x.fillStyle = '#8A949E';
      x.fillText(minted ? 'ECDSA P-256 · SHA-256 · minted on-device' : 'Generate a keypair to mint yours', cx, 1046);
      if (minted && st.sigHex) {
        const m = st.signedMsg.length > 46 ? `${st.signedMsg.slice(0, 45)}…` : st.signedMsg;
        x.font = 'italic 400 30px "Space Grotesk", sans-serif'; x.fillStyle = '#E9EEF2';
        x.fillText(`“${m}”`, cx, 1104);
        x.font = '400 22px "JetBrains Mono", monospace'; x.fillStyle = c1;
        x.fillText(`signed · ${st.sigHex.slice(0, 20)}…${st.sigHex.slice(-8)}`, cx, 1142);
      }
      let bx = 96;
      for (let i = 0; bx < PW - 100; i++) {
        const w = (bytes[i % 64] % 4) + 2;
        if (i % 2 === 0) { x.fillStyle = hexA(i % 7 ? '#E9EEF2' : c1, minted ? .75 : .25); x.fillRect(bx, 1176, w, 54); }
        bx += w + 3;
      }
      x.font = '400 22px "JetBrains Mono", monospace'; x.fillStyle = '#8A949E';
      x.textAlign = 'left';
      x.fillText(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), 96, PH - 84);
      x.textAlign = 'right';
      x.fillText(`BLOCK #${fmt(height)}`, PW - 96, PH - 84);
    }
    const redraw = () => drawPass(st.minted ? st.pubHex : 'ledger-light-unminted', st.minted);
    const setVerify = (cls, text) => { els.verify.className = `id-verify mono ${cls}`; els.verify.lastElementChild.textContent = text; };
    const shareable = () => {
      try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'])], 'x.png', { type: 'image/png' })] })); }
      catch (e) { return false; }
    };

    async function generate() {
      if (!canCrypto) { setVerify('bad', 'Key generation needs https or a local file'); return; }
      els.gen.disabled = true; $('span', els.gen).textContent = 'Generating…';
      const kpPromise = crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      if (motion) { // a second of visible "entropy" while the real key is made
        const t0 = performance.now();
        await new Promise(res => {
          const step = () => {
            const r = Math.random().toString(36);
            els.pub.textContent = `${sha256(r).slice(0, 24)}…${sha256(r + 1).slice(0, 12)}`;
            els.addr.textContent = `0x${sha256(r + 2).slice(0, 40)}`;
            drawPass(r, false);
            if (performance.now() - t0 < 1000) requestAnimationFrame(step); else res();
          };
          step();
        });
      }
      const kp = await kpPromise;
      const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
      const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
      Object.assign(st, { kp, pubHex: toHex(raw), privHex: toHex(b64u(jwk.d)), sig: null, sigHex: '', signedMsg: '', minted: true, revealed: false, valid: false });
      st.address = `0x${sha256(st.pubHex).slice(-40)}`;
      els.addr.textContent = st.address;
      els.pub.textContent = `${st.pubHex.slice(0, 24)}…${st.pubHex.slice(-12)}`; els.pub.title = st.pubHex;
      els.priv.textContent = `${'•'.repeat(20)} stays in this tab`;
      els.reveal.hidden = false; els.reveal.textContent = 'reveal';
      els.sig.textContent = '—';
      els.sign.disabled = false; els.dl.disabled = false;
      if (shareable()) els.share.hidden = false;
      $('span', els.gen).textContent = 'Regenerate'; els.gen.disabled = false;
      setVerify('', 'Keys ready · now sign your message');
      redraw();
      els.wrap.classList.add('minted');
      if (motion) G.fromTo(els.wrap, { scale: .9, rotationY: -30, transformPerspective: 1100 }, { scale: 1, rotationY: 0, duration: 1.4, ease: 'elastic.out(1, .6)' });
      FX.at(els.wrap, 100);
      Sound.found();
      Ach.unlock('keys');
    }
    async function verify() {
      if (!st.sig) return false;
      const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, st.kp.publicKey, st.sig, enc.encode(els.msg.value));
      if (ok) setVerify('ok', 'Signature valid · verified with your public key');
      else setVerify('bad', 'Invalid · the message changed after signing');
      if (st.valid && !ok) Sound.error();
      st.valid = ok;
      return ok;
    }
    async function sign() {
      if (!st.kp) return;
      const msg = els.msg.value;
      const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, st.kp.privateKey, enc.encode(msg)));
      Object.assign(st, { sig, sigHex: toHex(sig), signedMsg: msg });
      els.sig.textContent = `${st.sigHex.slice(0, 32)}…${st.sigHex.slice(-12)}`; els.sig.title = st.sigHex;
      await verify();
      redraw();
      Sound.chime();
      FX.at(els.verify, 30);
    }
    const toBlob = () => new Promise(res => cv.toBlob(res, 'image/png'));

    els.gen.addEventListener('click', generate);
    els.sign.addEventListener('click', sign);
    els.msg.addEventListener('input', () => { if (st.sig) verify(); });
    els.reveal.addEventListener('click', () => {
      st.revealed = !st.revealed;
      els.priv.textContent = st.revealed ? st.privHex : `${'•'.repeat(20)} stays in this tab`;
      els.reveal.textContent = st.revealed ? 'hide · never share this' : 'reveal';
    });
    els.dl.addEventListener('click', async () => {
      const blob = await toBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `genesis-pass-${st.address.slice(2, 8) || 'unminted'}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      Ach.unlock('pass');
    });
    els.share.addEventListener('click', async () => {
      try {
        const file = new File([await toBlob()], 'genesis-pass.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'My Genesis Pass', text: `Minted on-device · ${st.address}` });
        Ach.unlock('pass');
      } catch (e) { /* share cancelled */ }
    });
    redraw();
    document.fonts?.ready.then(redraw);
    return { get address() { return st.address; }, generate };
  })();

  /* =========================================================
     Hash rain (secret): type "satoshi" anywhere, or run `matrix`
     ========================================================= */
  const Rain = (() => {
    let cv = null, x = null, cols = [], running = false, stopT = null, fadeT = null, W = 0, H = 0;
    const FS = 16, CH = '0123456789abcdef';
    const frame = () => {
      if (!running) return;
      x.fillStyle = 'rgba(7,8,11,.14)'; x.fillRect(0, 0, W, H);
      x.font = `500 ${FS}px "JetBrains Mono", monospace`;
      for (let i = 0; i < cols.length; i++) {
        const y = cols[i];
        x.fillStyle = '#E9FFF6'; x.fillText(CH[(Math.random() * 16) | 0], i * FS, y * FS);
        x.fillStyle = 'rgba(60,255,180,.8)'; x.fillText(CH[(Math.random() * 16) | 0], i * FS, (y - 1) * FS);
        cols[i] = y * FS > H && Math.random() > .97 ? 0 : y + 1;
      }
      setTimeout(() => requestAnimationFrame(frame), 40);
    };
    const stop = () => {
      clearTimeout(stopT);
      if (!cv) return;
      cv.style.opacity = '0';
      fadeT = setTimeout(() => { running = false; x.clearRect(0, 0, W, H); }, 1000);
    };
    const start = () => {
      Ach.unlock('matrix');
      if (reduce) return;
      clearTimeout(stopT); clearTimeout(fadeT);
      if (!cv) { cv = document.createElement('canvas'); cv.className = 'rain'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); x = cv.getContext('2d'); }
      if (!running) {
        W = cv.width = innerWidth; H = cv.height = innerHeight;
        cols = Array.from({ length: Math.ceil(W / FS) }, () => (Math.random() * -50) | 0);
        running = true; frame(); Sound.whoosh();
      }
      cv.style.opacity = '1';
      stopT = setTimeout(stop, 9000);
    };
    return { start, stop, toggle: () => (running && cv.style.opacity !== '0' ? stop() : start()) };
  })();
  let keyBuf = '';
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key.length !== 1) return;
    keyBuf = (keyBuf + e.key.toLowerCase()).slice(-7);
    if (keyBuf === 'satoshi') { keyBuf = ''; Rain.start(); }
  });

  /* =========================================================
     Big bang: click the genesis cube to blow it apart
     ========================================================= */
  let exploding = false;
  function explodeCube() {
    const cube = $('.hero-cube');
    if (exploding || !cube) return;
    exploding = true;
    Ach.unlock('bigbang');
    Sound.boom();
    FX.at(cube, 170, ['#3CFFB4', '#E9FFF6', '#9C8CFF', '#5CC8FF']);
    Field.explode(5);
    if (!motion) { exploding = false; return; }
    G.timeline({ onComplete: () => { exploding = false; G.set(cube, { clearProps: 'filter' }); G.set('.hero', { clearProps: 'transform' }); } })
      .to(cube, { scale: 1.35, opacity: 0, filter: 'blur(16px) brightness(2.2)', duration: .3, ease: 'power2.out' })
      .fromTo('.hero', { x: -12 }, { x: 0, duration: .7, ease: 'elastic.out(1.2, .2)' }, 0)
      .fromTo(cube, { scale: .2, opacity: 0, filter: 'blur(12px) brightness(2.5)' },
        { scale: 1, opacity: 1, filter: 'blur(0px) brightness(1)', duration: 1.6, ease: 'elastic.out(1, .5)' }, 1.5);
  }
  $('.hero-cube').addEventListener('click', explodeCube);
  $('.hero-cube').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); explodeCube(); } });

  /* =========================================================
     Chain console: Ctrl/Cmd+K, the ` key, or the ›_ button
     ========================================================= */
  const Console = (() => {
    const root = $('#console'), out = $('#consoleOut'), form = $('#consoleForm'), input = $('#consoleInput');
    const hist = [];
    let hi = 0, open = false, busy = false, lastFocus = null;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const print = (html, cls = '') => {
      const p = document.createElement('p');
      if (cls) p.className = cls;
      p.innerHTML = html;
      out.appendChild(p); out.scrollTop = out.scrollHeight;
      return p;
    };
    const SECTIONS = { top: 0, home: 0, chain: '#chain', lab: '#chain', pillars: '#pillars', market: '#market', wallet: '#wallet', identity: '#identity', roadmap: '#roadmap', join: '.cta' };
    const jump = sel => { close(); setTimeout(() => Warp.go(sel === 0 ? 0 : $(sel), [innerWidth / 2, innerHeight / 2]), 200); };
    const pow = (data, prefix, perFrame, onStep) => new Promise(res => {
      let n = 0;
      const run = () => {
        let h = '';
        for (let k = 0; k < perFrame; k++, n++) {
          h = sha256(`${data}|${n}`);
          if (h.startsWith(prefix)) { onStep(n, h, true); return res({ n, h }); }
        }
        onStep(n, h, false);
        requestAnimationFrame(run);
      };
      run();
    });

    const CMDS = {
      help() {
        print('<span class="hl">commands</span>');
        [['mine [n]', 'mine n real blocks at difficulty 0000'], ['hash <text>', 'SHA-256 of any text'], ['goto <section>', 'warp: chain pillars market wallet identity roadmap top'],
          ['price [btc|eth|sol…]', 'latest price from the ticker'], ['balance', 'your vault balance'], ['keys', 'show your address, or go make one'],
          ['tamper', 'break the chain lab'], ['explode', 'detonate the genesis block'], ['sound [on|off]', 'toggle sound'],
          ['discoveries', 'your progress'], ['clear', 'clear the screen'], ['exit', 'close the console']]
          .forEach(([c, d]) => print(`  <em>${c.padEnd(22)}</em><span class="dim">${d}</span>`));
        print('<span class="dim">  …and a couple you have to find yourself.</span>');
      },
      async mine(n) {
        const count = clamp(parseInt(n, 10) || 1, 1, 5);
        for (let k = 0; k < count; k++) {
          const hgt = height + 1, t0 = performance.now();
          const line = print(`<span class="dim">mining block #${fmt(hgt)} · target 0000…</span>`);
          const { n: nonce, h } = await pow(`${hgt}|${Math.random()}`, '0000', 2500, (nn, hh, ok) => {
            if (!ok) line.innerHTML = `<span class="dim">mining #${fmt(hgt)} · nonce ${fmt(nn)} · ${hh.slice(0, 20)}…</span>`;
          });
          line.innerHTML = `<span class="ok">✓ block #${fmt(hgt)}</span> nonce <span class="hl">${fmt(nonce)}</span> · 0x<em>${h.slice(0, 4)}</em>${h.slice(4, 26)}… <span class="dim">${Math.round(performance.now() - t0)} ms</span>`;
          height = hgt; showLive(h);
          Sound.found();
        }
        Ach.unlock('miner');
      },
      hash(...w) {
        const t = w.join(' ');
        if (!t) return print('usage: hash &lt;text&gt;', 'err');
        print(`<span class="dim">sha256("${esc(t)}")</span>`);
        print(sha256(t), 'ok');
      },
      goto(s) {
        const k = (s || '').toLowerCase();
        if (!(k in SECTIONS)) return print(`unknown section "${esc(s || '')}". try: ${Object.keys(SECTIONS).join(', ')}`, 'err');
        print(`warping to ${k}…`, 'ok'); jump(SECTIONS[k]);
      },
      ls() { print(Object.keys(SECTIONS).join('  ')); },
      price(s) {
        const k = (s || 'btc').toUpperCase(), p = PRICES[k];
        if (!p) return print(Object.keys(PRICES).length ? `no price for ${esc(k)}. try: ${Object.keys(PRICES).join(', ').toLowerCase()}` : 'prices still loading…', 'err');
        print(`${k}  $${fmtPrice(p.p)}  <span class="${p.ch >= 0 ? 'ok' : 'err'}">${p.ch >= 0 ? '▲' : '▼'} ${Math.abs(p.ch).toFixed(2)}%</span>  <span class="dim">${p.live ? 'live · CoinGecko' : 'demo data'}</span>`);
      },
      balance() { print(`${fmt(state.balance, 2)} HEX  <span class="dim">≈ $${fmt(state.balance * HEX_USD, 2)} · ${state.tx} tx</span>`); },
      keys() {
        if (Identity.address) print(`address <em>${Identity.address}</em>`);
        else { print('no keys yet. warping to identity…', 'dim'); jump('#identity'); }
      },
      whoami() { print(Identity.address ? `holder of <em>${Identity.address}</em>` : 'an anonymous node. run <em>keys</em> to become someone.'); },
      tamper() { print('injecting a fraudulent transaction…', 'err'); jump('#chain'); setTimeout(() => $('#tamper').click(), 2000); },
      explode() {
        print('detonating the genesis block…', 'err'); close();
        if (scrollY > innerHeight * .5) { Warp.go(0, [innerWidth / 2, innerHeight / 2]); setTimeout(explodeCube, 2000); }
        else setTimeout(explodeCube, 250);
      },
      sound(v) {
        const btn = $('#soundToggle'), on = btn.getAttribute('aria-pressed') === 'true';
        const want = v === 'on' ? true : v === 'off' ? false : !on;
        if (want !== on) btn.click();
        print(`sound ${want ? 'on' : 'off'}`, 'ok');
      },
      discoveries(arg) {
        if (arg === 'reset') { Ach.reset(); return print('discoveries reset', 'ok'); }
        const l = Ach.list();
        print(`${l.filter(a => a.on).length}/${l.length} found`, 'hl');
        l.forEach(a => print(`  ${a.on ? '<span class="ok">◆</span>' : '<span class="dim">◇</span>'} ${a.on || !a.s ? a.t : '???'}`));
      },
      matrix() { Rain.toggle(); print('wake up…', 'ok'); },
      satoshi() { Rain.start(); print('…is that you?', 'ok'); },
      sudo() { print('nice try. this chain has no admins.', 'err'); },
      clear() { out.innerHTML = ''; },
      exit() { close(); },
    };
    CMDS.achievements = CMDS.discoveries;
    CMDS.cls = CMDS.clear;
    const VISIBLE = ['help', 'mine', 'hash', 'goto', 'ls', 'price', 'balance', 'keys', 'whoami', 'tamper', 'explode', 'sound', 'discoveries', 'clear', 'exit'];

    async function run(line) {
      const raw = line.trim();
      if (!raw) return;
      print(esc(raw), 'cmd');
      hist.push(raw); hi = hist.length;
      const [c, ...args] = raw.split(/\s+/);
      const fn = CMDS[c.toLowerCase()];
      if (!fn) return print(`command not found: ${esc(c)}. type <em>help</em>`, 'err');
      busy = true; input.disabled = true;
      try { await fn(...args); } catch (e) { print(esc(e.message || e), 'err'); }
      busy = false; input.disabled = false;
      if (open) input.focus();
    }
    form.addEventListener('submit', e => { e.preventDefault(); if (busy) return; const v = input.value; input.value = ''; run(v); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const parts = input.value.split(' ');
        const pool = parts.length === 1 ? VISIBLE : parts[0] === 'goto' ? Object.keys(SECTIONS) : [];
        const word = parts[parts.length - 1].toLowerCase();
        const m = pool.filter(k => k.startsWith(word));
        if (m.length === 1) { parts[parts.length - 1] = m[0]; input.value = `${parts.join(' ')}${parts.length === 1 ? ' ' : ''}`; }
        else if (m.length > 1) print(m.join('  '), 'dim');
      }
    });
    function show() {
      if (open) return;
      open = true; lastFocus = document.activeElement;
      root.hidden = false;
      if (lenis) lenis.stop();
      if (!out.childElementCount) {
        print(`<span class="hl">LEDGER/LIGHT chain console</span> <span class="dim">· connected at block #${fmt(height)}</span>`);
        print('type <em>help</em> to see what you can do. <span class="dim">tab completes, ↑ recalls.</span>');
      }
      if (motion) G.fromTo('.console-panel', { y: -24, opacity: 0, scale: .97 }, { y: 0, opacity: 1, scale: 1, duration: .35, ease: 'power3.out' });
      setTimeout(() => input.focus(), 30);
      Ach.unlock('console');
    }
    function close() {
      if (!open) return;
      open = false; root.hidden = true;
      if (lenis) lenis.start();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    root.addEventListener('click', e => { if (e.target === root) close(); });
    $('#consoleBtn').addEventListener('click', show);
    document.addEventListener('keydown', e => {
      const typing = e.target.closest && e.target.closest('input, textarea');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (open) close(); else show(); }
      else if (e.key === '`' && !typing) { e.preventDefault(); if (open) close(); else show(); }
      else if (e.key === 'Escape' && open) close();
    });
    return { show, close, run };
  })();

  /* =========================================================
     Boot: the intro mines the first four blocks for real
     ========================================================= */
  const finish = () => {
    document.documentElement.classList.add('loaded');
    document.documentElement.classList.remove('is-loading');
    if (lenis) lenis.start();
    if (ST) ST.refresh();
  };
  (async function boot() {
    try {
      if (!motion) {
        for (let i = 0; i < lab.blocks.length; i++) await mine(i, 1e7);
        renderLab();
        finish();
        return;
      }
      if (lenis) lenis.stop();
      const t0 = performance.now();
      const hashEl = $('#loaderHash'), nonceEl = $('#loaderNonce');
      for (let i = 0; i < lab.blocks.length; i++) {
        $('#loaderLabel').textContent = i ? `Mining block #${i + 1}` : 'Mining genesis block';
        await mine(i, 160, (n, h, ok) => { nonceEl.textContent = fmt(n); hashEl.innerHTML = ok ? hashHTML(h) : h; });
        $('#loaderBlocks').textContent = i + 1;
        $('#loaderBar').style.width = `${(i + 1) * 25}%`;
      }
      renderLab();
      const left = 2000 - (performance.now() - t0);
      if (left > 0) await wait(left);
      $('#loaderLabel').textContent = 'Chain ready · 4 blocks found';
      await wait(500);
      G.to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut', onComplete: finish });
      setTimeout(() => intro && intro.play(), 450);
    } catch (err) {
      console.error(err);
      renderLab();
      finish();
      if (intro) intro.progress(1);
    }
  })();

  document.fonts?.ready.then(() => ST && ST.refresh());
  addEventListener('load', () => ST && ST.refresh());
})();
