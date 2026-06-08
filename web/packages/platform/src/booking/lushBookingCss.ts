/**
 * Lush Studio booking-flow stylesheet — extracted from
 * LushStudioTemplate.tsx by M2b so consumers (Lush template + the
 * Velvet Theory shim) can import the booking CSS directly from the
 * shared module without depending on the Lush template file.
 *
 * The class system is still .lush-* prefixed and the rules still scope
 * under .lush-template; class rename to .brk-booking-* and CSS variable
 * theming hooks (--brk-booking-*) are M2c — those changes require
 * picking explicit theming tokens which is a separate decision.
 *
 * Consumers MUST inject this in a <style>{LUSH_CSS}</style> AND wrap the
 * embedded booking component in a div with className="lush-template"
 * (Velvet Theory adds vt-booking-inner alongside to apply its variable
 * overrides; see web/templates/velvettheory/VelvetTheoryBooking.tsx).
 */
export const LUSH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cookie&family=DM+Mono:wght@400;500&family=Molle:ital@1&family=DM+Serif+Text:ital@0;1&family=DM+Sans:opsz,wght@9..40,300..700&family=Roboto:wght@400;500;700&display=swap');

/* ── Tokens scoped to template root ── */
.lush-template {
  /* Lush Studio palette (soft spa). Cream page, near-black text,
     muted sage accent. Var names retain "pink" for now to avoid a
     full rename sweep — they're sage values internally. */
  --lush-bg:          #F6F3EE;
  --lush-card:        #FFFFFF;
  --lush-text:        #0E1111;
  --lush-muted:       #6B7280;
  --lush-pink:        #7FAF9A;
  /* Comma-separated RGB triplet for the same accent. Used by every
     rgba(var(--lush-pink-rgb), opacity) glow so swapping accents
     propagates everywhere via a single override on .lush-template. */
  --lush-pink-rgb:    127, 175, 154;
  /* Foreground color rendered ON TOP of a solid --lush-pink background.
     Default is white (legible on every preset except white itself);
     the editor flips this to dark when the white accent is picked. */
  --lush-on-pink:     #FFFFFF;
  --lush-pink-soft:   #B3D0C2;
  --lush-dark-border: rgba(14,17,17,0.10);
  /* Glow effects intentionally removed for the soft-spa direction —
     spa visual language is calm + flat, not luminous. The vars stay
     so the existing references still resolve; they just render as
     "no shadow". */
  --lush-glow:        none;
  --lush-text-glow:   none;
  /* Cookie — clean handwritten script for decorative headings.
     Molle — italic display script used for the highlight-color
     Before/After block; defined here so it propagates to any future
     use (the section pulls var(--lush-molle) directly). */
  --lush-script:      "Cookie", cursive;
  --lush-molle:       "Molle", cursive;
  --lush-serif:       "DM Serif Text", serif;
  --lush-sans:        "DM Sans", sans-serif;
  --lush-ui:          "Roboto", sans-serif;
  --lush-mono:        "DM Mono","Roboto Mono",monospace;
  width: 100%; background: var(--lush-bg); color: var(--lush-text);
  /* overflow-x:clip (not overflow-x:hidden) so the tab rail's
     position:sticky still works. overflow:hidden would establish a
     scroll container on .lush-template and ancestors of sticky
     elements then become the sticky's scroll boundary — sticky never
     activates against the viewport. overflow:clip does the same visual
     clipping without creating a scroll context. */
  overflow-x: clip; font-family: var(--lush-ui);
}
.lush-template *, .lush-template *::before, .lush-template *::after { box-sizing: border-box; }
.lush-template img { max-width: 100%; display: block; }
.lush-template a { text-decoration: none; }
.lush-template button, .lush-template a { -webkit-tap-highlight-color: transparent; cursor: pointer; }
.lush-template :focus-visible { outline: 2px solid var(--lush-pink); outline-offset: 3px; }

/* ── Announcement bar ── Static centered strip matching the pattern
   TFR (✦ bookends) and Blackline (clean strip) established. Lush keeps
   its own vocabulary with heart bookends + flat sage tint. ── */
.lush-announce {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:14px;
  padding:12px 24px;
  background:rgba(var(--lush-pink-rgb),0.08);
  border-bottom:1px solid rgba(var(--lush-pink-rgb),0.20);
  color:var(--lush-text);
  font-family:var(--lush-ui);
  font-size:11px;
  font-weight:600;
  letter-spacing:0.22em;
  text-transform:uppercase;
  text-align:center;
}
.lush-announce-spark {
  display:inline-flex;
  align-items:center;
  color:var(--lush-pink);
  flex-shrink:0;
}

/* ── Section frame ── Generic .lush-section base mirroring the trio's
   .tfr-section / .blackline-section / .vt-section. Uses literal pixel
   values that match what --brk-space-3xl / --brk-space-md / etc resolve
   to in the trio (64px / 16px / 720px / 48px) because Lush doesn't
   inject tokensToCss() — the brk-* var references would resolve empty
   here and the padding would silently disappear. */
.lush-section {
  max-width: 720px;
  margin: 0 auto;
  padding: 64px 16px;
}
/* .lush-book — modifier matching .tfr-book / .blackline-book / .vt-book.
   80px top compensates for the missing .tfr-booking-frame shim that TFR
   uses to add 16px above the platform booking; 48px bottom keeps the
   flow off the next section. */
.lush-book {
  padding-top: 80px;
  padding-bottom: 48px;
}

/* ── Header ── */
.lush-header-section {
  /* Size to content. The old min-height:100vh was overridden to auto on
     mobile but still applied on tablet/desktop, forcing the header to a
     full viewport height and leaving a big empty gap before the tab rail
     on PC. */
  width:100%; min-height:auto; background:var(--lush-bg);
  overflow:hidden; position:relative;
}
/* ── Customer-account widget (BookReady house style) ──
   Absolutely positioned top-right of the FadeRoom header. Sharp
   rectangular pill — NO border-radius, hairline border, system font,
   uppercase 10px label with wide tracking. White by default, flips
   to near-black on hover so it reads BookReady not template-y on
   whatever cover image is behind it. Same base class is shared
   between an <a> (authed link) and a <button> (unauthed → opens
   LushAuthModal). */
.lush-account-widget {
  position:absolute; top:14px; right:14px; z-index:6;
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 12px; border-radius:0;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.15);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:10px; font-weight:700; line-height:1;
  letter-spacing:0.16em; text-transform:uppercase;
  text-decoration:none;
  box-shadow:0 1px 3px rgba(0,0,0,0.08);
  transition:background .15s ease,color .15s ease,border-color .15s ease;
  cursor:pointer; -webkit-appearance:none; appearance:none;
}
@media (hover:hover) and (pointer:fine) {
  .lush-account-widget:hover {
    background:#121212; color:#FFFFFF; border-color:#121212;
  }
}
.lush-account-widget--authed { padding:0; gap:0; overflow:hidden; }
.lush-account-widget-link {
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 12px; color:inherit; text-decoration:none;
  font-size:10px; font-weight:700;
  letter-spacing:0.16em; text-transform:uppercase;
}
.lush-account-widget-signout {
  display:inline-flex; align-items:center; justify-content:center;
  width:32px; height:32px; padding:0;
  border:none; border-left:1px solid rgba(18,18,18,0.15);
  background:transparent; color:inherit; cursor:pointer;
  transition:background .15s ease,color .15s ease;
}
@media (hover:hover) and (pointer:fine) {
  .lush-account-widget-signout:hover {
    background:rgba(0,0,0,0.06);
  }
  .lush-account-widget--authed:hover .lush-account-widget-signout {
    border-left-color:rgba(255,255,255,0.20);
  }
  .lush-account-widget--authed:hover .lush-account-widget-signout:hover {
    background:rgba(255,255,255,0.10);
  }
}
/* Hide the floating top-right widget on mobile — it competes with the
   header cover + floating hearts for limited real estate. The booking
   form's Step 4 already has its own in-flow "Sign in to autofill"
   prompt for visitors who need to authenticate. */
@media (max-width:768px) {
  .lush-account-widget { display:none !important; }
}

/* ── Customer-auth modal (LushCustomerAuth) ──
   Mounted at template root by LushCustomerAuthProvider. BookReady
   house style: sharp corners (no border-radius anywhere), dark brand
   bar across the top, system font, near-black solids. Mirrors the
   AuthShell pattern used on /login and /account/login so customers
   know they're authenticating into BookReady, not the salon. */
.lush-auth-modal-backdrop {
  position:fixed; inset:0; z-index:9999;
  background:rgba(14,17,17,0.65);
  -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center;
  padding:16px;
  animation:lushAuthFade .15s ease both;
}
@keyframes lushAuthFade { from{opacity:0} to{opacity:1} }
.lush-auth-modal {
  position:relative; width:100%; max-width:440px;
  background:#FFFFFF; color:#121212;
  border-radius:0;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  box-shadow:0 24px 60px rgba(0,0,0,0.35);
  animation:lushAuthRise .2s ease both;
}
@keyframes lushAuthRise { from{transform:translateY(10px);opacity:0} to{transform:none;opacity:1} }

/* Dark brand bar across the top — sharp, full-bleed, BookReady wordmark
   on the left, close button on the right. */
.lush-auth-modal-brand {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 22px;
  background:#121212; color:#FFFFFF;
}
.lush-auth-modal-wordmark {
  font-size:10px; font-weight:700;
  letter-spacing:0.24em; text-transform:uppercase;
}
.lush-auth-modal-close {
  display:inline-flex; align-items:center; justify-content:center;
  width:24px; height:24px; padding:0;
  border:none; background:transparent;
  color:rgba(255,255,255,0.65); cursor:pointer;
  margin:-4px -6px -4px 0;
  transition:color .15s ease;
}
.lush-auth-modal-close:hover { color:#FFFFFF; }

/* Tab strip — same 2-col grid with bg-near-black-on-active treatment
   that the editor app auth pages use. */
.lush-auth-modal-tabs {
  display:grid; grid-template-columns:1fr 1fr;
  border-bottom:1px solid rgba(18,18,18,0.12);
}
.lush-auth-modal-tab {
  padding:14px 12px;
  border:none; background:transparent;
  font:inherit; font-size:11px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280; cursor:pointer;
  transition:color .15s ease, background .15s ease;
}
.lush-auth-modal-tab.is-active {
  background:#121212; color:#FFFFFF;
}
.lush-auth-modal-tab:not(.is-active):hover { color:#121212; }

.lush-auth-modal-body { padding:28px 26px 24px; }
.lush-auth-modal-eyebrow {
  display:block;
  font-size:10px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
  margin:0 0 6px;
}
.lush-auth-modal-title {
  font-family:inherit;
  font-size:26px; font-weight:700;
  letter-spacing:-0.01em; line-height:1.1;
  margin:0 0 6px; color:#121212;
}
.lush-auth-modal-tag {
  font-size:13px; color:#6B7280; line-height:1.5;
  margin:0 0 20px;
}
.lush-auth-modal-error {
  margin-bottom:14px; padding:10px 12px;
  background:#FEF2F2; border:1px solid #FECACA; border-radius:0;
  font-size:12px; color:#B91C1C;
}
.lush-auth-modal-form { display:grid; gap:14px; }
.lush-auth-modal-field { display:flex; flex-direction:column; gap:5px; }
.lush-auth-modal-field > span {
  font-size:10px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
}
.lush-auth-modal-form input {
  width:100%; padding:12px 14px;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.15); border-radius:0;
  font:inherit; font-size:14px; line-height:1.2;
  -webkit-appearance:none; appearance:none;
  transition:border-color .15s ease;
}
.lush-auth-modal-form input:focus { outline:none; border-color:#121212; }
.lush-auth-modal-form input::placeholder { color:#c4bcb6; }
.lush-auth-modal-submit {
  width:100%; padding:14px;
  background:#121212; color:#FFFFFF;
  border:none; border-radius:0;
  font:inherit; font-size:11px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  cursor:pointer; margin-top:4px;
  display:inline-flex; align-items:center; justify-content:center;
  transition:background .15s ease;
}
.lush-auth-modal-submit:hover:not(:disabled) { background:#2a2a2a; }
.lush-auth-modal-submit:disabled { opacity:0.6; cursor:default; }
.lush-auth-modal-foot {
  margin:16px 0 0; text-align:center;
  font-size:12px; color:#6B7280;
}
.lush-auth-modal-foot a {
  color:#121212; text-decoration:underline; text-underline-offset:2px;
}
.lush-auth-modal-fineprint { font-size:11px; line-height:1.45; }
.lush-spin { animation:lushAuthSpin .9s linear infinite; }
@keyframes lushAuthSpin { to { transform:rotate(360deg); } }
/* Mobile: stay centered (no bottom-sheet). Backdrop already has
   padding:16px so the modal gets breathing room on the sides; just
   tighten the internal padding so the form isn't cramped. */
@media (max-width:480px) {
  .lush-auth-modal { max-width:380px; }
  .lush-auth-modal-brand { padding:13px 18px; }
  .lush-auth-modal-body { padding:24px 20px 22px; }
}
/* ── Header cover ──
   Compact backdrop image; flat soft-spa direction (no veil / pulsing
   heart). A gradient floor + drop-shadow give the cover real depth
   so the content card visibly sits ON TOP of it instead of touching. */
.lush-header-cover {
  width:100%; height:31vh; min-height:230px; position:relative;
  background:#F6F3EE;
  overflow:hidden;
}
.lush-header-cover > img {
  width:100%; height:100%; object-fit:cover; display:block;
}
/* Bottom-edge gradient on the cover photo for depth. Subtle — the
   real shadow comes from the content card's top edge below. */
.lush-header-cover::after {
  content:""; position:absolute; left:0; right:0; bottom:0; height:120px;
  background:linear-gradient(to bottom, transparent 0%, rgba(14,17,17,0.22) 100%);
  pointer-events:none; z-index:1;
}
/* Legacy elements — hidden so any residual markup is invisible. */
.lush-cover-veil, .lush-cover-heart,
.lush-header-avatar, .lush-avatar-ring, .lush-avatar-heart, .lush-avatar-initials {
  display:none !important;
}
/* Floating hearts: hide everywhere — spa stays calm. */
.lush-floating-heart { display:none; }
@keyframes tfrHeartPulse {
  0%,100% { transform:scale(1); }
  50%      { transform:scale(1.12); }
}

/* ── Header content card ──
   Sits on top of the cover photo with the top corners rounded + translated
   up so the cover peeks above it. Strong top-edge shadow gives the
   "floating panel" depth. Solid cream bg so content reads cleanly on
   whatever cover image is below. Text is LEFT-aligned with generous
   top/left padding (editorial spa feel). */
.lush-header-content {
  position:relative; z-index:2;
  width:100%; margin:0 auto;
  padding:44px 30px 48px;
  text-align:left;
  background:var(--lush-bg);
  border-radius:36px 36px 0 0;
  margin-top:-48px;
  box-shadow:0 -14px 36px rgba(14,17,17,0.14);
}
.lush-header-content h1 {
  margin:0; color:var(--lush-text); font-family:var(--lush-serif);
  font-size:clamp(34px,8vw,56px); line-height:1.05;
  font-weight:400; letter-spacing:-0.02em;
}
.lush-header-subtype {
  margin:10px 0 0;
  font-family:var(--lush-ui); /* Roboto bold */
  font-size:14px; font-weight:700;
  letter-spacing:0.16em; text-transform:uppercase;
  color:rgba(14,17,17,0.55);
}
.lush-header-info {
  display:flex; flex-direction:column; align-items:flex-start; gap:10px;
  margin:18px 0 0;
}
/* Location + service-menu rows. Bold body text at lower opacity so
   the lines still read clearly without competing with the business
   name. Solid filled icons in highlight color, scaled to match. */
.lush-header-info-row {
  display:inline-flex; align-items:center; gap:12px;
  font-family:var(--lush-ui); /* Roboto bold */
  font-size:16px; line-height:1.3; font-weight:700;
  color:rgba(14,17,17,0.65);
}
.lush-header-info-row > svg {
  color:var(--lush-pink); flex-shrink:0;
}

/* ── Header buttons ──
   Grid: 5 columns of 50px circles. Every button is the same shape
   (including Book), so the visual rhythm is consistent. Centered
   under the info rows. Wraps to a second row if more than 5 are
   enabled. */
.lush-header-buttons {
  display:grid;
  grid-template-columns:repeat(5, 50px);
  gap:14px;
  margin-top:28px;
  justify-content:center;
}

/* Base button: 50px solid circle. The text label inside (a <span>)
   is hidden for sighted users but kept in the DOM for screen readers. */
.lush-header-btn {
  position:relative;
  display:inline-flex; align-items:center; justify-content:center;
  width:50px; height:50px; padding:0;
  border-radius:50%;
  color:#FFFFFF;
  border:none; cursor:pointer; text-decoration:none;
  font-size:0; line-height:1;
  transition:transform .15s ease, filter .15s ease;
  -webkit-tap-highlight-color:transparent; touch-action:manipulation;
}
@media (hover:hover) and (pointer:fine) {
  .lush-header-btn:hover { transform:translateY(-1px); filter:brightness(1.06); }
}
.lush-header-btn:active { transform:translateY(0); filter:brightness(1.0); }
.lush-header-btn[aria-disabled] { opacity:0.5; cursor:default; transform:none !important; }
.lush-header-btn > span {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0 0 0 0); border:0;
}
/* Default icon color = the accent-aware contrast var. Social brand
   buttons override this to forced white further down so platform
   gradients stay legible regardless of the chosen accent. */
.lush-header-btn svg {
  color:var(--lush-on-pink) !important;
  stroke:var(--lush-on-pink);
  fill:var(--lush-on-pink);
}

/* Book + Call + Email + Message → flat accent solids (highlight color),
   replacing the FadeRoom multi-color gradients. */
.lush-header-btn-book,
.lush-header-btn-call,
.lush-header-btn-chat,
.lush-header-btn-message {
  background:var(--lush-pink) !important;
  color:var(--lush-on-pink) !important;
}

/* The remaining contact + social buttons keep their brand gradients
   so the platform colors are recognizable at a glance. */
.lush-header-btn-directions { background:linear-gradient(45deg,#34D399 0%,#60A5FA 100%); }
.lush-header-btn-tiktok     { background:linear-gradient(45deg,#EA5F96 36%,#2FC2BF 100%); }
.lush-header-btn-youtube    { background:linear-gradient(45deg,#FB3354 49%,#FE879C 100%); }
.lush-header-btn-instagram  { background:linear-gradient(45deg,#F9CE34 0%,#EE2A7B 50%,#6228D7 100%); }
.lush-header-btn-facebook   { background:linear-gradient(45deg,#1877F2 0%,#5DA8FF 100%); }
.lush-header-btn-pinterest  { background:linear-gradient(45deg,#E60023 0%,#FF6E80 100%); }
.lush-header-btn-whatsapp   { background:linear-gradient(45deg,#25D366 0%,#A4F4C5 100%); }

/* Social-brand icons are always WHITE — the platform gradients are
   saturated enough that white is the only reliably-legible icon
   color across every accent choice. */
.lush-header-btn-directions svg,
.lush-header-btn-tiktok svg,
.lush-header-btn-youtube svg,
.lush-header-btn-instagram svg,
.lush-header-btn-facebook svg,
.lush-header-btn-pinterest svg,
.lush-header-btn-whatsapp svg {
  color:#FFFFFF !important;
  stroke:#FFFFFF !important;
  fill:#FFFFFF !important;
}

.lush-header-btn-mobile-only { display:inline-flex !important; }

/* ── Tabs ── */
.lush-tabbed-section { width:100%; background:var(--lush-bg); }

/* Sticky rail — keeps Lush's own rhythm (wider 1180px container, 24px
   sides, 18/24 padding, z-index:20) per user feedback. The trio's exact
   dimensions felt too tight for Lush's softer voice. Drops the
   mask-image fade edges (none of the others use them). */
.lush-tab-rail {
  position:sticky; top:0; z-index:20;
  background:var(--lush-bg);
  border-top:1px solid var(--lush-dark-border);
  border-bottom:1px solid var(--lush-dark-border);
  overflow-x:auto;
  -webkit-overflow-scrolling:touch;
  /* Keep the horizontal tab-scroll from bleeding into the browser's
     back/forward swipe gesture on mobile (was a big part of the rail
     "not working properly" on phones). */
  overscroll-behavior-x:contain;
  scrollbar-width:none;
  padding:18px 0 24px;
}
.lush-tab-rail::-webkit-scrollbar { display:none; }
.lush-tab-slider {
  display:flex;
  flex-wrap:nowrap;
  max-width:1180px;
  margin:0 auto;
  padding:0 24px;
  gap:8px;
  /* proximity (not mandatory): mandatory snapping fought taps and
     free-scroll on mobile (7 pills overflow a phone width), re-centering
     pills mid-gesture so the strip felt stuck. proximity only snaps when
     you're already near a snap point. scroll-padding keeps the first/last
     pill off the very edge when snapped/scrolled into view. */
  scroll-snap-type:x proximity;
  scroll-padding-inline:24px;
}
/* Rounded outlined pills — hairline sage outline at 30% opacity on
   cream, uppercase Roboto micro 11px/0.20em. Active state fills the
   border to solid sage, swaps the label color to sage, and floats a
   ✦ sparkle above the pill — Lush's signature marker, tied to the
   same glyph used in ritual separators + before/after dividers. */
.lush-tab-pill {
  position:relative; flex:0 0 auto;
  display:inline-flex; align-items:center; justify-content:center;
  padding:12px 22px;
  background:transparent;
  border:1px solid rgba(var(--lush-pink-rgb),0.30);
  border-radius:999px;
  color:var(--lush-muted);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.20em; text-transform:uppercase; line-height:1;
  cursor:pointer; white-space:nowrap; scroll-snap-align:center;
  transition:color .22s ease, border-color .22s ease, background .22s ease;
}
.lush-tab-pill::before {
  content:"\\2726\\FE0E"; /* ✦ — \\FE0E variation selector forces text rendering, not emoji */
  position:absolute; top:-12px; left:50%;
  transform:translateX(-50%) translateY(-2px);
  color:var(--lush-pink);
  font-size:11px; line-height:1;
  opacity:0;
  transition:opacity .22s ease, transform .28s cubic-bezier(.4,0,.2,1);
  pointer-events:none;
}
.lush-tab-pill:hover {
  color:var(--lush-text);
  border-color:rgba(var(--lush-pink-rgb),0.55);
}
.lush-tab-pill.is-active {
  color:var(--lush-pink);
  border-color:var(--lush-pink);
}
.lush-tab-pill.is-active::before {
  opacity:1;
  transform:translateX(-50%) translateY(0);
}
.lush-tab-pill:focus-visible {
  outline:2px solid var(--lush-pink); outline-offset:2px;
}
@media (prefers-reduced-motion:reduce) {
  .lush-tab-pill,
  .lush-tab-pill::before { transition:none !important; }
}
.lush-tab-panel { display:none; }
.lush-tab-panel.is-active { display:block; }

/* ── Booking ── */
.brk-booking-section { padding:36px 22px 64px; max-width:860px; margin:0 auto; color:var(--lush-text); }
.brk-booking-head { text-align:center; margin-bottom:28px; }
.brk-booking-eyebrow {
  display:inline-block; font-family:var(--lush-ui); font-size:11px;
  font-weight:600; letter-spacing:0.22em; text-transform:uppercase;
  color:var(--lush-pink); margin-bottom:8px;
}
.brk-booking-head h2 {
  font-family:var(--lush-script); font-size:clamp(48px,9vw,64px);
  font-weight:400; line-height:1; letter-spacing:0; margin:0 0 22px;
  color:var(--lush-text);
}
/* Compact dot-timeline: small numbered circles connected by thin lines
   with a single caption underneath ("Step 3 of 5 · Date & Time"). */
.brk-booking-progress {
  display:flex; flex-direction:column; align-items:center;
  gap:12px; margin-bottom:6px;
}
.brk-booking-progress-track {
  display:flex; align-items:center; justify-content:center;
  gap:0; width:min(100%,360px);
}
.brk-booking-step {
  background:transparent; border:0; padding:0;
  display:inline-flex; align-items:center; justify-content:center;
  flex:0 0 auto;
  cursor:pointer; transition:transform .2s ease;
}
.brk-booking-step-num {
  width:28px; height:28px;
  display:inline-flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:600; letter-spacing:0.02em;
  border:1px solid var(--lush-dark-border); border-radius:999px;
  color:var(--lush-muted); background:transparent;
  transition:all .25s ease;
}
.brk-booking-step + .brk-booking-step::before {
  content:""; flex:1 1 auto; height:1px; min-width:14px;
  background:var(--lush-dark-border); margin:0 4px;
  transition:background .25s ease;
}
.brk-booking-step.is-done + .brk-booking-step::before {
  background:var(--lush-pink);
}
.brk-booking-step.is-active { transform:scale(1.05); }
.brk-booking-step.is-active .brk-booking-step-num {
  background:var(--lush-pink); border-color:var(--lush-pink);
  color:var(--lush-on-pink);
}
.brk-booking-step.is-done .brk-booking-step-num {
  border-color:var(--lush-pink);
  color:var(--lush-pink);
  background:transparent;
}
.brk-booking-step:hover:not(.is-active) .brk-booking-step-num {
  border-color:var(--lush-pink);
}
.brk-booking-step-label {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
.brk-booking-progress-caption {
  margin:0; font-family:var(--lush-ui);
  font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted); font-weight:600;
}
.brk-booking-progress-caption strong {
  color:var(--lush-pink); font-weight:600;
  margin-left:4px;
}
/* Add-on cards: hidden native checkbox + visible card with flat sage
   active state. No glow — flat soft-spa direction. */
.lush-addon-card {
  display:flex; align-items:flex-start; gap:12px;
  padding:14px 16px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  cursor:pointer;
  transition:border-color .2s ease, background .2s ease;
}
.lush-addon-card:hover:not(.is-locked) {
  border-color:var(--lush-pink);
}
.lush-addon-card.is-checked {
  border-color:var(--lush-pink);
  background:rgba(var(--lush-pink-rgb),0.06);
}
.lush-addon-card.is-locked { cursor:not-allowed; }
.lush-addon-input { position:absolute; opacity:0; pointer-events:none; }
.lush-addon-indicator {
  flex-shrink:0; width:22px; height:22px;
  display:inline-flex; align-items:center; justify-content:center;
  border:1.5px solid var(--lush-dark-border);
  background:transparent;
  color:var(--lush-on-pink);
  margin-top:1px;
  transition:all .2s ease;
}
.lush-addon-card.is-checked .lush-addon-indicator {
  border-color:var(--lush-pink);
  background:var(--lush-pink);
}
/* Optional addon thumbnail — slots between the checkbox indicator and
   the text body when an image_url is set. Square, modest size so a
   row of addons stays compact and scannable. */
.lush-addon-thumb {
  flex-shrink:0;
  width:48px; height:48px;
  border-radius:4px;
  object-fit:cover;
  background:rgba(var(--lush-pink-rgb),0.06);
}
.lush-addon-body { flex:1; min-width:0; }
.lush-addon-head {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  margin-bottom:2px;
}
.lush-addon-name {
  font-family:var(--lush-ui); font-size:13px; font-weight:600;
  color:var(--lush-text); letter-spacing:0.01em;
}
.lush-addon-required {
  font-size:9px; font-weight:700; letter-spacing:0.12em;
  text-transform:uppercase;
  padding:2px 8px;
  color:var(--lush-pink);
  border:1px solid var(--lush-pink);
  background:rgba(var(--lush-pink-rgb),0.08);
}
.lush-addon-desc {
  font-size:11px; line-height:1.45;
  color:var(--lush-muted);
  margin:2px 0 6px;
}
.lush-addon-meta {
  display:inline-flex; gap:8px; align-items:center;
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.06em;
  color:var(--lush-pink);
}
.lush-addon-meta-dot { opacity:0.45; }

.brk-booking-slides { display:block; }
.brk-booking-slide { display:none; animation:lushBookingFade .35s ease both; }
.brk-booking-slide.is-active { display:block; }
@keyframes lushBookingFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* Services in booking */
.brk-booking-services { display:grid; gap:12px; }
.brk-booking-service-card {
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-left:2px solid var(--lush-pink);
  border-radius:6px; padding:18px 18px 16px;
  display:flex; flex-direction:column; gap:8px;
  transition:border-color .2s ease;
}
/* Top-banner image used by service cards AND category tiles. Lives
   INSIDE the card padding (the earlier bleed-to-edge version felt
   cramped against the card border). Aspect-ratio locked so a row of
   cards stays visually balanced regardless of the underlying photo
   dimensions. Subtle corner radius matches the card's. */
.brk-booking-service-image {
  display:block;
  width:100%;
  margin:0 0 4px;
  aspect-ratio:16 / 9;
  object-fit:cover;
  border-radius:4px;
  background:rgba(var(--lush-pink-rgb),0.06);
}
.brk-booking-service-card:hover { border-color:var(--lush-pink); }
.brk-booking-service-card.is-selected {
  border-color:var(--lush-pink);
  background:rgba(var(--lush-pink-rgb),0.06);
}
.brk-booking-service-top { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.brk-booking-service-card h3 { margin:0; font-family:var(--lush-ui); font-size:16px; font-weight:600; letter-spacing:0.02em; color:var(--lush-text); }
.brk-booking-price { font-family:var(--lush-ui); font-size:15px; font-weight:600; color:var(--lush-pink); white-space:nowrap; }
.brk-booking-desc { margin:0; font-size:13px; color:var(--lush-muted); line-height:1.5; }
.brk-booking-meta { margin:0; font-size:12px; color:var(--lush-muted); display:inline-flex; gap:6px; align-items:center; }
.brk-booking-pick {
  align-self:flex-start; margin-top:4px; background:transparent;
  border:1px solid var(--lush-pink); color:var(--lush-text);
  border-radius:999px; padding:8px 14px;
  font-size:11px; letter-spacing:0.16em; text-transform:uppercase; font-weight:600;
  cursor:pointer; display:inline-flex; gap:8px; align-items:center;
  transition:background .2s ease;
}
.brk-booking-pick:hover { background:rgba(var(--lush-pink-rgb),0.10); }

/* Date & time */
.brk-booking-datetime { display:flex; flex-direction:column; gap:22px; }
.brk-booking-block { }
.brk-booking-block-label {
  display:block; font-size:11px; letter-spacing:0.18em;
  text-transform:uppercase; color:var(--lush-muted); margin-bottom:12px; font-weight:600;
}
.brk-booking-days { display:flex; flex-wrap:wrap; gap:8px; }
.brk-booking-day {
  flex:1 1 72px; min-width:68px; max-width:100px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-radius:8px; padding:12px 8px;
  display:flex; flex-direction:column; align-items:center; gap:3px;
  color:var(--lush-text); cursor:pointer; transition:all .2s ease;
}
.brk-booking-day span { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--lush-muted); }
.brk-booking-day strong { font-family:var(--lush-ui); font-size:18px; font-weight:600; }
.brk-booking-day:hover { border-color:var(--lush-pink); }
.brk-booking-day.is-selected {
  border-color:var(--lush-pink);
  background:var(--lush-pink);
  color:var(--lush-on-pink);
}
.brk-booking-day.is-selected span,
.brk-booking-day.is-selected strong { color:var(--lush-on-pink); }

/* ── Calendar ── */
.brk-booking-calendar {
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border); border-radius:10px;
  padding:14px; display:flex; flex-direction:column; gap:10px;
}
.lush-calendar-head {
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.lush-calendar-title {
  font-family:var(--lush-ui); font-size:14px; font-weight:600;
  letter-spacing:0.08em; color:var(--lush-text); text-transform:uppercase;
}
.lush-calendar-nav {
  background:transparent; border:1px solid var(--lush-dark-border);
  color:var(--lush-text); width:34px; height:34px; border-radius:999px;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s ease;
}
.lush-calendar-nav:hover { border-color:var(--lush-pink); color:var(--lush-pink); }
.lush-calendar-nav:disabled { opacity:0.3; cursor:not-allowed; }
.lush-calendar-nav:disabled:hover { border-color:var(--lush-dark-border); color:var(--lush-text); }
.lush-calendar-dow {
  display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
  font-family:var(--lush-ui); font-size:10px; font-weight:600;
  letter-spacing:0.1em; text-transform:uppercase; color:var(--lush-muted);
  text-align:center; padding:0 2px;
}
.lush-calendar-dow span { padding:4px 0; }
.lush-calendar-grid {
  display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
}
.lush-calendar-day {
  aspect-ratio:1/1; min-height:36px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-radius:6px; color:var(--lush-text);
  font-family:var(--lush-ui); font-size:13px; font-weight:500;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .15s ease; padding:0;
}
.lush-calendar-day:hover:not(:disabled) { border-color:var(--lush-pink); transform:translateY(-1px); }
.lush-calendar-day--today {
  border-color:var(--lush-pink); color:var(--lush-text);
}
.lush-calendar-day--blocked {
  background:transparent; border-color:rgba(14,17,17,0.04);
  color:rgba(14,17,17,0.25); cursor:not-allowed;
}
.lush-calendar-day--blocked:hover { transform:none; }
.lush-calendar-day--selected {
  background:var(--lush-pink); border-color:var(--lush-pink); color:var(--lush-on-pink);
}
.lush-calendar-day--selected.lush-calendar-day--today { color:var(--lush-on-pink); }
.lush-calendar-day--empty {
  background:transparent; border:0; cursor:default; visibility:hidden;
}
.brk-booking-times { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px; }
.brk-booking-time {
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  border-radius:999px; padding:12px 10px; color:var(--lush-text);
  font-family:var(--lush-ui); font-size:13px; cursor:pointer; transition:all .2s ease; text-align:center;
}
.brk-booking-time:hover { border-color:var(--lush-pink); }
.brk-booking-time.is-selected {
  border-color:var(--lush-pink);
  background:var(--lush-pink);
  color:var(--lush-on-pink);
}
/* Av2.0 P4 — after-hours (premium) slots: dark fill + dashed edge so they
   visibly read as "after hours / premium" against the regular pills. */
.brk-booking-time.is-after-hours {
  border-style:dashed;
  background:var(--lush-ink, #16131a);
  border-color:var(--lush-ink, #16131a);
  color:#fff;
}
.brk-booking-time.is-after-hours:hover { border-color:var(--lush-pink); }
.brk-booking-time.is-after-hours.is-selected {
  background:var(--lush-pink); border-color:var(--lush-pink); color:var(--lush-on-pink);
}
.brk-booking-time-fee {
  display:block; margin-top:2px; font-size:10px; font-weight:700;
  letter-spacing:.04em; opacity:.75;
}
.lush-slot-msg { font-size:13px; color:var(--lush-muted); padding:16px 0; }
.lush-slot-error { color:#B91C1C; }

/* Details step */
/* Customer-account banner above the Details step inputs (BookReady
   house style). Sharp white card with a hairline border that
   deliberately reads as a BookReady inset, not a template element.
   Same class handles --authed (cream tint) and the default (white).
   Sign-in button opens the LushAuthModal in-page; the link variant
   navigates to /account in a new tab. */
.brk-booking-auth {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:11px 14px; margin-bottom:14px;
  background:#FFFFFF;
  border:1px solid rgba(18,18,18,0.10);
  border-radius:0;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:12px; line-height:1.3;
  color:#121212;
}
.brk-booking-auth--authed { background:#F8F6F2; }
.brk-booking-auth strong { font-weight:700; }
.brk-booking-auth-link {
  margin-left:auto; color:#121212;
  text-decoration:underline; text-underline-offset:2px;
  font-weight:700; font-size:10px;
  letter-spacing:0.14em; text-transform:uppercase;
  white-space:nowrap;
  /* Button reset so the same class works on <a> and <button>. */
  background:transparent; border:none; padding:0;
  font-family:inherit; cursor:pointer;
}
@media (hover:hover) and (pointer:fine) {
  .brk-booking-auth-link:hover { color:#6B7280; }
}

/* Persistent thin sign-in row below the booking title. Centered,
   muted, single line — visible on every step without competing for
   attention. Bottom margin keeps it off the progress dots beneath. */
.brk-booking-auth-thin {
  margin:6px 0 20px;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:12px; line-height:1.4;
  color:var(--lush-muted);
  text-align:center;
}
.brk-booking-auth-thin strong { font-weight:600; color:var(--lush-text); }
.brk-booking-auth-thin button {
  background:transparent; border:none; padding:0;
  font:inherit; color:var(--lush-text);
  text-decoration:underline; text-underline-offset:2px;
  cursor:pointer;
}
@media (hover:hover) and (pointer:fine) {
  .brk-booking-auth-thin button:hover { opacity:0.7; }
}

/* Prominent "View your bookings" CTA for already-authed visitors at
   Step 4. Sharp BookReady house style — full-width card that reads
   as a button. Replaces the previous subtle inline "Manage bookings"
   link. */
.brk-booking-account-cta {
  display:flex; align-items:center; gap:14px;
  padding:14px 16px; margin-bottom:18px;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.12);
  border-radius:0;
  text-decoration:none;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  transition:background .15s ease, color .15s ease, border-color .15s ease;
}
@media (hover:hover) and (pointer:fine) {
  .brk-booking-account-cta:hover {
    background:#121212; color:#FFFFFF; border-color:#121212;
  }
}
.brk-booking-account-cta-icon {
  width:36px; height:36px;
  display:inline-flex; align-items:center; justify-content:center;
  background:rgba(18,18,18,0.06); flex-shrink:0;
  transition:background .15s ease;
}
.brk-booking-account-cta:hover .brk-booking-account-cta-icon {
  background:rgba(255,255,255,0.12);
}
.brk-booking-account-cta-body { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.brk-booking-account-cta-eyebrow {
  font-size:9px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  opacity:0.6;
}
.brk-booking-account-cta-title {
  font-size:15px; font-weight:700;
  letter-spacing:-0.005em;
}
.brk-booking-account-cta-sub {
  font-size:12px; opacity:0.7; line-height:1.3;
}
.brk-booking-account-cta-arrow {
  width:32px; height:32px;
  display:inline-flex; align-items:center; justify-content:center;
  flex-shrink:0;
}

/* Opt-in "Create a BookReady account" block in Step 4 (unauthed).
   Sits inside the form flow, bordered to read as a related-but-
   optional choice. Password field reveals when checkbox is checked. */
.brk-booking-create-account {
  margin-top:6px;
  padding:14px 16px;
  background:#FFFFFF;
  border:1px solid rgba(18,18,18,0.12);
  border-radius:0;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:#121212;
}
.brk-booking-create-account-row {
  display:flex; align-items:center; gap:10px;
  cursor:pointer; user-select:none;
}
.brk-booking-create-account-row > input[type="checkbox"] {
  width:16px; height:16px; flex-shrink:0;
  accent-color:#121212; cursor:pointer;
}
.brk-booking-create-account-row > strong {
  font-size:14px; font-weight:700; letter-spacing:-0.005em;
}
/* Benefits paragraph sits below the row at full width — no leading
   indent that would compete with the checkbox alignment above. */
.brk-booking-create-account-blurb {
  margin:8px 0 0;
  font-size:12px; line-height:1.45; color:#6B7280;
}
.brk-booking-create-account-pw {
  display:flex; flex-direction:column; gap:6px;
  margin-top:12px; padding-top:12px;
  border-top:1px solid rgba(18,18,18,0.10);
}
.brk-booking-create-account-pw > span:first-child {
  font-size:10px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
}
/* Password input — the higher-specificity selector (with [type] and
   the create-account scope) wins over .brk-booking-fields input which
   would otherwise paint white text on a near-transparent background.
   Also using stronger border + a visible placeholder color. */
.brk-booking-create-account .brk-booking-create-account-pw input[type="password"] {
  width:100%; padding:11px 13px;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.25); border-radius:0;
  font:inherit; font-size:14px; line-height:1.2;
  -webkit-appearance:none; appearance:none;
  box-shadow:none;
}
.brk-booking-create-account .brk-booking-create-account-pw input[type="password"]:focus {
  outline:none; border-color:#121212;
}
.brk-booking-create-account .brk-booking-create-account-pw input[type="password"]::placeholder {
  color:#c4bcb6;
}
.brk-booking-create-account-fineprint {
  font-size:11px; line-height:1.45; color:#6B7280;
}

/* Account-follow-up card. Used twice: at the top of the booking form
   when returning from Stripe with &account=new, and inside the
   success state when a non-payment booking just minted an account.
   Cream tint + Mail icon makes it visually distinct from the form. */
.brk-booking-account-followup {
  display:flex; gap:14px;
  padding:16px;
  margin:12px 0 0;
  background:#F8F6F2; color:#121212;
  border:1px solid rgba(18,18,18,0.10);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  text-align:left;
}
.brk-booking-account-followup--success {
  margin:20px auto 0; max-width:520px;
}
.brk-booking-account-followup-icon {
  width:36px; height:36px; flex-shrink:0;
  display:inline-flex; align-items:center; justify-content:center;
  background:#FFFFFF; border:1px solid rgba(18,18,18,0.12);
}
.brk-booking-account-followup-body { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.brk-booking-account-followup-eyebrow {
  margin:0;
  font-size:9px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
}
.brk-booking-account-followup-title {
  margin:0;
  font-size:14px; font-weight:700; line-height:1.25;
}
.brk-booking-account-followup-sub {
  margin:0;
  font-size:12px; line-height:1.45; color:#6B7280;
}
.brk-booking-account-followup-cta {
  display:inline-flex; align-items:center; gap:6px;
  margin-top:6px; align-self:flex-start;
  padding:7px 11px;
  background:#121212; color:#FFFFFF;
  border:1px solid #121212;
  font-size:10px; font-weight:700;
  letter-spacing:0.14em; text-transform:uppercase;
  text-decoration:none;
  transition:background .15s ease,color .15s ease;
}
@media (hover:hover) and (pointer:fine) {
  .brk-booking-account-followup-cta:hover { background:#2a2a2a; }
}
@media (hover:hover) and (pointer:fine) {
  .brk-booking-auth-link:hover { opacity:0.75; }
}

.brk-booking-fields { display:grid; gap:14px; }

/* SMS consent row — small inline checkbox that sits below the Phone
   field when populated. Smaller and less prominent than the account-
   creation block above; this is regulatory plumbing, not a feature
   nudge. Same .brk-booking-field-defying scoping (no .brk-booking-
   field class) so the wrapper's column rule doesn't grab it. */
.brk-booking-sms-consent {
  display:flex; align-items:flex-start; gap:9px;
  margin-top:-4px; padding:8px 0;
  cursor:pointer; user-select:none;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:11px; line-height:1.45; color:#6B7280;
}
.brk-booking-sms-consent > input[type="checkbox"] {
  width:14px; height:14px; margin-top:2px; flex-shrink:0;
  accent-color:#121212; cursor:pointer;
}

/* One standard identity field row (Name / Email / Phone / Notes).
   Scoped class instead of .brk-booking-fields label so nested labels
   inside the create-account block (the checkbox row, the password
   input, the fineprint) don't inherit this layout — and so the four
   standard fields can be styled independently (e.g. flex-direction:
   row) without disturbing the create-account UI. */
.brk-booking-field { display:flex; flex-direction:column; gap:6px; }
.brk-booking-field > span {
  font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted); font-weight:600;
}
.brk-booking-fields input,
.brk-booking-textarea {
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  border-radius:6px; padding:12px 14px; color:var(--lush-text);
  font-family:var(--lush-ui); font-size:14px; width:100%;
  transition:border-color .2s ease;
}
.brk-booking-fields input::placeholder,
.brk-booking-textarea::placeholder { color:var(--lush-muted); }
.brk-booking-fields input:focus,
.brk-booking-textarea:focus { outline:0; border-color:var(--lush-pink); }
.brk-booking-textarea { resize:vertical; }

/* Phase 16 — custom questions on the Details step */
.brk-booking-questions {
  display:grid; gap:14px;
  padding-top:14px; margin-top:6px;
  border-top:1px solid var(--lush-dark-border);
}
.brk-booking-question { display:flex; flex-direction:column; gap:4px; }
.brk-booking-question > label { display:flex; flex-direction:column; gap:6px; }
.brk-booking-question select {
  width:100%; padding:12px 14px;
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  color:var(--lush-text); font-family:var(--lush-ui); font-size:14px;
  border-radius:6px;
}
.brk-booking-question select:focus { outline:0; border-color:var(--lush-pink); }
.brk-booking-question-hint { font-size:11px; color:var(--lush-muted); margin:0; }
.brk-booking-checkbox-row {
  display:flex; align-items:center; gap:10px;
  font-size:13px !important; color:var(--lush-text) !important;
  letter-spacing:normal !important; text-transform:none !important; font-weight:400 !important;
}
.brk-booking-checkbox-row input[type="checkbox"] { width:18px; height:18px; accent-color:var(--lush-pink); }

.brk-booking-image-upload { display:flex; flex-direction:column; gap:8px; }
.brk-booking-image-pick {
  display:inline-flex; align-items:center; gap:8px;
  align-self:flex-start; padding:10px 16px; border-radius:6px;
  background:var(--lush-card); border:1px dashed var(--lush-dark-border);
  color:var(--lush-text); font-size:12px; cursor:pointer;
  transition:border-color .2s ease;
  letter-spacing:normal !important; text-transform:none !important; font-weight:500 !important;
}
.brk-booking-image-pick:hover { border-color:var(--lush-pink); }
.brk-booking-image-preview {
  position:relative; display:inline-block; max-width:220px;
}
.brk-booking-image-preview img {
  width:100%; height:auto; max-height:180px; object-fit:cover;
  border-radius:6px; border:1px solid var(--lush-dark-border);
}
.brk-booking-image-remove {
  position:absolute; top:6px; right:6px;
  width:24px; height:24px; border-radius:50%;
  background:rgba(14,17,17,0.85); border:1px solid var(--lush-dark-border);
  color:#fff; display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer;
}
.brk-booking-image-err { font-size:11px; color:#B91C1C; }
.lush-spin { animation: lush-spin 1s linear infinite; }
@keyframes lush-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Nav buttons */
.brk-booking-nav { display:flex; justify-content:space-between; gap:10px; padding-top:4px; flex-wrap:wrap; }
.brk-booking-back,
.brk-booking-next,
.brk-booking-confirm-btn {
  background:transparent; border:1px solid var(--lush-dark-border);
  color:var(--lush-text); padding:13px 20px; border-radius:999px;
  font-size:11px; letter-spacing:0.16em; text-transform:uppercase;
  font-weight:600; cursor:pointer;
  display:inline-flex; gap:8px; align-items:center;
  transition:all .25s ease; font-family:var(--lush-ui);
}
.brk-booking-back:hover { border-color:var(--lush-text); }
.brk-booking-next,
.brk-booking-confirm-btn {
  background:var(--lush-pink); border-color:var(--lush-pink);
  color:var(--lush-on-pink);
}
.brk-booking-next:hover,
.brk-booking-confirm-btn:hover { filter:brightness(1.06); transform:translateY(-1px); }
.brk-booking-next:disabled,
.brk-booking-confirm-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

/* Confirm step */
.brk-booking-confirm { display:flex; flex-direction:column; gap:18px; }
.brk-booking-summary {
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border); border-radius:8px; padding:18px;
}
.brk-booking-summary dl { margin:0; display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.brk-booking-summary div {
  display:flex; justify-content:space-between; align-items:baseline; gap:12px;
  padding-bottom:8px; border-bottom:1px dashed var(--lush-dark-border);
}
.brk-booking-summary div:last-child { border-bottom:0; padding-bottom:0; }
.brk-booking-summary dt { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:var(--lush-muted); margin:0; font-weight:600; }
.brk-booking-summary dd { margin:0; font-family:var(--lush-ui); font-size:14px; color:var(--lush-text); text-align:right; }
.brk-booking-total dt, .brk-booking-total dd { color:var(--lush-pink) !important; font-size:16px !important; }
.brk-booking-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:6px; padding:12px 16px; font-size:13px; color:#B91C1C; }
.brk-booking-disclaimer { text-align:center; font-size:11px; color:var(--lush-muted); margin-top:4px; }

/* Success */
.brk-booking-success {
  text-align:center; padding:48px 24px; display:flex; flex-direction:column;
  align-items:center; gap:12px; max-width:500px; margin:0 auto;
}
.brk-booking-success-icon { font-size:48px; color:var(--lush-pink); }
.brk-booking-success h3 { font-family:var(--lush-serif); font-size:clamp(28px,5vw,40px); font-weight:400; letter-spacing:-0.02em; margin:0; }
.brk-booking-success-copy { font-size:15px; color:var(--lush-muted); line-height:1.55; margin:0; }
.brk-booking-success-summary {
  display:flex; flex-wrap:wrap; justify-content:center; gap:8px;
  background:rgba(var(--lush-pink-rgb),0.07); border:1px solid var(--lush-dark-border);
  border-radius:8px; padding:12px 18px; font-size:14px; color:var(--lush-text);
}
.brk-booking-success-dot { color:var(--lush-pink); }
.brk-booking-success-note { font-size:12px; color:var(--lush-muted); margin:0; }

/* ── Gallery ── */
/* ── Shared tab header ── Every Lush tab opens with the same eyebrow +
   Cookie script section title pair so the tabs read as a consistent
   family. Mirrors the trio's eyebrow + h2 pattern (TFR/Blackline/VT all
   ship this) but in Lush vocabulary: sage Roboto micro caps eyebrow +
   big Cookie script heading on cream. */
.lush-tab-header {
  max-width: 720px;
  margin: 0 auto 24px;
  padding: 56px 24px 0;
  text-align: center;
}
.lush-eyebrow {
  margin: 0;
  font-family: var(--lush-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--lush-pink);
}
.lush-section-title {
  margin: 14px 0 0;
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: clamp(52px, 8vw, 72px);
  line-height: 1;
  letter-spacing: 0;
  color: var(--lush-text);
}

/* ── Gallery / Before & After ── now render via the shared
   GallerySection / BeforeAfterSection components (@bkrdy/platform/
   sections); the Lush look (tilted white polaroid tiles + serif-italic
   diptych with a sage ✦ separator) lives in LUSH_SECTIONS_SKIN inside
   LushStudioTemplate.tsx. The former .lush-gallery* / .lush-ba* /
   .lush-results-* rules were removed here. ── */

/* ── About ── Editorial rebuild: 3 staggered images at top, layered
   DM Serif backdrop + Cookie script overlay title, body with sage
   drop cap, highlights bullets with hairline dividers, Cookie script
   signature closer. Borrows the staggered-image + layered-title
   pattern from TFR and the divided-highlights pattern from VT, in
   Lush vocabulary. */
.lush-about-section {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  background: var(--lush-bg);
  padding: 56px 24px 80px;
}

/* Lead image — wide 16:9 single panel at the top, magazine-opener
   energy. Hairline sage border + soft cream surround keep it gentle
   on cream. */
.lush-about-feature {
  margin: 0 0 56px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--lush-dark-border);
  background: rgba(var(--lush-pink-rgb), 0.06);
  aspect-ratio: 16/9;
}
.lush-about-feature img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Two-image staggered companion strip — sits between the body
   paragraph and the highlights, giving the prose a visual breath. */
.lush-about-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;
  margin: 40px 0 48px;
}
.lush-about-img {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--lush-dark-border);
  background: rgba(var(--lush-pink-rgb), 0.06);
}
.lush-about-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lush-about-img--placeholder {
  background: linear-gradient(
    135deg,
    rgba(var(--lush-pink-rgb), 0.04),
    rgba(var(--lush-pink-rgb), 0.14)
  );
}
.lush-about-images > *:nth-child(1) { aspect-ratio: 4/5; margin-top: 0; }
.lush-about-images > *:nth-child(2) { aspect-ratio: 3/4; margin-top: 28px; }
@media (max-width: 640px) {
  .lush-about-images { gap: 10px; }
  .lush-about-images > *:nth-child(2) { margin-top: 14px; }
}

/* About header — centered eyebrow + Cookie-script heading; reuses
   .lush-eyebrow and .lush-section-title so it stays in lockstep with
   every other Lush tab opener. Just a wrapper for centering + the
   gap that sits below the lead image. */
.lush-about-header {
  text-align: center;
  margin: 0 0 40px;
}

/* Body copy + drop cap. First paragraph gets a sage DM Serif drop cap
   that pulls the eye into the prose — borrowed from VT's editorial
   treatment. */
.lush-about-copy {
  font-family: var(--lush-ui);
  font-size: 15px;
  line-height: 1.7;
  color: var(--lush-text);
}
.lush-about-body { margin: 0 0 40px; }
.lush-about-body::first-letter {
  font-family: var(--lush-serif);
  font-size: 56px;
  line-height: 0.9;
  float: left;
  padding: 6px 12px 0 0;
  color: var(--lush-pink);
}

/* Highlights — divided list with sage hairlines top + bottom of each
   row. DM Serif titles + Roboto body sentences. Borrowed pattern from
   VT (vt-highlights) re-skinned for cream + sage. */
.lush-about-highlights {
  list-style: none;
  padding: 0;
  margin: 0 0 56px;
}
.lush-about-highlights > li {
  padding: 24px 0;
  border-top: 1px solid var(--lush-dark-border);
}
.lush-about-highlights > li:last-child {
  border-bottom: 1px solid var(--lush-dark-border);
}
.lush-about-highlights h3 {
  margin: 0 0 6px;
  font-family: var(--lush-serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--lush-text);
}
.lush-about-highlights p {
  margin: 0;
  font-family: var(--lush-ui);
  font-size: 14px;
  line-height: 1.6;
  color: var(--lush-muted);
}

/* Signature closer — small uppercase Roboto "With care," sits above
   the Cookie script signature word. Reads like the final line of a
   handwritten note. */
.lush-about-sign {
  margin: 0;
  text-align: center;
  font-family: var(--lush-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--lush-muted);
}
.lush-about-sign em {
  display: block;
  margin-top: 14px;
  font-family: var(--lush-script);
  font-style: normal;
  font-size: 48px;
  line-height: 1;
  color: var(--lush-pink);
  letter-spacing: 0;
  text-transform: none;
}

/* ── Policy ── now renders via the shared PolicySection component
   (@bkrdy/platform/sections); the Lush look (✦-marked divided
   brand-book list with serif titles + Cookie-script custom-group
   headings) lives in LUSH_SECTIONS_SKIN inside LushStudioTemplate.tsx.
   The former .lush-policy* rules were removed here. ── */

/* ── Advice / Timeline ── These two tab sections now render the shared
   @bkrdy/platform InstructionsSection (.brk-instructions*); the Lush
   look (un-numbered ✦-separated "Ritual" advice + alternating circular
   sage timeline nodes) lives in LUSH_SECTIONS_SKIN inside
   LushStudioTemplate.tsx. The former .lush-ritual* / .lush-before-*
   rules were removed here. ── */

/* ── Contact cards ── */
.lush-contact-card {
  display:flex; align-items:center; gap:14px; padding:16px 18px;
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  border-left:2px solid var(--lush-pink); border-radius:4px;
  text-decoration:none; color:var(--lush-text); transition:border-color .2s ease;
}
.lush-contact-card:hover { border-color:var(--lush-pink); }
.lush-contact-icon { font-size:20px; flex-shrink:0; }
.lush-contact-card div { display:flex; flex-direction:column; gap:3px; }
.lush-contact-label { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:var(--lush-pink); font-weight:600; }
.lush-contact-value { font-size:14px; color:var(--lush-text); }

/* ── Desktop ── Rebuilt PC layout. Keeps the tabbed-SPA model + the
   Lush identity; styles the component's CURRENT classes. The previous
   block targeted stale markup the component no longer renders
   (.lush-about-frame / .lush-policy-card / .lush-results-*) and forced a
   broken 2-col grid onto .lush-about-section, which is why the PC view
   read as off. The .lush-femme signature block below still layers on
   top at every width. */
@media (min-width:1025px) {
  /* Hero — full-bleed cover with a width-capped, corner-rounded floating
     content card. Keeps Lush's signature card-over-cover overlap + soft
     shadow, but the cap + radius make the shadow read as a floating panel
     instead of the full-width "halo" the old block was fighting. */
  .lush-header-cover { height:38vh; min-height:400px; }
  /* A little breathing room below the floating header card before the
     sticky tab rail (the card's soft shadow needs room too). */
  .lush-header-section { padding-bottom:36px; }
  .lush-header-content {
    max-width:1040px;
    margin:-76px auto 0;
    padding:56px 64px 60px;
    border-radius:30px;
    /* No drop shadow on PC — the cream-on-cream card sits cleaner without
       the floating-panel halo. (Mobile keeps its small upward shadow above
       the card; that's defined in the base .lush-header-content rule.) */
    box-shadow:none;
  }
  .lush-header-content h1 { font-size:clamp(52px,5vw,74px); }
  .lush-header-subtype { margin-top:14px; font-size:15px; }
  .lush-header-info { margin-top:24px; gap:12px; }
  .lush-header-info-row { font-size:17px; }
  .lush-header-buttons { justify-content:flex-start; margin-top:34px; gap:16px; }

  /* Tab rail — centered slider with roomier pills. */
  .lush-tab-rail { padding:20px 0 26px; }
  .lush-tab-slider { justify-content:center; padding:0 40px; gap:14px; }
  .lush-tab-pill { padding:16px 26px; font-size:12px; letter-spacing:0.2em; }

  /* Shared panel opener — larger eyebrow + script title. */
  .lush-tab-header { max-width:880px; padding-top:76px; }
  .lush-section-title { font-size:clamp(64px,6vw,86px); }

  /* Gallery + Before & After desktop scale-ups now live in
     LUSH_SECTIONS_SKIN (LushStudioTemplate.tsx) on the shared
     .brk-gallery* / .brk-ba* markup. */

  /* About — centered editorial column (NO grid). Wide feature image,
     layered Molle title, then prose + staggered images + highlights. */
  .lush-about-section { max-width:920px; padding:24px 40px 110px; }
  .lush-about-feature { aspect-ratio:21/9; margin-bottom:64px; }
  .lush-layered-eyebrow { font-size:clamp(34px,3vw,46px); }
  .lush-layered-heading { font-size:clamp(78px,7vw,108px); }
  .lush-about-copy { font-size:17px; line-height:1.72; }
  .lush-about-body::first-letter { font-size:64px; }
  .lush-about-images { gap:24px; margin:48px 0 56px; }
  .lush-about-highlights { margin-bottom:64px; }
  .lush-about-highlights > li { padding:28px 0; }
  .lush-about-highlights h3 { font-size:25px; }
  .lush-about-highlights p { font-size:15px; }
  .lush-about-sign em { font-size:56px; }

  /* Policy desktop scale-ups now live in LUSH_SECTIONS_SKIN
     (LushStudioTemplate.tsx) on the shared .brk-policy* markup. */

  /* Advice + Timeline desktop scale-ups now live in LUSH_SECTIONS_SKIN
     (LushStudioTemplate.tsx) on the shared .brk-instructions* markup. */

  /* Booking — services breathe into 2-col within the shared section.
     (Shared .brk-* rule, preserved from the prior block so the other
     templates that inject this CSS keep their desktop booking layout.) */
  .brk-booking-section { padding:48px 48px 80px; }
  .brk-booking-services { grid-template-columns:repeat(2,1fr); }
}

/* ── Tablet ── Sits between the mobile phone layout and desktop.
   Widens containers, scales type up, and switches grids to 2-3 col
   where they earn it. Targets the component's current classes (the old
   tablet block referenced stale .lush-about-frame / .lush-policy-card
   markup). */
@media (min-width:641px) and (max-width:1024px) {
  /* Hero — taller cover, centered floating card (smaller than desktop). */
  .lush-header-cover { height:34vh; min-height:300px; }
  .lush-header-content {
    max-width:760px;
    margin:-64px auto 0;
    padding:48px 48px 52px;
    border-radius:26px;
    box-shadow:0 18px 46px rgba(14,17,17,0.16);
  }
  .lush-header-content h1 { font-size:clamp(40px,6vw,56px); }
  .lush-header-info-row { font-size:16px; }
  .lush-header-buttons { justify-content:flex-start; margin-top:30px; }
  .lush-tab-slider { justify-content:center; padding:0 28px; gap:10px; }
  .lush-tab-pill { padding:14px 20px; font-size:11px; letter-spacing:0.18em; }
  .lush-tab-header { padding-top:64px; }

  /* Gallery + Before & After tablet scale-ups now live in
     LUSH_SECTIONS_SKIN (LushStudioTemplate.tsx) on the shared
     .brk-gallery* / .brk-ba* markup. */

  /* About — centered column, mid type scale. */
  .lush-about-section { max-width:680px; padding:16px 36px 88px; }
  .lush-about-feature { aspect-ratio:16/9; margin-bottom:48px; }
  .lush-layered-eyebrow { font-size:clamp(30px,4vw,38px); }
  .lush-layered-heading { font-size:clamp(64px,9vw,88px); }
  .lush-about-copy { font-size:16px; line-height:1.66; }

  /* Policy tablet scale-ups now live in LUSH_SECTIONS_SKIN
     (LushStudioTemplate.tsx) on the shared .brk-policy* markup. */

  /* Advice + Timeline tablet scale-ups now live in LUSH_SECTIONS_SKIN
     (LushStudioTemplate.tsx) on the shared .brk-instructions* markup. */

  /* Booking — services into 2-col on tablet too. (Shared .brk-* rule,
     preserved from the prior block.) */
  .brk-booking-section { padding:36px 36px 64px; }
  .brk-booking-services { grid-template-columns:repeat(2,1fr); }
}

/* ── Mobile ── */
@media (max-width:640px) {
  /* Mobile owns the canonical design. Header is a compact 31vh / 230px
     cover with the overlapping content card defined above. Buttons
     are the same centered 5 × 50 px grid defined in the base. */
  .lush-header-section { min-height:auto; }
  .lush-tab-pill { padding:14px 12px; font-size:10px; letter-spacing:0.12em; }
  .lush-tab-pill::after { left:12px; right:12px; }
  .brk-booking-section { padding:28px 16px 56px; }
  .brk-booking-days { gap:6px; }
  .brk-booking-day { flex:1 1 64px; min-width:60px; padding:10px 6px; }
  .brk-booking-times { grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:6px; }
  /* progress pills already use a sr-only label; no mobile override needed */
}

/* ──────────────────────────────────────────────────────────────────────
   LUSH FEMME — visual signature that separates Lush from TFR.
   Scoped to .lush-femme so the VelvetTheoryBooking embed (which only
   has .lush-template) doesn't pick these up. Feminine + luxurious +
   playful: scalloped hero edge, sparkle field, polaroid before/after,
   script-font accents, soft pearl-glow shadows. None of these touch
   the booking-flow internals — they're additive chrome.
   ────────────────────────────────────────────────────────────────────── */

/* Scalloped cover edge — feminine soft bottom (vs TFR's hard straight
   edge). The mask cuts a wave pattern into the bottom of the hero
   image so the next section reads as a soft transition. */
.lush-femme .lush-header-cover {
  position: relative;
}
.lush-femme .lush-header-cover > img {
  -webkit-mask-image:
    radial-gradient(ellipse 18px 10px at 12px 100%, transparent 99%, #000 100%),
    linear-gradient(#000, #000);
  mask-image:
    radial-gradient(ellipse 18px 10px at 12px 100%, transparent 99%, #000 100%),
    linear-gradient(#000, #000);
  -webkit-mask-size: 36px 16px, 100% calc(100% - 14px);
  mask-size: 36px 16px, 100% calc(100% - 14px);
  -webkit-mask-repeat: repeat-x, no-repeat;
  mask-repeat: repeat-x, no-repeat;
  -webkit-mask-position: bottom, top;
  mask-position: bottom, top;
}

/* Pearl-shimmer ring around the avatar — luxurious touch using a slow
   conic gradient. Subtle. Animates the rotation so the ring catches
   "light" like real pearl. */
.lush-femme .lush-avatar-ring {
  background: conic-gradient(
    from 0deg,
    rgba(255,232,242,0.95),
    rgba(232,220,236,0.6),
    rgba(255,232,242,0.95),
    rgba(232,220,236,0.6),
    rgba(255,232,242,0.95)
  );
  animation: lf-pearl 14s linear infinite;
}
@keyframes lf-pearl { to { transform: rotate(360deg); } }

/* Floating sparkle field — adds 4-5 decorative star marks scattered
   around the hero section using pseudo-elements on the section itself.
   Pure decoration, doesn't affect layout. */
.lush-femme .lush-header-section { position: relative; overflow: hidden; }
.lush-femme .lush-header-section::before,
.lush-femme .lush-header-section::after {
  /* Escaped codepoint + text-variation selector so iOS/Android render
     this as a TEXT glyph (per the Unicode "Plain Text" property) instead
     of swapping to a color emoji. Same fix applied to ♡ below. */
  content: '\\2726\\FE0E';
  position: absolute;
  font-family: serif;
  color: rgba(var(--lush-pink-rgb), 0.65);
  pointer-events: none;
  animation: lf-twinkle 4s ease-in-out infinite;
}
.lush-femme .lush-header-section::before {
  top: 18%; left: 8%;
  font-size: 14px;
  animation-delay: 0s;
}
.lush-femme .lush-header-section::after {
  top: 62%; right: 10%;
  font-size: 18px;
  animation-delay: 1.4s;
}
@keyframes lf-twinkle {
  0%, 100% { opacity: 0.35; transform: scale(1) rotate(0deg); }
  50%      { opacity: 0.95; transform: scale(1.15) rotate(8deg); }
}

/* The femme gallery-heading ✺ ornaments + polaroid before/after
   overrides moved to LUSH_SECTIONS_SKIN (LushStudioTemplate.tsx) when
   Gallery + Results migrated to the shared .brk-gallery* / .brk-ba*
   markup. They used to target the local .lush-gallery-group h2 /
   .lush-ba-pair figure nodes, which no longer render. */

/* Tab pills get a softer feminine shape — proper rounded pill with a
   gentle gradient fill on active state instead of the TFR-style hard
   underline. */
.lush-femme .lush-tab-pill {
  border-radius: 999px;
  padding-left: 18px !important;
  padding-right: 18px !important;
  transition: background 200ms ease, color 200ms ease, box-shadow 200ms ease;
}
.lush-femme .lush-tab-pill.is-active {
  background: linear-gradient(135deg,
    rgba(var(--lush-pink-rgb), 0.16),
    rgba(var(--lush-pink-rgb), 0.06));
  box-shadow:
    inset 0 0 0 1px rgba(var(--lush-pink-rgb), 0.32),
    0 4px 12px rgba(var(--lush-pink-rgb), 0.18);
}
.lush-femme .lush-tab-pill.is-active::after {
  display: none; /* drop the underline — we use the soft pill fill now */
}

/* Service prices get a tiny heart marker — fun + feminine. Targets the
   common service-row price node. Safe no-op if the class doesn't render. */
.lush-femme [class*="brk-booking-service"] [class*="price"]::before {
  /* Escaped codepoint + \\FE0E text-variation selector keeps this as a
     text glyph instead of an iOS color emoji. */
  content: '\\2661\\FE0E';
  margin-right: 6px;
  opacity: 0.55;
  font-family: serif;
}

/* Subtle pearl-tinted glow under primary CTAs — depth without weight.
   Targets the hero book button + the booking-flow primary CTAs Lush
   shares with us. */
.lush-femme .lush-header-btn-book {
  box-shadow:
    0 1px 0 rgba(255,255,255,0.42) inset,
    0 8px 18px rgba(var(--lush-pink-rgb), 0.28),
    0 2px 6px rgba(var(--lush-pink-rgb), 0.20);
}

/* Reduced-motion respect — kill the animations for users who opt out. */
@media (prefers-reduced-motion: reduce) {
  .lush-femme .lush-avatar-ring { animation: none; }
  .lush-femme .lush-header-section::before,
  .lush-femme .lush-header-section::after { animation: none; opacity: 0.65; }
}
`
