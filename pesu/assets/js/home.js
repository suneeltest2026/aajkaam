/* ==========================================================================
   PESU — Homepage behaviour
   Hero parallax, the featured object, and the material configurator teaser.
   ========================================================================== */
(function (PESU) {
  'use strict';

  var $ = PESU.ui.$, $$ = PESU.ui.$$;
  var catalog = PESU.catalog, art = PESU.art;

  function applyMaterial(el, material) {
    Object.keys(material.vars).forEach(function (key) {
      el.style.setProperty(key, material.vars[key]);
    });
  }

  /* --- Featured object --------------------------------------------------- */
  function initSpotlight() {
    var mount = $('[data-art="pendant"]');
    if (!mount) return;
    mount.innerHTML = art.pendant({ id: 'spot' });
    applyMaterial(mount, catalog.byId(catalog.materials, 'alabaster'));
  }

  /* --- Configurator teaser ----------------------------------------------- */
  function initConfigureTeaser() {
    var preview = $('[data-teaser-preview]');
    var object = $('[data-teaser-object]');
    var caption = $('[data-teaser-caption]');
    var swatchWrap = $('[data-teaser-swatches]');
    if (!preview || !object || !swatchWrap) return;

    object.innerHTML = art.vessel({ id: 'teaser' });

    var materials = catalog.materials;
    swatchWrap.innerHTML = materials.map(function (m, i) {
      return [
        '<span class="swatch-item">',
        '  <button class="swatch surface ' + m.swatch + '" type="button"',
        '     data-material="' + m.id + '" aria-pressed="' + (i === 0) + '"',
        '     aria-label="' + m.name + '"></button>',
        '  <span class="swatch__label">' + m.short + '</span>',
        '</span>'
      ].join('');
    }).join('');

    function select(id) {
      var material = catalog.byId(materials, id);
      applyMaterial(object, material);
      preview.style.background = material.stage;
      if (caption) caption.textContent = material.name + ' — ' + material.origin;
      $$('[data-material]', swatchWrap).forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-material') === id));
      });
    }

    $$('[data-material]', swatchWrap).forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn.getAttribute('data-material')); });
      btn.addEventListener('mouseenter', function () { select(btn.getAttribute('data-material')); });
    });

    select(materials[0].id);
  }

  /* --- Ticker ------------------------------------------------------------- */
  function initTicker() {
    var track = $('.ticker__track');
    if (!track) return;
    /* Duplicate the run so the -100% translate loops seamlessly. */
    var clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.parentNode.appendChild(clone);
  }

  /* --- Hero: pointer-led light ------------------------------------------- */
  function initHeroLight() {
    var hero = $('.hero');
    if (!hero || PESU.ui.reduced || window.matchMedia('(pointer: coarse)').matches) return;
    var sun = $('.hero__sun', hero);
    if (!sun) return;
    hero.addEventListener('pointermove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 60;
      var y = (e.clientY / window.innerHeight - 0.5) * 24;
      sun.style.translate = x + 'px ' + y + 'px';
    });
  }

  function init() {
    initSpotlight();
    initConfigureTeaser();
    initTicker();
    initHeroLight();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.PESU);
