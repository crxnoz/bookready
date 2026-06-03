# BookReady templates — architecture & extension guide

How the 5 public templates are built, what propagates automatically vs. what
costs "× 5", and the plan for making future additions cheaper via shared,
theme-tokenized section components.

Templates: `thefaderoom`, `blackline`, `velvettheory`, `lushstudio`, `opaline`.

---

## 1. The three layers

A change lands in one of three layers, and the layer decides how far it
propagates:

| Layer | Where | Propagation |
|---|---|---|
| **Editor + data** | `web/components/editor/WebsiteHub.tsx` + panels, `web/lib/types.ts` `TemplateSettings`, `api/app/Support/TemplateDefaults.php` | **Global.** One change covers all tenants & templates. New default keys reach existing tenants via the backend deep-merge (`mergeWithDefaults`) with no data migration. |
| **Shared render** | `@bkrdy/platform` — booking flow (`/booking`) and **sections (`/sections`)** | **All templates** that consume it. |
| **Per-template render** | `web/templates/<name>/<Name>Template.tsx` (one ~1,500-line component + scoped CSS each) | **None automatic.** Each template must be wired individually. |

**Rule of thumb:** if a change must appear on visitors' sites, budget for
"× 5 templates" *unless* it lives in a shared render module. The whole point
of §4 below is to move more sections into the shared layer so that budget shrinks.

What's intentionally global today: the editor UI, the settings/data contract,
the booking flow, and (newly) the FAQ section.

What's intentionally per-template: each template's **Hero/Header** and **About**
— the identity-defining layouts — plus the signature "skin" of every section.

---

## 2. Section similarity matrix

Measured by reading all 5 templates (2026-06). `S` = skin-only (same DOM +
same data, only CSS differs) · `M` = minor-structural (small markup/variant) ·
`X` = structurally different.

| Section | TFR | Blackline | Velvet | Lush | Opaline | Extraction |
|---|---|---|---|---|---|---|
| **FAQ** | S | S | S | S | S | ✅ done (prototype) |
| **Reviews** | S | S | S | S | S | ✅ easy (star glyph = prop) |
| **Thank-you** | S | S | S | S | S | ✅ easy |
| **Footer** | S | S | S | S | S | ✅ easy (needs `onBook` cb) |
| **Gallery** | S | S | M | S | S | ✅ (Velvet = strips variant) |
| **Policy** | M | S | M | S | S | ✅ (marker variant) |
| **Before/After** | S | S | S | M | M | ✅ (optional separator + labels) |
| **Advice** | M | S | S | M | S | ✅ (marker + numbered/separator) |
| **Timeline** | M | M | S | S | S | ✅ (numbered vs. "when" variant) |
| **About** | X | S | M | X | M | ⚠️ keep bespoke / slot-heavy |
| **Header/Hero** | X | M | X | M | M | ⚠️ extract logic, keep layout |

8–9 of 11 sections are the same skeleton reading the same payload — only paint
differs. Data contracts already match (`site.gallery/results/policies/hours`,
`settings.about/advice/timeline/additionals`). Only **About** and **Header/Hero**
are genuinely per-template, and those are the parts you *want* bespoke.

---

## 3. The token contract

Two token tiers; shared components are styled against both.

### 3a. Global size tokens — `web/packages/platform/src/tokens.ts`
Spacing, radius, font **sizes**, container widths, motion. Identical for every
template. Injected with `${tokensToCss()}` inside the template's scoped
`<style>`. Emits `--brk-space-*`, `--brk-radius-*`, `--brk-font-*` (sizes),
`--brk-container-*`, `--brk-motion-*`.

### 3b. Theme tokens — `web/packages/platform/src/sections/theme.ts`
The layer that **differs** per template: color roles + font **families**.
Canonical vars:

```
--brk-color-bg  --brk-color-surface  --brk-color-text  --brk-color-muted
--brk-color-rule  --brk-color-accent  --brk-color-on-accent
--brk-family-display  --brk-family-body  (--brk-family-script optional)
```

> `--brk-family-*` is deliberately separate from the size token `--brk-font-*`.

Each template already defines an equivalent local set; it just has a different
name (`--tfr-*`, `--blackline-*`, `--vt-*`, `--lush-*`, `--opaline-*`). A
template **bridges** its palette onto the canonical vars — either by CSS
aliasing (preferred; a runtime accent override flows through for free):

```css
.opaline-template {
  --brk-color-bg:   var(--opaline-bg);
  --brk-color-text: var(--opaline-ink);
  --brk-color-accent: var(--opaline-accent);
  /* ...etc... */
}
```

or via `themeVarsToCss(theme)` (JS injection).

### Per-template token quirks (must be handled by the bridge)
- **Velvet** inverts the model: the tenant `theme.accent_color` field is a
  **background-variant key**, and the gold accent is constant. Bridge maps its
  resolved variant → `--brk-color-bg/text/rule` and the constant gold →
  `--brk-color-accent`.
- **Lush** & **Velvet** don't call `tokensToCss()` today (Lush hardcodes px).
  SECTIONS_CSS uses literal fallbacks (`var(--brk-space-md, 16px)`) so layout
  still holds — but adopting `tokensToCss()` in all 5 is the clean end state.
- Latent bug to fix during migration: Velvet references an **undefined
  `--vt-serif`** in `.vt-review-body`.

---

## 4. Shared sections — `@bkrdy/platform/sections`

Render-layer counterpart to the shared booking module. A template:

1. injects `<style>{SECTIONS_CSS}</style>` once,
2. bridges its palette onto the canonical theme tokens (§3b),
3. composes the shared components instead of hand-rolling each section,
4. adds signature flourishes in its own scoped CSS over the `.brk-*` classes.

```
@bkrdy/platform/sections
  theme.ts        SectionTheme + themeVarsToCss()   (canonical token contract)
  sectionsCss.ts  SECTIONS_CSS                        (.brk-section, .brk-faq*, …)
  FaqSection.tsx  <FaqSection>                        (first extracted section)
  index.ts        barrel
```

**Two-layer skinning:** canonical tokens deliver ~80% of the look
(color/font/rule/spacing); per-template variant props + a thin scoped CSS
override deliver the signature 20% (polaroid tilt, neon glow, roman numerals,
✦ separators). This is exactly how Velvet already re-skins the shared booking
CSS under `.lush-template` — proven pattern.

### Worked example (shipped): FAQ on Opaline
- `<FaqSection items heading eyebrow>` renders `.brk-section > .brk-section-head
  (.brk-eyebrow + .brk-section-title) > .brk-faq-list > details.brk-faq`.
- `SECTIONS_CSS` ports Opaline's exact FAQ rules to `.brk-*` + canonical vars.
- Opaline bridges `--opaline-*` → `--brk-color-*`/`--brk-family-*` and renders
  `<FaqSection>` instead of the old inline `.opaline-faq` markup — pixel-identical.
- The old `.opaline-faq*` CSS is now dead and can be deleted (left in place for
  the prototype).

### Proposed component API (as sections are extracted)
```tsx
<SectionShell eyebrow title/>                 // generalize Opaline's SectionHeader
<FaqSection items heading eyebrow/>           // ✅ shipped
<ReviewsSection items heading starGlyph="★"/>
<ThanksSection title body signature/>
<SiteFooter settings hours profile onBook poweredBy/>
<GallerySection items groups variant="grid"|"strips"/>
<PolicySection policies marker="none"|"numeral"|"roman"|"glyph"/>
<BeforeAfterSection items separator="✦" labels/>
<AdviceSection items heading kicker numbered separator/>
<TimelineSection items heading kicker mode="numbered"|"when"/>
```

The tab shell + `goBook` orchestration and the Hero stay per-template; sections
are pure content and render identically whether stacked or inside a tab panel.

---

## 5. Recipes

### Add a new editable field
1. `TemplateDefaults.php` — add the key + default (deep-merge reaches all tenants).
2. `web/lib/types.ts` — add to `TemplateSettings`.
3. Editor panel in `web/components/editor/` — add the control.
4. **Each template** that should show it — render it (or gate via `manifest.ts`).
   → Step 4 is the "× 5" cost. Run the §7 checklist as an audit.

### Add a new section (today)
1. `website_sections` already supports type/enable/order — no schema change.
2. Add content keys (as above).
3. `TemplateDefaults.php sectionsFor()` — add the `section_key` + a `sort_order`
   that matches each template's designed tab order (see note below).
4. **Each template** — add to `SECTION_KEY_TO_TAB`, `allTabs`, a render function,
   and scoped CSS. (After §4 matures: build one shared `<XSection>` + compose.)

> Section order: templates render their tab rail by `website_sections.sort_order`.
> `sectionsFor()` encodes each template's *designed* order (TFR/Blackline/Opaline
> share; Lush + Velvet override). Keep them in sync or existing tenants reorder.

### Add a new template
Today: ~1,500-line bespoke component + scoped CSS + `manifest.ts` + registry
entry + `TemplateDefaults` branch. After §4 matures: define a theme (map tokens)
+ compose shared sections + write a skin file + bespoke Hero/About.

---

## 6. Migration plan (incremental, reversible)

1. **Token unification** — every template bridges its palette onto the canonical
   theme tokens (pure aliasing, no visual change). Fix Velvet's `--vt-serif`.
2. **Extract section-by-section in similarity order**, one reversible step each,
   verified against the live render:
   **FAQ ✅ → Reviews → Thank-you → Footer → Gallery → Policy → Before/After →
   Advice → Timeline.**
3. **Leave About + Hero bespoke** (or slot-rich versions last).

Each step: build the shared component + CSS + variant props, migrate all 5 behind
their existing look, verify parity, delete the now-dead per-template CSS.

---

## 7. Editable-fields checklist (the "× 5" audit)

Run this against every template when adding/auditing editor inputs. All live
under `site.template.settings` unless noted.

- **Header:** `announcement_text`, `show_announcement`, `cover_image_url`,
  `avatar_image_url` (manifest-gated). Contact/social buttons — for each of
  **book, call, email, message, directions, instagram, tiktok, youtube,
  facebook, pinterest, whatsapp**: `show_<key>_button` + `<key>_button_url`.
- **Tabs:** `tabs.{book,gallery,policy,about,results,advice,timeline}_label`
  (+ per-tab visibility via `website_sections.is_enabled`; order via `sort_order`).
- **About:** `images[3]`, `eyebrow`, `heading`, `body`, `highlights[].{title,body}`.
- **Advice / Timeline:** `heading`, `card_kicker`, `items[].{title,body}`.
- **Additionals:** `show_thank_you`, `thank_you_{title,body,signature}`;
  `faq.{enabled,heading,items[].{question,answer}}`;
  `reviews.{enabled,heading,items[].{author,body,location,rating}}`.
- **Footer:** `business_name_override`, `subtext`, `show_{contact_links,hours,quick_book,powered_by}` (manifest-gated).
- **Theme:** `theme.accent_color`.
- **Separate resources (own endpoints/tables):** Gallery (`gallery_items` + groups),
  Before/After (`results` + groups), Policies (`/editor/policies`).

Sourced elsewhere (not the website editor): business name/tagline/phone/email
(Settings → Business), hours (Availability).

---

## 8. Effort vs. payoff

- **Upfront:** token unification (~1–2 days, mechanical, 5 files) + the sections
  scaffold (~1 day, done).
- **Per section:** ~0.5–1 day to build the shared component + CSS + variants,
  then ~0.5 day to migrate all 5 + verify. Tier-1 (FAQ/Reviews/Thanks/Footer)
  are fastest.
- **Total** to extract the ~8 high-similarity sections: ~2–3 weeks focused.
- **Payoff:** a new section becomes 1 component + 5 one-line compositions (+ skin)
  instead of 5 bespoke builds + a 5-way audit; a new template becomes
  "map tokens + compose + skin" instead of 1,500 lines; cross-cutting fixes
  (contact buttons, eyebrows, review stars) become **1× instead of 5×**.

**When to invest:** worth it if you keep adding templates/sections. If the set
is stable at 5 with rare additions, the current "× 5 + this checklist" discipline
is cheaper than the refactor. Gate the decision on the roadmap.
