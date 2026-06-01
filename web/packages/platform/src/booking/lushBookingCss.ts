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
  overflow-x: hidden; font-family: var(--lush-ui);
}
.lush-template *, .lush-template *::before, .lush-template *::after { box-sizing: border-box; }
.lush-template img { max-width: 100%; display: block; }
.lush-template a { text-decoration: none; }
.lush-template button, .lush-template a { -webkit-tap-highlight-color: transparent; cursor: pointer; }
.lush-template :focus-visible { outline: 2px solid var(--lush-pink); outline-offset: 3px; }

/* ── Announcement bar ── */
.lush-announce {
  width: 100%; overflow: hidden; position: relative;
  /* Flat sage tint on cream — flat colors only per the soft-spa
     direction. No multi-stop gradient. */
  background: rgba(var(--lush-pink-rgb),0.08);
  border-bottom: 1px solid rgba(var(--lush-pink-rgb),0.20);
}
.lush-announce::before, .lush-announce::after {
  content:""; position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none;
}
.lush-announce::before { left:0; background:linear-gradient(90deg,#F6F3EE,transparent); }
.lush-announce::after  { right:0; background:linear-gradient(-90deg,#F6F3EE,transparent); }
.lush-announce-track {
  display:inline-flex; align-items:center; gap:20px; padding:10px 0;
  white-space:nowrap; animation:lushMarquee 42s linear infinite;
  color:var(--lush-text); font-family:var(--lush-sans); font-size:11px;
  letter-spacing:0.14em; text-transform:uppercase; font-weight:600;
}
.lush-announce-sep { color:var(--lush-pink); opacity:0.8; font-size:8px; }
@keyframes lushMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@media (prefers-reduced-motion:reduce) { .lush-announce-track { animation:none; } }

/* ── Header ── */
.lush-header-section {
  width:100%; min-height:100vh; background:var(--lush-bg);
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
.lush-tabbed-section { width:100%; background:var(--lush-bg); overflow:hidden; }
.lush-tab-rail {
  width:100%; background:var(--lush-bg); position:sticky; top:0; z-index:20;
  border-top:1px solid var(--lush-dark-border);
  border-bottom:1px solid var(--lush-dark-border);
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
          mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
}
.lush-tab-slider {
  width:100%; display:flex; align-items:stretch; gap:4px; padding:6px 22px;
  overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
  scroll-snap-type:x mandatory;
}
.lush-tab-slider::-webkit-scrollbar { display:none; }
.lush-tab-pill {
  position:relative; flex:0 0 auto;
  display:inline-flex; align-items:center; justify-content:center;
  padding:16px 14px; background:transparent; border:0;
  color:var(--lush-muted);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.16em; text-transform:uppercase; line-height:1;
  cursor:pointer; white-space:nowrap; scroll-snap-align:center;
  transition:color .22s ease;
}
.lush-tab-pill::after {
  content:""; position:absolute; left:14px; right:14px; bottom:0;
  height:2px; background:var(--lush-pink); border-radius:2px;
  transform:scaleX(0); transform-origin:center;
  transition:transform .28s cubic-bezier(.4,0,.2,1);
}
.lush-tab-pill:hover { color:var(--lush-text); }
.lush-tab-pill.is-active { color:var(--lush-text); }
.lush-tab-pill.is-active::after { transform:scaleX(1); }
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
.lush-gallery-section { width:100%; padding:0 0 clamp(64px,8vw,110px); background:var(--lush-bg); overflow:hidden; }
.lush-gallery-group { width:min(100%,396px); margin:0 auto; padding:36px 30px 0; }
.lush-gallery-group+.lush-gallery-group { padding-top:30px; }
.lush-gallery-group h2 {
  margin:0 0 22px; color:var(--lush-text); text-align:center;
  font-family:var(--lush-script); font-size:42px; line-height:1;
  font-weight:400; letter-spacing:0;
  display:inline-flex; align-items:center; gap:12px; width:100%; justify-content:center;
}
.lush-gallery-group h2::before,.lush-gallery-group h2::after {
  content:""; flex:1; height:1px; max-width:60px;
  background:var(--lush-dark-border);
}
.lush-gallery-grid {
  display:grid; grid-template-columns:repeat(2,1fr); grid-auto-flow:dense;
  gap:28px 18px;
  padding:10px 4px;
}
/* ── Polaroid gallery item ──
   Each tile is a casually-placed polaroid: white border-frame, a
   thicker strip at the bottom (the caption area), a soft drop
   shadow, and a gentle rotation that alternates with nth-child so
   the wall of prints feels hand-arranged. Hover straightens the
   tile and lifts the shadow. Aspect-ratio lives on the inner img
   (not the wrapper) so the polaroid hugs the image cleanly. */
.lush-gallery-img {
  position:relative;
  background:#FFFFFF;
  padding:8px 8px 30px;
  border:none;
  border-radius:2px;
  box-shadow:0 6px 18px rgba(14,17,17,0.12);
  overflow:visible;
  transition:transform .35s ease, box-shadow .35s ease;
}
.lush-gallery-img:nth-child(odd)  { transform:rotate(-2.5deg); }
.lush-gallery-img:nth-child(even) { transform:rotate(2deg); }
.lush-gallery-img:nth-child(3n)   { transform:rotate(-1deg); }
.lush-gallery-img:nth-child(5n)   { transform:rotate(1.5deg); }
.lush-gallery-img:hover {
  transform:rotate(0);
  box-shadow:0 10px 24px rgba(14,17,17,0.18);
  z-index:2;
}
.lush-gallery-img > img {
  width:100%; display:block; object-fit:cover;
}
.lush-gallery-img--square > img { aspect-ratio:1/1; }
.lush-gallery-img--tall   > img { aspect-ratio:160/200; }
.lush-gallery-img--wide   { grid-column:1/-1; }
.lush-gallery-img--wide   > img { aspect-ratio:331/160; }
.lush-gallery-placeholder {
  width:100%;
  background:#ECE7DD;
  display:flex; align-items:center; justify-content:center;
  min-height:auto;
}
.lush-gallery-img--square .lush-gallery-placeholder { aspect-ratio:1/1; }
.lush-gallery-img--tall   .lush-gallery-placeholder { aspect-ratio:160/200; }
.lush-gallery-img--wide   .lush-gallery-placeholder { aspect-ratio:331/160; }
.lush-gallery-placeholder span {
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted);
}

/* ── Before & After ── */
.lush-before-after-section { width:min(100%,396px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 0 70px; }
/* "Amazing" + "results" are both Molle italic in highlight-color sage
   with a hard sharp shadow (no blur). Big word on TOP (h2 = "Amazing"),
   small word BELOW (backdrop = "results") translated up so they sit
   close. About + Policy share the same pattern with their own
   ordering. */
.lush-results-heading {
  position:relative; text-align:center;
  display:flex; flex-direction:column; align-items:center;
  padding:0 16px 12px;
}
.lush-results-heading h2 {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(60px,15vw,80px); line-height:1; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:5px 5px 0 rgba(14,17,17,0.18);
}
.lush-results-backdrop {
  margin:-14px 0 0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(28px,7vw,40px); line-height:1;
  color:var(--lush-pink);
  text-shadow:3px 3px 0 rgba(14,17,17,0.18);
}
/* Lush Studio's Before/After is an editorial DIPTYCH — side-by-side
   panes with a sage ✦ separator. No tilt, no tap-to-reveal — those
   were FadeRoom's barbershop gimmicks. The DM Serif numeral on the
   left numbers the portfolio entries; small DM Serif italic labels
   sit above each pane; cookie caption optional below. */
.lush-ba-stack { display:grid; gap:36px; padding:14px 0 0; }
.lush-ba-bucket+.lush-ba-bucket { margin-top:48px; }
.lush-ba-bucket-heading {
  margin:18px 0 4px; font-family:var(--lush-script); font-size:42px; font-weight:400;
  letter-spacing:0; color:var(--lush-text); text-align:center; line-height:1;
}
.lush-ba-diptych {
  width:min(100%, 360px); margin:0 auto;
  padding:6px 0 0;
}
.lush-ba-pair {
  display:grid; grid-template-columns:1fr auto 1fr; gap:8px;
  align-items:stretch;
}
.lush-ba-pane { margin:0; display:flex; flex-direction:column; gap:6px; }
.lush-ba-label {
  margin:0; text-align:center;
  font-family:var(--lush-serif); font-style:italic; font-weight:400;
  font-size:14px; letter-spacing:0; line-height:1;
  color:var(--lush-muted);
}
.lush-ba-pane img,
.lush-ba-placeholder {
  width:100%; aspect-ratio:1/1; object-fit:cover; display:block;
  background:#ECE7DD;
  border:1px solid var(--lush-dark-border);
}
.lush-ba-pane--after img { border-color:var(--lush-pink); }
.lush-ba-sep {
  align-self:center;
  font-family:var(--lush-ui);
  font-size:18px; line-height:1; color:var(--lush-pink);
  padding:0 2px;
  /* matches the post-label baseline so the ✦ sits between the photos,
     not at the very top including the labels */
  margin-top:18px;
}
.lush-ba-caption {
  margin:14px 0 0;
  text-align:center;
  font-family:var(--lush-script);
  font-size:22px; font-weight:400; line-height:1.1;
  color:var(--lush-text);
}

/* ── About ── */
.lush-about-section { width:min(100%,395px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:12px 20px 58px; }

/* About hero: type-only treatment now (the spark image was removed).
   Centered Molle eyebrow + big italic heading + small DM Mono
   tagline below. Sets up a quiet editorial entry that we can drop a
   new image treatment back into later if/when one is designed. */
.lush-about-hero {
  display:flex; flex-direction:column; align-items:center;
  padding:24px 16px 24px;
  margin-bottom:24px;
}
.lush-about-heading-wrap {
  position:relative; z-index:2;
  text-align:center;
  display:flex; flex-direction:column; align-items:center;
  max-width:min(86vw, 360px);
}
/* Small eyebrow kicker on top, big heading underneath. */
.lush-about-backdrop {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(24px,6vw,36px); line-height:1.05;
  color:var(--lush-pink);
  text-shadow:2px 2px 0 rgba(14,17,17,0.18);
}
.lush-about-heading-wrap h2 {
  margin:-12px 0 0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(44px,12vw,64px); line-height:1; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:3px 3px 0 rgba(14,17,17,0.18);
}
/* Tagline in DM Mono all caps — small typographic accent below the
   heading. Sits at full opacity sage so it reads as a tight
   secondary line, not a body-text muted afterthought. */
.lush-about-tagline {
  margin:14px 0 0;
  font-family:var(--lush-mono);
  font-size:11px; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-pink);
  line-height:1.4;
  max-width:280px;
}
.lush-about-copy { width:min(100%,344px); margin:0 auto; color:var(--lush-text); font-family:var(--lush-ui); font-size:15px; line-height:1.55; }
.lush-about-copy p { margin:0 0 22px; padding:16px 0 0; border-top:1px solid var(--lush-dark-border); }
.lush-about-copy p:first-of-type { border-top:0; padding-top:0; }
.lush-about-copy span {
  display:inline-flex; align-items:center; gap:8px; color:var(--lush-pink);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.22em; text-transform:uppercase; margin-bottom:12px;
}
.lush-about-copy span::before { content:""; width:18px; height:1px; background:var(--lush-pink); display:inline-block; }
.lush-about-list { margin:0 0 22px; padding:16px 0 0; border-top:1px solid var(--lush-dark-border); }
.lush-about-list span {
  display:inline-flex; align-items:center; gap:8px; color:var(--lush-pink);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.22em; text-transform:uppercase; margin-bottom:12px;
}
.lush-about-list span::before { content:""; width:18px; height:1px; background:var(--lush-pink); display:inline-block; }
.lush-about-list ul { margin:0; padding-left:0; list-style:none; }
.lush-about-list li { position:relative; margin:0 0 12px; padding-left:22px; font-family:var(--lush-ui); font-size:14px; line-height:1.55; color:var(--lush-text); }
.lush-about-list li::before { content:""; position:absolute; left:0; top:10px; width:12px; height:1px; background:var(--lush-pink); }
.lush-about-list strong { display:block; color:var(--lush-text); font-weight:400; font-family:var(--lush-serif); font-size:18px; line-height:1.1; letter-spacing:-0.02em; margin-bottom:2px; }

/* About — editorial pull quote in Molle italic with a big sage
   opening quote mark. Sits between the star hero and the body copy
   and gives the about section a brand-voice moment. */
.lush-about-quote {
  margin:0 auto 36px;
  width:min(100%, 344px);
  padding:0 8px;
  display:flex; flex-direction:column; align-items:center;
  text-align:center;
}
.lush-about-quote-mark {
  font-family:var(--lush-serif); font-style:italic;
  font-size:80px; line-height:0.6; color:var(--lush-pink);
  margin-bottom:-8px;
  user-select:none;
}
.lush-about-quote blockquote {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(28px, 7vw, 38px); line-height:1.05; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:2px 2px 0 rgba(14,17,17,0.16);
}
.lush-about-quote figcaption {
  margin:14px 0 0;
  font-family:var(--lush-mono);
  font-size:11px; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted);
}

/* About — handwritten signature closer. Cookie script + italic so
   it reads as a personal sign-off, not corporate boilerplate. */
.lush-about-sign {
  margin:24px 0 0;
  padding:18px 0 0;
  border-top:1px solid var(--lush-dark-border);
  font-family:var(--lush-ui);
  font-size:14px; color:var(--lush-muted);
  line-height:1.5;
}
.lush-about-sign em {
  font-family:var(--lush-script); font-style:normal;
  font-size:38px; line-height:1;
  color:var(--lush-pink);
  margin-top:4px; display:inline-block;
}

/* ── Policy ── */
.lush-policy-section { width:min(100%,396px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 14px 64px; }
/* Policy heading is a Molle twin-line kicker pattern:
   small "Booking" kicker on top, big "Policies" heading underneath
   (translated up to close the gap). */
.lush-policy-heading {
  margin:0 0 24px;
  display:flex; flex-direction:column; align-items:center;
  text-align:center;
}
.lush-policy-heading span {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(28px,7vw,40px); line-height:1;
  color:var(--lush-pink);
  text-shadow:3px 3px 0 rgba(14,17,17,0.18);
}
.lush-policy-heading h2 {
  margin:-14px 0 0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(60px,15vw,80px); line-height:1; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:5px 5px 0 rgba(14,17,17,0.18);
}
/* "House Rules" — Policies as an editorial brand-book numbered list.
   Big DM Serif numerals on the left, Cookie script kicker ("Rule One"),
   DM Serif rule title, Roboto body. Hairline sage divider between
   policies. Replaces the previous box grid (which read as generic
   SaaS rather than spa). */
.lush-policy-list {
  list-style:none; margin:0; padding:0;
  display:flex; flex-direction:column;
  border-top:1px solid var(--lush-dark-border);
}
.lush-policy-row {
  display:grid; grid-template-columns:56px 1fr; gap:18px;
  padding:24px 4px 28px;
  border-bottom:1px solid var(--lush-dark-border);
}
.lush-policy-num {
  font-family:var(--lush-serif); font-weight:400;
  font-size:44px; line-height:0.9; letter-spacing:-0.04em;
  color:var(--lush-pink);
  align-self:flex-start;
  padding-top:4px;
}
.lush-policy-body { min-width:0; }
.lush-policy-title {
  margin:0 0 10px;
  font-family:var(--lush-serif); font-weight:400;
  font-size:22px; line-height:1.1; letter-spacing:-0.02em;
  color:var(--lush-text);
}
.lush-policy-text {
  margin:0;
  font-family:var(--lush-ui);
  font-size:14px; font-weight:400; line-height:1.6;
  color:var(--lush-text);
}
.lush-policy-custom-group { margin-top:48px; }
.lush-policy-custom-heading {
  margin:0 0 18px; font-family:var(--lush-script); font-weight:400;
  font-size:36px; letter-spacing:0; line-height:1;
  color:var(--lush-text); text-align:center;
}

/* ── Before appointment / Aftercare ── */
.lush-before-appointment-section { width:min(100%,395px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 16px 60px; }
.lush-before-appointment-section h2 { margin:0 0 38px; color:var(--lush-text); text-align:center; font-size:clamp(40px,9vw,52px); font-family:var(--lush-script); font-weight:400; line-height:1; letter-spacing:0; }
.lush-before-timeline { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:26px; position:relative; }
/* No connector line between steps — the alternating sage nodes carry
   the rhythm on their own. (Previous dashed line was removed per
   design feedback — felt too noisy on the cream bg.) */
.lush-before-step { display:grid; grid-template-columns:52px 1fr; gap:14px; align-items:flex-start; }
/* Alternating nodes echo the Steps section: odd = solid sage with
   white numeral; even = outlined sage with sage numeral. */
.lush-before-node {
  width:52px; height:52px;
  display:flex; align-items:center; justify-content:center;
  border-radius:999px;
  border:2px solid var(--lush-pink); background:var(--lush-bg);
  flex-shrink:0;
}
.lush-before-step:nth-child(odd) .lush-before-node {
  background:var(--lush-pink); border-color:var(--lush-pink);
}
.lush-before-node-num { font-family:var(--lush-ui); font-weight:700; font-size:16px; letter-spacing:0.04em; color:var(--lush-pink); }
.lush-before-step:nth-child(odd) .lush-before-node-num { color:#FFFFFF; }
.lush-before-step-body { padding:4px 4px 14px 6px; border-bottom:1px dashed var(--lush-dark-border); }
/* Spa-themed accent: a sage 4-point sparkle (Unicode ✦) before each
   title, scaled smaller than the title so it reads as decoration. */
.lush-before-step-body h3 { margin:0 0 8px; color:var(--lush-text); font-family:var(--lush-serif); font-weight:400; font-size:22px; line-height:1.1; letter-spacing:-0.02em; }
.lush-before-step-body h3::before {
  content:"\\2726";
  display:inline-block; margin-right:8px;
  color:var(--lush-pink); font-size:0.65em;
  vertical-align:0.1em;
}
.lush-before-step-body p { margin:0; color:var(--lush-muted); font-family:var(--lush-ui); font-size:13px; font-weight:400; line-height:1.55; }
.lush-before-step-kicker {
  display:block; margin-bottom:4px;
  color:var(--lush-pink); font-family:var(--lush-ui);
  font-size:10px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;
}

.lush-aftercare-section { width:min(100%,396px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 14px 60px; }
.lush-aftercare-section h2 { margin:0 0 30px; color:var(--lush-text); text-align:center; font-size:clamp(42px,10vw,56px); font-family:var(--lush-script); font-weight:400; line-height:1; letter-spacing:0; }

/* "The Ritual" — Steps as a vertical ceremony, no boxes. Each step
   is an editorial pane with a big serif numeral, a Cookie kicker
   ("First", "Then", "Last"), DM Serif title, Roboto body. A single
   sage ✦ centered between steps reads as a separator without the
   visual weight of card chrome. The previous alternating sage cards
   read as transactional; this reads as something you're walked
   through. */
.lush-ritual {
  list-style:none; margin:0; padding:0;
  display:flex; flex-direction:column; gap:0;
}
.lush-ritual-step {
  padding:14px 4px 18px;
  position:relative;
}
.lush-ritual-body { min-width:0; }
.lush-ritual-kicker {
  display:block; margin-bottom:4px;
  font-family:var(--lush-script); font-weight:400;
  font-size:24px; line-height:1; letter-spacing:0;
  color:var(--lush-pink);
}
.lush-ritual-step h3 {
  margin:0 0 10px;
  font-family:var(--lush-serif); font-weight:400;
  font-size:22px; line-height:1.1; letter-spacing:-0.02em;
  color:var(--lush-text);
}
.lush-ritual-step p {
  margin:0;
  font-family:var(--lush-ui);
  font-size:14px; font-weight:400; line-height:1.6;
  color:var(--lush-text);
}
.lush-ritual-sep {
  display:block; text-align:center;
  font-family:var(--lush-ui);
  font-size:16px; line-height:1; color:var(--lush-pink);
  padding:14px 0 4px;
}

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

/* ── FAQ — collapsible Q&A list ── */
/* FAQ — Lush editorial treatment. Drops the card chrome for a
   hairline-divider list, switches the question to DM Serif italic,
   replaces +/- with a rotating sage ✦ chevron, and tints the open
   row with a soft sage wash. */
.lush-faq-section { position:relative; width:100%; background:var(--lush-bg); padding:64px 22px 24px; }
.lush-faq-inner { max-width:720px; margin:0 auto; color:var(--lush-text); }
.lush-faq-heading {
  font-family:var(--lush-script);
  font-size:clamp(48px,9vw,68px); font-weight:400; line-height:1; letter-spacing:0;
  margin:0 0 8px; text-align:center; color:var(--lush-text);
}
.lush-faq-eyebrow {
  display:block; text-align:center;
  font-family:var(--lush-mono); font-size:11px; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-pink);
  margin:0 0 28px;
}
.lush-faq-list {
  display:flex; flex-direction:column;
  border-top:1px solid var(--lush-dark-border);
}
.lush-faq-item {
  background:transparent;
  border:0; border-bottom:1px solid var(--lush-dark-border);
  border-radius:0;
  padding:0;
  transition:background .2s ease;
}
.lush-faq-item[open] { background:rgba(var(--lush-pink-rgb), 0.04); }
.lush-faq-item > summary {
  cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap:18px;
  padding:22px 18px;
  font-family:var(--lush-serif); font-style:italic; font-weight:400;
  font-size:clamp(17px, 2.4vw, 20px); line-height:1.25; letter-spacing:-0.02em;
  color:var(--lush-text);
  list-style:none; outline:none;
}
.lush-faq-item > summary::-webkit-details-marker { display:none; }
.lush-faq-item > summary::after {
  content:"\\2726\\FE0E"; flex-shrink:0;
  font-family:var(--lush-ui);
  font-size:16px; line-height:1; color:var(--lush-pink);
  transition:transform .25s ease;
}
.lush-faq-item[open] > summary::after { transform:rotate(45deg); }
.lush-faq-item > p {
  margin:0;
  padding:0 18px 22px 18px;
  font-family:var(--lush-ui);
  font-size:14px; line-height:1.65; color:var(--lush-muted);
}

/* Reviews — testimonial grid */
/* Reviews — Lush editorial treatment. Each card opens with a big
   sage Molle italic quote glyph, DM Serif italic body text, Cookie
   script author name, and DM Mono uppercase location. Two-column
   grid feels more like a magazine spread than the previous 3-col
   tile wall. Star rating is reframed as a row of sage ✦. */
.lush-reviews-section { position:relative; width:100%; background:var(--lush-bg); padding:64px 22px 36px; }
.lush-reviews-inner { max-width:960px; margin:0 auto; color:var(--lush-text); }
.lush-reviews-eyebrow {
  display:block; text-align:center;
  font-family:var(--lush-mono); font-size:11px; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-pink);
  margin:0 0 10px;
}
.lush-reviews-heading {
  font-family:var(--lush-script);
  font-size:clamp(48px,9vw,68px); font-weight:400; line-height:1; letter-spacing:0;
  margin:0 0 36px; text-align:center; color:var(--lush-text);
}
.lush-reviews-grid { display:grid; grid-template-columns:1fr; gap:0; }
@media (min-width:720px) {
  .lush-reviews-grid {
    grid-template-columns:repeat(2,1fr);
    border-top:1px solid var(--lush-dark-border);
    border-left:1px solid var(--lush-dark-border);
  }
  .lush-review-card {
    border-right:1px solid var(--lush-dark-border);
    border-bottom:1px solid var(--lush-dark-border);
    border-top:none; border-left:none;
  }
}
.lush-review-card {
  position:relative;
  background:transparent;
  border:0; border-bottom:1px solid var(--lush-dark-border);
  padding:32px 24px 28px;
  border-radius:0;
  display:flex; flex-direction:column; gap:14px;
}
.lush-review-card::before {
  content:"\\201C";
  position:absolute; top:14px; left:18px;
  font-family:var(--lush-molle); font-style:italic;
  font-size:72px; line-height:0.6; color:var(--lush-pink);
  opacity:0.85;
  text-shadow:2px 2px 0 rgba(14,17,17,0.14);
  pointer-events:none;
}
.lush-review-stars {
  align-self:flex-start;
  margin-top:24px;
  color:var(--lush-pink);
  font-family:var(--lush-ui); font-size:12px; letter-spacing:6px;
}
.lush-review-body {
  margin:0;
  font-family:var(--lush-serif); font-style:italic; font-weight:400;
  font-size:17px; line-height:1.55; letter-spacing:-0.01em;
  color:var(--lush-text);
}
.lush-review-author {
  margin:auto 0 0; padding-top:8px;
  font-family:var(--lush-script); font-weight:400;
  font-size:24px; line-height:1; color:var(--lush-text);
}
.lush-review-loc {
  display:block; margin-top:6px;
  font-family:var(--lush-mono); font-size:11px; font-weight:500;
  letter-spacing:0.16em; text-transform:uppercase;
  color:var(--lush-muted);
}

.lush-thanks-section { position:relative; width:100%; background:var(--lush-bg); padding:80px 22px 88px; border-top:1px solid var(--lush-dark-border); }
.lush-thanks-inner { max-width:720px; margin:0 auto; text-align:center; color:var(--lush-text); display:flex; flex-direction:column; align-items:center; gap:24px; }
.lush-thanks-eyebrow { display:inline-block; font-family:var(--lush-ui); font-size:11px; font-weight:600; letter-spacing:0.24em; text-transform:uppercase; color:var(--lush-pink); }
.lush-thanks-inner h2 { font-family:var(--lush-script); font-size:clamp(48px,10vw,72px); font-weight:400; line-height:1; letter-spacing:0; margin:0; color:var(--lush-text); }
.lush-thanks-inner em { font-family:var(--lush-script); font-style:normal; color:var(--lush-pink); font-size:1em; }
.lush-thanks-sig { display:inline-flex; align-items:center; gap:16px; font-family:var(--lush-script); font-size:28px; color:var(--lush-pink); }
.lush-thanks-sig em { font-style:italic; }
.lush-thanks-line { width:56px; height:1px; background:var(--lush-pink); opacity:0.5; }

/* ── Footer ── */
/* Footer: flat cream to match the page; hairline dark border for
   division. All text is the standard near-black so it reads cleanly
   on the cream bg (the FadeRoom #fff/#whites are invisible here). */
.lush-footer { position:relative; width:100%; background:var(--lush-bg); color:var(--lush-text); overflow:hidden; border-top:1px solid var(--lush-dark-border); }
.lush-footer-glow { display:none; }
.lush-footer-inner { position:relative; width:100%; max-width:1180px; margin:0 auto; padding:56px 24px 32px; display:grid; grid-template-columns:1fr; gap:36px; }
.lush-footer-brand { display:flex; flex-direction:column; gap:10px; }
.lush-footer-mark { font-family:var(--lush-serif); font-size:36px; line-height:1; letter-spacing:-0.03em; margin:0; }
.lush-footer-tag { margin:0; font-family:var(--lush-script); font-style:normal; font-size:32px; line-height:1; color:var(--lush-pink); }
.lush-footer-blurb { margin:0; color:var(--lush-muted); font-family:var(--lush-ui); font-size:13px; line-height:1.55; }
.lush-footer-col { display:flex; flex-direction:column; gap:10px; }
.lush-footer-label { font-family:var(--lush-ui); font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--lush-pink); font-weight:600; margin-bottom:4px; }
.lush-footer-item { display:inline-flex; align-items:center; gap:10px; color:var(--lush-text); font-family:var(--lush-ui); font-size:13px; line-height:1.4; transition:color .2s ease; }
.lush-footer-item:hover { color:var(--lush-pink); }
.lush-footer-hour { display:flex; justify-content:space-between; gap:16px; font-family:var(--lush-ui); font-size:12px; color:var(--lush-text); padding-bottom:6px; border-bottom:1px dashed var(--lush-dark-border); }
.lush-footer-hour:last-of-type { border-bottom:0; }
.lush-footer-hour span:last-child { color:var(--lush-muted); font-family:var(--lush-ui); font-size:11px; }
.lush-footer-bottom { position:relative; border-top:1px solid var(--lush-dark-border); padding:18px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; font-family:var(--lush-ui); font-size:11px; letter-spacing:0.08em; color:var(--lush-muted); }
.lush-footer-bottom strong { color:var(--lush-pink); font-weight:600; }
.lush-footer-dot { color:var(--lush-pink); opacity:0.5; font-size:6px; }

/* Footer Quick Book — full-width sage pill, identical pattern to the
   FadeRoom footer CTA. Distinct class so it doesn't inherit the
   header's 50 px circle styling. */
.lush-footer-book {
  width:100%;
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  padding:14px 22px;
  background:var(--lush-pink); color:var(--lush-on-pink);
  border:none; border-radius:14px;
  font-family:var(--lush-ui); font-size:14px; font-weight:700;
  letter-spacing:0.04em; line-height:1;
  cursor:pointer;
  transition:filter .15s ease, transform .15s ease;
}
.lush-footer-book svg { color:var(--lush-on-pink); fill:var(--lush-on-pink); }
@media (hover:hover) and (pointer:fine) {
  .lush-footer-book:hover { filter:brightness(1.06); transform:translateY(-1px); }
}
.lush-footer-book:active { transform:translateY(0); }

/* ── Desktop ── */
@media (min-width:1025px) {
  /* Header at desktop: deferred to a future pass; mobile-first design
     applies. Slightly taller cover so the photo gets room to breathe
     on wider viewports. Content card stays full-width and overlaps
     the cover (same as mobile). */
  .lush-header-cover { min-height:300px; }
  .lush-header-content { max-width:1180px; padding:56px 64px 64px; }
  .lush-tab-slider { justify-content:center; padding:8px 40px; gap:12px; }
  .lush-tab-pill { padding:22px 18px; font-size:12px; letter-spacing:0.2em; }
  .lush-tab-pill::after { left:18px; right:18px; height:2px; }
  .lush-gallery-group, .lush-before-after-section, .lush-about-section, .lush-policy-section, .lush-before-appointment-section, .lush-aftercare-section { width:min(100%,1180px); }
  .lush-gallery-section { padding:0 40px 96px; }
  .lush-gallery-group { padding:56px 0 0; }
  .lush-gallery-group+.lush-gallery-group { padding-top:56px; }
  .lush-gallery-group h2 { font-size:64px; margin:0 0 34px; }
  .lush-gallery-grid { grid-template-columns:repeat(4,1fr); gap:32px 22px; }
  .lush-gallery-img--tall > img { aspect-ratio:1/1.25; }
  .lush-gallery-img--wide { grid-column:span 2; }
  .lush-gallery-img--wide > img { aspect-ratio:2/1; }
  .lush-before-after-section { padding:74px 40px 110px; }
  .lush-results-heading { padding:0 0 32px; }
  .lush-results-heading h2 { font-size:clamp(96px,10vw,140px); text-shadow:7px 7px 0 rgba(14,17,17,0.18); }
  .lush-results-backdrop { font-size:clamp(48px,5vw,68px); text-shadow:5px 5px 0 rgba(14,17,17,0.18); margin-top:-20px; }
  .lush-ba-stack { grid-template-columns:repeat(3,minmax(0,1fr)); gap:36px; padding:30px 0 0; }
  .lush-ba-pair { max-width:380px; height:340px; }
  .lush-ba-label { font-size:38px; }
  .lush-ba-card { width:205px; height:205px; }
  .lush-ba-card--before { left:0; top:64px; }
  .lush-ba-card--after  { right:0; top:128px; left:auto; }
  /* Without the spark image, About becomes a centered editorial column —
     hero (heading), pull quote, body, signature — all stacked. Caps
     width at ~640px so it reads like a letter, not a column-stretched
     body. */
  .lush-about-section { min-height:auto; padding:80px 40px 110px; max-width:680px; margin:0 auto; display:block; }
  .lush-about-hero { padding:24px 0 36px; margin-bottom:0; }
  .lush-about-heading-wrap { max-width:480px; }
  .lush-about-backdrop { font-size:clamp(32px,3.5vw,56px); text-shadow:3px 3px 0 rgba(14,17,17,0.18); }
  .lush-about-heading-wrap h2 { font-size:clamp(72px,7vw,108px); text-shadow:5px 5px 0 rgba(14,17,17,0.18); margin-top:-20px; }
  .lush-about-tagline { font-size:13px; margin-top:18px; }
  .lush-about-copy { max-width:none; font-size:18px; line-height:1.55; }
  .lush-policy-section { padding:70px 40px 110px; }
  .lush-policy-heading { align-items:center; margin-bottom:34px; }
  .lush-policy-heading span { font-size:clamp(48px,5vw,68px); text-shadow:5px 5px 0 rgba(14,17,17,0.18); }
  .lush-policy-heading h2 { font-size:clamp(96px,10vw,140px); text-shadow:7px 7px 0 rgba(14,17,17,0.18); margin-top:-20px; }
  .lush-policy-list { grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; align-items:stretch; }
  .lush-policy-card { min-height:320px; padding:24px 24px 28px; display:flex; flex-direction:column; }
  .lush-policy-card h3 { font-size:32px; margin-bottom:18px; }
  .lush-policy-copy { font-size:15px; line-height:1.55; }
  .lush-before-appointment-section, .lush-aftercare-section { padding:74px 40px 110px; }
  .lush-before-appointment-section h2, .lush-aftercare-section h2 { font-size:84px; margin-bottom:58px; }
  .lush-before-timeline { max-width:880px; margin:0 auto; gap:36px; }
  .lush-before-timeline::before { left:33px; }
  .lush-before-step { grid-template-columns:70px 1fr; gap:28px; }
  .lush-before-node { width:68px; height:68px; }
  .lush-before-node-num { font-size:18px; }
  .lush-before-step-body { padding:10px 0 22px; }
  .lush-before-step-body h3 { font-size:42px; margin-bottom:14px; }
  .lush-before-step-body p { font-size:16px; line-height:1.6; }
  .lush-aftercare-list { max-width:1080px; margin:0 auto; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; }
  .lush-aftercare-card { padding:28px 28px 30px; }
  .lush-aftercare-card h3 { font-size:38px; margin-bottom:14px; }
  .lush-aftercare-card p { font-size:15px; line-height:1.6; }
  .lush-footer-inner { padding:72px 48px 36px; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:48px; align-items:start; }
  .brk-booking-section { padding:48px 48px 80px; }
  .brk-booking-services { grid-template-columns:repeat(2,1fr); }
}

/* ── Tablet ── */
@media (min-width:641px) and (max-width:1024px) {
  /* Header at tablet: same mobile-first design, just slightly more
     generous container padding. Buttons grid + circle sizing stays
     uniform across breakpoints (5 × 50 px circles). */
  .lush-header-cover { min-height:260px; }
  .lush-header-content { padding:48px 44px 52px; max-width:760px; }
  .lush-tab-slider { padding:6px 28px; justify-content:center; gap:8px; }
  .lush-gallery-group, .lush-before-after-section, .lush-about-section, .lush-policy-section, .lush-before-appointment-section, .lush-aftercare-section { width:min(100%,720px); }
  .lush-gallery-grid { grid-template-columns:repeat(3,1fr); gap:14px; }
  .lush-policy-list { grid-template-columns:repeat(2,1fr); }
  .lush-aftercare-list { grid-template-columns:repeat(2,1fr); }
  .lush-footer-inner { grid-template-columns:1fr 1fr; }
  .lush-footer-brand { grid-column:1/-1; }
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
  .lush-gallery-group { padding-left:18px; padding-right:18px; }
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
  content: '✦';
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

/* Section title ornament — small flourish marks before/after every h2
   inside the page (gallery / about / before-after / etc.) so the
   feminine "decorated header" reads consistently. Uses currentColor so
   it inherits the accent. */
.lush-femme .lush-gallery-group h2::before {
  content: '✺';
  margin-right: 10px;
  opacity: 0.75;
  font-family: serif;
}
.lush-femme .lush-gallery-group h2::after {
  content: '✺';
  margin-left: 10px;
  opacity: 0.75;
  font-family: serif;
}

/* Polaroid before/after — wraps each pair as a soft offset stack with
   a white border, slight rotation, and pearl-shadow. Reads as actual
   photographs on a vanity table, not a clinical grid. The Lush ba-pair
   markup uses two figures side-by-side; alternate the tilt so they look
   handheld. */
.lush-femme .lush-ba-pair figure {
  background: #FFFFFF;
  padding: 10px 10px 28px;
  border: 1px solid rgba(18,18,18,0.06);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.8) inset,
    0 12px 28px rgba(118, 75, 90, 0.18),
    0 4px 8px rgba(0,0,0,0.06);
  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lush-femme .lush-ba-pair figure:first-child  { transform: rotate(-1.6deg); }
.lush-femme .lush-ba-pair figure:last-child   { transform: rotate(1.8deg); }
.lush-femme .lush-ba-pair figure:hover {
  transform: rotate(0deg) translateY(-4px);
}
.lush-femme .lush-ba-pair figcaption {
  font-family: var(--lush-script);
  font-size: 22px;
  letter-spacing: 0;
  text-transform: none !important;
  color: var(--lush-text);
  opacity: 0.75;
  text-align: center;
  margin-top: 8px;
}

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
  content: '♡';
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
