/* Stella Group — 1-section: kechki chorraha sahnasi.
   Yo'l o'rtasidagi orolchada katta LED ekran (Stella logotipi va yozuv), ikki tomonga harakatlanayotgan
   mashina va avtobuslar, yo'laklarda yurgan odamlar, svetoforli piyodalar o'tish joyi.
   Video emas — hammasi <canvas> da kod bilan chiziladi, shuning uchun yengil va har qanday ekranda tiniq. */
(function () {
  'use strict';

  const section = document.getElementById('scene');
  const canvas = document.getElementById('scene-canvas');
  if (!section || !canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* LED ekrandagi slaydlar: avval kreativ yozuv, keyin uning sababi va aniq raqamlar.
     Raqamlar manbasi: Edem LED ekrani ko'rsatkichlari (kerakli/LED_slayd_yangi_QR.pdf, 1-slayd: OTS, Universe,
     Reach, yosh oralig'i) va saytdagi ma'lumotlar (21 ta ekran, 20+ yil, 1000+ loyiha, telefon). */
  // har slayd necha soniya turadi (barcha tillarda bir xil)
  const DUR = [2, 3, 3, 3, 3, 3, 4.5];
  // sayt tiliga qarab (html lang) — uz / ru / en
  const SLIDES_I18N = {
    uz: [
      { lines: ['BU YERDA', 'REKLAMANGIZNI', 'JOYLASHTIRMANG'] },
      { kicker: 'SABABI:', lines: ['MIJOZLARINGIZ', 'KO‘PAYIB KETADI!'] },
      { kicker: 'BITTA EKRANDA', big: '184 268', cap: 'MARTA KO‘RISH IMKONIYATI (OTS)' },
      { kicker: 'MAQSADLI AUDITORIYA', big: '325 650', cap: 'KISHI · 18–50 YOSH' },
      { kicker: 'SHAHAR AHOLISINING', big: '10%', cap: 'REKLAMANGIZNI KAMIDA 1 MARTA KO‘RADI' },
      { kicker: 'BUXORO BO‘YLAB', big: '21 TA EKRAN', cap: 'KUNU TUN, HAR KUNI' },
      { kicker: 'ENDI ESA — JOYLASHTIRING', big: '99 700 00 44', cap: 'STELLA GROUP · 20+ YIL · 1000+ LOYIHA' },
    ],
    ru: [
      { lines: ['ЗДЕСЬ', 'РЕКЛАМУ', 'НЕ РАЗМЕЩАЙТЕ'] },
      { kicker: 'ПРИЧИНА:', lines: ['КЛИЕНТОВ СТАНЕТ', 'СЛИШКОМ МНОГО!'] },
      { kicker: 'НА ОДНОМ ЭКРАНЕ', big: '184 268', cap: 'ВОЗМОЖНОСТЕЙ УВИДЕТЬ (OTS)' },
      { kicker: 'ЦЕЛЕВАЯ АУДИТОРИЯ', big: '325 650', cap: 'ЧЕЛОВЕК · 18–50 ЛЕТ' },
      { kicker: 'ОХВАТ', big: '10%', cap: 'ЖИТЕЛЕЙ ГОРОДА УВИДЯТ РЕКЛАМУ ХОТЯ БЫ РАЗ' },
      { kicker: 'ПО ВСЕЙ БУХАРЕ', big: '21 ЭКРАН', cap: 'КРУГЛОСУТОЧНО, КАЖДЫЙ ДЕНЬ' },
      { kicker: 'А ТЕПЕРЬ — РАЗМЕЩАЙТЕ', big: '99 700 00 44', cap: 'STELLA GROUP · 20+ ЛЕТ · 1000+ ПРОЕКТОВ' },
    ],
    en: [
      { lines: ['DO NOT PLACE', 'YOUR ADS', 'HERE'] },
      { kicker: 'THE REASON:', lines: ['YOU’LL GET TOO', 'MANY CUSTOMERS!'] },
      { kicker: 'ON ONE SCREEN', big: '184 268', cap: 'OPPORTUNITIES TO SEE (OTS)' },
      { kicker: 'TARGET AUDIENCE', big: '325 650', cap: 'PEOPLE · AGED 18–50' },
      { kicker: 'REACH', big: '10%', cap: 'OF RESIDENTS SEE YOUR AD AT LEAST ONCE' },
      { kicker: 'ACROSS BUKHARA', big: '21 SCREENS', cap: 'DAY AND NIGHT, EVERY DAY' },
      { kicker: 'NOW — PLACE YOUR AD', big: '99 700 00 44', cap: 'STELLA GROUP · 20+ YEARS · 1000+ PROJECTS' },
    ],
  };
  const pageLang = () => (SLIDES_I18N[document.documentElement.lang] ? document.documentElement.lang : 'uz');
  let SLIDES = SLIDES_I18N[pageLang()];
  const FONT = 'Montserrat, "Segoe UI", Arial, sans-serif';
  const SHOPS = ['MARKET', 'KAFE', 'APTEKA', 'OSHXONA', 'KIYIM', 'NON', 'MEVA', 'TELEFON', 'GULLAR', 'SHIRINLIK'];
  const NEON = ['#ff4fd8', '#4ff3ff', '#ffd84d', '#7dff8a', '#ff8a4f', '#b48cff'];

  const logo = new Image();
  logo.src = 'assets/img/logo-white.png';

  /* ---------- yordamchilar ---------- */
  function seeded(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = Math.random;
  const rr = (a, b, r = R) => a + (b - a) * r();
  const pick = (arr, r = R) => arr[Math.floor(r() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function glow(c, x, y, r, color, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', a));
    g.addColorStop(1, color.replace('A', 0));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* ---------- o'lchamlar ---------- */
  let W = 0, H = 0, DPR = 1, u = 1;
  const L = {};
  let city = null;   // qotgan fon (osmon, binolar, yo'l) — o'lcham o'zgarganda qayta chiziladi
  let faces = [];    // LED ekran yuzalari — har slayd uchun bittadan
  let rings = null;  // ekran chetidagi nuqtali halqalar (alohida — miltillaydi)
  let shopSigns = [];
  let flickWins = [];

  function layout() {
    const rect = section.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(480, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    // asosiy o'lchov birligi: tor (telefon) ekranda kenglikka ham bog'lanadi
    u = Math.min(H / 100, W / 62);

    L.backWalkTop = H * 0.535;
    L.roadTop = H * 0.592;
    L.laneA = H * 0.672;          // orqa qator (chapga)
    L.medTop = H * 0.700;
    L.medBot = H * 0.732;
    L.laneB = H * 0.842;          // old qator (o'ngga)
    L.roadBot = H * 0.872;
    L.backWalkY = H * 0.582;      // orqa yo'lakdagi odamlar oyog'i
    L.frontWalkY = H * 0.955;     // old yo'lakdagi odamlar oyog'i
    // miqyoslar: orqa qator / old qator / orqa yo'lak / old yo'lak
    L.sA = 0.95; L.sB = 1.3; L.sBack = 0.72; L.sFront = 1.35;
    L.zx = W < 700 ? W * 0.17 : W * 0.2;  // piyodalar o'tish joyi
    L.zw = 9 * u;

    // LED ekran
    const fw = Math.min(W * 0.86, H * 0.66, 64 * u * 1.15);
    L.faceW = fw;
    L.faceH = fw / 2.3;
    L.frame = L.faceH * 0.065;
    L.cx = W * 0.5;
    L.faceBot = Math.min(H * 0.43, L.medTop - L.faceH * 1.05);
    L.faceTop = L.faceBot - L.faceH;
    if (L.faceTop < H * 0.13) { L.faceTop = H * 0.13; L.faceBot = L.faceTop + L.faceH; }
    L.poleW = fw * 0.12;
    L.poleBase = (L.medTop + L.medBot) / 2;

    buildCity();
    buildFace();
  }

  /* ---------- qotgan fon ---------- */
  function buildCity() {
    const r = seeded(20260617);
    city = document.createElement('canvas');
    city.width = canvas.width;
    city.height = canvas.height;
    const c = city.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    shopSigns = [];
    flickWins = [];

    // osmon
    const sky = c.createLinearGradient(0, 0, 0, L.backWalkTop);
    sky.addColorStop(0, '#120a2e');
    sky.addColorStop(0.45, '#2c1766');
    sky.addColorStop(0.8, '#5b2b9a');
    sky.addColorStop(1, '#a5508f');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, L.backWalkTop);
    for (let i = 0; i < W / 9; i++) {
      c.fillStyle = `rgba(255,255,255,${rr(0.15, 0.7, r)})`;
      const s = rr(0.6, 1.6, r);
      c.fillRect(rr(0, W, r), rr(0, L.backWalkTop * 0.55, r), s, s);
    }

    // uzoqdagi shahar: binolar, Minorai Kalon va gumbaz
    const far = L.backWalkTop;
    c.fillStyle = '#2a1857';
    for (let x = -10; x < W; ) {
      const bw = rr(6, 16, r) * u, bh = rr(10, 26, r) * u;
      c.fillRect(x, far - bh, bw, bh);
      for (let wy = far - bh + u; wy < far - 2 * u; wy += 1.6 * u) {
        for (let wx = x + 0.8 * u; wx < x + bw - u; wx += 1.6 * u) {
          if (r() < 0.25) { c.fillStyle = 'rgba(255,214,140,0.35)'; c.fillRect(wx, wy, 0.5 * u, 0.7 * u); c.fillStyle = '#2a1857'; }
        }
      }
      x += bw + rr(0, 3, r) * u;
    }
    const mx = W * (W < 700 ? 0.86 : 0.8);
    c.fillStyle = '#231449';
    c.beginPath();
    c.moveTo(mx - 2.2 * u, far);
    c.lineTo(mx - 1.5 * u, far - 44 * u);
    c.lineTo(mx + 1.5 * u, far - 44 * u);
    c.lineTo(mx + 2.2 * u, far);
    c.fill();
    rrect(c, mx - 2.1 * u, far - 49 * u, 4.2 * u, 5 * u, 0.6 * u); c.fill();
    c.beginPath(); c.moveTo(mx - 1.6 * u, far - 49 * u); c.quadraticCurveTo(mx, far - 53 * u, mx + 1.6 * u, far - 49 * u); c.fill();
    c.fillStyle = 'rgba(255,214,140,0.5)';
    for (let i = 0; i < 4; i++) c.fillRect(mx - 1.4 * u + i * 0.8 * u, far - 47 * u, 0.4 * u, 1.6 * u);
    c.fillStyle = '#231449';
    const dx = mx + 9 * u;
    c.fillRect(dx - 6 * u, far - 14 * u, 12 * u, 14 * u);
    c.beginPath(); c.ellipse(dx, far - 14 * u, 5.2 * u, 6 * u, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#2b3f8f';
    c.beginPath(); c.ellipse(dx, far - 14 * u, 4.6 * u, 5.4 * u, 0, Math.PI, 0); c.fill();

    // ufqdagi tuman
    const haze = c.createLinearGradient(0, far - 18 * u, 0, far);
    haze.addColorStop(0, 'rgba(165,80,143,0)');
    haze.addColorStop(1, 'rgba(165,80,143,0.35)');
    c.fillStyle = haze;
    c.fillRect(0, far - 18 * u, W, 18 * u);

    // yaqin binolar va do'konlar
    const bs = 0.62; // binolar miqyosi
    let shopI = Math.floor(r() * SHOPS.length);
    for (let x = -rr(2, 8, r) * u; x < W; ) {
      const bw = rr(16, 28, r) * u * bs * 1.5;
      const bh = rr(16, 30, r) * u * bs * 1.4;
      const top = L.backWalkTop - bh;
      const hue = pick(['#3a2368', '#33205c', '#40276f', '#2f1d55', '#3d2a63'], r);
      const g = c.createLinearGradient(x, 0, x + bw, 0);
      g.addColorStop(0, hue);
      g.addColorStop(1, '#22133f');
      c.fillStyle = g;
      c.fillRect(x, top, bw, bh);
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(x, top, bw, 0.5 * u);

      // derazalar
      const shopH = 6.5 * u * bs * 1.2;
      const ww = 1.7 * u * bs * 1.3, wh = 2.3 * u * bs * 1.3, gap = 1.3 * u * bs * 1.3;
      const cols = Math.max(1, Math.floor((bw - gap) / (ww + gap)));
      const ox = x + (bw - (cols * (ww + gap) - gap)) / 2;
      for (let wy = top + 1.6 * u; wy < L.backWalkTop - shopH - wh - u * 0.6; wy += wh + gap) {
        for (let k = 0; k < cols; k++) {
          const wx = ox + k * (ww + gap);
          const lit = r() < 0.55;
          c.fillStyle = lit ? pick(['#ffd28a', '#ffc46b', '#ffe3b0', '#a8d8ff'], r) : '#1b1036';
          c.globalAlpha = lit ? rr(0.6, 0.95, r) : 1;
          c.fillRect(wx, wy, ww, wh);
          c.globalAlpha = 1;
          if (lit && r() < 0.08) flickWins.push({ x: wx, y: wy, w: ww, h: wh, p: rr(0, 6, r) });
        }
      }

      // do'kon vitrinasi
      const sy = L.backWalkTop - shopH;
      const vg = c.createLinearGradient(0, sy, 0, L.backWalkTop);
      vg.addColorStop(0, '#ffcf8a');
      vg.addColorStop(1, '#ff9a5a');
      c.fillStyle = vg;
      c.globalAlpha = 0.85;
      c.fillRect(x + 0.8 * u, sy + 2.4 * u * bs, bw - 1.6 * u, shopH - 2.4 * u * bs);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(40,20,60,0.55)';
      for (let k = x + 0.8 * u; k < x + bw - u; k += 3.2 * u) c.fillRect(k, sy + 2.4 * u * bs, 0.25 * u, shopH);
      // vitrina ichidagi odamlar soyasi
      for (let k = 0; k < 2; k++) {
        if (r() < 0.6) {
          const px = x + rr(2, bw / u - 2, r) * u, py = L.backWalkTop - 0.3 * u;
          c.fillStyle = 'rgba(60,25,60,0.55)';
          c.beginPath(); c.arc(px, py - 3.6 * u * bs, 0.55 * u, 0, Math.PI * 2); c.fill();
          rrect(c, px - 0.7 * u, py - 3 * u * bs, 1.4 * u, 3 * u * bs, 0.4 * u); c.fill();
        }
      }
      // soyabon
      const aw = pick(['#c2275f', '#2a8f8a', '#d9822b', '#5a3dc2'], r);
      for (let k = 0, n = Math.ceil(bw / (2 * u)); k < n; k++) {
        c.fillStyle = k % 2 ? aw : '#f4ecff';
        c.fillRect(x + k * 2 * u, sy + 1.5 * u * bs, Math.min(2 * u, x + bw - (x + k * 2 * u)), 0.9 * u * bs * 1.3);
      }
      // peshlavha
      const name = SHOPS[shopI++ % SHOPS.length];
      const color = pick(NEON, r);
      shopSigns.push({ x: x + bw / 2, y: sy + 0.75 * u * bs, w: bw * 0.86, h: 1.5 * u * bs * 1.2, name, color, p: rr(0, 6, r) });
      x += bw + rr(0, 1.2, r) * u;
    }

    // orqa yo'lak
    c.fillStyle = '#3b3352';
    c.fillRect(0, L.backWalkTop, W, L.roadTop - L.backWalkTop);
    c.fillStyle = '#4a4266';
    for (let x = 0; x < W; x += 4 * u) c.fillRect(x, L.backWalkTop, 0.12 * u, L.roadTop - L.backWalkTop);
    c.fillStyle = '#8c86a3';
    c.fillRect(0, L.roadTop - 0.45 * u, W, 0.45 * u);

    // yo'l
    const rg = c.createLinearGradient(0, L.roadTop, 0, L.roadBot);
    rg.addColorStop(0, '#24203a');
    rg.addColorStop(1, '#1a1729');
    c.fillStyle = rg;
    c.fillRect(0, L.roadTop, W, L.roadBot - L.roadTop);
    // qator chiziqlari
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < W; x += 9 * u) {
      c.fillRect(x, (L.roadTop + L.medTop) / 2 - 0.1 * u, 4 * u * 0.72, 0.2 * u);
      c.fillRect(x, (L.medBot + L.roadBot) / 2 - 0.15 * u, 4.5 * u, 0.3 * u);
    }
    // ajratuvchi orolcha
    c.fillStyle = '#2f5a3a';
    c.fillRect(0, L.medTop, W, L.medBot - L.medTop);
    c.fillStyle = '#b9b4c9';
    c.fillRect(0, L.medTop - 0.3 * u, W, 0.3 * u);
    c.fillStyle = '#d7d2e4';
    c.fillRect(0, L.medBot, W, 0.5 * u);
    c.fillStyle = '#3e7a4c';
    for (let x = rr(0, 6, r) * u; x < W; x += rr(5, 10, r) * u) {
      c.beginPath(); c.ellipse(x, L.medTop + 0.2 * u, rr(1, 2, r) * u, 0.9 * u, 0, Math.PI, 0); c.fill();
    }

    // piyodalar o'tish joyi (zebra)
    c.fillStyle = 'rgba(240,240,250,0.85)';
    const zt = L.roadTop, zb = L.roadBot;
    for (let y = zt + 0.6 * u; y < zb - 0.4 * u; y += 1.5 * u) {
      if (y > L.medTop - 0.6 * u && y < L.medBot + 0.3 * u) continue;
      const t = (y - zt) / (zb - zt);
      const w = L.zw * lerp(0.75, 1.1, t);
      c.fillRect(L.zx - w / 2, y, w, 0.75 * u * lerp(0.7, 1.1, t));
    }
    // to'xtash chiziqlari
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillRect(L.zx + L.zw * 0.55 + 0.6 * u, L.roadTop, 0.4 * u, L.medTop - L.roadTop);
    c.fillRect(L.zx - L.zw * 0.62 - 1.2 * u, L.medBot, 0.5 * u, L.roadBot - L.medBot);

    // old yo'lak
    c.fillStyle = '#d0cbe0';
    c.fillRect(0, L.roadBot, W, 0.6 * u);
    const fg = c.createLinearGradient(0, L.roadBot, 0, H);
    fg.addColorStop(0, '#4a4167');
    fg.addColorStop(1, '#2b2343');
    c.fillStyle = fg;
    c.fillRect(0, L.roadBot + 0.6 * u, W, H - L.roadBot);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < W; x += 7 * u) c.fillRect(x, L.roadBot + 0.6 * u, 0.15 * u, H);

    // ko'cha chiroqlari (orqa yo'lakda) — yorug'lik dog'i bilan
    for (let x = 6 * u; x < W; x += 30 * u) {
      const s = 0.62, top = L.backWalkTop - 18 * u * s;
      c.fillStyle = '#1d1533';
      c.fillRect(x - 0.3 * u, top, 0.6 * u, L.roadTop - top);
      c.fillRect(x - 0.3 * u, top, 3 * u, 0.5 * u);
      c.save();
      c.globalCompositeOperation = 'lighter';
      glow(c, x + 2.6 * u, top + 0.8 * u, 7 * u, 'rgba(255,200,120,A)', 0.55);
      c.beginPath();
      c.moveTo(x + 1.8 * u, top + u);
      c.lineTo(x + 3.4 * u, top + u);
      c.lineTo(x + 8 * u, L.roadTop + 3 * u);
      c.lineTo(x - 3 * u, L.roadTop + 3 * u);
      c.closePath();
      const cone = c.createLinearGradient(0, top, 0, L.roadTop + 3 * u);
      cone.addColorStop(0, 'rgba(255,200,120,0.22)');
      cone.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = cone;
      c.fill();
      c.restore();
      c.fillStyle = '#fff3d6';
      rrect(c, x + 1.8 * u, top + 0.3 * u, 1.6 * u, 0.6 * u, 0.3 * u); c.fill();
    }
  }

  /* ---------- LED ekran yuzasi ---------- */
  function fit(c, text, maxW, size, weight) {
    c.font = `${weight} ${size}px ${FONT}`;
    const w = c.measureText(text).width;
    return w > maxW ? (size * maxW) / w : size;
  }
  // sariq, yonib turgan LED yozuv
  function ledText(c, text, x, y, size, color, glowColor) {
    c.font = `800 ${size}px ${FONT}`;
    c.shadowColor = glowColor;
    c.shadowBlur = size * 0.35;
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillText(text, x, y - size * 0.03);
    c.fillStyle = color;
    c.fillText(text, x, y + size * 0.01);
  }
  const YELLOW = ['#ffd21f', 'rgba(255,214,40,0.85)'];
  const WHITE = ['#ffffff', 'rgba(170,200,255,0.9)'];

  function paintFace(slide, fw, fh) {
    const cv = document.createElement('canvas');
    cv.width = fw; cv.height = fh;
    const c = cv.getContext('2d');
    const bg = c.createRadialGradient(fw / 2, fh * 0.55, fh * 0.1, fw / 2, fh * 0.5, fw * 0.6);
    bg.addColorStop(0, '#2747ff');
    bg.addColorStop(0.6, '#1430d6');
    bg.addColorStop(1, '#0a1a8f');
    c.fillStyle = bg;
    c.fillRect(0, 0, fw, fh);
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    // logotip
    const lh = fh * (slide.big ? 0.15 : 0.2), lw = lh * (872 / 440);
    const ly = fh * 0.06;
    if (logo.complete && logo.naturalWidth) c.drawImage(logo, (fw - lw) / 2, ly, lw, lh);
    let top = ly + lh + fh * 0.05;

    if (slide.big) {
      // raqamli slayd: kichik sarlavha — katta raqam — izoh
      const ks = fit(c, slide.kicker, fw * 0.8, fh * 0.085, 800);
      ledText(c, slide.kicker, fw / 2, fh * 0.34, ks, WHITE[0], WHITE[1]);
      const bs = fit(c, slide.big, fw * 0.84, fh * 0.3, 800);
      ledText(c, slide.big, fw / 2, fh * 0.6, bs, YELLOW[0], YELLOW[1]);
      const cs = fit(c, slide.cap, fw * 0.86, fh * 0.07, 800);
      ledText(c, slide.cap, fw / 2, fh * 0.86, cs, WHITE[0], WHITE[1]);
    } else {
      if (slide.kicker) {
        const ks = fit(c, slide.kicker, fw * 0.8, fh * 0.12, 800);
        ledText(c, slide.kicker, fw / 2, top + ks * 0.6, ks, WHITE[0], WHITE[1]);
        top += ks * 1.3;
      }
      // yozuv: qatorlar bir xil o'lchamda, kenglikka sig'diriladi
      const bottom = fh * 0.95;
      const lineH = (bottom - top) / slide.lines.length;
      let size = Math.min(lineH * 0.86, fh * 0.22);
      c.font = `800 ${size}px ${FONT}`;
      const widest = Math.max(...slide.lines.map((x) => c.measureText(x).width));
      if (widest > fw * 0.8) size *= (fw * 0.8) / widest;
      slide.lines.forEach((x, i) => ledText(c, x, fw / 2, top + lineH * (i + 0.5), size, YELLOW[0], YELLOW[1]));
    }

    // LED piksel to'ri
    c.fillStyle = 'rgba(0,0,40,0.28)';
    const step = Math.max(3, Math.round(DPR * 2.5));
    for (let x = 0; x < fw; x += step) c.fillRect(x, 0, 1, fh);
    for (let y = 0; y < fh; y += step) c.fillRect(0, y, fw, 1);
    return cv;
  }

  function buildFace() {
    const fw = Math.round(L.faceW * DPR), fh = Math.round(L.faceH * DPR);
    SLIDES = SLIDES_I18N[pageLang()];
    faces = SLIDES.map((sl) => paintFace(sl, fw, fh));
    rings = document.createElement('canvas');
    rings.width = fw; rings.height = fh;

    // chetlardagi nuqtali halqalar (asl ekrandagi kabi)
    const rc = rings.getContext('2d');
    [[fw * 0.08, fh * 0.5], [fw * 0.92, fh * 0.5]].forEach(([cx, cy]) => {
      for (let k = 1; k <= 9; k++) {
        const rad = k * fh * 0.075;
        const n = Math.floor(rad * 0.55);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
          if (x < 0 || x > fw || y < 0 || y > fh) continue;
          rc.fillStyle = `rgba(170,205,255,${0.95 - k * 0.07})`;
          rc.beginPath(); rc.arc(x, y, fh * 0.009, 0, Math.PI * 2); rc.fill();
        }
      }
    });
  }

  /* ---------- svetofor ---------- */
  const CYCLE = 20;
  function lightAt(t) {
    const p = t % CYCLE;
    return p < 10 ? 'green' : p < 12 ? 'yellow' : 'red';
  }
  function pedPhase(t) {
    const p = t % CYCLE;
    if (p >= 12.6 && p < 16.5) return 'go';
    if (p >= 16.5 && p < 18.5) return 'blink';
    return 'stop';
  }

  /* ---------- mashinalar ---------- */
  const lanes = [
    { dir: -1, s: () => L.sA, y: () => L.laneA, cars: [], timer: 0 },
    { dir: 1, s: () => L.sB, y: () => L.laneB, cars: [], timer: 0.5 },
  ];
  const CAR_COLORS = ['#e8e8f0', '#1d1d24', '#b3122e', '#2d5bd8', '#8f97a6', '#f2f2f2', '#3c3c46', '#0f6b5c', '#c9a227', '#6a2fb5'];
  const BUS_LIVERY = [
    { body: '#f6f7f2', stripe: '#8fd13b', stripe2: '#2fae4a' },   // Alixan Trans uslubida
    { body: '#f4f4f6', stripe: '#d4202f', stripe2: '#1f3f9e' },   // Miramax uslubida
    { body: '#1f4fd8', stripe: '#ffffff', stripe2: '#9fb8ff' },   // Progress Mega Trans uslubida
  ];

  function newCar(lane) {
    const roll = R();
    const type = roll < 0.12 ? 'bus' : roll < 0.2 ? 'minibus' : roll < 0.36 ? 'taxi' : roll < 0.55 ? 'suv' : 'sedan';
    const len = { bus: 30, minibus: 17, taxi: 12.5, suv: 13, sedan: 12.5 }[type];
    const vmax = (type === 'bus' ? rr(8, 10) : rr(11, 16)) * u * lane.s();
    return {
      type, len, vmax, v: vmax * 0.9, x: 0, brake: 0,
      color: type === 'taxi' ? '#f5f5f0' : pick(CAR_COLORS),
      livery: pick(BUS_LIVERY),
    };
  }

  function stepCars(dt, t) {
    const light = lightAt(t);
    lanes.forEach((lane) => {
      const s = lane.s(), dir = lane.dir;
      const cars = lane.cars;
      const stopX = dir > 0 ? L.zx - L.zw * 0.62 - 1.5 * u : L.zx + L.zw * 0.55 + 1 * u;
      // tartib: eng oldindagi birinchi
      cars.sort((a, b) => dir * (b.x - a.x));
      for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const lenPx = car.len * u * s;
        let free = Infinity;
        if (i > 0) {
          const lead = cars[i - 1];
          const leadRear = lead.x - dir * lead.len * u * s;
          free = dir * (leadRear - car.x) - 2.2 * u * s;
        }
        const toStop = dir * (stopX - car.x);
        if (light !== 'green' && toStop > -0.5 * u) {
          // sariqda — juda yaqin bo'lsa o'tib ketadi
          if (!(light === 'yellow' && toStop < 3 * u * s)) free = Math.min(free, toStop);
        }
        const target = clamp(free * 1.4, 0, car.vmax);
        const prev = car.v;
        car.v += (target - car.v) * Math.min(1, dt * (target < car.v ? 4 : 1.2));
        if (free < 0.2 * u) car.v = Math.min(car.v, 0);
        car.brake = car.v < prev - 0.5 || car.v < 0.5 * u ? 1 : Math.max(0, car.brake - dt * 3);
        car.x += dir * car.v * dt;
        car.lenPx = lenPx;
      }
      // chiqib ketganlarni olib tashlash
      lane.cars = cars.filter((c) => (dir > 0 ? c.x - c.lenPx < W + 20 * u : c.x + c.lenPx > -20 * u));
      // yangi mashina
      lane.timer -= dt;
      if (lane.timer <= 0) {
        const entry = dir > 0 ? -2 * u : W + 2 * u;
        const last = lane.cars.reduce((m, c) => (m === null || dir * (c.x - m.x) < 0 ? c : m), null);
        const car = newCar(lane);
        const lenPx = car.len * u * s;
        const clear = !last || dir * ((last.x - dir * last.lenPx) - entry) > 3 * u * s;
        if (clear) {
          car.x = entry;
          car.lenPx = lenPx;
          if (last) car.v = Math.min(car.vmax, last.v + u);
          lane.cars.push(car);
          lane.timer = rr(1.1, 3.4);
        } else lane.timer = 0.4;
      }
    });
  }

  function drawCar(c, car, x, y, s, dir) {
    const k = u * s;
    c.save();
    c.translate(x, y);
    c.scale(dir * k, k);
    const len = car.len;
    // yer soyasi
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(-len / 2, 0.15, len * 0.52, 0.55, 0, 0, Math.PI * 2); c.fill();

    // fara nuri
    c.save();
    c.globalCompositeOperation = 'lighter';
    const beam = c.createLinearGradient(0, 0, 11, 0);
    beam.addColorStop(0, 'rgba(255,240,200,0.32)');
    beam.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = beam;
    c.beginPath();
    const hy = car.type === 'bus' ? -2.4 : -2.2;
    c.moveTo(0, hy - 0.4); c.lineTo(11, hy - 1.2); c.lineTo(11, 0.4); c.lineTo(0, hy + 0.6);
    c.fill();
    c.restore();

    if (car.type === 'bus' || car.type === 'minibus') drawBus(c, car);
    else drawSedan(c, car);

    // stop-chiroq
    c.save();
    c.globalCompositeOperation = 'lighter';
    const ty = car.type === 'bus' ? -3 : -2.5;
    glow(c, -len + 0.2, ty, car.brake ? 3.2 : 1.6, 'rgba(255,40,60,A)', car.brake ? 0.75 : 0.45);
    glow(c, -0.1, hy, 2.2, 'rgba(255,245,210,A)', 0.8);
    c.restore();
    c.restore();
  }

  function wheel(c, x, r) {
    c.fillStyle = '#0d0c12';
    c.beginPath(); c.arc(x, -r, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9aa0ad';
    c.beginPath(); c.arc(x, -r, r * 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5c6270';
    c.beginPath(); c.arc(x, -r, r * 0.2, 0, Math.PI * 2); c.fill();
  }

  function drawSedan(c, car) {
    const len = car.len, tall = car.type === 'suv' ? 0.7 : 0;
    // kuzov
    const g = c.createLinearGradient(0, -4.6 - tall, 0, -0.6);
    g.addColorStop(0, car.color);
    g.addColorStop(0.55, car.color);
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = car.color;
    rrect(c, -len + 0.1, -3.1 - tall * 0.4, len - 0.2, 2.3 + tall * 0.4, 0.9); c.fill();
    c.fillStyle = g;
    rrect(c, -len + 0.1, -3.1 - tall * 0.4, len - 0.2, 2.3 + tall * 0.4, 0.9); c.fill();
    // salon
    c.fillStyle = car.color;
    c.beginPath();
    c.moveTo(-len * 0.8, -3);
    c.lineTo(-len * (car.type === 'suv' ? 0.78 : 0.68), -4.5 - tall);
    c.lineTo(-len * 0.3, -4.5 - tall);
    c.lineTo(-len * 0.17, -3);
    c.closePath(); c.fill();
    // oynalar
    c.fillStyle = '#1b2440';
    c.beginPath();
    c.moveTo(-len * 0.76, -3.15);
    c.lineTo(-len * (car.type === 'suv' ? 0.75 : 0.665), -4.25 - tall);
    c.lineTo(-len * 0.315, -4.25 - tall);
    c.lineTo(-len * 0.205, -3.15);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(160,190,255,0.25)';
    c.beginPath();
    c.moveTo(-len * 0.5, -3.15); c.lineTo(-len * 0.44, -4.25 - tall); c.lineTo(-len * 0.38, -4.25 - tall); c.lineTo(-len * 0.44, -3.15);
    c.fill();
    c.fillStyle = car.color;
    c.fillRect(-len * 0.49, -4.3 - tall, 0.35, 1.2 + tall);
    // eshik chizig'i va tutqich
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 0.08;
    c.beginPath(); c.moveTo(-len * 0.49, -3.1); c.lineTo(-len * 0.49, -1.2); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(-len * 0.42, -2.6, 0.7, 0.15);
    c.fillRect(-len * 0.66, -2.6, 0.7, 0.15);
    if (car.type === 'taxi') {
      c.fillStyle = '#f2c21b';
      c.fillRect(-len + 0.4, -2.05, len - 0.8, 0.45);
      c.fillStyle = '#111';
      for (let i = 0; i < 6; i++) c.fillRect(-len * 0.62 + i * 0.4, (i % 2 ? -2.05 : -1.825), 0.4, 0.225);
      c.fillStyle = '#ffd21f';
      rrect(c, -len * 0.55, -5.25, 2.2, 0.75, 0.2); c.fill();
    }
    wheel(c, -len * 0.2, 1.15);
    wheel(c, -len * 0.8, 1.15);
  }

  function drawBus(c, car) {
    const len = car.len, mini = car.type === 'minibus';
    const h = mini ? 6.6 : 9.2;
    const lv = mini ? { body: '#f4f4f2', stripe: '#3cb04a', stripe2: '#2d6fd6' } : car.livery;
    c.fillStyle = lv.body;
    rrect(c, -len, -h - 0.8, len, h, 1.1); c.fill();
    // oynalar qatori — ichida chiroq va yo'lovchilar
    const wy = -h - 0.2, wh = h * 0.36;
    c.fillStyle = '#1a2240';
    rrect(c, -len + 1, wy, len - 3.4, wh, 0.4); c.fill();
    c.fillStyle = 'rgba(255,220,150,0.28)';
    c.fillRect(-len + 1, wy, len - 3.4, wh);
    c.fillStyle = 'rgba(20,10,30,0.7)';
    for (let x = -len + 2.2; x < -3.4; x += 2.6) {
      c.beginPath(); c.arc(x, wy + wh * 0.55, 0.45, 0, Math.PI * 2); c.fill();
      c.fillRect(x - 0.55, wy + wh * 0.7, 1.1, wh * 0.3);
    }
    c.fillStyle = lv.body;
    for (let x = -len + 1 + 4.3; x < -3; x += 4.3) c.fillRect(x, wy, 0.3, wh);
    // old oyna
    c.fillStyle = '#1a2240';
    rrect(c, -2.2, -h - 0.4, 2, h * 0.62, 0.6); c.fill();
    // naqsh chiziqlari
    c.fillStyle = lv.stripe;
    c.beginPath();
    c.moveTo(-len, -2.6); c.bezierCurveTo(-len * 0.6, -1.4, -len * 0.35, -5, 0, -3.4); c.lineTo(0, -2.2);
    c.bezierCurveTo(-len * 0.35, -3.6, -len * 0.6, -0.9, -len, -1.4); c.closePath(); c.fill();
    c.fillStyle = lv.stripe2;
    c.fillRect(-len, -1.6, len, 0.6);
    // yon reklama paneli — Stella (avtobusda reklama)
    if (!mini) {
      const pw = len * 0.38, ph = h * 0.32, px = -len * 0.62, py = wy + wh + 0.5;
      const pg = c.createLinearGradient(px, 0, px + pw, 0);
      pg.addColorStop(0, '#4b2a9a'); pg.addColorStop(1, '#7c3aed');
      c.fillStyle = pg;
      rrect(c, px, py, pw, ph, 0.4); c.fill();
      if (logo.complete && logo.naturalWidth) {
        const lh = ph * 0.7, lw = lh * (872 / 440);
        c.save();
        // mashina teskari chizilganda logotip ko'zgudagidek bo'lib qolmasin
        c.translate(px + pw / 2, py + ph / 2);
        c.scale(c.getTransform().a < 0 ? -1 : 1, 1);
        c.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
        c.restore();
      }
    }
    // eshiklar
    c.fillStyle = 'rgba(26,34,64,0.85)';
    c.fillRect(-4.6, wy + wh + 0.3, 1.8, h * 0.5);
    if (!mini) c.fillRect(-len * 0.55 - 1, wy + wh + 0.3, 1.8, h * 0.5);
    // yo'nalish tablosi
    c.fillStyle = '#ff8a1f';
    c.fillRect(-1.9, -h - 0.3, 1.5, 0.5);
    wheel(c, -len * 0.18, 1.45);
    wheel(c, -len * 0.8, 1.45);
  }

  /* ---------- piyodalar ---------- */
  const walkers = [];   // yo'laklarda
  const crossers = [];  // zebradan o'tayotganlar
  const SKIN = ['#f1c7a3', '#d9a27c', '#b97a55', '#8a5a3c', '#e8b48f'];
  const CLOTH = ['#e2385a', '#2f7de1', '#f2b632', '#2aa876', '#ffffff', '#30303c', '#8a5cf6', '#ff7a3d', '#1f3b6e', '#c2c7d6'];
  const PANTS = ['#1d2033', '#2b3a63', '#3d3d48', '#5a4632', '#1a1a1a'];

  function newPerson() {
    return {
      skin: pick(SKIN), shirt: pick(CLOTH), pants: pick(PANTS), hair: pick(['#1a120e', '#3b2416', '#0e0e10', '#6b4a2b']),
      scarf: R() < 0.25 ? pick(['#d6336c', '#f4f0e6', '#2b2b3a', '#7a4fd6', '#1f7a6a']) : null, bag: R() < 0.3 ? pick(['#7a3a1a', '#222', '#c23a6a']) : null,
      tall: rr(0.9, 1.08), phase: rr(0, 6), speed: rr(2.6, 4.2),
    };
  }
  function spawnWalker(side, x) {
    const p = newPerson();
    p.side = side;
    p.dir = R() < 0.5 ? -1 : 1;
    p.x = x !== undefined ? x : p.dir > 0 ? -3 * u : W + 3 * u;
    walkers.push(p);
  }
  function walkerTarget(side) {
    return side ? Math.round(W / (16 * u)) : Math.round(W / (11 * u));
  }

  function drawPerson(c, p, x, y, s, dir, moving) {
    const k = u * s * p.tall;
    const sw = moving ? Math.sin(p.phase) : 0;
    c.save();
    c.translate(x, y);
    c.scale(dir * k, k);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.ellipse(0, 0.1, 1.4, 0.35, 0, 0, Math.PI * 2); c.fill();
    c.lineCap = 'round';
    // oyoqlar
    c.strokeStyle = p.pants;
    c.lineWidth = 0.85;
    [sw, -sw].forEach((a, i) => {
      c.globalAlpha = i ? 0.85 : 1;
      c.beginPath(); c.moveTo(0, -4.3); c.lineTo(Math.sin(a * 0.5) * 2, -0.3); c.stroke();
    });
    c.globalAlpha = 1;
    // orqa qo'l
    c.strokeStyle = p.shirt;
    c.lineWidth = 0.65;
    c.globalAlpha = 0.8;
    c.beginPath(); c.moveTo(0, -7); c.lineTo(Math.sin(sw * 0.45) * 1.7, -4.4); c.stroke();
    c.globalAlpha = 1;
    // tana
    c.fillStyle = p.shirt;
    rrect(c, -0.95, -7.6, 1.9, 3.6, 0.7); c.fill();
    if (p.bag) { c.fillStyle = p.bag; rrect(c, -1.9, -5.9, 1.1, 1.5, 0.25); c.fill(); }
    // old qo'l
    c.strokeStyle = p.shirt;
    c.beginPath(); c.moveTo(0, -7); c.lineTo(Math.sin(-sw * 0.45) * 1.7, -4.4); c.stroke();
    c.fillStyle = p.skin;
    c.beginPath(); c.arc(Math.sin(-sw * 0.45) * 1.7, -4.3, 0.3, 0, Math.PI * 2); c.fill();
    // bosh
    c.fillStyle = p.skin;
    c.beginPath(); c.arc(0.1, -8.55, 0.85, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.scarf || p.hair;
    c.beginPath();
    if (p.scarf) { c.arc(0.05, -8.6, 0.98, Math.PI * 0.55, Math.PI * 2.25); c.lineTo(-0.6, -7.5); }
    else c.arc(0.05, -8.75, 0.85, Math.PI * 0.95, Math.PI * 2.1);
    c.fill();
    c.restore();
  }

  function stepPeople(dt, t) {
    // yo'lakdagilar
    for (const p of walkers) {
      const s = p.side ? L.sFront : L.sBack;
      p.x += p.dir * p.speed * u * s * dt;
      p.phase += p.speed * dt * 1.9;
    }
    for (let i = walkers.length - 1; i >= 0; i--) {
      const p = walkers[i];
      if (p.x < -6 * u || p.x > W + 6 * u) walkers.splice(i, 1);
    }
    [0, 1].forEach((side) => {
      const n = walkers.filter((p) => p.side === side).length;
      if (n < walkerTarget(side) && R() < dt * 1.5) spawnWalker(side);
    });
    // zebradan o'tish
    const ph = pedPhase(t), p = t % CYCLE;
    if (ph === 'go' && p < 14.8 && R() < dt * 1.6) {
      const up = R() < 0.5;
      const c = newPerson();
      c.y0 = up ? L.frontWalkY - 0.5 * u : L.backWalkY;
      c.y1 = up ? L.backWalkY : L.frontWalkY - 0.5 * u;
      c.x = L.zx + rr(-0.3, 0.3) * L.zw;
      c.k = 0;
      c.dur = rr(3.4, 4.2);
      c.dir = R() < 0.5 ? -1 : 1;
      crossers.push(c);
    }
    for (let i = crossers.length - 1; i >= 0; i--) {
      const c = crossers[i];
      c.k += dt / c.dur;
      c.phase += dt * 6.5;
      if (c.k >= 1) {
        // narigi yo'lakka chiqib, yo'lida davom etadi
        crossers.splice(i, 1);
        const w = Object.assign(c, { side: c.y1 > L.medBot ? 1 : 0 });
        walkers.push(w);
      }
    }
  }
  function crosserY(c) { return lerp(c.y0, c.y1, c.k); }
  function scaleAtY(y) { return lerp(L.sBack, L.sFront, clamp((y - L.backWalkY) / (L.frontWalkY - L.backWalkY), 0, 1)); }

  /* ---------- svetofor chizish ---------- */
  function drawTrafficLight(c, x, y, s, t) {
    const k = u * s;
    const light = lightAt(t), ped = pedPhase(t);
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    c.fillStyle = '#16121f';
    c.fillRect(-0.3, -15, 0.6, 15);
    rrect(c, -1.1, -19.4, 2.2, 5.6, 0.5); c.fill();
    [['red', -18.4, '255,50,60'], ['yellow', -16.6, '255,190,40'], ['green', -14.8, '60,230,120']].forEach(([n, ly, rgb]) => {
      const on = light === n;
      c.fillStyle = on ? `rgb(${rgb})` : `rgba(${rgb},0.15)`;
      c.beginPath(); c.arc(0, ly, 0.62, 0, Math.PI * 2); c.fill();
      if (on) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, ly, 3, `rgba(${rgb},A)`, 0.6); c.restore(); }
    });
    // piyoda chirog'i
    rrect(c, -0.9, -11.6, 1.8, 3.4, 0.35); c.fillStyle = '#16121f'; c.fill();
    const blinkOn = ph(t);
    function ph(tt) { return ped === 'go' || (ped === 'blink' && Math.floor(tt * 2) % 2 === 0); }
    c.fillStyle = blinkOn ? '#3ce67a' : 'rgba(60,230,120,0.15)';
    c.beginPath(); c.arc(0, -9.4, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = ped === 'stop' ? '#ff3a4a' : 'rgba(255,58,74,0.15)';
    c.beginPath(); c.arc(0, -10.7, 0.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* ---------- LED ekran (orolchada) ---------- */
  let screenOn = 0; // yoqilish animatsiyasi 0..1
  let slide = 0, prevSlide = -1, slideT = 0; // joriy slayd va unda o'tgan vaqt
  const WIPE = 0.5; // slaydlar almashishi (yuqoridan pastga LED skaner) — soniya
  function drawScreen(c, t) {
    const { cx, faceW: fw, faceH: fh, frame: fr, faceTop: ft } = L;
    const x0 = cx - fw / 2, y0 = ft;
    const poleTop = y0 + fh + fr + fh * 0.12;

    // ustun
    const pg = c.createLinearGradient(cx - L.poleW / 2, 0, cx + L.poleW / 2, 0);
    pg.addColorStop(0, '#6b7486'); pg.addColorStop(0.35, '#a7b0c0'); pg.addColorStop(1, '#58606f');
    c.fillStyle = pg;
    c.fillRect(cx - L.poleW / 2, poleTop - 2, L.poleW, L.poleBase - poleTop + 2);
    c.fillStyle = 'rgba(80,120,255,0.25)';
    c.fillRect(cx - L.poleW / 2, poleTop, L.poleW * 0.4, L.poleBase - poleTop);
    c.fillStyle = '#5c6474';
    c.fillRect(cx - L.poleW * 0.85, L.poleBase - fh * 0.05, L.poleW * 1.7, fh * 0.06);
    c.fillStyle = '#8b93a4';
    c.fillRect(cx - L.poleW * 0.85, L.poleBase - fh * 0.05, L.poleW * 1.7, fh * 0.012);

    // ekran ortidagi nur (osmonga)
    c.save();
    c.globalCompositeOperation = 'lighter';
    const pulse = 0.85 + Math.sin(t * 1.3) * 0.08;
    glow(c, cx, y0 + fh / 2, fw * 0.85, 'rgba(60,90,255,A)', 0.42 * screenOn * pulse);
    c.restore();

    // ramka
    const fg = c.createLinearGradient(0, y0 - fr, 0, y0 + fh + fr);
    fg.addColorStop(0, '#b6bdcb'); fg.addColorStop(0.5, '#8a93a5'); fg.addColorStop(1, '#5f6778');
    c.fillStyle = fg;
    rrect(c, x0 - fr, y0 - fr, fw + fr * 2, fh + fr * 2, fr * 0.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(x0 - fr, y0 - fr, fw + fr * 2, fr * 0.25);
    // pastki qism (jalyuzi) — asl ekrandagi kabi
    const by = y0 + fh + fr, bh = fh * 0.12;
    c.fillStyle = '#7d8698';
    c.fillRect(x0 - fr * 0.6, by, fw + fr * 1.2, bh);
    c.fillStyle = '#5a6272';
    for (let i = 0; i < 4; i++) {
      const sx = x0 + (fw / 4) * i + fw * 0.02;
      c.fillRect(sx, by + bh * 0.25, fw / 4 - fw * 0.04, bh * 0.5);
    }

    // yuz
    c.save();
    c.beginPath(); c.rect(x0, y0, fw, fh); c.clip();
    c.fillStyle = '#050a30';
    c.fillRect(x0, y0, fw, fh);
    if (faces.length) {
      const cur = faces[slide];
      // yoqilish (screenOn) va slayd almashishi bir xil: yangi yuz yuqoridan pastga skaner chizig'i bilan ochiladi
      const k = screenOn < 1 ? screenOn : prevSlide >= 0 ? Math.min(1, slideT / WIPE) : 1;
      if (k < 1 && screenOn >= 1) c.drawImage(faces[prevSlide], x0, y0, fw, fh);
      c.drawImage(cur, 0, 0, cur.width, cur.height * k, x0, y0, fw, fh * k);
      c.globalAlpha = (0.75 + Math.sin(t * 2.2) * 0.25) * (screenOn < 1 ? screenOn : 1);
      c.drawImage(rings, 0, 0, rings.width, rings.height * screenOn, x0, y0, fw, fh * screenOn);
      c.globalAlpha = 1;
      if (k < 1) {
        c.fillStyle = 'rgba(200,220,255,0.9)';
        c.fillRect(x0, y0 + fh * k - 1.5, fw, 3);
      }
      // ustidan o'tadigan yaltirash
      const sweep = ((t % 6) / 6) * (fw * 1.8) - fw * 0.4;
      const sg = c.createLinearGradient(x0 + sweep - fw * 0.15, 0, x0 + sweep + fw * 0.15, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.13)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sg;
      c.fillRect(x0, y0, fw, fh);
    }
    c.restore();
  }

  /* ---------- kadr ---------- */
  let t0 = 0, last = 0, simT = 0, running = false, raf = 0;

  function draw() {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(city, 0, 0);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const t = simT;

    // peshlavhalar va miltillovchi derazalar
    for (const s of shopSigns) {
      const flick = Math.sin(t * 3 + s.p) > -0.92 ? 1 : 0.35;
      c.save();
      c.fillStyle = '#140b26';
      rrect(c, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, s.h * 0.2); c.fill();
      c.font = `700 ${s.h * 0.7}px Montserrat, "Segoe UI", Arial, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = s.color; c.shadowBlur = s.h * 0.9 * flick;
      c.fillStyle = s.color; c.globalAlpha = flick;
      c.fillText(s.name, s.x, s.y + s.h * 0.04, s.w * 0.9);
      c.restore();
    }
    for (const w of flickWins) {
      c.fillStyle = Math.sin(t * 0.7 + w.p) > 0.3 ? '#ffe1a6' : '#2a1748';
      c.fillRect(w.x, w.y, w.w, w.h);
    }

    // ekrandan yo'lga tushayotgan ko'k nur
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(L.cx, L.poleBase);
    c.scale(1, 0.32);
    glow(c, 0, 0, L.faceW * 0.75, 'rgba(70,100,255,A)', 0.4 * screenOn);
    c.restore();

    // chuqurlik bo'yicha tartiblab chizish
    const items = [];
    for (const p of walkers) {
      const y = p.side ? L.frontWalkY : L.backWalkY;
      items.push([y, () => drawPerson(c, p, p.x, y, p.side ? L.sFront : L.sBack, p.dir, true)]);
    }
    for (const p of crossers) {
      const y = crosserY(p);
      items.push([y, () => drawPerson(c, p, p.x, y, scaleAtY(y), p.dir, true)]);
    }
    lanes.forEach((lane) => {
      for (const car of lane.cars) items.push([lane.y(), () => drawCar(c, car, car.x, lane.y(), lane.s(), lane.dir)]);
    });
    items.push([L.poleBase, () => drawScreen(c, t)]);
    items.push([L.backWalkY - 0.1, () => drawTrafficLight(c, L.zx + L.zw * 0.75, L.backWalkY - 0.2 * u, 0.6, t)]);
    items.push([L.frontWalkY - 1.5 * u, () => drawTrafficLight(c, L.zx - L.zw * 0.85, L.roadBot + 2.4 * u, 1, t)]);
    items.sort((a, b) => a[0] - b[0]);
    items.forEach((it) => it[1]());

    // chetlarni xiralashtirish va keyingi bo'limga silliq o'tish
    const vg = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(10,4,30,0)');
    vg.addColorStop(1, 'rgba(10,4,30,0.55)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
  }

  function step(dt) {
    simT += dt;
    // ekran kirish animatsiyasi tugagach yonadi
    if (screenOn < 1 && !document.documentElement.classList.contains('intro-on')) screenOn = Math.min(1, screenOn + dt / 1.4);
    else if (screenOn >= 1) {
      slideT += dt;
      if (slideT >= DUR[slide]) {
        prevSlide = slide;
        slide = (slide + 1) % SLIDES.length;
        slideT = 0;
      }
    }
    stepCars(dt, simT);
    stepPeople(dt, simT);
  }

  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function prefill() {
    // sahna bo'sh boshlanmasin: yo'laklar odam bilan, yo'l mashina bilan to'lgan holda
    walkers.length = 0; crossers.length = 0;
    lanes.forEach((l) => { l.cars = []; l.timer = 0; });
    [0, 1].forEach((side) => {
      for (let i = 0; i < walkerTarget(side); i++) {
        spawnWalker(side, rr(0, W));
        walkers[walkers.length - 1].phase = rr(0, 6);
      }
    });
    simT = 0;
    for (let i = 0; i < 260; i++) { stepCars(1 / 20, simT); simT += 1 / 20; }
    simT = 2; // svetofor yashil holatdan boshlanadi
  }

  function resize() {
    const oldW = W;
    layout();
    if (!oldW || Math.abs(oldW - W) > 40) prefill();
    draw();
  }

  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 150);
  });

  function boot() {
    resize();
    if (reduce) { screenOn = 1; draw(); return; }
    // faqat ko'rinib turganda chiziladi
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { en[0].isIntersecting ? start() : stop(); }).observe(section);
    } else start();
  }

  // shrift va logotip tayyor bo'lgach ekran yuzasi qayta chiziladi
  const ready = [];
  // kirill harflari (ruscha) shriftning alohida qismida — u ham yuklanadi
  const loadFont = () => (document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('800 40px Montserrat', 'AZ'), document.fonts.load('800 40px Montserrat', 'ЯЖ')]).catch(() => {})
    : Promise.resolve());
  ready.push(loadFont());
  // til almashtirilganda ekrandagi yozuvlar yangi tilda qayta chiziladi
  new MutationObserver(() => {
    loadFont().then(() => { if (W) { buildFace(); if (!running) draw(); } });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  ready.push(new Promise((res) => { if (logo.complete) res(); else { logo.onload = res; logo.onerror = res; } }));
  boot();
  Promise.all(ready).then(() => { buildFace(); if (!running) draw(); });
})();
