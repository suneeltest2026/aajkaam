# PESU — front-end prototype

An ultra-luxury home-decor storefront: a full homepage and a product detail
page with a working configurator, built as a self-contained static front end.

The brand strategy, visual identity system and the page-by-page UX breakdown
live in [`docs/brand-and-experience.md`](docs/brand-and-experience.md).

> This folder is independent of the AajKaam application at the repository
> root. It shares no code, routes or dependencies with it.

## Run it

No build step and no dependencies. Either:

```bash
# from the repository root
npx http-server pesu -p 8099    # then open http://localhost:8099
```

…or simply open `pesu/index.html` in a browser — the scripts are classic
(non-module) scripts precisely so the pages work from `file://` too.

## What's here

```
pesu/
├── index.html            Homepage — 12 sections, hero through footer
├── product.html          Sabkha Console — gallery, configurator, story
├── docs/
│   └── brand-and-experience.md
└── assets/
    ├── css/
    │   ├── base.css        Tokens, reset, type scale, material surfaces, motion
    │   ├── components.css  Header, mega menu, drawers, search, forms, footer
    │   ├── home.css        Homepage sections
    │   └── product.css     Product detail + configurator
    └── js/
        ├── store.js        Currency, cart, wishlist — persisted, observable
        ├── catalog.js      Materials, options, products, editorial
        ├── art.js          Vector stand-ins for product photography
        ├── ui.js           Shared chrome: reveals, overlays, prices, toasts
        ├── home.js         Hero parallax, featured object, material teaser
        └── product.js      Configurator state → price, lead time, artwork
```

## Working features

- **Configurator** — five materials, four finishes (incompatible ones disable
  themselves per material), three sizes plus bespoke dimensions, three bases,
  and a hand-engraved inscription. Price, atelier lead time, the elevation
  drawing, the in-situ scene and the technical drawing all update together.
- **Multi-currency** — AED first, plus USD/EUR/GBP/SAR, with per-currency
  rounding (AED stays exact; converted prices round to a luxury increment).
  Every price on the page, including option deltas, re-renders on change.
- **Cart drawer** — each line records its full configuration and lead time;
  identically configured pieces merge, differently configured ones don't.
- **Wishlist**, **search overlay**, **mega menu**, **mobile menu**, toasts.
- Cart, wishlist and currency persist in `localStorage`; blocked storage
  degrades to a session-only shop rather than an error.

## Product photography

There is none yet, and nothing depends on it. `assets/js/art.js` draws each
view as SVG from CSS custom properties, so selecting a material re-skins every
scene. When the shoot lands, those builders are replaced by `<picture>`
elements and no other file changes.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge. Uses `:has()`, `grid-template-rows`
transitions and `backdrop-filter` for progressive enhancement only — the page
is fully usable without them.

## Not built yet

Collection/category listing pages, cart page, checkout, account and order
tracking, and the bespoke enquiry flow. See the roadmap at the end of
`docs/brand-and-experience.md`.
