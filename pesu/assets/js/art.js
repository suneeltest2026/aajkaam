/* ==========================================================================
   PESU — Art
   Vector stand-ins for commissioned product photography.

   Every drawing paints from CSS custom properties (--m-1 … --m-metal) rather
   than hard-coded fills, so a single material change re-skins the whole
   scene. When real photography arrives these builders are replaced by
   <picture> elements; nothing else in the app has to move.
   ========================================================================== */
window.PESU = window.PESU || {};

(function (PESU) {
  'use strict';

  /* Shared gradient/filter defs, injected once per page. */
  function defs(id) {
    return `
      <defs>
        <linearGradient id="${id}-face" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0"   style="stop-color:var(--m-1)"/>
          <stop offset="0.55" style="stop-color:var(--m-2)"/>
          <stop offset="1"   style="stop-color:var(--m-3)"/>
        </linearGradient>
        <linearGradient id="${id}-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:var(--m-hi)"/>
          <stop offset="1" style="stop-color:var(--m-1)"/>
        </linearGradient>
        <linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"    stop-color="#E4CB96"/>
          <stop offset="0.42" style="stop-color:var(--m-metal)"/>
          <stop offset="0.68" stop-color="#7B5F2C"/>
          <stop offset="1"    stop-color="#C9AC70"/>
        </linearGradient>
        <radialGradient id="${id}-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0"   stop-color="rgba(18,16,14,0.34)"/>
          <stop offset="0.6" stop-color="rgba(18,16,14,0.12)"/>
          <stop offset="1"   stop-color="rgba(18,16,14,0)"/>
        </radialGradient>
        <linearGradient id="${id}-veil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(255,255,255,0.34)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id="${id}-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="n"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComposite operator="in" in2="SourceGraphic"/>
        </filter>
        <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14"/>
        </filter>
      </defs>`;
  }

  /* --- Base treatments ---------------------------------------------------
     Each returns the pedestal geometry for the console, drawn between the
     underside of the slab (y=250) and the floor (y=520).                    */
  var BASES = {
    monolith: function (id) {
      return `
        <g>
          <rect x="176" y="250" width="116" height="270" fill="url(#${id}-face)"/>
          <rect x="176" y="250" width="116" height="270" fill="rgba(18,16,14,0.10)"/>
          <rect x="176" y="250" width="26"  height="270" fill="url(#${id}-veil)" opacity="0.5"/>
          <rect x="608" y="250" width="116" height="270" fill="url(#${id}-face)"/>
          <rect x="608" y="250" width="116" height="270" fill="rgba(18,16,14,0.10)"/>
          <rect x="608" y="250" width="26"  height="270" fill="url(#${id}-veil)" opacity="0.5"/>
          <rect x="176" y="512" width="116" height="8" fill="rgba(18,16,14,0.18)"/>
          <rect x="608" y="512" width="116" height="8" fill="rgba(18,16,14,0.18)"/>
        </g>`;
    },
    cantilever: function (id) {
      return `
        <g>
          <rect x="196" y="250" width="15" height="270" rx="2" fill="url(#${id}-metal)"/>
          <rect x="689" y="250" width="15" height="270" rx="2" fill="url(#${id}-metal)"/>
          <rect x="196" y="452" width="508" height="9" rx="2" fill="url(#${id}-metal)"/>
          <rect x="150" y="512" width="108" height="9" rx="2" fill="url(#${id}-metal)"/>
          <rect x="642" y="512" width="108" height="9" rx="2" fill="url(#${id}-metal)"/>
          <rect x="196" y="250" width="4" height="270" fill="rgba(255,255,255,0.35)"/>
          <rect x="689" y="250" width="4" height="270" fill="rgba(255,255,255,0.35)"/>
        </g>`;
    },
    fluted: function (id) {
      var flutes = '';
      for (var i = 0; i < 7; i++) {
        flutes += `<rect x="${188 + i * 16}" y="262" width="6" height="248" fill="rgba(18,16,14,0.13)"/>`;
        flutes += `<rect x="${620 + i * 16}" y="262" width="6" height="248" fill="rgba(18,16,14,0.13)"/>`;
      }
      return `
        <g>
          <rect x="180" y="250" width="120" height="270" rx="6" fill="url(#${id}-face)"/>
          <rect x="612" y="250" width="120" height="270" rx="6" fill="url(#${id}-face)"/>
          ${flutes}
          <rect x="168" y="504" width="144" height="16" rx="3" fill="url(#${id}-metal)"/>
          <rect x="600" y="504" width="144" height="16" rx="3" fill="url(#${id}-metal)"/>
        </g>`;
    }
  };

  /* --- The signature piece: Sabkha console ------------------------------- */
  function consoleView(opts) {
    opts = opts || {};
    var id = opts.id || 'c1';
    var base = BASES[opts.base] ? opts.base : 'monolith';
    var span = opts.span || 1;                 /* 160 / 180 / 220 cm widths  */
    var engraving = (opts.engraving || '').trim();
    var slabX = 450 - 360 * span;
    var slabW = 720 * span;

    return `
      <svg viewBox="0 0 900 600" role="img" aria-label="PESU Sabkha console, ${base} base">
        ${defs(id)}
        <ellipse cx="450" cy="528" rx="${330 * span}" ry="30" fill="url(#${id}-shadow)"/>
        ${BASES[base](id)}
        <g>
          <rect x="${slabX}" y="204" width="${slabW}" height="46" rx="4" fill="url(#${id}-face)"/>
          <rect x="${slabX}" y="204" width="${slabW}" height="9"  rx="2" fill="url(#${id}-edge)"/>
          <rect x="${slabX}" y="240" width="${slabW}" height="10" fill="rgba(18,16,14,0.14)"/>
          <rect x="${slabX}" y="204" width="${slabW}" height="46" rx="4" fill="url(#${id}-veil)" opacity="0.35"/>
        </g>
        ${engraving ? `
        <g opacity="0.95">
          <rect x="${slabX + slabW - 214}" y="220" width="184" height="20" rx="1"
                fill="none" stroke="var(--m-metal)" stroke-width="0.7" opacity="0.5"/>
          <text x="${slabX + slabW - 122}" y="234" text-anchor="middle"
                font-family="Cormorant Garamond, serif" font-size="13"
                letter-spacing="3.4" font-weight="500" fill="var(--m-metal)">${escapeXml(engraving.toUpperCase())}</text>
        </g>` : ''}
        <!-- styling objects, for scale -->
        <g>
          <!-- slim brass vase -->
          <path d="M296 204 L292 148 C292 124 302 110 318 110 C334 110 344 124 344 148 L340 204 Z"
                fill="url(#${id}-metal)"/>
          <path d="M296 204 L292 148 C292 124 302 110 318 110" fill="none"
                stroke="rgba(255,255,255,0.42)" stroke-width="1.4"/>
          <ellipse cx="318" cy="110" rx="26" ry="6" fill="rgba(18,16,14,0.35)"/>
          <ellipse cx="318" cy="108" rx="26" ry="6" fill="url(#${id}-metal)"/>
          <!-- low stone bowl -->
          <path d="M508 190 a52 34 0 0 0 104 0 z" fill="url(#${id}-face)"/>
          <ellipse cx="560" cy="190" rx="52" ry="10" fill="rgba(18,16,14,0.16)"/>
          <ellipse cx="560" cy="188" rx="52" ry="10" fill="url(#${id}-edge)"/>
          <path d="M508 190 a52 34 0 0 0 104 0" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
        </g>
      </svg>`;
  }

  /* --- Macro detail: the mitred edge, its veining and the brass inlay ---- */
  function detailView(opts) {
    var id = (opts && opts.id) || 'd1';
    var veins = '';
    var paths = [
      'M-20 430 C160 402 300 452 470 424 C640 396 760 436 920 410',
      'M-20 500 C140 486 260 522 420 498 C600 470 740 508 920 486',
      'M-20 372 C180 350 320 384 520 358 C700 334 800 366 920 348'
    ];
    paths.forEach(function (d, i) {
      veins += `<path d="${d}" fill="none" stroke="rgba(255,255,255,${0.30 - i * 0.06})" stroke-width="${5 - i}"/>`;
      veins += `<path d="${d}" fill="none" stroke="rgba(18,16,14,${0.10 - i * 0.02})" stroke-width="1.2" transform="translate(0 6)"/>`;
    });
    return `
      <svg viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Macro detail of the mitred edge and brass inlay">
        ${defs(id)}
        <!-- the top plane, catching the light -->
        <path d="M0 0 L900 0 L900 236 L0 306 Z" fill="url(#${id}-face)"/>
        <path d="M0 0 L900 0 L900 236 L0 306 Z" fill="rgba(255,255,255,0.30)"/>
        <!-- the brass inlay along the mitre -->
        <path d="M0 306 L900 236 L900 252 L0 322 Z" fill="url(#${id}-metal)"/>
        <path d="M0 306 L900 236 L900 240 L0 310 Z" fill="rgba(255,255,255,0.45)"/>
        <!-- the front face, in shade -->
        <path d="M0 322 L900 252 L900 600 L0 600 Z" fill="url(#${id}-face)"/>
        <path d="M0 322 L900 252 L900 600 L0 600 Z" fill="rgba(18,16,14,0.13)"/>
        <g clip-path="none" opacity="0.9">${veins}</g>
        <circle cx="700" cy="120" r="180" fill="rgba(255,255,255,0.22)" filter="url(#${id}-soft)"/>
        <ellipse cx="120" cy="560" rx="300" ry="120" fill="rgba(18,16,14,0.10)" filter="url(#${id}-soft)"/>
        <rect width="900" height="600" filter="url(#${id}-grain)" opacity="0.18"/>
      </svg>`;
  }

  /* --- In situ: a Dubai penthouse entrance ------------------------------- */
  function situView(opts) {
    var id = (opts && opts.id) || 's1';
    var base = (opts && opts.base) || 'monolith';
    return `
      <svg viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The console styled in a Dubai penthouse entrance hall">
        ${defs(id)}
        <rect width="900" height="600" fill="#E6DCCB"/>
        <path d="M300 600 L300 186 a150 150 0 0 1 300 0 L600 600 Z" fill="#D6C9B4"/>
        <path d="M322 600 L322 192 a128 128 0 0 1 256 0 L578 600 Z" fill="#C8B79E"/>
        <circle cx="450" cy="150" r="86" fill="rgba(224,196,140,0.42)" filter="url(#${id}-soft)"/>
        <rect y="452" width="900" height="148" fill="#B8A88E"/>
        <rect y="452" width="900" height="34" fill="rgba(18,16,14,0.10)"/>
        <rect y="486" width="900" height="114" fill="url(#${id}-veil)" opacity="0.30"/>
        <rect width="900" height="452" fill="url(#${id}-veil)" opacity="0.25"/>
        <g transform="translate(228 250) scale(0.5)">
          <ellipse cx="450" cy="528" rx="330" ry="26" fill="url(#${id}-shadow)"/>
          ${BASES[base](id)}
          <rect x="90" y="204" width="720" height="46" rx="4" fill="url(#${id}-face)"/>
          <rect x="90" y="204" width="720" height="9" rx="2" fill="url(#${id}-edge)"/>
          <rect x="90" y="240" width="720" height="10" fill="rgba(18,16,14,0.14)"/>
        </g>
        <g>
          <path d="M760 452 C760 380 742 330 726 296" fill="none" stroke="#4C543F" stroke-width="4"/>
          <path d="M745 372 C716 356 704 330 706 306 C730 314 744 340 745 372 Z" fill="#4C543F" opacity="0.85"/>
          <path d="M756 336 C778 314 784 288 778 266 C756 280 748 308 756 336 Z" fill="#5A6349" opacity="0.85"/>
          <path d="M742 316 C720 300 712 274 716 252 C738 264 748 290 742 316 Z" fill="#414936" opacity="0.8"/>
          <path d="M736 452 h48 l-6 -44 h-36 z" fill="#9C8A6E"/>
          <ellipse cx="760" cy="454" rx="42" ry="7" fill="rgba(18,16,14,0.20)"/>
        </g>
        <rect width="900" height="600" filter="url(#${id}-grain)" opacity="0.12"/>
      </svg>`;
  }

  /* --- Technical drawing: live dimensions -------------------------------- */
  function dimensionView(opts) {
    opts = opts || {};
    var w = opts.w || 180, d = opts.d || 42, h = opts.h || 84;
    var line = 'stroke="rgba(18,16,14,0.5)" stroke-width="1" fill="none"';
    var tick = 'stroke="rgba(18,16,14,0.35)" stroke-width="0.8"';
    var label = 'font-family="Jost, sans-serif" font-size="17" letter-spacing="2.5" fill="rgba(18,16,14,0.62)"';
    return `
      <svg viewBox="0 0 900 600" role="img" aria-label="Technical drawing: ${w} by ${d} by ${h} centimetres">
        <rect width="900" height="600" fill="none"/>
        <g ${line}>
          <rect x="150" y="180" width="600" height="38"/>
          <rect x="212" y="218" width="86" height="242"/>
          <rect x="602" y="218" width="86" height="242"/>
        </g>
        <g ${tick}>
          <path d="M150 138 L150 172 M750 138 L750 172 M150 155 L750 155"/>
          <path d="M142 155 L158 147 M142 155 L158 163 M758 155 L742 147 M758 155 L742 163"/>
          <path d="M798 180 L832 180 M798 460 L832 460 M815 180 L815 460"/>
          <path d="M815 172 L807 188 M815 172 L823 188 M815 468 L807 452 M815 468 L823 452"/>
          <path d="M150 500 L150 534 M750 500 L750 534"/>
        </g>
        <text x="450" y="140" text-anchor="middle" ${label}>W ${w} CM</text>
        <text x="856" y="326" text-anchor="middle" ${label} transform="rotate(90 856 326)">H ${h} CM</text>
        <text x="450" y="524" text-anchor="middle" ${label}>D ${d} CM</text>
        <text x="450" y="562" text-anchor="middle" font-family="Jost, sans-serif" font-size="13"
              letter-spacing="4" fill="rgba(18,16,14,0.34)">DRAWN 1:20 — PESU ATELIER, AL QUOZ</text>
      </svg>`;
  }

  /* --- Home page objects -------------------------------------------------- */
  function vesselView(opts) {
    var id = (opts && opts.id) || 'v1';
    return `
      <svg viewBox="0 0 400 520" role="img" aria-label="PESU sculptural vessel">
        ${defs(id)}
        <ellipse cx="200" cy="478" rx="118" ry="18" fill="url(#${id}-shadow)"/>
        <path d="M166 70 C124 128 94 212 102 300 C110 398 146 466 200 466
                 C254 466 290 398 298 300 C306 212 276 128 234 70 Z"
              fill="url(#${id}-face)"/>
        <path d="M166 70 C124 128 94 212 102 300 C110 398 146 466 200 466"
              fill="none" stroke="rgba(255,255,255,0.40)" stroke-width="2.4"/>
        <path d="M234 70 C276 128 306 212 298 300 C290 398 254 466 200 466"
              fill="none" stroke="rgba(18,16,14,0.14)" stroke-width="2.4"/>
        <ellipse cx="200" cy="70" rx="34" ry="9" fill="rgba(18,16,14,0.30)"/>
        <ellipse cx="200" cy="66" rx="34" ry="9" fill="url(#${id}-edge)"/>
        <path d="M120 300 c-4 -70 14 -134 42 -180" fill="none"
              stroke="rgba(255,255,255,0.30)" stroke-width="10" stroke-linecap="round" opacity="0.5"/>
      </svg>`;
  }

  function pendantView(opts) {
    var id = (opts && opts.id) || 'p1';
    return `
      <svg viewBox="0 0 460 620" role="img" aria-label="PESU Ghaf pendant light">
        ${defs(id)}
        <rect x="228" y="0" width="4" height="150" fill="url(#${id}-metal)"/>
        <g>
          <path d="M60 320 C60 200 140 150 230 150 C320 150 400 200 400 320 Z" fill="url(#${id}-face)"/>
          <path d="M60 320 C60 200 140 150 230 150" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
          <ellipse cx="230" cy="320" rx="170" ry="26" fill="var(--m-3)"/>
          <ellipse cx="230" cy="320" rx="170" ry="26" fill="url(#${id}-veil)" opacity="0.5"/>
        </g>
        <ellipse cx="230" cy="470" rx="150" ry="120" fill="rgba(224,196,140,0.30)" filter="url(#${id}-soft)"/>
        <ellipse cx="230" cy="336" rx="120" ry="16" fill="rgba(255,240,208,0.75)" filter="url(#${id}-soft)"/>
        <rect x="150" y="150" width="160" height="5" rx="2" fill="url(#${id}-metal)"/>
      </svg>`;
  }

  function escapeXml(str) {
    return String(str).replace(/[<>&"']/g, function (ch) {
      return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch];
    });
  }

  PESU.art = {
    console: consoleView,
    detail: detailView,
    situ: situView,
    dimensions: dimensionView,
    vessel: vesselView,
    pendant: pendantView
  };
})(window.PESU);
