/* ==========================================================================
   PESU — UI
   Shared chrome behaviour: scroll reveals, header state, mega menu, drawers
   (cart / menu / search), currency binding, price re-rendering, toasts,
   accordions. Progressive: every panel is real markup that works with JS
   off; this layer only adds state classes.
   ========================================================================== */
window.PESU = window.PESU || {};

(function (PESU) {
  'use strict';

  var store = PESU.store;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* --- Scroll reveals ---------------------------------------------------- */
  function initReveals() {
    var items = $$('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(function (el, i) {
      /* Stagger siblings inside a group so rows arrive in sequence. */
      if (el.hasAttribute('data-reveal-stagger')) {
        $$('[data-reveal-child]', el).forEach(function (child, j) {
          child.style.setProperty('--reveal-delay', (j * 90) + 'ms');
        });
      }
      io.observe(el);
    });
  }

  /* --- Header ------------------------------------------------------------ */
  function initHeader() {
    var header = $('.header');
    if (!header) return;
    var overlay = document.body.getAttribute('data-header') === 'overlay';
    var hero = $('.hero');
    var last = window.scrollY;

    function update() {
      var y = window.scrollY;
      var threshold = overlay && hero ? hero.offsetHeight - 120 : -1;
      header.classList.toggle('is-solid', y > threshold);
      /* Hide on the way down, reveal on the way up — keeps long product
         pages calm without losing the cart. */
      var goingDown = y > last && y > threshold + 200;
      if (!document.body.classList.contains('is-locked')) {
        header.classList.toggle('is-hidden', goingDown);
      }
      last = y;
      document.documentElement.style.setProperty('--scroll', String(y));
    }
    update();
    window.addEventListener('scroll', function () {
      window.requestAnimationFrame(update);
    }, { passive: true });
  }

  /* --- Overlay manager (mega menu, drawers, search) ---------------------- */
  var openPanel = null;
  var lastFocus = null;

  function focusables(root) {
    return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', root)
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function setPanel(el, open) {
    var scrim = $('.scrim');
    if (open) {
      if (openPanel && openPanel !== el) setPanel(openPanel, false);
      lastFocus = document.activeElement;
      el.classList.add('is-open');
      el.removeAttribute('aria-hidden');
      if (scrim) scrim.classList.add('is-open');
      document.body.classList.add('is-locked');
      openPanel = el;
      var f = focusables(el)[0];
      if (f) window.setTimeout(function () { f.focus(); }, 120);
    } else {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      if (scrim) scrim.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (openPanel === el) openPanel = null;
      $$('[aria-expanded="true"][data-panel]').forEach(function (btn) {
        if (btn.getAttribute('data-panel') === '#' + el.id) btn.setAttribute('aria-expanded', 'false');
      });
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }

  function initPanels() {
    $$('[data-panel]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var el = $(btn.getAttribute('data-panel'));
        if (!el) return;
        var willOpen = !el.classList.contains('is-open');
        setPanel(el, willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
      });
    });

    $$('[data-close-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = btn.closest('.drawer, .megamenu, .search') || openPanel;
        if (el) setPanel(el, false);
      });
    });

    var scrim = $('.scrim');
    if (scrim) scrim.addEventListener('click', function () { if (openPanel) setPanel(openPanel, false); });

    document.addEventListener('keydown', function (e) {
      if (!openPanel) return;
      if (e.key === 'Escape') { setPanel(openPanel, false); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(openPanel);
      if (!f.length) return;
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
  }

  /* --- Prices ------------------------------------------------------------ */
  function renderPrices(root) {
    $$('[data-price-aed]', root || document).forEach(function (el) {
      var aed = parseFloat(el.getAttribute('data-price-aed'));
      if (isNaN(aed)) return;
      var prefix = el.getAttribute('data-price-prefix') || '';
      el.textContent = prefix + store.format(aed);
    });
  }

  function initCurrency() {
    $$('[data-currency-select]').forEach(function (sel) {
      Object.keys(store.currencies).forEach(function (code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = code;
        sel.appendChild(opt);
      });
      sel.value = store.state.currency;
      sel.addEventListener('change', function () {
        store.setCurrency(sel.value);
        toast('Prices shown in ' + sel.value);
      });
    });
  }

  /* --- Cart drawer -------------------------------------------------------- */
  function cartLineMarkup(line) {
    return [
      '<article class="cart-line" data-line="' + line.id + '">',
      '  <div class="cart-line__thumb surface ' + line.swatch + '"></div>',
      '  <div>',
      '    <a class="cart-line__name" href="' + line.href + '">' + line.name + '</a>',
      '    <p class="cart-line__spec">' + line.specLines.join(' · ') + '</p>',
      '    <p class="cart-line__spec">' + (line.leadTime ? 'Delivery ' + line.leadTime : '') + '</p>',
      '    <div class="cart-line__foot">',
      '      <span class="num" data-price-aed="' + (line.priceAED * line.qty) + '"></span>',
      '      <span class="cart-line__spec">Qty ' + line.qty + '</span>',
      '    </div>',
      '    <button class="cart-line__remove" data-remove="' + line.id + '" type="button">Remove</button>',
      '  </div>',
      '</article>'
    ].join('');
  }

  function renderCart() {
    var body = $('[data-cart-body]');
    var foot = $('[data-cart-foot]');
    if (!body) return;

    if (!store.state.cart.length) {
      body.innerHTML = [
        '<div class="cart-empty stack">',
        '  <p class="display display--s">Your selection is empty.</p>',
        '  <p>Every PESU piece is made to order. Begin with a collection, or speak with a design advisor.</p>',
        '  <p><a class="link" href="index.html#collections">View collections</a></p>',
        '</div>'
      ].join('');
      if (foot) foot.hidden = true;
    } else {
      body.innerHTML = store.state.cart.map(cartLineMarkup).join('');
      if (foot) foot.hidden = false;
      var total = $('[data-cart-total]');
      if (total) total.setAttribute('data-price-aed', String(store.cartSubtotalAED()));
      renderPrices(body);
      renderPrices(foot);
      $$('[data-remove]', body).forEach(function (btn) {
        btn.addEventListener('click', function () {
          store.removeFromCart(btn.getAttribute('data-remove'));
          toast('Removed from selection');
        });
      });
    }
  }

  function syncCounts() {
    $$('[data-cart-count]').forEach(function (el) { el.textContent = store.cartCount(); });
    $$('[data-wishlist-count]').forEach(function (el) { el.textContent = store.state.wishlist.length; });
  }

  /* --- Search ------------------------------------------------------------- */
  function initSearch() {
    var input = $('[data-search-input]');
    var results = $('[data-search-results]');
    if (!input || !results) return;

    function render(q) {
      var term = q.trim().toLowerCase();
      var hits = PESU.catalog.searchIndex.filter(function (p) {
        return !term || (p.name + ' ' + p.collection).toLowerCase().indexOf(term) > -1;
      }).slice(0, 6);

      results.innerHTML = hits.length ? hits.map(function (p) {
        return [
          '<a class="search__result" href="' + p.href + '">',
          '  <span class="surface ' + p.swatch + '"></span>',
          '  <span><span class="tile__name" style="font-size:var(--step-1)">' + p.name + '</span>',
          '  <span class="tile__meta" style="display:block">' + p.collection + '</span></span>',
          '  <span class="tile__price num" data-price-aed="' + p.priceAED + '"></span>',
          '</a>'
        ].join('');
      }).join('') : '<p class="prose">Nothing matches “' + q + '”. Our advisors can source or commission it — <a class="link" href="#">write to the atelier</a>.</p>';
      renderPrices(results);
    }

    input.addEventListener('input', function () { render(input.value); });
    $$('[data-search-term]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        input.value = btn.getAttribute('data-search-term');
        render(input.value);
        input.focus();
      });
    });
    render('');
  }

  /* --- Accordions --------------------------------------------------------- */
  function initAccordions() {
    $$('.accordion__trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.accordion__item');
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* --- Toasts ------------------------------------------------------------- */
  function toast(message) {
    var stack = $('.toast-stack');
    if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="toast__dot"></span>' + message;
    stack.appendChild(el);
    window.setTimeout(function () {
      el.classList.add('is-out');
      window.setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }

  /* --- Misc --------------------------------------------------------------- */
  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  function initWishlistButtons() {
    $$('[data-wishlist-sku]').forEach(function (btn) {
      var sku = btn.getAttribute('data-wishlist-sku');
      btn.setAttribute('aria-pressed', String(store.inWishlist(sku)));
      btn.addEventListener('click', function () {
        var on = store.toggleWishlist(sku);
        btn.setAttribute('aria-pressed', String(on));
        toast(on ? 'Saved to your wishlist' : 'Removed from wishlist');
      });
    });
  }

  function init() {
    initReveals();
    initHeader();
    initPanels();
    initCurrency();
    initSearch();
    initAccordions();
    initYear();
    initWishlistButtons();

    store.subscribe(function () {
      renderPrices();
      renderCart();
      syncCounts();
      $$('[data-currency-select]').forEach(function (sel) { sel.value = store.state.currency; });
      document.dispatchEvent(new CustomEvent('pesu:store'));
    });
  }

  PESU.ui = {
    init: init,
    toast: toast,
    renderPrices: renderPrices,
    openPanel: function (sel) { var el = $(sel); if (el) setPanel(el, true); },
    $: $, $$: $$,
    reduced: reduced
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.PESU);
