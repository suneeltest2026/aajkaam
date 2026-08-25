/* ==========================================================================
   PESU — Catalogue
   The single source of truth for merchandising data in the prototype:
   materials, configurable options, products, collections, editorial.
   Shaped deliberately like an API response so it can be replaced by a fetch
   from the commerce backend / PIM without touching the views.
   ========================================================================== */
window.PESU = window.PESU || {};

(function (PESU) {
  'use strict';

  /* --- Materials ---------------------------------------------------------
     `vars` drive the vector artwork; `swatch` drives the CSS texture chip;
     `stage` tints the backdrop so each material sits in its own light.      */
  var MATERIALS = [
    {
      id: 'travertine',
      leadAdd: 0,   /* extra weeks in the atelier for this material */
      name: 'Travertine Dune',
      short: 'Travertine',
      origin: 'Quarried in Ras Al Khaimah',
      note: 'Open-pored, honed by hand until the stone reads like still sand.',
      swatch: 'mat-travertine',
      deltaAED: 0,
      stage: '#EFE7DA',
      finishes: ['honed', 'brushed', 'polished'],
      vars: { '--m-1': '#EFE6D6', '--m-2': '#DCCDB4', '--m-3': '#C2AF92', '--m-hi': '#FAF5EB', '--m-metal': '#B08D4F' }
    },
    {
      id: 'oak',
      leadAdd: 0,   /* extra weeks in the atelier for this material */
      name: 'Desert Oak',
      short: 'Oak',
      origin: 'FSC-certified, air-dried 18 months',
      note: 'Smoked and oiled, the grain left proud so the surface keeps moving.',
      swatch: 'mat-oak',
      deltaAED: -1800,
      stage: '#E7DCCB',
      finishes: ['honed', 'brushed', 'oiled'],
      vars: { '--m-1': '#B48F62', '--m-2': '#946F45', '--m-3': '#6F5133', '--m-hi': '#D3B287', '--m-metal': '#B08D4F' }
    },
    {
      id: 'alabaster',
      leadAdd: 2,   /* extra weeks in the atelier for this material */
      name: 'Alabaster Nour',
      short: 'Alabaster',
      origin: 'Selected block, Iberian quarry',
      note: 'Translucent at the edge — it holds light the way a lamp does.',
      swatch: 'mat-alabaster',
      deltaAED: 4200,
      stage: '#F2EDE3',
      finishes: ['honed', 'polished'],
      vars: { '--m-1': '#F7F2E8', '--m-2': '#E6DBC7', '--m-3': '#CFC0A6', '--m-hi': '#FFFDF8', '--m-metal': '#C6A464' }
    },
    {
      id: 'basalt',
      leadAdd: 1,   /* extra weeks in the atelier for this material */
      name: 'Volcanic Basalt',
      short: 'Basalt',
      origin: 'Hajar mountain basalt',
      note: 'Flamed then brushed to a matte graphite that swallows reflection.',
      swatch: 'mat-basalt',
      deltaAED: 2200,
      stage: '#DFD8CD',
      finishes: ['honed', 'brushed'],
      vars: { '--m-1': '#4A4239', '--m-2': '#332D26', '--m-3': '#23201B', '--m-hi': '#645A4D', '--m-metal': '#C6A464' }
    },
    {
      id: 'brass',
      leadAdd: 2,   /* extra weeks in the atelier for this material */
      name: 'Brushed Brass',
      short: 'Brass',
      origin: 'Cast and finished in Al Quoz',
      note: 'Unlacquered, so it warms and deepens through the years it is used.',
      swatch: 'mat-brass',
      deltaAED: 6500,
      stage: '#EAE0CD',
      finishes: ['brushed', 'polished'],
      vars: { '--m-1': '#DFC287', '--m-2': '#B08D4F', '--m-3': '#7E6229', '--m-hi': '#F2DFAE', '--m-metal': '#8A6C36' }
    }
  ];

  var FINISHES = [
    { id: 'honed',    name: 'Honed',    deltaAED: 0,    note: 'Matte, velvet to the touch' },
    { id: 'brushed',  name: 'Brushed',  deltaAED: 900,  note: 'Directional, low sheen' },
    { id: 'polished', name: 'Polished', deltaAED: 1600, note: 'Mirror depth, sealed' },
    { id: 'oiled',    name: 'Oiled',    deltaAED: 0,    note: 'Natural hardwax oil' }
  ];

  var SIZES = [
    { id: 's160', name: '160 cm', deltaAED: -2200, dims: { w: 160, d: 40, h: 84 }, weeks: '10–12' },
    { id: 's180', name: '180 cm', deltaAED: 0,     dims: { w: 180, d: 42, h: 84 }, weeks: '10–12', span: 1 },
    { id: 's220', name: '220 cm', deltaAED: 3900,  dims: { w: 220, d: 45, h: 86 }, weeks: '12–14' },
    { id: 'bespoke', name: 'Bespoke', deltaAED: 6800, dims: { w: 200, d: 45, h: 86 }, weeks: '16–18', custom: true }
  ];

  var BASES = [
    { id: 'monolith',   name: 'Monolith plinth', deltaAED: 0,    note: 'Solid material, mitred' },
    { id: 'cantilever', name: 'Cantilever',      deltaAED: 3400, note: 'Solid brass frame' },
    { id: 'fluted',     name: 'Fluted column',   deltaAED: 2600, note: 'Hand-carved reeding' }
  ];

  var ENGRAVING = { deltaAED: 680, maxLength: 22 };

  /* --- The configurable hero product ------------------------------------ */
  var PRODUCT = {
    sku: 'PS-SBK-CON-180',
    name: 'Sabkha Console',
    collection: 'Sabkha',
    collectionHref: '#',
    edition: 'Made to order · Edition of 60 per year',
    basePriceAED: 24500,
    href: 'product.html',
    story: [
      'Sabkha are the salt flats that lie between Dubai and the Empty Quarter — a surface that looks solid and reads, up close, as a thousand fractured plates of crystal and sand.',
      'The console takes that geology literally. A single 42 mm slab is cut, honed and set on a plinth with no visible fixings, so the piece appears to have been left there by weather rather than assembled by hand.'
    ],
    care: 'Seal annually with the PESU stone balm included in your delivery. Wipe with a soft, damp cloth; avoid citrus and alcohol on porous stone.',
    provenance: 'Every piece carries a hand-numbered brass disc on the underside and a signed certificate of provenance recording the block, the maker and the date it left the atelier in Al Quoz.'
  };

  /* --- Merchandising for the homepage ------------------------------------ */
  var COLLECTIONS = [
    {
      name: 'Dune',
      count: '14 pieces',
      line: 'Seating and consoles carved from a single mass',
      swatch: 'mat-travertine',
      href: '#'
    },
    {
      name: 'Majlis',
      count: '11 pieces',
      line: 'Modular low seating in camel wool and bouclé',
      swatch: 'mat-boucle',
      href: '#'
    },
    {
      name: 'Ghaf',
      count: '9 pieces',
      line: 'Lighting drawn from the canopy of the desert tree',
      swatch: 'mat-brass',
      href: '#'
    }
  ];

  var MATERIAL_STORIES = [
    { name: 'Travertine', swatch: 'mat-travertine', origin: 'Ras Al Khaimah', line: 'Cut from a single block so the veining runs unbroken across a whole collection.' },
    { name: 'Desert oak', swatch: 'mat-oak',        origin: 'Air-dried 18 months', line: 'Smoked to a deep amber, finished with hardwax oil and nothing else.' },
    { name: 'Brass',      swatch: 'mat-brass',      origin: 'Cast in Al Quoz',   line: 'Left unlacquered. It records every hand that has touched it.' },
    { name: 'Alabaster',  swatch: 'mat-alabaster',  origin: 'Iberian quarry',    line: 'Milled to 8 mm at the rim, where it turns translucent under light.' },
    { name: 'Bouclé',     swatch: 'mat-boucle',     origin: 'Woven in Puglia',   line: 'Undyed camel and wool, looped on a slow shuttle loom.' },
    { name: 'Basalt',     swatch: 'mat-basalt',     origin: 'Hajar mountains',   line: 'Flamed until the surface opens, then brushed back to graphite.' }
  ];

  var JOURNAL = [
    { kicker: 'At home with', title: 'A tower apartment on the Palm, furnished in three materials', line: 'Restraint as a form of luxury: one stone, one wood, one metal, repeated.', swatch: 'mat-travertine' },
    { kicker: 'In the atelier', title: 'Sixty hours of hand-honing, in eleven photographs', line: 'How a slab becomes a surface you want to touch on the way past.', swatch: 'mat-basalt' },
    { kicker: 'Material study', title: 'Why we leave brass unlacquered', line: 'Patina is not a defect. It is the object keeping a record of your life.', swatch: 'mat-brass' }
  ];

  var RELATED = [
    { name: 'Ghaf Pendant',     collection: 'Ghaf',   priceAED: 18900, swatch: 'mat-alabaster' },
    { name: 'Majlis Low Seat',  collection: 'Majlis', priceAED: 32400, swatch: 'mat-boucle' },
    { name: 'Dune Side Table',  collection: 'Dune',   priceAED: 11200, swatch: 'mat-travertine' },
    { name: 'Oud Vessel, Tall', collection: 'Sabkha', priceAED: 6400,  swatch: 'mat-clay' }
  ];

  var SEARCH_INDEX = [
    { name: 'Sabkha Console',     collection: 'Sabkha', priceAED: 24500, swatch: 'mat-travertine', href: 'product.html' },
    { name: 'Ghaf Pendant',       collection: 'Ghaf',   priceAED: 18900, swatch: 'mat-alabaster',  href: 'product.html' },
    { name: 'Majlis Low Seat',    collection: 'Majlis', priceAED: 32400, swatch: 'mat-boucle',     href: 'product.html' },
    { name: 'Dune Side Table',    collection: 'Dune',   priceAED: 11200, swatch: 'mat-travertine', href: 'product.html' },
    { name: 'Dune Lounge Chair',  collection: 'Dune',   priceAED: 27800, swatch: 'mat-oak',        href: 'product.html' },
    { name: 'Oud Vessel, Tall',   collection: 'Sabkha', priceAED: 6400,  swatch: 'mat-clay',       href: 'product.html' },
    { name: 'Basalt Plinth',      collection: 'Sabkha', priceAED: 9800,  swatch: 'mat-basalt',     href: 'product.html' },
    { name: 'Nour Wall Light',    collection: 'Ghaf',   priceAED: 7400,  swatch: 'mat-alabaster',  href: 'product.html' }
  ];

  function byId(list, id) {
    return list.filter(function (item) { return item.id === id; })[0] || list[0];
  }

  PESU.catalog = {
    materials: MATERIALS,
    finishes: FINISHES,
    sizes: SIZES,
    bases: BASES,
    engraving: ENGRAVING,
    product: PRODUCT,
    collections: COLLECTIONS,
    materialStories: MATERIAL_STORIES,
    journal: JOURNAL,
    related: RELATED,
    searchIndex: SEARCH_INDEX,
    byId: byId
  };
})(window.PESU);
