/* ==========================================================================
   PESU — Product detail & configurator
   One state object drives price, lead time, artwork, summary and the cart
   payload. Every option change is a single re-render — no partial updates,
   so the page can never show a price that disagrees with the drawing.
   ========================================================================== */
(function (PESU) {
  'use strict';

  var $ = PESU.ui.$, $$ = PESU.ui.$$;
  var store = PESU.store, catalog = PESU.catalog, art = PESU.art;
  var product = catalog.product;

  var config = {
    material: 'travertine',
    finish: 'honed',
    size: 's180',
    base: 'monolith',
    engraving: '',
    qty: 1,
    custom: { w: 200, d: 45, h: 86 }
  };

  var els = {};

  /* --- Derived values ---------------------------------------------------- */
  function parts() {
    return {
      material: catalog.byId(catalog.materials, config.material),
      finish:   catalog.byId(catalog.finishes,  config.finish),
      size:     catalog.byId(catalog.sizes,     config.size),
      base:     catalog.byId(catalog.bases,     config.base)
    };
  }

  function unitPriceAED() {
    var p = parts();
    return product.basePriceAED
      + p.material.deltaAED
      + p.finish.deltaAED
      + p.size.deltaAED
      + p.base.deltaAED
      + (config.engraving.trim() ? catalog.engraving.deltaAED : 0);
  }

  function leadTime() {
    var p = parts();
    var range = p.size.weeks.split('–').map(Number);
    var add = p.material.leadAdd || 0;
    return (range[0] + add) + '–' + (range[1] + add) + ' weeks';
  }

  function dims() {
    var p = parts();
    return p.size.custom ? config.custom : p.size.dims;
  }

  function specLines() {
    var p = parts();
    var d = dims();
    var lines = [
      p.material.name,
      p.finish.name + ' finish',
      (p.size.custom ? 'Bespoke ' + d.w + '×' + d.d + '×' + d.h + ' cm' : p.size.name),
      p.base.name
    ];
    if (config.engraving.trim()) lines.push('Engraved “' + config.engraving.trim().toUpperCase() + '”');
    return lines;
  }

  /* --- Artwork ----------------------------------------------------------- */
  function applyMaterialVars(el, material) {
    Object.keys(material.vars).forEach(function (k) { el.style.setProperty(k, material.vars[k]); });
  }

  function renderArt() {
    var p = parts();
    var d = dims();
    var span = Math.max(0.82, Math.min(1.12, d.w / 180));

    els.viewMain.innerHTML = art.console({
      id: 'pdp', base: config.base, span: span, engraving: config.engraving
    });
    els.viewDetail.innerHTML = art.detail({ id: 'pdpd' });
    els.viewSitu.innerHTML   = art.situ({ id: 'pdps', base: config.base });
    els.viewDims.innerHTML   = art.dimensions({ w: d.w, d: d.d, h: d.h });

    [els.viewMain, els.viewDetail, els.viewSitu].forEach(function (el) {
      applyMaterialVars(el, p.material);
    });
    els.stage.style.background = p.material.stage;

    /* Thumbnails mirror the live material. */
    $$('[data-thumb-art]', els.thumbs).forEach(function (holder) {
      var kind = holder.getAttribute('data-thumb-art');
      if (kind === 'main')   holder.innerHTML = art.console({ id: 't1', base: config.base, span: 1 });
      if (kind === 'detail') holder.innerHTML = art.detail({ id: 't2' });
      if (kind === 'situ')   holder.innerHTML = art.situ({ id: 't3', base: config.base });
      if (kind === 'dims')   holder.innerHTML = art.dimensions({ w: d.w, d: d.d, h: d.h });
      applyMaterialVars(holder, p.material);
    });
  }

  /* --- Options ------------------------------------------------------------ */
  function buildOptions() {
    /* Materials */
    els.materials.innerHTML = catalog.materials.map(function (m) {
      return [
        '<span class="swatch-item">',
        '  <button class="swatch surface ' + m.swatch + '" type="button" data-opt="material" data-value="' + m.id + '"',
        '   aria-pressed="false" aria-label="' + m.name + ', ' + (m.deltaAED >= 0 ? 'plus ' : 'less ') + Math.abs(m.deltaAED) + ' dirhams"></button>',
        '  <span class="swatch__label">' + m.short + '</span>',
        '</span>'
      ].join('');
    }).join('');

    els.finishes.innerHTML = catalog.finishes.map(function (f) {
      return chip('finish', f.id, f.name, f.deltaAED);
    }).join('');

    els.sizes.innerHTML = catalog.sizes.map(function (s) {
      return chip('size', s.id, s.name, s.deltaAED);
    }).join('');

    els.bases.innerHTML = catalog.bases.map(function (b) {
      return chip('base', b.id, b.name, b.deltaAED);
    }).join('');

    $$('[data-opt]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-opt');
        config[key] = btn.getAttribute('data-value');
        if (key === 'material') reconcileFinish();
        render();
      });
    });
  }

  function chip(group, value, label, delta) {
    var money = delta === 0 ? 'Included' : (delta > 0 ? '+' : '−') + Math.abs(delta).toLocaleString('en-US');
    return [
      '<button class="option" type="button" data-opt="' + group + '" data-value="' + value + '" aria-pressed="false">',
      label, '<small data-delta="' + delta + '">' + money + '</small></button>'
    ].join('');
  }

  /* A material dictates which finishes the atelier will accept. */
  function reconcileFinish() {
    var allowed = parts().material.finishes;
    if (allowed.indexOf(config.finish) === -1) config.finish = allowed[0];
  }

  /* --- Render ------------------------------------------------------------- */
  function render() {
    var p = parts();
    var unit = unitPriceAED();

    $$('[data-opt]').forEach(function (btn) {
      var key = btn.getAttribute('data-opt');
      btn.setAttribute('aria-pressed', String(config[key] === btn.getAttribute('data-value')));
      if (key === 'finish') {
        var ok = p.material.finishes.indexOf(btn.getAttribute('data-value')) > -1;
        btn.disabled = !ok;
        btn.title = ok ? '' : 'Not offered in ' + p.material.name;
      }
    });

    /* Delta chips are quoted in the shopper's currency too. */
    $$('.option small[data-delta]').forEach(function (small) {
      var delta = parseFloat(small.getAttribute('data-delta'));
      if (delta === 0) { small.textContent = 'Included'; return; }
      small.textContent = (delta > 0 ? '+ ' : '− ') + store.format(Math.abs(delta));
    });

    els.groupValue.material.textContent = p.material.name;
    els.groupValue.finish.textContent   = p.finish.name + ' — ' + p.finish.note;
    els.groupValue.size.textContent     = p.size.custom ? 'Bespoke' : p.size.name;
    els.groupValue.base.textContent     = p.base.name;

    els.price.textContent = store.format(unit);
    els.price.classList.remove('is-bumping');
    void els.price.offsetWidth;              /* restart the bump animation */
    els.price.classList.add('is-bumping');
    if (els.buybarPrice) els.buybarPrice.textContent = store.format(unit * config.qty);

    els.lead.textContent = 'Atelier lead time ' + leadTime();
    els.qty.textContent = config.qty;
    els.customDims.hidden = !p.size.custom;

    els.summary.innerHTML = specLines().map(function (line, i) {
      var labels = ['Material', 'Finish', 'Dimensions', 'Base', 'Engraving'];
      return '<dt>' + labels[i] + '</dt><dd>' + line + '</dd>';
    }).join('');

    var engraved = config.engraving.trim();
    els.engravePreview.classList.toggle('is-empty', !engraved);
    els.engravePreviewText.textContent = engraved ? engraved.toUpperCase() : 'Your inscription appears here';
    els.engraveCount.textContent = config.engraving.length + ' / ' + catalog.engraving.maxLength;

    renderArt();
    PESU.ui.renderPrices(els.rail);
  }

  /* --- Gallery ------------------------------------------------------------ */
  function initGallery() {
    $$('.gallery__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var view = thumb.getAttribute('data-view');
        $$('.gallery__thumb').forEach(function (t) {
          t.setAttribute('aria-selected', String(t === thumb));
        });
        $$('.gallery__view').forEach(function (v) {
          v.classList.toggle('is-active', v.getAttribute('data-view') === view);
        });
      });
    });

    els.stage.addEventListener('click', function (e) {
      var rect = els.stage.getBoundingClientRect();
      els.stage.style.setProperty('--zx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      els.stage.style.setProperty('--zy', ((e.clientY - rect.top) / rect.height * 100) + '%');
      els.stage.classList.toggle('is-zoomed');
    });
  }

  /* --- Buy bar ------------------------------------------------------------ */
  function initBuyBar() {
    var bar = $('.buybar');
    var anchor = $('[data-buy-anchor]');
    if (!bar || !anchor || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(anchor);
  }

  /* --- Add to cart -------------------------------------------------------- */
  function addToCart() {
    var p = parts();
    store.addToCart({
      sku: product.sku,
      name: product.name,
      collection: product.collection,
      priceAED: unitPriceAED(),
      qty: config.qty,
      specLines: specLines(),
      options: {
        material: config.material, finish: config.finish, size: config.size,
        base: config.base, engraving: config.engraving.trim(),
        dims: p.size.custom ? config.custom : null
      },
      swatch: p.material.swatch,
      leadTime: leadTime(),
      href: 'product.html'
    });
    PESU.ui.toast('Added to your selection');
    PESU.ui.openPanel('#cart');
  }

  /* --- Wiring ------------------------------------------------------------- */
  function init() {
    els.rail = $('.config');
    if (!els.rail) return;

    els.stage       = $('.gallery__stage');
    els.thumbs      = $('.gallery__thumbs');
    els.viewMain    = $('[data-view="main"].gallery__view');
    els.viewDetail  = $('[data-view="detail"].gallery__view');
    els.viewSitu    = $('[data-view="situ"].gallery__view');
    els.viewDims    = $('[data-view="dims"].gallery__view');
    els.materials   = $('[data-options="material"]');
    els.finishes    = $('[data-options="finish"]');
    els.sizes       = $('[data-options="size"]');
    els.bases       = $('[data-options="base"]');
    els.price       = $('[data-unit-price]');
    els.buybarPrice = $('[data-buybar-price]');
    els.lead        = $('[data-lead-time]');
    els.qty         = $('[data-qty]');
    els.summary     = $('[data-summary]');
    els.customDims  = $('[data-custom-dims]');
    els.engravePreview     = $('[data-engrave-preview]');
    els.engravePreviewText = $('[data-engrave-preview] span');
    els.engraveCount       = $('[data-engrave-count]');
    els.groupValue = {
      material: $('[data-value-for="material"]'),
      finish:   $('[data-value-for="finish"]'),
      size:     $('[data-value-for="size"]'),
      base:     $('[data-value-for="base"]')
    };

    buildOptions();
    initGallery();
    initBuyBar();

    var engraveInput = $('[data-engrave-input]');
    engraveInput.setAttribute('maxlength', catalog.engraving.maxLength);
    engraveInput.addEventListener('input', function () {
      config.engraving = engraveInput.value;
      render();
    });

    $$('[data-custom-dim]').forEach(function (input) {
      input.addEventListener('input', function () {
        var key = input.getAttribute('data-custom-dim');
        var v = parseInt(input.value, 10);
        if (!isNaN(v)) { config.custom[key] = Math.max(40, Math.min(400, v)); render(); }
      });
    });

    $$('[data-qty-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        config.qty = Math.max(1, config.qty + parseInt(btn.getAttribute('data-qty-step'), 10));
        render();
      });
    });

    $$('[data-add-to-cart]').forEach(function (btn) {
      btn.addEventListener('click', addToCart);
    });

    $('[data-book-consult]').addEventListener('click', function () {
      PESU.ui.toast('A design advisor will be in touch within one working day');
    });

    $('[data-swatch-box]').addEventListener('click', function () {
      PESU.ui.toast('Swatch box requested — delivered by courier in Dubai');
    });

    /* Currency changes re-price every chip and the buy bar. */
    document.addEventListener('pesu:store', render);

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.PESU);
