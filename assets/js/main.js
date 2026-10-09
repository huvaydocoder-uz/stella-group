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
  const LED = window.STELLA_LED || [];
  const IMG = 'assets/img/portfolio/';

  const root = document.documentElement;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lang = root.lang === 'ru' ? 'ru' : 'uz';
  let firstRender = true;

  /* ---------------- yordamchi funksiyalar ---------------- */
  const t = (key, vars) => {
    let s = I18N[lang] && I18N[lang][key];
    if (s == null) s = I18N.uz[key];
    if (s == null) return key;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
    return s;
  };
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
    lang = next === 'ru' ? 'ru' : 'uz';
    root.lang = lang;
    if (persist) {
      try { localStorage.setItem('stella-lang', lang); } catch (e) { /* xususiy rejim */ }
      try {
        const url = new URL(location.href);
        if (lang === 'ru') url.searchParams.set('lang', 'ru'); else url.searchParams.delete('lang');
        history.replaceState(null, '', url);
      } catch (e) { /* file:// */ }
    }
    $$('.lang-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)));
    applyStaticText();
    renderTicker();
    renderLed();
    renderServices();
    renderServiceOptions();
    renderFilters();
    renderPortfolio({ keepCount: true });
    updateHeroCaption();
    firstRender = false;
    root.classList.remove('i18n-pending');
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

    $$('.lang-switch button').forEach((b) => b.addEventListener('click', () => setLang(b.getAttribute('data-lang'), true)));

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
      if (w) img.alt = `${w[lang][0]} — ${w[lang][1]}`;
    });
    const cur = hero.slides[hero.index];
    const w = cur && workByFile(cur.getAttribute('data-file'));
    if (!w) return;
    $('#hero-cap-title').textContent = w[lang][0];
    $('#hero-cap-desc').textContent = w[lang][1];
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

  /* ---------------- LED ekranlar: manzil → Yandex xarita ---------------- */
  const led = { index: -1 };
  const ledPoint = (p) => `${p.ll[1]},${p.ll[0]}`;
  // bir nuqtada bir nechta ekran bo'lishi mumkin — umumiy ko'rinishda takrorlanmaydi
  const ledAllPoints = () => Array.from(new Set(LED.map(ledPoint)));

  function ledMapUrl(p, embed) {
    const base = embed ? 'https://yandex.uz/map-widget/v1/' : 'https://yandex.uz/maps/';
    const q = p
      ? `ll=${ledPoint(p)}&z=17&pt=${ledPoint(p)},pm2vvl`
      : `ll=64.5500,39.9300&z=10&pt=${ledAllPoints().map((pt) => `${pt},pm2vvm`).join('~')}`;
    return `${base}?${q}&lang=${lang === 'ru' ? 'ru_RU' : 'uz_UZ'}`;
  }

  function showLed(i) {
    led.index = i;
    const p = LED[i];
    $$('#led-list .led-item').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-led')) === i)));
    const map = $('#led-map');
    const src = ledMapUrl(p, true);
    if (map && map.getAttribute('src') !== src) map.setAttribute('src', src);
    $('#led-cur-title').textContent = p ? p[lang][0] : t('led.all');
    $('#led-cur-desc').textContent = p
      ? `${p[lang][1]} · ${t('led.city.' + p.city)} · ${t('led.size', { w: p.size[0], h: p.size[1] })}`
      : t('led.pick');
    $('#led-open').setAttribute('href', ledMapUrl(p, false));
  }

  function renderLed() {
    const list = $('#led-list');
    if (!list) return;
    const item = (i, badge, title, desc) => `
      <button type="button" class="led-item" data-led="${i}" aria-pressed="false">
        <span class="led-num">${badge}</span>
        <span class="min-w-0">
          <span class="block font-display text-sm font-bold">${esc(title)}</span>
          <span class="mt-0.5 block text-xs leading-snug text-brand-100/75">${esc(desc)}</span>
        </span>
      </button>`;
    list.innerHTML = item(-1, icon('i-pin'), t('led.all'), t('led.count', { n: LED.length }))
      + LED.map((p, i) => item(i, i + 1, p[lang][0], p[lang][1])).join('');
    showLed(led.index);
  }

  function initLed() {
    const list = $('#led-list');
    if (!list) return;
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.led-item');
      if (btn) showLed(Number(btn.getAttribute('data-led')));
    });
  }

  /* ---------------- xizmatlar ---------------- */
  function renderServices() {
    const grid = $('#services-grid');
    if (!grid) return;
    const reveal = (i) => (firstRender ? ` data-reveal style="--d:${(i % 4) * 70}ms"` : '');
    const cards = SERVICES.map((s, i) => {
      const L = s[lang];
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
    if (s.samples) return s.samples.map(workByFile).filter(Boolean);
    return s.cat ? WORKS.filter((w) => w.cat === s.cat).slice(0, 3) : [];
  }

  function openService(id) {
    const s = SERVICES.find((x) => x.id === id);
    if (!s || !svcModal) return;
    currentService = s;
    const L = s[lang];
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
    $('#svc-modal-samples').innerHTML = samples.map((w) => `
      <button type="button" class="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 transition hover:border-neon-300" data-sample="${esc(w.file)}" title="${esc(w[lang][0])}">
        <img src="${IMG}${esc(w.file)}" alt="${esc(w[lang][0] + ' — ' + w[lang][1])}" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-110">
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
    const [title, desc] = w[lang];
    return `
      <button type="button" class="pf-item${shape}${entering ? ' is-entering' : ''}" data-index="${i}"${entering ? ` style="--d:${order * 45}ms"` : ''}>
        <img src="${IMG}${esc(w.file)}" alt="${esc(title + ' — ' + desc)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async">
        <span class="pf-cap">
          <span class="pf-tag">${esc(CATS[w.cat] ? CATS[w.cat][lang] : '')}</span>
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
      return `<button type="button" class="pf-filter" data-filter="${k}" aria-pressed="${k === pf.filter}">${esc(CATS[k][lang])}<span class="pf-n">${n}</span></button>`;
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

  function fillLightbox() {
    const w = lbState.list[lbState.index];
    if (!w) return;
    const img = $('#lb-img');
    img.src = IMG + w.file;
    img.alt = `${w[lang][0]} — ${w[lang][1]}`;
    img.width = w.w;
    img.height = w.h;
    $('#lb-tag').textContent = CATS[w.cat] ? CATS[w.cat][lang] : '';
    $('#lb-title').textContent = w[lang][0];
    $('#lb-desc').textContent = w[lang][1];
    $('#lb-count').textContent = `${lbState.index + 1} / ${lbState.list.length}`;
    const single = lbState.list.length < 2;
    $('#lb-prev').hidden = single;
    $('#lb-next').hidden = single;
    // qo'shni rasmlarni oldindan yuklash
    [1, -1].forEach((d) => {
      const n = lbState.list[(lbState.index + d + lbState.list.length) % lbState.list.length];
      if (n) new Image().src = IMG + n.file;
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
      SERVICES.map((s) => `<option value="${s.id}">${esc(s[lang].title)}</option>`).join('') +
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
        service: svc ? svc[lang].title : t('form.service.other'),
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

  /* ---------------- ishga tushirish ---------------- */
  function init() {
    initHero();
    renderClients();
    setLang(lang, false);
    initTicker();
    initLed();
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
