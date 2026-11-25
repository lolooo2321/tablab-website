/* TabLab: motion and behaviour. Everything works without GSAP; GSAP adds the motion. */
(function () {
  'use strict';

  var root = document.documentElement;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 60rem)');
  var i18n = window.TabLabI18n || { t: function () { return ''; }, lang: 'en' };
  var NAV_OFFSET = 72;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  if (!hasGSAP) root.classList.remove('js'); // no motion library: show the finished page
  root.classList.add('ready');

  // The intro plays on every load, so every load starts at the top unless a section was linked.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------- smooth scroll: Lenis on the GSAP ticker ---------- */
  var lenis = null;
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    if (window.ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);
    if (window.Lenis && !reduce) {
      lenis = new Lenis({ lerp: 0.1, autoRaf: false });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- page switch: the curtain ---------- */
  var curtain = $('.curtain');
  var busy = false;
  if (curtain && hasGSAP) gsap.set($$('.curtain__panel', curtain), { yPercent: 101 });

  function targetFor(hash) { return hash === '#top' ? document.body : $(hash); }

  function jump(hash, immediate) {
    var target = targetFor(hash);
    if (lenis) lenis.scrollTo(hash === '#top' ? 0 : target, { offset: hash === '#top' ? 0 : -NAV_OFFSET, immediate: immediate, force: true, duration: 1.2 });
    else if (hash === '#top') window.scrollTo({ top: 0, behavior: immediate || reduce ? 'auto' : 'smooth' });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET, behavior: immediate || reduce ? 'auto' : 'smooth' });
    var focusEl = hash === '#top' ? $('#hero-title') : target;
    if (focusEl) { if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1'); focusEl.focus({ preventScroll: true }); }
    if (history.replaceState) history.replaceState(null, '', hash);
  }

  function labelFor(hash, link) {
    if (hash === '#top') return 'TabLab';
    var navLink = $('.nav__links a[href="' + hash + '"]');
    return (navLink || link).textContent.trim();
  }

  function switchTo(hash, link) {
    if (busy) return;
    if (!hasGSAP || reduce || !curtain) { jump(hash, false); return; }
    busy = true;
    var dark = $('.curtain__panel--dark', curtain);
    var lime = $('.curtain__panel--lime', curtain);
    var label = $('.curtain__label', curtain);
    var mark = $('.curtain__mark', curtain);
    label.textContent = labelFor(hash, link);
    curtain.classList.add('is-active');
    gsap.timeline({
      defaults: { ease: 'expo.inOut' },
      onComplete: function () {
        curtain.classList.remove('is-active');
        gsap.set([dark, lime], { yPercent: 101 });
        busy = false;
      }
    })
      .fromTo(dark, { yPercent: 101 }, { yPercent: 0, duration: 0.5 }, 0)
      .fromTo(lime, { yPercent: 101 }, { yPercent: 0, duration: 0.5 }, 0.07)
      .fromTo(label, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'expo.out' }, 0.32)
      .fromTo(mark, { yPercent: 40, opacity: 0, rotate: -12 }, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.45, ease: 'expo.out' }, 0.28)
      .call(function () { jump(hash, true); ScrollTrigger.update(); }, null, 0.6)
      .to([label, mark], { yPercent: -40, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.72)
      .to(lime, { yPercent: -101, duration: 0.55 }, 0.8)
      .to(dark, { yPercent: -101, duration: 0.55 }, 0.86);
  }

  $$('a[href^="#"]').forEach(function (a) {
    if (a.classList.contains('skip')) return;
    a.addEventListener('click', function (e) {
      var hash = a.getAttribute('href');
      if (!targetFor(hash)) return;
      e.preventDefault();
      switchTo(hash, a);
    });
  });

  /* ---------- nav turns solid once the page moves ---------- */
  var nav = $('[data-nav]');
  function navState() { nav.classList.toggle('is-solid', (window.scrollY || 0) > 24); }
  navState();
  window.addEventListener('scroll', navState, { passive: true });

  /* ---------- folders: the live concept sites ---------- */
  var folders = $('[data-folders]');
  var tabs = $$('.ftab', folders);
  var panels = $$('.folder', folders);
  var active = 0;
  var workVisible = false;

  function previewOf(panel) { return $('[data-preview]', panel); }

  function fitIframe(preview) {
    var w = preview.clientWidth;
    if (w) preview.style.setProperty('--scale', (w / 1440).toFixed(4));
  }

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (en) { fitIframe(en.target); });
  }) : null;

  function mountIframe(panel) {
    if (!desktop.matches || !root.classList.contains('js')) return;
    var preview = previewOf(panel);
    if ($('iframe', preview)) return;
    var frame = document.createElement('iframe');
    frame.src = panel.getAttribute('data-site');
    frame.title = i18n.t('iframeTitle') + $('h3', panel).textContent;
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('loading', 'lazy');
    frame.addEventListener('load', function () {
      frame.classList.add('is-loaded');
      try {
        frame.contentWindow.addEventListener('keydown', function (e) { if (e.key === 'Escape') setLive(panel, false, true); });
      } catch (err) { /* another origin: Escape stays with the page */ }
    });
    fitIframe(preview);
    if (ro) ro.observe(preview);
    preview.appendChild(frame);
  }

  function unmountIframe(panel) {
    var preview = previewOf(panel);
    var frame = $('iframe', preview);
    setLive(panel, false);
    if (frame) frame.remove();
    if (ro) ro.unobserve(preview);
  }

  function setLive(panel, on, returnFocus) {
    var preview = previewOf(panel);
    var frame = $('iframe', preview);
    var btn = $('[data-try]', preview);
    var was = preview.classList.contains('is-live');
    if (on && !frame) { mountIframe(panel); frame = $('iframe', preview); }
    preview.classList.toggle('is-live', !!on);
    $('span', btn).textContent = on ? i18n.t('tryOff') : i18n.t('tryOn');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (frame) {
      frame.setAttribute('tabindex', on ? '0' : '-1');
      if (on) frame.focus();
    }
    if (lenis && was !== !!on) { if (on) lenis.stop(); else lenis.start(); }
    if (returnFocus) btn.focus();
  }

  function select(index, focusTab) {
    var prev = active;
    active = index;
    var n = panels.length;
    panels.forEach(function (panel, i) {
      var depth = (i - index + n) % n;
      panel.setAttribute('data-depth', depth);
      tabs[i].setAttribute('data-depth', depth);
      panel.style.setProperty('--depth', depth);
      tabs[i].style.setProperty('--depth', depth);
      tabs[i].setAttribute('aria-selected', depth === 0 ? 'true' : 'false');
      tabs[i].setAttribute('tabindex', depth === 0 ? '0' : '-1');
      if (depth === 0) { panel.removeAttribute('inert'); panel.removeAttribute('aria-hidden'); }
      else { panel.setAttribute('inert', ''); panel.setAttribute('aria-hidden', 'true'); }
    });
    if (focusTab) tabs[index].focus();
    if (prev !== index) unmountIframe(panels[prev]);
    if (workVisible) mountIframe(panels[index]);

    if (hasGSAP && !reduce && prev !== index && root.classList.contains('js')) {
      var front = panels[index];
      gsap.fromTo(front, { y: -3 * 18 }, { y: 0, duration: 0.7, ease: 'expo.out', clearProps: 'transform' });
      gsap.fromTo($$('.folder__meta > *', front), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: 'power3.out', delay: 0.1 });
      gsap.fromTo(previewOf(front), { scale: 0.985, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' });
    }
  }

  if (folders) {
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i, false); });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, next = null;
        if (k === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') next = 0;
        else if (k === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });

    panels.forEach(function (panel) {
      var btn = $('[data-try]', panel);
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        setLive(panel, !previewOf(panel).classList.contains('is-live'));
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var live = $('.folder__preview.is-live');
        if (live) setLive(live.closest('.folder'), false, true);
      }
    });

    select(0, false);

    // Load the live site only while the section is near the screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          workVisible = en.isIntersecting;
          if (workVisible) mountIframe(panels[active]);
          else unmountIframe(panels[active]);
        });
      }, { rootMargin: '300px 0px' }).observe(folders);
    }

    desktop.addEventListener('change', function () {
      if (desktop.matches) { if (workVisible) mountIframe(panels[active]); }
      else panels.forEach(unmountIframe);
    });
  }

  /* ---------- the contact form: validates, sends only once connected ---------- */
  var form = $('form[data-endpoint]');
  if (form) {
    var help = $('.form__help', form);
    var fields = [
      { el: $('#f-name', form), msg: 'errName' },
      { el: $('#f-email', form), msg: 'errEmail' },
      { el: $('#f-msg', form), msg: 'errMsg' }
    ];
    fields.forEach(function (f) {
      f.el.addEventListener('input', function () {
        if (f.el.hasAttribute('aria-invalid') && f.el.checkValidity()) { f.el.removeAttribute('aria-invalid'); f.el.removeAttribute('aria-describedby'); help.textContent = ''; }
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) {
        var value = f.el.value.trim();
        var ok = value.length > 0 && f.el.checkValidity();
        if (ok) { f.el.removeAttribute('aria-invalid'); f.el.removeAttribute('aria-describedby'); }
        else { f.el.setAttribute('aria-invalid', 'true'); f.el.setAttribute('aria-describedby', help.id); if (!firstBad) firstBad = f; }
      });
      if (firstBad) { help.textContent = i18n.t(firstBad.msg); firstBad.el.focus(); return; }
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) { help.textContent = i18n.t('notSent'); return; }
      var btn = $('button[type="submit"]', form);
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          help.textContent = r.ok ? i18n.t('sent') + $('#f-email', form).value.trim() + '.' : i18n.t('failed');
          if (r.ok) form.reset();
        })
        .catch(function () { help.textContent = i18n.t('failed'); })
        .then(function () { btn.removeAttribute('aria-busy'); btn.disabled = false; });
    });
  }

  /* ---------- reveal once ---------- */
  var reveals = $$('[data-reveal]');
  reveals.forEach(function (el) {
    var siblings = $$('[data-reveal]', el.parentElement).filter(function (s) { return s.parentElement === el.parentElement; });
    el.style.setProperty('--i', siblings.indexOf(el));
  });
  if ('IntersectionObserver' in window && root.classList.contains('js')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- language switch: refresh what the script wrote ---------- */
  document.addEventListener('tablab:lang', function () {
    panels.forEach(function (panel) {
      var live = previewOf(panel).classList.contains('is-live');
      $('[data-try] span', panel).textContent = live ? i18n.t('tryOff') : i18n.t('tryOn');
      var frame = $('iframe', panel);
      if (frame) frame.title = i18n.t('iframeTitle') + $('h3', panel).textContent;
    });
    if (form) $('.form__help', form).textContent = '';
  });

  if (!hasGSAP) return;

  /* ================= motion (GSAP) ================= */
  var mm = gsap.matchMedia();

  // Resolves when the web fonts are in, or after `ms` at the latest.
  function fontsReady(ms) {
    var wait = new Promise(function (r) { setTimeout(r, ms); });
    return document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait]) : wait;
  }

  /* ---------- headings rise line by line ---------- */
  var running = []; // split animations still playing; finished early when the language changes

  function riseLines(el, opts) {
    opts = opts || {};
    gsap.set(el, { opacity: 1 });
    if (reduce || !window.SplitText) return null;
    var split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
    var tween = gsap.from(split.lines, {
      yPercent: 110, duration: opts.duration || 1, ease: 'expo.out', stagger: 0.09, delay: opts.delay || 0,
      onComplete: function () { split.revert(); running = running.filter(function (t) { return t !== tween; }); }
    });
    running.push(tween);
    return tween;
  }

  /* ---------- language switch: every visible letter leaves, then the new ones fly in ---------- */
  var statementTween = null, statementSplit = null;

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 2 && r.height > 2;
  }

  function charsOf(splits) {
    return splits.reduce(function (all, s) { return all.concat(s.chars); }, []);
  }

  if (window.SplitText && !reduce) {
    i18n.transition = function (pairs, swap) {
      var seen = pairs.filter(function (p) { return inView(p.el); });
      pairs.filter(function (p) { return seen.indexOf(p) < 0; }).forEach(function (p) { p.el.textContent = p.text; });
      var rotorOut = $$('.rotor__word.is-active .ch');
      var outSplits = seen.map(function (p) { return SplitText.create(p.el, { type: 'chars', charsClass: 'fly' }); });
      var spread = Math.min(window.innerWidth * 0.45, 520);
      var OUT = 0.34, OUT_SPREAD = 0.28, IN = 1.05, IN_SPREAD = 0.4;

      gsap.timeline()
        .to(charsOf(outSplits).concat(rotorOut), {
          opacity: 0, yPercent: -40, filter: 'blur(6px)', duration: OUT, ease: 'power2.in',
          stagger: { amount: OUT_SPREAD, from: 'random' }
        })
        .call(function () {
          outSplits.forEach(function (s) { s.revert(); });
          seen.forEach(function (p) { p.el.textContent = p.text; });
          swap(); // the changing word rebuilds itself in the new language here
          var inSplits = seen.map(function (p) { return SplitText.create(p.el, { type: 'chars', charsClass: 'fly' }); });
          var rotorIn = $$('.rotor__word.is-active .ch');
          gsap.set(rotorIn, { filter: 'blur(0px)' });
          gsap.fromTo(charsOf(inSplits).concat(rotorIn), {
            opacity: 0,
            x: function () { return gsap.utils.random(-spread, spread); },
            y: function () { return gsap.utils.random(-spread * 0.45, spread * 0.45); },
            rotation: function () { return gsap.utils.random(-50, 50); }
          }, {
            opacity: 1, x: 0, y: 0, yPercent: 0, rotation: 0, duration: IN, ease: 'expo.out',
            stagger: { amount: IN_SPREAD, from: 'random' },
            onComplete: function () { inSplits.forEach(function (s) { s.revert(); }); gsap.set(rotorIn, { clearProps: 'x,y,rotation' }); }
          });
        });
      return (OUT + OUT_SPREAD + IN + IN_SPREAD) * 1000;
    };
  }

  document.addEventListener('tablab:beforelang', function () {
    running.slice().forEach(function (t) { t.progress(1); });
    if (statementTween) { statementTween.scrollTrigger && statementTween.scrollTrigger.kill(); statementTween.kill(); statementTween = null; }
    if (statementSplit) { statementSplit.revert(); statementSplit = null; }
  });
  document.addEventListener('tablab:lang', function () { splitStatement(); ScrollTrigger.refresh(); });

  function splitStatement() {
    var el = $('[data-statement]');
    if (!el) return;
    if (statementTween) { statementTween.scrollTrigger && statementTween.scrollTrigger.kill(); statementTween.kill(); statementTween = null; }
    if (statementSplit) { statementSplit.revert(); statementSplit = null; }
    if (reduce || !window.SplitText || !window.matchMedia('(min-width: 40rem)').matches) return;
    statementSplit = SplitText.create(el, { type: 'words', wordsClass: 'w' });
    statementTween = gsap.fromTo(statementSplit.words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: true }
    });
  }

  /* ---------- one switch pauses everything that loops ---------- */
  var motion = (function () {
    var btn = $('[data-motion-toggle]');
    var listeners = [];
    var paused = false;
    try { paused = localStorage.getItem('tablab-motion') === 'paused'; } catch (e) {}
    function sync() {
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? i18n.t('playMotion') : i18n.t('pauseMotion'));
      listeners.forEach(function (fn) { fn(paused); });
    }
    btn.addEventListener('click', function () {
      paused = !paused;
      try { localStorage.setItem('tablab-motion', paused ? 'paused' : 'on'); } catch (e) {}
      sync();
    });
    document.addEventListener('tablab:lang', sync);
    return {
      get paused() { return paused; },
      on: function (fn) { listeners.push(fn); fn(paused); },
      sync: sync
    };
  })();
  motion.sync();

  /* ---------- particles: lime specks drifting behind the dark sections ---------- */
  (function () {
    var canvas = $('[data-particles]');
    if (!canvas || reduce) return;
    var ctx = canvas.getContext('2d');
    var color = getComputedStyle(root).getPropertyValue('--color-accent').trim();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, dots = [], lastScroll = window.scrollY, mouse = { x: -9999, y: -9999 };
    var running = false, paused = false, hidden = false, t = 0;

    function seed() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(170, Math.max(40, (W * H) / 10000)));
      dots = [];
      for (var i = 0; i < n; i++) {
        var z = gsap.utils.random(0.25, 1);
        dots.push({
          x: Math.random() * W, y: Math.random() * H, z: z,
          s: 1.2 + z * 2.6,                       // size grows with depth
          vx: gsap.utils.random(-0.08, 0.08), vy: gsap.utils.random(-0.22, -0.05) * z,
          a: gsap.utils.random(0.35, 0.95) * (0.4 + z * 0.6), // nearer specks are brighter
          tw: gsap.utils.random(0.4, 1.4), ph: Math.random() * 6.28,
          plus: Math.random() < 0.16
        });
      }
    }

    function frame() {
      t += 0.016;
      var sc = window.scrollY, dy = sc - lastScroll; lastScroll = sc;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color; ctx.strokeStyle = color;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy - dy * d.z * 0.22;   // drift up; the page scroll moves near specks faster
        var mx = d.x - mouse.x, my = d.y - mouse.y, dist = mx * mx + my * my;
        if (dist < 14400) { var f = (1 - Math.sqrt(dist) / 120) * 1.4; d.x += (mx / 120) * f; d.y += (my / 120) * f; }
        if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
        if (d.y > H + 10) { d.y = -10; d.x = Math.random() * W; }
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        ctx.globalAlpha = d.a * (0.55 + 0.45 * Math.sin(t * d.tw + d.ph));
        if (d.plus) {
          ctx.lineWidth = 1; ctx.beginPath();
          ctx.moveTo(d.x - d.s * 1.6, d.y); ctx.lineTo(d.x + d.s * 1.6, d.y);
          ctx.moveTo(d.x, d.y - d.s * 1.6); ctx.lineTo(d.x, d.y + d.s * 1.6); ctx.stroke();
        } else {
          ctx.fillRect(d.x - d.s / 2, d.y - d.s / 2, d.s, d.s);
        }
      }
      // faint threads between near specks, like a chain
      ctx.lineWidth = 0.6;
      for (var a = 0; a < dots.length; a++) {
        for (var b = a + 1; b < dots.length; b++) {
          var p = dots[a], q = dots[b], ddx = p.x - q.x, ddy = p.y - q.y, dd = ddx * ddx + ddy * ddy;
          if (dd < 12100 && p.z > 0.45 && q.z > 0.45) {
            ctx.globalAlpha = (1 - Math.sqrt(dd) / 110) * 0.22;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function sync() {
      var should = !paused && !hidden;
      if (should && !running) { gsap.ticker.add(frame); running = true; }
      if (!should && running) { gsap.ticker.remove(frame); running = false; }
    }

    seed(); frame();
    motion.on(function (p) { paused = p; sync(); });
    document.addEventListener('visibilitychange', function () { hidden = document.hidden; sync(); });
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { seed(); frame(); }, 200); });
  })();

  /* ---------- hero: the word that changes ---------- */
  // Fades from one word to the next while the hero is on screen; pauses on hover, on focus and with the motion switch.
  var rotor = (function () {
    var el = $('[data-rotor]');
    var hero = $('.hero');
    var title = $('#hero-title');
    var words = [], index = 0, call = null, animating = false;
    var s = { ready: false, visible: true, hover: false, focus: false, held: false, hidden: false };

    function build(list) {
      words = list.slice();
      index = 0;
      el.textContent = '';
      words.forEach(function (w, i) {
        var word = document.createElement('span');
        word.className = 'rotor__word' + (i === 0 ? ' is-active' : '');
        Array.prototype.forEach.call(w, function (c) {
          var ch = document.createElement('span');
          ch.className = 'ch';
          ch.textContent = c;
          word.appendChild(ch);
        });
        el.appendChild(word);
      });
      gsap.set($$('.rotor__word:not(.is-active) .ch', el), { opacity: 0 });
    }

    function running() { return s.ready && s.visible && !s.hover && !s.focus && !s.held && !s.hidden && !reduce; }

    function schedule() {
      if (call) call.kill();
      call = running() ? gsap.delayedCall(2.2, next) : null;
    }

    function next() {
      if (!running() || animating) return;
      var all = $$('.rotor__word', el);
      var out = all[index];
      index = (index + 1) % words.length;
      var into = all[index];
      animating = true;
      gsap.timeline({ onComplete: function () { animating = false; schedule(); } })
        .to($$('.ch', out), { opacity: 0, yPercent: -18, filter: 'blur(8px)', duration: 0.5, ease: 'power2.in', stagger: 0.025 })
        .call(function () { out.classList.remove('is-active'); into.classList.add('is-active'); gsap.set($$('.ch', out), { yPercent: 0, filter: 'blur(0px)' }); }, null, 0.55)
        .fromTo($$('.ch', into), { opacity: 0, yPercent: 18, filter: 'blur(8px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.035 }, 0.55);
    }

    function sync() { schedule(); }

    if (el) {
      build(i18n.t('words'));
      motion.on(function (p) { s.held = p; sync(); });
      title.addEventListener('pointerenter', function () { s.hover = true; sync(); });
      title.addEventListener('pointerleave', function () { s.hover = false; sync(); });
      hero.addEventListener('focusin', function () { s.focus = true; sync(); });
      hero.addEventListener('focusout', function () { s.focus = false; sync(); });
      document.addEventListener('visibilitychange', function () { s.hidden = document.hidden; sync(); });
      new IntersectionObserver(function (es) { s.visible = es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(hero);
      document.addEventListener('tablab:beforelang', function () { if (call) call.kill(); call = null; animating = true; });
      document.addEventListener('tablab:langswap', function () {
        gsap.killTweensOf($$('.ch', el));
        build(i18n.t('words'));
      });
      document.addEventListener('tablab:lang', function () { animating = false; sync(); });
      sync();
    }

    return { ready: function () { s.ready = true; sync(); } };
  })();

  /* hero links straight into one folder */
  $$('[data-open-tab]').forEach(function (a) {
    a.addEventListener('click', function () { select(parseInt(a.getAttribute('data-open-tab'), 10) || 0, false); });
  });

  /* ---------- hero: text and folders arrive ---------- */
  var layers = $$('.layer');
  var heroReady = false;

  function heroEntrance() {
    var title = $('#hero-title');
    var rest = $$('.hero [data-hero]').filter(function (el) { return el !== title; });
    var visual = $('[data-hero-visual]');
    if (reduce) { gsap.set([title, visual].concat(rest), { opacity: 1 }); heroReady = true; return; }
    gsap.set([title, visual], { opacity: 1 });
    gsap.from(['.hero__line', '.rotor'], { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.12, onComplete: function () { rotor.ready(); } });
    gsap.fromTo(rest, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.35 });
    gsap.fromTo(layers, { opacity: 0, x: function (i) { return 140 - i * 30; }, y: function (i) { return 60 + i * 20; }, scale: 0.9 }, {
      opacity: 1, x: 0, y: 0, scale: 1, duration: 1.5, ease: 'expo.out', stagger: 0.12, delay: 0.1,
      onComplete: function () { heroReady = true; }
    });
  }

  /* ---------- the intro, on every load ---------- */
  if (!reduce) {
    var loader = $('.loader');
    if (lenis) lenis.stop();
    gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: function () { loader.style.display = 'none'; if (lenis) lenis.start(); }
    })
      .to('.loader__flask', { strokeDashoffset: 0, duration: 0.8 })
      .to('.loader__flask', { fillOpacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.15')
      .fromTo('.loader__chevron', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.35, ease: 'expo.out' }, '-=0.1')
      .fromTo('.loader__cursor', { opacity: 0 }, { opacity: 1, duration: 0.01, repeat: 3, yoyo: true, repeatDelay: 0.12 })
      .to('.loader__cursor', { opacity: 1, duration: 0.01 })
      .to(loader, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, '+=0.1')
      .call(heroEntrance, null, '-=0.45');
  } else {
    fontsReady(900).then(heroEntrance);
  }

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    /* hero: the folders pull apart as you scroll away */
    var spread = [{ xPercent: -14, yPercent: -22, rotate: -3 }, { xPercent: -5, yPercent: -9, rotate: -1 }, { xPercent: 12, yPercent: 20, rotate: 3 }];
    layers.forEach(function (layer, i) {
      gsap.to(layer, Object.assign({ ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }, spread[i]));
    });
    gsap.to(['.hero__text', '.hero__foot'], {
      yPercent: -18, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true }
    });

    /* work: the folder stack rises into place once */
    gsap.from('.folders', {
      y: 80, opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.folders', start: 'top 85%', once: true }
    });

    /* footer: the logo rises out of the floor */
    gsap.fromTo('.footer__mast svg', { yPercent: 45, opacity: 0.15 }, {
      yPercent: 0, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  });

  /* section headings rise in when they reach the screen */
  $$('[data-split]').forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { riseLines(el); } });
  });

  /* process: the line draws across, each step lights as it passes */
  var steps = $$('.step');
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 60rem)', function () {
    gsap.fromTo('.process__line span', { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: {
        trigger: '[data-process]', start: 'top 78%', end: 'bottom 60%', scrub: true,
        onUpdate: function (self) {
          steps.forEach(function (s, i) { s.classList.toggle('is-on', self.progress > i / steps.length + 0.02); });
        }
      }
    });
  });
  mm.add('(prefers-reduced-motion: no-preference) and (max-width: 59.99rem)', function () {
    steps.forEach(function (s) {
      ScrollTrigger.create({ trigger: s, start: 'top 80%', onEnter: function () { s.classList.add('is-on'); } });
    });
  });

  /* ---------- pointer: folders lean toward the mouse, buttons pull, dark controls glow ---------- */
  if (finePointer && !reduce) {
    var hero = $('.hero');
    var depth = [10, 18, 30];
    var movers = layers.map(function (layer) {
      return { x: gsap.quickTo(layer, 'x', { duration: 0.9, ease: 'power3.out' }), y: gsap.quickTo(layer, 'y', { duration: 0.9, ease: 'power3.out' }) };
    });
    hero.addEventListener('pointermove', function (e) {
      if (!heroReady) return;
      var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      movers.forEach(function (m, i) { m.x(nx * depth[i] * 2); m.y(ny * depth[i] * 2); });
    });
    hero.addEventListener('pointerleave', function () {
      if (!heroReady) return;
      movers.forEach(function (m) { m.x(0); m.y(0); });
    });

    $$('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      var box = null;
      // Measure without the pull already applied, so the button does not chase itself.
      function measure() {
        var r = el.getBoundingClientRect();
        var x = gsap.getProperty(el, 'x'), y = gsap.getProperty(el, 'y');
        return { cx: r.left - x + r.width / 2, cy: r.top - y + r.height / 2 };
      }
      el.addEventListener('pointerenter', function () { box = measure(); });
      el.addEventListener('pointermove', function (e) {
        if (!box) box = measure();
        xTo((e.clientX - box.cx) * strength);
        yTo((e.clientY - box.cy) * strength);
      });
      el.addEventListener('pointerleave', function () { box = null; xTo(0); yTo(0); });
    });

    $$('[data-glow]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  var lastWidth = window.innerWidth, resizeTimer;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(splitStatement, 250);
  });

  fontsReady(2500).then(function () { splitStatement(); ScrollTrigger.refresh(); });
})();
