/* ==========================================================================
   PESU — Store
   Client-side state: currency, cart, wishlist. Persisted to localStorage,
   published through a tiny subscribe/emit bus so every view (header counts,
   cart drawer, buy bar) stays in sync without a framework.

   In production this module is the seam where a real commerce backend
   (Shopify Storefront / Medusa / commercetools) is swapped in: the shape of
   `state` and the methods below stay, the persistence layer changes.
   ========================================================================== */
window.PESU = window.PESU || {};

(function (PESU) {
  'use strict';

  var KEY = 'pesu.v1';

  /* All prices are authored in AED — the home currency of the house.
     Rates are indicative and would come from an FX service, refreshed daily,
     with rounding rules per market (luxury pricing never ends in .37). */
  var CURRENCIES = {
    AED: { label: 'AED', locale: 'en-AE', rate: 1,      round: 1 },
    USD: { label: 'USD', locale: 'en-US', rate: 0.2723, round: 10 },
    EUR: { label: 'EUR', locale: 'de-DE', rate: 0.2510, round: 10 },
    GBP: { label: 'GBP', locale: 'en-GB', rate: 0.2140, round: 10 },
    SAR: { label: 'SAR', locale: 'en-SA', rate: 1.0210, round: 50 }
  };

  var state = {
    currency: 'AED',
    cart: [],
    wishlist: []
  };

  var listeners = [];

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (CURRENCIES[saved.currency]) state.currency = saved.currency;
        if (Array.isArray(saved.cart)) state.cart = saved.cart;
        if (Array.isArray(saved.wishlist)) state.wishlist = saved.wishlist;
      }
    } catch (err) {
      /* Private browsing, blocked storage — the shop still works, it just
         forgets. Never let persistence take the page down. */
    }
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) {}
  }

  function emit() {
    write();
    listeners.forEach(function (fn) { fn(state); });
  }

  /* --- Money ------------------------------------------------------------ */
  function convert(aed) {
    var c = CURRENCIES[state.currency];
    var value = aed * c.rate;
    return Math.round(value / c.round) * c.round;
  }

  function format(aed, opts) {
    var code = (opts && opts.currency) || state.currency;
    var c = CURRENCIES[code];
    var value = code === state.currency ? convert(aed) : Math.round(aed * c.rate / c.round) * c.round;
    try {
      return new Intl.NumberFormat(c.locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'code',
        maximumFractionDigits: 0
      }).format(value).replace(/\u00a0/g, ' ');
    } catch (err) {
      return code + ' ' + value.toLocaleString('en-US');
    }
  }

  /* --- Cart ------------------------------------------------------------- */
  function lineId(item) {
    /* Two identically configured pieces merge into one line; change any
       option — a finish, an engraving — and it becomes its own line. */
    return [item.sku, JSON.stringify(item.options || {})].join('|');
  }

  function addToCart(item) {
    var id = lineId(item);
    var existing = state.cart.filter(function (l) { return l.id === id; })[0];
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      state.cart.push({
        id: id,
        sku: item.sku,
        name: item.name,
        collection: item.collection,
        priceAED: item.priceAED,
        qty: item.qty || 1,
        specLines: item.specLines || [],
        options: item.options || {},
        swatch: item.swatch || 'mat-travertine',
        leadTime: item.leadTime || '',
        href: item.href || '#'
      });
    }
    emit();
    return id;
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(function (l) { return l.id !== id; });
    emit();
  }

  function setQty(id, qty) {
    state.cart.forEach(function (l) { if (l.id === id) l.qty = Math.max(1, qty); });
    emit();
  }

  function cartCount() {
    return state.cart.reduce(function (n, l) { return n + l.qty; }, 0);
  }

  function cartSubtotalAED() {
    return state.cart.reduce(function (n, l) { return n + l.priceAED * l.qty; }, 0);
  }

  /* --- Wishlist --------------------------------------------------------- */
  function toggleWishlist(sku) {
    var i = state.wishlist.indexOf(sku);
    if (i > -1) state.wishlist.splice(i, 1);
    else state.wishlist.push(sku);
    emit();
    return state.wishlist.indexOf(sku) > -1;
  }

  function inWishlist(sku) { return state.wishlist.indexOf(sku) > -1; }

  /* --- Currency --------------------------------------------------------- */
  function setCurrency(code) {
    if (!CURRENCIES[code]) return;
    state.currency = code;
    emit();
  }

  read();

  PESU.store = {
    state: state,
    currencies: CURRENCIES,
    subscribe: function (fn) { listeners.push(fn); fn(state); },
    format: format,
    convert: convert,
    setCurrency: setCurrency,
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    setQty: setQty,
    cartCount: cartCount,
    cartSubtotalAED: cartSubtotalAED,
    toggleWishlist: toggleWishlist,
    inWishlist: inWishlist
  };
})(window.PESU);
