# Template Ideas Library

A scratchpad of design directions we've considered or pitched for the BookReady template marketplace but haven't shipped (yet). Each entry captures enough detail that the `template-creator` skill can pick it up later when a niche calls for it.

When promoting an idea to a real template, move it from this doc to its own scaffold and link the shipped template here so the trail stays.

---

## Hero patterns

### Hanging shop-sign hero

**The move**: brand name printed on a wooden / cream rectangular placard that hangs from two thin gold cords at top-center, casting a soft drop-shadow. Cover photo sits below in a smaller framed rectangle. Tagline + ornament + contact buttons stack under.

**Reads as**: walking past an Italian artisan storefront. Heaviest commitment to a workshop / atelier metaphor, most distinctive in the marketplace grid because nothing else in the family uses literal real-world hardware.

**Best fit**:
- Italian-coded studios (a deeper version of Bottega's lane)
- Vintage barbershops
- Tea rooms / cafés that take appointments
- Stationer / engraver / leather workshops

**Implementation sketch**:
- Outer container = centered max-w narrow, padded top
- Two `<span>` cords with `background: linear-gradient(gold-to-darker)` and `transform: rotate(-2deg) / rotate(2deg)` from the top edge to the placard's top corners
- Placard = surface card with a subtle inset shadow + the brand name in DM Serif Display italic
- A `box-shadow: 0 16px 32px rgba(0,0,0,0.18)` under the placard simulates it swaying
- Cover image below as a small rectangular "shop window" with a thin brass-toned frame
- Optional: subtle `@keyframes swing` rotation gated to `prefers-reduced-motion: no-preference`

**Status**: idea — pitched for Bottega 2025-06, deferred in favor of the magazine-cover split. Worth promoting if a future template wants a heavier old-world feel.

---

### Museum placard + framed photo hero

**The move**: cover image lives inside a thick warm-matte "frame" (paper-mat look) on the left; identity text sits right as a museum-placard column (italic name + tagline + small placard rule + contact strip). Both halves centered vertically, hairline gold ornament between.

**Reads as**: gallery-wall coded. Pairs the work and the artist as side-by-side art objects. Fits "artisanal workshop" + "fine-art studio" without being literal.

**Best fit**:
- High-end PMU artists
- Tattoo studios
- Boutique tattoo / fine-line tattoo
- Photographers offering portraits + bookings
- Fine-jewelry studios

**Implementation sketch**:
- `display: grid; grid-template-columns: 7fr 5fr` (image weighted)
- Cover image wrapped in a `padding: 18px` matte div with `background: var(--surface)` and a subtle `box-shadow: 0 8px 30px rgba(...)` to simulate frame depth
- Inside the matte, the image gets a 1px hairline gold border
- Identity column has small horizontal hairline gold rule above + below the name (museum-placard signature)
- Padding gets a vertical scroll hint via `background: linear-gradient(transparent 0%, --bg 95%)` if content gets long

**Status**: idea — pitched for Bottega 2025-06, deferred. Worth promoting if a future template targets fine-art or tattoo niches.

---

## Hero patterns shipped

Tracking what's in production so we don't propose duplicates.

| Template | Hero shape | Notes |
|---|---|---|
| TFR | Centered editorial + neon-glow name overlapping the cover | Identity card lifted into a soft cover veil |
| Blackline | Centered industrial wordmark on cover | Sharp rectangular vocabulary throughout |
| Velvet Theory | Full-viewport cover, text floats over a dark gradient fade | The boldest cover-as-stage move |
| Lush Studio | Centered with Cookie-script flourishes | Polaroid / handwritten feel |
| Opaline | Centered editorial card lifted into a soft cream veil | Refined-restrained editorial |
| Pétale | Asymmetric wedding-invitation (identity left, cover right portrait window with avatar "stamp" overlap) | Wedding-paper coded |
| Bottega | Magazine-cover split — cover bleeds left, identity panel right | Editorial-magazine spread |

---

## Patterned-background motifs

Bottega proves the backdrop-pattern technique. Future motif candidates to extend the same pattern-motif lever:

- **Art-deco fan / sunburst** in brass on cream/onyx — vintage barber + luxe salon
- **Moroccan tile / harlequin** in muted color — boho or editorial barber
- **Subtle paper grain / linen weave** at ~5% — niche-agnostic premium feel
- **Marble veining** behind hero only — boutique med-spa
- **Pressed botanicals** (subtle eucalyptus / fern silhouettes) on cream — wellness / facialist / aromatherapist

Pattern URL contract: drop the asset at `web/public/templates/{slug}/{motif}.{ext}` and add an entry to the template's `PATTERNS` map with `{ url, overlay, tileW, tileH }`. The overlay opacity must be tuned per asset — denser source artwork wants higher overlay (terrazzo at .92), white-backed linework wants lower overlay (flowers at .50) so the motif reads.

---

## Conventions for adding to this doc

- Title each entry with the **move + the metaphor**, not the implementation detail ("Hanging shop-sign hero", not "two-cord ASCII art").
- Always include **best-fit niches** — the doc is for picking up later, and the matchmaking is what's hard to remember.
- Implementation sketch should be enough to start, not a complete spec.
- Update the **shipped** table when an idea promotes — keeps the matrix honest.
