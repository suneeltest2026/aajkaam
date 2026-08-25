# PESU — Brand, Experience & Platform Blueprint

_Ultra-luxury home decor. Made to order in Al Quoz, Dubai._

---

## 1. Brand strategy

### Positioning
PESU is a Dubai house of made-to-order home decor for people who have already
bought the recognisable things. It sells **material, craft and specification**
rather than logo — the luxury of having chosen every dimension yourself.

> **Category:** sculptural furniture, lighting, decorative objects
> **Home market:** UAE / GCC, priced AED-first
> **Audience:** affluent design-led buyers — residents, expatriate principals,
> international collectors, and the interior designers and architects who
> specify on their behalf

### The four pillars, and how each shows up

| Pillar | In the product | In the site |
| --- | --- | --- |
| **Natural** | Six materials, no substitutes; nothing veneered | Material stories with named origins; a swatch-box request |
| **Innovative** | Invisible joinery, cantilevers, alabaster milled to 8 mm | Live configurator; drawing that redraws as you specify |
| **Ultra-luxury** | Editions, hand-numbering, certificate of provenance | Space, silence, slow motion, no discount language ever |
| **Dubai** | Al Quoz atelier, desert-derived collections | Desert palette, AED-first, Arabic-ready type, GCC concierge |
| **Customisable** | Material, finish, dimension, base, inscription | Configuration is the product page, not a modal on it |

### Name and tagline
**PESU** — set as tracked capitals, never as a logotype with a symbol.

- Primary tagline: **The desert, refined**
- Support lines: _Made to order in Dubai_ · _Six materials, no substitutes_ ·
  _Specify it down to the grain_

### Manifesto (site copy)

> We make objects the way the desert makes landscape.
>
> Slowly. From very few materials. With the marks of the process left visible,
> because that is the evidence of a human hand.
>
> PESU begins with a block of stone, a length of air-dried oak, a sheet of
> brass left unlacquered so it will change. Nothing is veneered, nothing
> pretends to be something else. What innovation we allow ourselves goes into
> engineering — invisible joinery, a cantilever that should not hold, a slab
> milled to eight millimetres until alabaster turns to light.
>
> Then we hand the object back to you unfinished, in one sense: dimension,
> finish, base, inscription. A PESU piece is only complete once it has been
> specified by the person who will live with it.

### Voice
Declarative, material-first, unhurried. Short sentences. Specific nouns
(travertine, 42 mm, Ras Al Khaimah) instead of adjectives (stunning, premium,
exquisite). Never exclamatory, never urgent, never discounted.

- **We say:** "Made to order. 10–12 weeks in the atelier."
- **We never say:** "Shop now", "Sale", "Limited time", "Luxury redefined".

### Commercial model
Made-to-order with deposit-based checkout, a bespoke commission funnel (12 per
year), a trade programme for designers and architects, and an editions
calendar that keeps scarcity honest rather than manufactured.

---

## 2. Visual identity

### Wordmark
`P E S U` in Cormorant Garamond Light, uppercase, tracked at **0.42em** in
navigation and **0.30em** at hero scale (optical correction: the tracking is
mirrored as `text-indent` so the mark stays optically centred). Hero
treatment fills a light gradient — alabaster into gilt — as if the letters
were cut from the same brass as the inlays.

**Seal / avatar:** a single `P` inside a hairline circle, for the brass disc
under every piece, packaging, favicon and app icon.

**Rules:** never stretch, never outline, never place on a busy image without a
scrim, never pair with a symbol. Minimum clear space = the cap height of the P.

### Colour

| Token | Hex | Role |
| --- | --- | --- |
| Ink | `#12100E` | Primary dark ground — warm, never pure black |
| Alabaster | `#F7F3ED` | Primary light ground |
| Gypsum | `#EFE8DD` | Secondary light, product stages |
| Dune | `#DCCEBB` | Tertiary surface |
| Sand | `#C6B49A` | Texture mid-tone |
| Gilt | `#B08D4F` | The only accent: rules, actives, inlays |
| Gilt Soft | `#D6BC8B` | Accent on dark grounds |
| Clay | `#A9765A` | Rare warm accent (wishlist, editorial) |
| Palm | `#38402F` | Rare cool accent (planting, sustainability) |

Ratio discipline: **70% neutral ground / 25% material / 5% gilt.** Gold is
punctuation, never decoration. Dark and light sections alternate down the page
so the eye rests; each section owns its palette via a single `.on-dark` class
that re-points the semantic tokens.

### Typography
- **Display — Cormorant Garamond Light (300).** Headlines, product names,
  prices, pull quotes. Optical sizes from 1.4rem to 7rem. Italic for the one
  emphasised word per headline, never more.
- **Interface — Jost (200/300/400).** Navigation, labels, body, buttons.
  Uppercase + 0.22em tracking for every label and button.
- **Arabic — Noto Kufi Arabic** for the `ar` locale, with the layout mirrored
  via logical properties (`padding-inline`, `margin-inline`) already used in
  the CSS.
- Fluid scale: nine `clamp()` steps, so nothing reflows awkwardly between a
  390 px phone and a 1560 px desktop.

### Imagery & material direction
Photography is commissioned as **object-in-light**, not lifestyle clutter:
a single piece, a warm neutral seamless, one directional source at 40°, deep
soft shadow, 4:5 or 3:4 crops, 8–12% film grain, no colour-graded blues.
Four shot types per SKU — full elevation, macro edge, in-situ, technical
drawing.

Until that shoot exists, this prototype renders all four as **vector scenes**
driven by CSS custom properties (`assets/js/art.js`), so a material change
re-skins every view. Replacing them with `<picture>` elements is a one-file
change.

---

## 3. Site map & page-by-page UX

```
PESU
├── Home
├── Collections
│   ├── Collection index (Dune · Majlis · Ghaf · Sabkha · Oud & Ash)
│   ├── Category / filtered grid  (material · room · price · lead time · size)
│   └── Product detail + configurator          ← built
├── Bespoke
│   ├── The commission process (4 steps)
│   ├── Enquiry flow (brief → budget → drawings → deposit)
│   └── Case studies
├── Materials  (six material stories, swatch-box request)
├── Journal    (editorial: at home with / in the atelier / material studies)
├── Client
│   ├── Account  (orders, atelier stage tracking, saved configurations,
│   │             registered provenance, addresses, currency & language)
│   ├── Wishlist / saved configurations
│   ├── Cart  → Checkout (deposit or full, multi-currency, VAT, duties)
│   └── Concierge  (WhatsApp, appointments, restoration requests)
└── Trade   (designer & architect programme, tearsheets, trade pricing)
```

### Homepage, section by section

| # | Section | Intent | Motion |
| --- | --- | --- | --- |
| 1 | **Hero** — full-viewport desert night, PESU wordmark at 17vw, tagline, one CTA | Establish the house before the shop | Letters rise in sequence (130 ms stagger); four parallax layers keyed to scroll; light source drifts with the pointer; grain overlay |
| 2 | **Ticker** | Compress the proof points into one calm line | Continuous 42 s marquee, pauses on hover |
| 3 | **Manifesto** | Say what the house believes, in its own voice | Line-by-line mask reveal; material plate fades in behind |
| 4 | **Collections** | Three tiles, offset vertically so the grid never reads as a catalogue | Ken-burns scale on hover, gradient scrim + CTA rises |
| 5 | **Spotlight** (dark) | One object, one story, four specs, price | Halo bloom behind the object; specs staggered |
| 6 | **Customisation** | Prove the promise on the homepage — five swatches, live preview | Material cross-fade in 1.1 s; caption swaps to the origin |
| 7 | **Materials rail** | Six materials with named provenance | Horizontal snap-scroll |
| 8 | **Bespoke** (dark) | The commission funnel, in four numbered steps | Steps reveal in sequence |
| 9 | **Concierge** | The four service guarantees | Icons + hairline rules |
| 10 | **Journal** | Dubai lifestyle as editorial, not as banner ads | Card media zoom |
| 11 | **Invitation** | Newsletter, framed as a private list | — |
| 12 | **Footer** | Wordmark at 12rem, four link columns, currency | Wordmark sits as the closing signature |

### Product detail + configurator

Two-column on desktop: gallery and story in column one, a **sticky
configurator rail** in column two spanning both rows. On mobile the order is
gallery → configurator → story, so nobody scrolls past the essay to reach the
price, plus a sticky buy bar.

The rail carries, in order: collection, name, edition line, **live price**,
VAT note, **live lead time**, material swatches, finish chips (incompatible
finishes disable themselves per material), dimensions (three presets +
bespoke, which reveals W/D/H inputs), base, inscription with a live brass
preview and character count, a configuration summary, quantity, add to
selection, wishlist, swatch box, and a consultation booking.

Every option carries its price delta **in the shopper's chosen currency**, and
every change re-renders price, lead time, the elevation drawing, the in-situ
scene and the technical drawing together — the page can never show a price
that disagrees with the drawing.

### Cart, checkout, account

- **Cart drawer** — configuration spelled out per line, lead time per line,
  subtotal, VAT/duties note, white-glove line, "speak with a design advisor".
- **Checkout** — guest or account; deposit (30%) or full payment; AED-first
  with USD/EUR/GBP/SAR; card, Apple/Google Pay, Tabby for lower tickets,
  bank transfer for high-value; delivery slot and access notes (lift
  dimensions, floor protection); gift/trade PO fields.
- **Account** — orders with **atelier stage tracking** (block selected → cut →
  honed → assembled → crated → in transit → installed, each with photographs),
  saved configurations, registered provenance certificates, restoration
  requests, addresses, currency and language.

### Interaction principles
One easing curve everywhere — `cubic-bezier(0.16, 1, 0.30, 1)` — at 260 ms
(controls), 620 ms (state) and 1100 ms (reveals). Nothing bounces. Nothing
slides in from off-screen except drawers. Hover states are always a wipe or a
fade, never a colour flash. Everything is gated behind
`prefers-reduced-motion`, and every reveal ends in a legible state even if the
observer never fires.

---

## 4. Platform features

| Area | In this prototype | Production |
| --- | --- | --- |
| Catalogue | `catalog.js` data module, search index | PIM/commerce API, faceted search (Algolia), per-market catalogues |
| Search | Overlay, suggestions, live filter | Typo-tolerant, synonym-mapped, merchandised |
| Configurator | Material/finish/size/base/engraving, compatibility rules, live price + lead time, live drawing | Same rules server-validated; BOM/costing feed to ERP; 3D/AR view |
| Cart | Drawer, per-configuration lines, localStorage | Server cart, abandoned-cart concierge follow-up |
| Checkout | Stub | Deposit split, VAT, duties, Tabby, bank transfer |
| Wishlist | Saved SKUs | Saved **configurations**, shareable with a designer |
| Accounts | Stub | Passwordless + WhatsApp OTP, provenance registry |
| Order tracking | Messaging | Atelier stages with photographs |
| Currency | AED/USD/EUR/GBP/SAR, per-currency rounding, exact AED | FX service, per-market rounding and price lists |
| Concierge | Booking + swatch-box CTAs | CRM, WhatsApp Business, appointment scheduling |

---

## 5. Build

```
pesu/
├── index.html                 Homepage
├── product.html               Sabkha Console — detail + configurator
└── assets/
    ├── css/  base · components · home · product
    └── js/   store · catalog · art · ui · home · product
```

**Stack:** vanilla HTML/CSS/JS, no build step, no runtime dependency. Classic
scripts on a `window.PESU` namespace so the pages open straight from disk as
well as from a server. Google Fonts is the only external request; the type
falls back gracefully.

**Layering:** `base.css` owns tokens, type scale, material surfaces and motion
primitives; `components.css` owns shared chrome; page CSS owns page layout.
`store.js` is the state seam a real commerce backend replaces; `catalog.js` is
shaped like an API response; `art.js` is the seam photography replaces.

**Accessibility:** landmarks and a skip link, focus trapping and `Escape` in
every overlay, `aria-pressed` on every option, live regions on the toast and
inscription preview, visible focus rings, AA contrast on text, and full
`prefers-reduced-motion` support.

---

## 6. Roadmap — from prototype to platform

**Phase 1 — complete the storefront (4–6 weeks)**
1. Collection index and faceted category pages (material, room, price, lead
   time, size), reusing the tile and material-surface components as-is.
2. Cart page and a deposit-based checkout: VAT, duties, delivery slot and
   access notes, Tabby and bank transfer alongside card and wallets.
3. Account: passwordless sign-in, saved **configurations** (not just SKUs),
   addresses, and the provenance registry.
4. Move the header, mega menu, drawers and footer into components — Astro or
   Next.js App Router — so the two copies of that chrome become one.

**Phase 2 — commerce backend (6–8 weeks)**
5. Swap `store.js` for a real cart (Shopify Storefront API, Medusa or
   commercetools) and `catalog.js` for the PIM; keep the module boundaries.
6. Server-validate the configurator's compatibility and pricing rules, and
   emit a bill of materials to the atelier's ERP on order.
7. FX service with per-market price lists and rounding rules.

**Phase 3 — the service layer (6–8 weeks)**
8. Atelier stage tracking with photograph uploads, surfaced in the account
   and in a WhatsApp thread with the client's advisor.
9. Bespoke commission funnel: brief, budget band, drawing round, deposit,
   and a CRM hand-off.
10. Trade programme: designer accounts, tearsheets, trade pricing, project
    boards shared with their clients.

**Phase 4 — depth (ongoing)**
11. Commission the photography and retire `art.js`.
12. 3D/AR configurator view — the same option state, a WebGL renderer.
13. Arabic locale end to end (RTL, Noto Kufi Arabic, Hijri-aware lead times).
14. Editions calendar, private-view invitations, and a client-only release
    feed.

**Always-on**
15. Performance budget (LCP < 2.0 s on 4G), analytics on configurator
    drop-off per option group, and A/B on the one thing that matters most:
    how early the price appears next to the drawing.
