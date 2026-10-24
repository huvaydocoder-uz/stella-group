/* Stella Group — sahifa mantiqi: til almashtirish, menyu, animatsiyalar,
   xizmatlar, portfolio filtri, rasm ko'rish oynasi va ariza formasi. */
(() => {
  'use strict';

  const CFG = window.STELLA_CONFIG || {};
  const I18N = window.STELLA_I18N || { uz: {} };
  const SERVICES = window.STELLA_SERVICES || [];
  const CATS = window.STELLA_CATEGORIES || {};
  const WORKS = window.STELLA_PORTFOLIO || [];
  const CLIENTS = window.STELLA_CLIENTS || [];
  const IMG = 'assets/img/portfolio/';
  const LANGS = ['uz', 'ru', 'en'];
  const MAP_LANG = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' };

  const root = document.documentElement;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lang = LANGS.includes(root.lang) ? root.lang : 'uz';
  let firstRender = true;

  /* ---------------- yordamchi funksiyalar ---------------- */
  const t = (key, vars) => {
    let s = I18N[lang] && I18N[lang][key];
    if (s == null) s = I18N.uz[key];
    if (s == null) return key;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
    return s;
  };
  // ma'lumotdagi { uz, ru, en } qiymatidan joriy tildagisini olish (tarjima bo'lmasa — o'zbekchasi)
  const tr = (o) => (o[lang] != null ? o[lang] : o.uz);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls) => `<svg class="${cls || 'ico'}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const workByFile = (file) => WORKS.find((w) => w.file === file);

  /* ---------------- til (UZ / RU) ---------------- */
  function applyStaticText() {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    $$('[data-i18n-attr]').forEach((el) => {
      el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((x) => x.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
    document.title = t('meta.title');
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));
  }

  function setLang(next, persist) {
    lang = LANGS.includes(next) ? next : 'uz';
    root.lang = lang;
    if (persist) {
      try { localStorage.setItem('stella-lang', lang); } catch (e) { /* xususiy rejim */ }
      try {
        const url = new URL(location.href);
        if (lang !== 'uz') url.searchParams.set('lang', lang); else url.searchParams.delete('lang');
        history.replaceState(null, '', url);
      } catch (e) { /* file:// */ }
    }
    $$('.lang-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)));
    applyStaticText();
    renderTicker();
    renderAdsTabs();
    renderAds();
    renderServices();
    renderServiceOptions();
    renderFilters();
    renderPortfolio({ keepCount: true });
    updateHeroCaption();
    firstRender = false;
    root.classList.remove('i18n-pending');
  }

  // Til almashganda ekrandagi matnlar xiralashib yo'qoladi, yangi tilda esa pastdan suzib chiqadi.
  // Web Animations API ishlatiladi — elementlarning o'z CSS animatsiyalariga (hero, reveal) tegmaydi.
  const LANG_FX = '[data-i18n], [data-i18n-html], [data-i18n-fx]';
  let langBusy = false;

  function inView(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }

  function switchLang(next) {
    if (next === lang || langBusy) return;
    const els = reduceMotion || !Element.prototype.animate ? [] : $$(LANG_FX).filter((el) => !el.parentElement.closest(LANG_FX) && inView(el));
    if (!els.length) { setLang(next, true); return; }
    langBusy = true;
    const ease = 'cubic-bezier(.4,0,.2,1)';
    const outs = els.map((el) => el.animate(
      [{ opacity: 1, filter: 'blur(0)', translate: '0 0' }, { opacity: 0, filter: 'blur(6px)', translate: '0 -6px' }],
      { duration: 170, easing: ease, fill: 'forwards' },
    ));
    Promise.all(outs.map((a) => a.finished)).catch(() => {}).then(() => {
      setLang(next, true);
      // qayta chizilgan bloklar ham animatsiyaga qo'shiladi
      const fresh = $$(LANG_FX).filter((el) => !el.parentElement.closest(LANG_FX) && inView(el));
      outs.forEach((a) => a.cancel());
      const top = fresh.length ? Math.min(...fresh.map((el) => el.getBoundingClientRect().top)) : 0;
      fresh.forEach((el) => {
        const delay = Math.min(260, Math.max(0, el.getBoundingClientRect().top - top) * 0.35);
        el.animate(
          [{ opacity: 0, filter: 'blur(8px)', translate: '0 10px' }, { opacity: 1, filter: 'blur(0)', translate: '0 0' }],
          { duration: 420, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' },
        );
      });
      langBusy = false;
    });
  }

  /* ---------------- kunduzgi / tungi rejim ---------------- */
  function initTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    const meta = $('meta[name="theme-color"]');
    const isLight = () => root.getAttribute('data-theme') === 'light';
    const apply = (light) => {
      if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
      btn.setAttribute('aria-checked', String(!light));
      if (meta) meta.setAttribute('content', light ? '#F7F3FF' : '#3B2265');
    };
    apply(isLight());

    btn.addEventListener('click', () => {
      const light = !isLight();
      try { localStorage.setItem('stella-theme', light ? 'light' : 'dark'); } catch (e) { /* xususiy rejim */ }
      if (document.startViewTransition && !reduceMotion) {
        // yangi rejim tugma markazidan doira bo'lib butun sahifaga yoyiladi
        const r = btn.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.style.setProperty('--vt-x', `${x}px`);
        root.style.setProperty('--vt-y', `${y}px`);
        root.style.setProperty('--vt-r', `${radius}px`);
        document.startViewTransition(() => apply(light));
        return;
      }
      root.classList.add('theme-anim');
      apply(light);
      setTimeout(() => root.classList.remove('theme-anim'), 600);
    });
  }

  /* ---------------- header va mobil menyu ---------------- */
  const header = $('#site-header');
  const menuBtn = $('#menu-toggle');
  const menu = $('#mobile-menu');
  const fab = $('#fab-call');

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-stuck', y > 12);
    if (fab) {
      // ariza formasi ko'ringanda tugma formani to'sib qo'ymasligi uchun yashiriladi
      const contact = $('#contact');
      const atContact = contact && contact.getBoundingClientRect().top < window.innerHeight * 0.7;
      const show = y > 520 && !atContact;
      fab.classList.toggle('translate-y-24', !show);
      fab.classList.toggle('opacity-0', !show);
      fab.classList.toggle('pointer-events-none', !show);
    }
  }

  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    $('[data-icon-open]', menuBtn).classList.toggle('hidden', open);
    $('[data-icon-close]', menuBtn).classList.toggle('hidden', !open);
  }

  function initHeader() {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

    $$('.lang-switch button').forEach((b) => b.addEventListener('click', () => switchLang(b.getAttribute('data-lang'))));

    // joriy bo'limni menyuda belgilash
    const links = $$('.nav-link');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ---------------- scroll animatsiyalari ---------------- */
  let revealIO = null;
  function done(el) {
    // animatsiya tugagach atributni olib tashlaymiz — elementning o'z hover o'tishlari ishlashi uchun
    const delay = parseInt(getComputedStyle(el).getPropertyValue('--d'), 10) || 0;
    setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); el.style.removeProperty('--d'); }, 900 + delay);
  }
  function observeReveal(ctx) {
    const els = $$('[data-reveal]:not(.is-in)', ctx);
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach((el) => el.removeAttribute('data-reveal'));
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          revealIO.unobserve(en.target);
          done(en.target);
        });
      }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
    }
    els.forEach((el) => revealIO.observe(el));
  }

  function initCounters() {
    const els = $$('[data-count]');
    if (!('IntersectionObserver' in window) || reduceMotion) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        const end = Number(el.getAttribute('data-count')) || 0;
        const t0 = performance.now();
        const dur = 1500;
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  // kartalarda kursor ortidan yuruvchi neon yog'du
  function initGlow() {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('[data-glow]');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------------- hero: "LED ekran" slaydlari ---------------- */
  const HERO_SLIDE_MS = 8000;
  const hero = { index: 0, slides: [], ambient: [], dots: [], bar: null, elapsed: 0, last: 0, paused: false };

  function updateHeroCaption() {
    hero.slides.forEach((img) => {
      const w = workByFile(img.getAttribute('data-file'));
      if (w) img.alt = `${tr(w)[0]} — ${tr(w)[1]}`;
    });
    const cur = hero.slides[hero.index];
    const w = cur && workByFile(cur.getAttribute('data-file'));
    if (!w) return;
    $('#hero-cap-title').textContent = tr(w)[0];
    $('#hero-cap-desc').textContent = tr(w)[1];
  }

  function showSlide(n) {
    const len = hero.slides.length;
    hero.index = (n + len) % len;
    [hero.slides, hero.ambient, hero.dots].forEach((set) => set.forEach((el, i) => el.classList.toggle('is-active', i === hero.index)));
    updateHeroCaption();
  }

  function initHero() {
    const screen = $('#hero-screen');
    if (!screen) return;
    hero.slides = $$('img', screen);
    hero.ambient = $$('.hero-ambient img');
    hero.dots = $$('#hero-dots .screen-dot');
    hero.bar = $('#hero-progress');
    if (reduceMotion) return;
    screen.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hero.paused = true; });
    screen.addEventListener('pointerleave', () => { hero.paused = false; });
    // neon chiziq to'lgach keyingi slaydga o'tadi; yashirin oynada rAF to'xtagani uchun vaqt ham to'xtaydi
    const frame = (now) => {
      const dt = hero.last ? Math.min(now - hero.last, 100) : 0;
      hero.last = now;
      if (!hero.paused) hero.elapsed += dt;
      if (hero.elapsed >= HERO_SLIDE_MS) {
        hero.elapsed = 0;
        showSlide(hero.index + 1);
      }
      if (hero.bar) hero.bar.style.transform = `scaleX(${hero.elapsed / HERO_SLIDE_MS})`;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------------- LED yugurma satr ---------------- */
  const ticker = { el: null, x: 0, period: 0, hover: false, drag: false, last: 0 };
  const TICKER_LOOP_S = 46; // bitta to'liq aylanish vaqti

  function measureTicker() {
    if (ticker.el) ticker.period = ticker.el.scrollWidth / 2;
  }

  function renderTicker() {
    const el = $('#ticker');
    if (!el) return;
    const items = t('ticker');
    const star = `<span class="text-star">${icon('i-star', 'ico-fill h-3.5 w-3.5')}</span>`;
    const one = items.map((s) => `<span class="led-dots px-6 sm:px-8">${esc(s)}</span>${star}`).join('');
    const half = `<div class="flex shrink-0 items-center">${one}${one}</div>`;
    el.innerHTML = half + half;
    measureTicker();
  }

  // o'ngdan chapga yuradi; kursor ustida to'xtaydi; sichqoncha yoki barmoq bilan ikki tomonga suriladi
  function initTicker() {
    const el = $('#ticker');
    const wrap = $('#ticker-wrap');
    if (!el || !wrap || reduceMotion) return;
    ticker.el = el;
    el.classList.remove('animate-marquee');
    wrap.classList.add('is-draggable');
    measureTicker();
    window.addEventListener('resize', measureTicker);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureTicker);

    let startX = 0;
    let startOffset = 0;
    wrap.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ticker.hover = true; });
    wrap.addEventListener('pointerleave', () => { ticker.hover = false; });
    wrap.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ticker.drag = true;
      startX = e.clientX;
      startOffset = ticker.x;
      wrap.classList.add('is-dragging');
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* eski brauzer */ }
    });
    wrap.addEventListener('pointermove', (e) => { if (ticker.drag) ticker.x = startOffset + (e.clientX - startX); });
    const endDrag = () => { ticker.drag = false; wrap.classList.remove('is-dragging'); };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    const frame = (now) => {
      const dt = ticker.last ? Math.min(now - ticker.last, 100) : 0;
      ticker.last = now;
      if (ticker.period > 0) {
        if (!ticker.hover && !ticker.drag) ticker.x -= (ticker.period / TICKER_LOOP_S) * (dt / 1000);
        // cheksiz aylanish: siljishni (-period, 0] oralig'ida ushlab turamiz
        const x = ((ticker.x % ticker.period) - ticker.period) % ticker.period;
        el.style.transform = `translate3d(${x}px,0,0)`;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------------- mijozlar ---------------- */
  function renderClients() {
    CLIENTS.forEach((row, i) => {
      const el = $(`#clients-row-${i + 1}`);
      if (!el) return;
      const one = row.map(([name, logo]) => `<figure class="client-card"><div class="client-logo"><img src="assets/img/clients/${esc(logo)}" alt="${esc(name)}" width="640" height="640" loading="lazy" decoding="async" draggable="false"></div><figcaption>${esc(name)}</figcaption></figure>`).join('');
      // 4 nusxa: keng ekranlarda ham yarim trek ekrandan keng bo'lib, aylanish uzluksiz chiqadi
      const copy = `<div class="client-group" aria-hidden="true">${one}</div>`;
      el.innerHTML = `<div class="client-group">${one}</div>${copy.repeat(3)}`;
    });
  }

  /* ---------------- reklama joylari: tur → manzil → Yandex xarita ---------------- */
  // service — "Reklama berish" tugmasi bosilganda formada tanlanadigan xizmat
  const NETS = [
    { id: 'led', icon: 's-led', service: 'led', items: window.STELLA_LED || [] },
    { id: 'billboard', icon: 's-billboard', service: 'billboard', items: window.STELLA_BILLBOARDS || [] },
    { id: 'bus', icon: 's-bus', service: 'transport', items: window.STELLA_BUS || [] },
    { id: 'stop', icon: 's-stop', service: 'other', items: window.STELLA_STOPS || [] },
  ];
  const ads = { net: NETS[0], index: -1 };
  const adPoint = (p) => `${p.ll[1]},${p.ll[0]}`;
  const adKey = (k) => t(`ads.${ads.net.id}.${k}`);

  function adsMapUrl(p, embed) {
    const base = embed ? 'https://yandex.uz/map-widget/v1/' : 'https://yandex.uz/maps/';
    const items = ads.net.items;
    // bir nuqtada bir nechta joy bo'lishi mumkin — umumiy ko'rinishda takrorlanmaydi
    const pts = Array.from(new Set(items.map(adPoint)));
    let q;
    if (p) q = `ll=${adPoint(p)}&z=17&pt=${adPoint(p)},pm2vvl`;
    else if (!pts.length) q = 'll=64.4286,39.7747&z=12';
    else {
      const lat = items.map((x) => x.ll[0]);
      const lon = items.map((x) => x.ll[1]);
      const far = Math.max(...lat) - Math.min(...lat) > 1 || Math.max(...lon) - Math.min(...lon) > 1;
      // G'ijduvondagi joylar ham bo'lsa, xarita kengroq ko'rinishda ochiladi;
      // boshqa shahardagi joy bo'lsa (masalan, Toshkent) — barcha nuqtalar sig'adigan oyna (bbox)
      const wide = items.some((x) => x.city !== 'bx');
      const view = far
        ? `bbox=${Math.min(...lon) - 0.3},${Math.min(...lat) - 0.3}~${Math.max(...lon) + 0.3},${Math.max(...lat) + 0.3}`
        : wide ? 'll=64.5500,39.9300&z=10' : 'll=64.4286,39.7747&z=12';
      q = `${view}&pt=${pts.map((pt) => `${pt},pm2vvm`).join('~')}`;
    }
    return `${base}?${q}&lang=${MAP_LANG[lang]}`;
  }

  /* Yandex Maps JS API: tanlangan LED ekran yoki bekat nuqtasida uning rasmi chiqadi
     va xarita bilan birga suriladi. API yuklanmasa, oddiy Yandex vidjeti (iframe) ishlashda davom etadi. */
  const BUKHARA = [39.7747, 64.4286];
  // rasm pastki o'rtasi aynan nuqtaga tushadi (ustun / bekat poli)
  const PINS = {
    led: { href: 'assets/img/led-pin.png', w: 96, h: 108 },
    billboard: { href: 'assets/img/billboard-pin.png', w: 100, h: 128 },
    stop: { href: 'assets/img/stop-pin.png', w: 220, h: 94 },
  };
  // joyning slayd-rasmlari (hozircha bilbordlarda): kichik nusxa ro'yxat va panelda, kattasi rasm ko'rish oynasida
  const AD_IMG = 'assets/img/billboards/';
  const adThumb = (file) => AD_IMG + file.replace(/\.webp$/, '-sm.webp');
  const adSlides = (p) => (p.photos || []).map((file) => ({ src: AD_IMG + file, cat: 'outdoor', w: 1600, h: 900, uz: p.uz, ru: p.ru, en: p.en }));
  const ymap = { state: 'idle', map: null };

  function loadYmaps() {
    if (ymap.state !== 'idle') return;
    ymap.state = 'loading';
    const key = (window.STELLA_CONFIG || {}).ymapsKey;
    const s = document.createElement('script');
    s.src = `https://api-maps.yandex.ru/2.1/?lang=${MAP_LANG[lang]}${key ? `&apikey=${encodeURIComponent(key)}` : ''}`;
    s.async = true;
    s.onerror = () => { ymap.state = 'failed'; };
    s.onload = () => {
      if (!window.ymaps) { ymap.state = 'failed'; return; }
      window.ymaps.ready(() => {
        const el = $('#ads-ymap');
        try {
          ymap.map = new window.ymaps.Map(el, { center: BUKHARA, zoom: 12, controls: ['zoomControl', 'fullscreenControl'] }, { suppressMapOpenBlock: true });
        } catch (err) { ymap.state = 'failed'; return; }
        // sahifani aylantirganda xarita kattalashib ketmasin
        ymap.map.behaviors.disable('scrollZoom');
        ymap.state = 'ready';
        el.hidden = false;
        const frame = $('#ads-map');
        frame.hidden = true;
        frame.removeAttribute('src');
        drawYmap();
      });
    };
    document.head.appendChild(s);
  }

  function drawYmap() {
    if (ymap.state !== 'ready') return;
    const Y = window.ymaps;
    const map = ymap.map;
    const items = ads.net.items;
    const sel = items[ads.index];
    map.geoObjects.removeAll();
    // bir nuqtada bir nechta joy bo'lishi mumkin — har nuqtaga bitta belgi
    const seen = new Set(sel ? [adPoint(sel)] : []);
    items.forEach((p, i) => {
      if (seen.has(adPoint(p))) return;
      seen.add(adPoint(p));
      const mark = new Y.Placemark(p.ll, { hintContent: tr(p)[0] }, { preset: 'islands#violetCircleDotIcon' });
      mark.events.add('click', () => showAd(i));
      map.geoObjects.add(mark);
    });
    if (sel) {
      const pin = PINS[ads.net.id];
      const opts = pin
        ? { iconLayout: 'default#image', iconImageHref: pin.href, iconImageSize: [pin.w, pin.h], iconImageOffset: [-pin.w / 2, -pin.h], zIndex: 1000 }
        : { preset: 'islands#violetDotIcon', zIndex: 1000 };
      map.geoObjects.add(new Y.Placemark(sel.ll, { hintContent: tr(sel)[0] }, opts));
      map.setCenter(sel.ll, 16, { duration: 300 });
    } else if (items.length > 1) {
      map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40, duration: 300 });
    } else {
      map.setCenter(items.length ? items[0].ll : BUKHARA, items.length ? 15 : 12, { duration: 300 });
    }
  }

  function showAd(i) {
    ads.index = i;
    const p = ads.net.items[i];
    $$('#ads-list .led-item').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-ad')) === i)));
    const map = $('#ads-map');
    const src = adsMapUrl(p, true);
    if (ymap.state === 'ready') drawYmap();
    else if (map && map.getAttribute('src') !== src) map.setAttribute('src', src);
    let title = adKey('all');
    let desc = adKey('pick');
    if (p) {
      title = tr(p)[0];
      desc = [tr(p)[1], t('ads.city.' + p.city), p.size ? t('ads.size', { w: p.size[0], h: p.size[1] }) : ''].filter(Boolean).join(' · ');
    } else if (!ads.net.items.length) {
      title = t('ads.tab.' + ads.net.id);
      desc = t('ads.empty.title');
    }
    $('#ads-cur-title').textContent = title;
    $('#ads-cur-desc').textContent = desc;
    const photos = $('#ads-photos');
    if (photos) {
      const files = (p && p.photos) || [];
      photos.hidden = !files.length;
      photos.innerHTML = files.map((file, k) => `
        <button type="button" class="ads-photo" data-photo="${k}" aria-label="${esc(t('ads.photo', { n: k + 1 }))}">
          <img src="${esc(adThumb(file))}" alt="${esc(tr(p)[0] + ' — ' + t('ads.photo', { n: k + 1 }))}" width="320" height="180" loading="lazy" decoding="async">
        </button>`).join('');
    }
    $('#ads-open').setAttribute('href', adsMapUrl(p, false));
  }

  function renderAdsTabs() {
    const el = $('#ads-tabs');
    if (!el) return;
    el.innerHTML = NETS.map((n) => {
      const on = n === ads.net;
      return `
      <button type="button" role="tab" class="ads-tab" id="ads-tab-${n.id}" data-net="${n.id}" aria-selected="${on}" aria-controls="ads-list" tabindex="${on ? 0 : -1}">
        <span class="ads-tab-ico">${icon(n.icon)}</span>
        <span class="min-w-0 flex-1">${esc(t('ads.tab.' + n.id))}</span>
        ${n.items.length ? `<span class="ads-tab-n">${n.items.length}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderAds(animate) {
    const list = $('#ads-list');
    if (!list) return;
    const n = ads.net;
    $('#ads-title').innerHTML = adKey('title');
    $('#ads-sub').textContent = adKey('sub');
    $('#ads-cta-text').textContent = adKey('cta');
    $('#ads-cta').setAttribute('data-service', n.service);
    $('#ads-map').setAttribute('title', adKey('map'));
    list.setAttribute('aria-labelledby', 'ads-tab-' + n.id);

    const fx = (k) => (animate ? ` is-entering" style="--d:${Math.min(k, 8) * 40}ms` : '');
    if (!n.items.length) {
      list.innerHTML = `
        <div class="ads-empty${fx(0)}">
          <span class="ads-tab-ico !h-11 !w-11">${icon(n.icon)}</span>
          <p class="mt-4 font-display text-base font-bold">${esc(t('ads.empty.title'))}</p>
          <p class="mt-1.5 text-sm leading-relaxed text-brand-100/75">${esc(t('ads.empty.text'))}</p>
          <a href="tel:${esc(CFG.phone || '')}" class="btn btn-glass btn-sm mt-5">${icon('i-phone')}<span>${esc(CFG.phoneDisplay || '')}</span></a>
        </div>`;
    } else {
      const item = (i, badge, title, desc, k, thumb) => `
        <button type="button" class="led-item${fx(k)}" data-ad="${i}" aria-pressed="false">
          <span class="led-num${thumb ? ' led-thumb' : ''}">${thumb ? `<img src="${esc(thumb)}" alt="" width="320" height="180" loading="lazy" decoding="async"><span>${badge}</span>` : badge}</span>
          <span class="min-w-0">
            <span class="block font-display text-sm font-bold">${esc(title)}</span>
            <span class="mt-0.5 block text-xs leading-snug text-brand-100/75">${esc(desc)}</span>
          </span>
        </button>`;
      list.innerHTML = item(-1, icon('i-pin'), adKey('all'), t('ads.count', { n: n.items.length }), 0)
        + n.items.map((p, i) => item(i, i + 1, tr(p)[0], tr(p)[1], i + 1, p.photos && p.photos.length ? adThumb(p.photos[0]) : '')).join('');
    }
    list.scrollTop = 0;
    list.scrollLeft = 0;
    showAd(ads.index);
  }

  function setNet(id, focus) {
    const n = NETS.find((x) => x.id === id);
    if (!n || n === ads.net) return;
    ads.net = n;
    ads.index = -1;
    $$('#ads-tabs .ads-tab').forEach((b) => {
      const on = b.getAttribute('data-net') === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    const head = $('#ads-head');
    if (head && !reduceMotion && head.animate) {
      head.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    renderAds(!reduceMotion);
  }

  function initAds() {
    // xarita API'si bo'lim ko'rinishiga yaqinlashganda yuklanadi
    const sec = $('#led');
    if (sec && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => {
        if (en.some((x) => x.isIntersecting)) { io.disconnect(); loadYmaps(); }
      }, { rootMargin: '600px 0px' });
      io.observe(sec);
    } else loadYmaps();
    const tabs = $('#ads-tabs');
    const list = $('#ads-list');
    if (!tabs || !list) return;
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.ads-tab');
      if (b) setNet(b.getAttribute('data-net'));
    });
    // klaviatura: chap/o'ng/yuqori/past strelkalar bilan turlar orasida yurish
    tabs.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const i = NETS.indexOf(ads.net);
      setNet(NETS[(i + step + NETS.length) % NETS.length].id, true);
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.led-item');
      if (btn) showAd(Number(btn.getAttribute('data-ad')));
    });
    list.addEventListener('animationend', (e) => { if (e.target.classList) e.target.classList.remove('is-entering'); });
    const photos = $('#ads-photos');
    if (photos) photos.addEventListener('click', (e) => {
      const b = e.target.closest('.ads-photo');
      const p = ads.net.items[ads.index];
      if (b && p) openLightbox(adSlides(p), Number(b.getAttribute('data-photo')));
    });
  }

  /* ---------------- xizmatlar ---------------- */
  function renderServices() {
    const grid = $('#services-grid');
    if (!grid) return;
    const reveal = (i) => (firstRender ? ` data-reveal style="--d:${(i % 4) * 70}ms"` : '');
    const cards = SERVICES.map((s, i) => {
      const L = tr(s);
      return `
      <article class="svc-card" data-glow${reveal(i)}>
        <span class="svc-num absolute right-6 top-6">${String(i + 1).padStart(2, '0')}</span>
        <div class="flex items-center gap-4 pr-8 sm:block sm:pr-0">
          <span class="svc-icon shrink-0">${icon(s.icon)}</span>
          <h3 class="text-lg font-bold leading-snug sm:mt-5">${esc(L.title)}</h3>
        </div>
        <p class="mt-3 flex-1 text-sm leading-relaxed text-brand-100/75 sm:mt-2">${esc(L.short)}</p>
        <div class="mt-4 sm:mt-5">
          <button type="button" class="btn-micro after:absolute after:inset-0 after:content-['']" data-service-open="${s.id}" aria-haspopup="dialog">
            ${esc(t('services.more'))}<span class="sr-only"> — ${esc(L.title)}</span>${icon('i-arrow')}
          </button>
        </div>
      </article>`;
    }).join('');

    const cta = `
      <div class="svc-cta"${reveal(1)}>
        <div>
          <h3 class="text-xl font-extrabold leading-snug sm:text-2xl">${esc(t('services.cta.title'))}</h3>
          <p class="mt-2 text-sm leading-relaxed text-brand-100/85 sm:text-base">${esc(t('services.cta.text'))}</p>
        </div>
        <a href="#contact" class="btn btn-primary shrink-0">${esc(t('services.cta.btn'))}${icon('i-arrow', 'ico btn-arrow')}</a>
      </div>`;

    grid.innerHTML = cards + cta;
  }

  const svcModal = $('#svc-modal');
  let currentService = null;

  function serviceSamples(s) {
    if (s.gallery) return s.gallery;
    if (s.samples) return s.samples.map(workByFile).filter(Boolean);
    return s.cat ? WORKS.filter((w) => w.cat === s.cat).slice(0, 3) : [];
  }

  function openService(id) {
    const s = SERVICES.find((x) => x.id === id);
    if (!s || !svcModal) return;
    currentService = s;
    const L = tr(s);
    $('#svc-modal-icon').innerHTML = icon(s.icon);
    $('#svc-modal-title').textContent = L.title;
    $('#svc-modal-text').textContent = L.text;
    $('#svc-modal-points').innerHTML = L.points.map((p) => `
      <li class="flex items-start gap-3 text-sm leading-relaxed sm:text-base">
        <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neon-500/30 text-neon-200">${icon('i-check', 'ico h-3 w-3')}</span>
        <span>${esc(p)}</span>
      </li>`).join('');

    const samples = serviceSamples(s);
    $('#svc-modal-samples-wrap').hidden = samples.length === 0;
    // oynada ko'pi bilan 6 ta rasm; to'liq ro'yxat rasm ko'rish oynasida varaqlanadi
    $('#svc-modal-samples').innerHTML = samples.slice(0, 6).map((w) => `
      <button type="button" class="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 transition hover:border-neon-300" data-sample="${esc(w.file)}" title="${esc(tr(w)[0])}">
        <img src="${IMG}${esc(w.file)}" alt="${esc(tr(w)[0] + ' — ' + tr(w)[1])}" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-110">
      </button>`).join('');

    if (!svcModal.open) svcModal.showModal();
    svcModal.firstElementChild.scrollTop = 0;
  }

  function selectService(id) {
    const sel = $('#f-service');
    if (sel && id) { sel.value = id; clearError(sel); }
  }

  function initServices() {
    document.addEventListener('click', (e) => {
      const open = e.target.closest('[data-service-open]');
      if (open) { openService(open.getAttribute('data-service-open')); return; }
      const pick = e.target.closest('a[data-service]');
      if (pick) selectService(pick.getAttribute('data-service'));
    });
    if (!svcModal) return;

    $('#svc-modal-order').addEventListener('click', () => {
      const id = currentService && currentService.id;
      svcModal.close();
      selectService(id);
      $('#contact').scrollIntoView();
      setTimeout(() => { const n = $('#f-name'); if (n) n.focus({ preventScroll: true }); }, 700);
    });
    $('#svc-modal-all').addEventListener('click', () => {
      const cat = currentService && currentService.cat;
      svcModal.close();
      setFilter(cat && CATS[cat] ? cat : 'all');
      $('#portfolio').scrollIntoView();
    });
    $('#svc-modal-samples').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sample]');
      if (!b) return;
      const list = serviceSamples(currentService);
      const i = list.findIndex((w) => w.file === b.getAttribute('data-sample'));
      svcModal.close();
      openLightbox(list, Math.max(0, i));
    });
  }

  /* ---------------- portfolio ---------------- */
  const pf = { filter: 'all', shown: 0, list: [] };
  const pageSize = () => (window.innerWidth < 640 ? 8 : 12);

  function tile(w, i, entering, order) {
    const shape = w.shape === 'tall' ? ' is-tall' : w.shape === 'wide' ? ' is-wide' : '';
    const [title, desc] = tr(w);
    return `
      <button type="button" class="pf-item${shape}${entering ? ' is-entering' : ''}" data-index="${i}"${entering ? ` style="--d:${order * 45}ms"` : ''}>
        <img src="${IMG}${esc(w.file)}" alt="${esc(title + ' — ' + desc)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async">
        <span class="pf-cap">
          <span class="pf-tag">${esc(CATS[w.cat] ? tr(CATS[w.cat]) : '')}</span>
          <span class="pf-title">${esc(title)}</span>
          <span class="pf-desc">${esc(desc)}</span>
        </span>
      </button>`;
  }

  function renderFilters() {
    const el = $('#pf-filters');
    if (!el) return;
    el.innerHTML = Object.keys(CATS).map((k) => {
      const n = k === 'all' ? WORKS.length : WORKS.filter((w) => w.cat === k).length;
      return `<button type="button" class="pf-filter" data-filter="${k}" aria-pressed="${k === pf.filter}">${esc(tr(CATS[k]))}<span class="pf-n">${n}</span></button>`;
    }).join('');
  }

  function updatePortfolioMeta() {
    const more = $('#pf-more');
    if (more) more.hidden = pf.shown >= pf.list.length;
    const count = $('#pf-count');
    if (count) count.textContent = t('portfolio.count', { shown: pf.shown, total: pf.list.length });
  }

  function renderPortfolio(opts) {
    const o = opts || {};
    const grid = $('#pf-grid');
    if (!grid) return;
    pf.list = pf.filter === 'all' ? WORKS : WORKS.filter((w) => w.cat === pf.filter);
    pf.shown = o.keepCount && pf.shown ? Math.min(pf.shown, pf.list.length) : Math.min(pageSize(), pf.list.length);
    grid.innerHTML = pf.list.slice(0, pf.shown).map((w, i) => tile(w, i, !!o.animate, i)).join('');
    updatePortfolioMeta();
  }

  function showMore() {
    const grid = $('#pf-grid');
    const from = pf.shown;
    pf.shown = Math.min(pf.shown + pageSize(), pf.list.length);
    grid.insertAdjacentHTML('beforeend', pf.list.slice(from, pf.shown).map((w, k) => tile(w, from + k, true, k)).join(''));
    updatePortfolioMeta();
    const first = grid.children[from];
    if (first) first.focus({ preventScroll: true });
  }

  function setFilter(key) {
    pf.filter = CATS[key] ? key : 'all';
    $$('#pf-filters .pf-filter').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === pf.filter)));
    renderPortfolio({ animate: true });
  }

  function initPortfolio() {
    const filters = $('#pf-filters');
    const grid = $('#pf-grid');
    if (!filters || !grid) return;
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      setFilter(b.getAttribute('data-filter'));
      b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.pf-item');
      if (item) openLightbox(pf.list, Number(item.getAttribute('data-index')));
    });
    grid.addEventListener('animationend', (e) => { if (e.target.classList) e.target.classList.remove('is-entering'); });
    $('#pf-more').addEventListener('click', showMore);
  }

  /* ---------------- rasm ko'rish oynasi ---------------- */
  const lb = $('#lightbox');
  const lbState = { list: [], index: 0 };
  // portfolio ishlari — file (portfolio papkasidan), boshqa rasmlar (masalan, bilbord slaydlari) — to'liq src
  const lbSrc = (w) => w.src || IMG + w.file;

  function fillLightbox() {
    const w = lbState.list[lbState.index];
    if (!w) return;
    const img = $('#lb-img');
    img.src = lbSrc(w);
    img.alt = `${tr(w)[0]} — ${tr(w)[1]}`;
    img.width = w.w;
    img.height = w.h;
    $('#lb-tag').textContent = CATS[w.cat] ? tr(CATS[w.cat]) : '';
    $('#lb-title').textContent = tr(w)[0];
    $('#lb-desc').textContent = tr(w)[1];
    $('#lb-count').textContent = `${lbState.index + 1} / ${lbState.list.length}`;
    const single = lbState.list.length < 2;
    $('#lb-prev').hidden = single;
    $('#lb-next').hidden = single;
    // qo'shni rasmlarni oldindan yuklash
    [1, -1].forEach((d) => {
      const n = lbState.list[(lbState.index + d + lbState.list.length) % lbState.list.length];
      if (n) new Image().src = lbSrc(n);
    });
  }

  function openLightbox(list, index) {
    if (!lb || !list.length) return;
    lbState.list = list;
    lbState.index = index;
    fillLightbox();
    if (!lb.open) lb.showModal();
  }

  function stepLightbox(d) {
    const len = lbState.list.length;
    lbState.index = (lbState.index + d + len) % len;
    fillLightbox();
  }

  function initDialogs() {
    $$('dialog').forEach((dlg) => {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg || e.target.hasAttribute('data-lb-backdrop') || e.target.closest('[data-close]')) dlg.close();
      });
    });
    if (!lb) return;
    $('#lb-prev').addEventListener('click', () => stepLightbox(-1));
    $('#lb-next').addEventListener('click', () => stepLightbox(1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------------- ariza formasi ---------------- */
  function renderServiceOptions() {
    const sel = $('#f-service');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${esc(t('form.service.ph'))}</option>` +
      SERVICES.map((s) => `<option value="${s.id}">${esc(tr(s).title)}</option>`).join('') +
      `<option value="other">${esc(t('form.service.other'))}</option>`;
    sel.value = current;
  }

  // +998 dan keyingi 9 ta raqam
  function localDigits(value) {
    const v = value.trim();
    if ('+998'.indexOf(v) === 0) return '';
    const rest = v.indexOf('+998') === 0 ? v.slice(4) : v;
    let d = rest.replace(/\D/g, '');
    if (d.length > 9 && d.indexOf('998') === 0) d = d.slice(3);
    else if (d.length === 10 && d[0] === '8') d = d.slice(1); // eski "8 (99) ..." yozuvi
    return d.slice(0, 9);
  }
  function formatPhone(d) {
    if (!d) return '';
    let out = '+998 ' + d.slice(0, 2);
    if (d.length > 2) out += ' ' + d.slice(2, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    return out;
  }

  function setError(field, message) {
    const err = $('#' + field.id + '-err');
    field.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = message; err.hidden = false; }
  }
  function clearError(field) {
    const err = $('#' + field.id + '-err');
    field.removeAttribute('aria-invalid');
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  function showStatus(parts) {
    const box = $('#form-status');
    box.textContent = '';
    parts.forEach((p) => {
      if (typeof p === 'string') { box.appendChild(document.createTextNode(p)); return; }
      const a = document.createElement('a');
      a.href = p.href;
      a.textContent = p.text;
      a.className = 'font-bold text-white underline decoration-neon-300 underline-offset-4';
      if (p.blank) { a.target = '_blank'; a.rel = 'noopener'; }
      box.appendChild(a);
    });
    box.hidden = false;
  }

  function initForm() {
    const form = $('#lead-form');
    if (!form) return;
    const name = $('#f-name');
    const phone = $('#f-phone');
    const service = $('#f-service');
    const submit = $('button[type="submit"]', form);
    const call = { href: 'tel:' + CFG.phone, text: CFG.phoneDisplay };

    phone.addEventListener('input', () => { phone.value = formatPhone(localDigits(phone.value)); clearError(phone); });
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+998 '; });
    phone.addEventListener('blur', () => { if (!localDigits(phone.value)) phone.value = ''; });
    name.addEventListener('input', () => clearError(name));
    service.addEventListener('change', () => clearError(service));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      $('#form-status').hidden = true;
      const digits = localDigits(phone.value);
      const cleanName = name.value.trim();
      let firstBad = null;
      [name, phone, service].forEach(clearError);
      if (cleanName.length < 2) { setError(name, t('form.err.name')); firstBad = firstBad || name; }
      if (digits.length !== 9) { setError(phone, t('form.err.phone')); firstBad = firstBad || phone; }
      if (!service.value) { setError(service, t('form.err.service')); firstBad = firstBad || service; }
      if (firstBad) { firstBad.focus(); return; }

      const svc = SERVICES.find((s) => s.id === service.value);
      const lead = {
        name: cleanName,
        phone: formatPhone(digits),
        service: svc ? tr(svc).title : t('form.service.other'),
        serviceId: service.value,
        lang,
      };

      if (CFG.formEndpoint) {
        const label = $('span', submit);
        const original = label.textContent;
        submit.disabled = true;
        label.textContent = t('form.sending');
        fetch(CFG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(lead),
        })
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); showStatus([t('form.ok')]); form.reset(); })
          .catch(() => showStatus([t('form.fail') + ' ', call]))
          .finally(() => { submit.disabled = false; label.textContent = original; });
        return;
      }

      if (CFG.telegramManager) {
        const url = `https://t.me/${CFG.telegramManager}?text=${encodeURIComponent(t('form.msg', lead))}`;
        window.open(url, '_blank', 'noopener');
        showStatus([t('form.tg') + ' ', { href: url, text: t('form.tg.again'), blank: true }, ' · ', call]);
        return;
      }

      showStatus([t('form.fail') + ' ', call]);
    });
  }

  /* ---------------- kirish animatsiyasi ---------------- */
  function initIntro() {
    const el = $('#intro');
    if (!el) return;
    if (root.classList.contains('no-intro')) { el.remove(); return; }
    const done = () => {
      root.classList.remove('intro-on');
      document.removeEventListener('keydown', skip);
      el.remove();
    };
    function skip() {
      root.classList.add('intro-skip');
      setTimeout(done, 450);
    }
    el.addEventListener('click', skip);
    document.addEventListener('keydown', skip);
    el.addEventListener('animationend', (e) => { if (e.target === el) done(); });
  }

  /* ---------------- ishga tushirish ---------------- */
  function init() {
    initIntro();
    initHero();
    renderClients();
    setLang(lang, false);
    initTicker();
    initAds();
    initTheme();
    initHeader();
    initServices();
    initPortfolio();
    initDialogs();
    initForm();
    initGlow();
    initCounters();
    observeReveal();
    window.__stellaReady = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
