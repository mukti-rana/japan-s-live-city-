# Live City Japan — Design System (MASTER)

> **Source of truth for all UI work.** Read before building or changing anything visual.
> Page overrides live in `pages/<page>.md` and win on any point of conflict.
>
> Rewritten 2026-11-15 from the current application. The previous version described a
> dark-only app with no theme switcher and 155 components; none of that is still true.
> Facts below were read from the code; the direction was approved by the project owner.

---

## 1. Product

A consumer companion app for living in and travelling around Japan — a **utility super-app**,
not a marketing site and not an enterprise dashboard.

| Family | Routes |
|---|---|
| Community | `community` + 16 nested (posts, questions, reviews, photos, places, profiles, admin) |
| Real-time | `map`, `weather`, `trains`, `earthquakes`, `emergency` |
| Content | `news`, `trending`, `events`, `calendar` |
| Explore | `explore`, `explore/[id]`, `explore/trip`, `cities`, `[city]` |
| Tools | `yen-converter`, `rent-calculator`, `salary-calculator` |
| Language & AI | `ai-assistant`, `explain-japanese`, `sign-assistant`, `jlpt`, `jlpt/[level]` |
| Account | `login`, `signup`, `forgot-password`, `reset-password`, `settings` |

**46 routes · 226 components.**

**Stack:** Next.js 16.3.5 App Router (Turbopack) · React · TypeScript · Tailwind v4
(`@theme inline`) · Supabase (`@supabase/ssr`) · Leaflet · `motion` · `lucide-react` ·
`rss-parser` · `@anthropic-ai/sdk`.

---

## 2. Direction

**Premium, modern, minimal.** Deep black foundation. White, electric blue and a subtle
purple carry the interface. Sakura pink and gold are **cultural and semantic only** — Japanese
seasonal content, festivals, warnings — never general decoration.

Avoid: heavy gradients, glow stacking, ornamental shapes, crowded panels.

**Both themes are supported.** Dark is the intended default; light is a first-class theme with
its own verified palette, reached through the Sun/Moon toggle. A visitor's stored choice is
never overwritten.

Community (`b88d8e4`) is the closest existing example of this direction. Treat it as the
reference, not as an exception.

---

## 3. Tokens — authoritative

Defined in `src/app/globals.css`, exported to Tailwind via `@theme inline`.
**Use the token. Never a raw hex.**

### Surfaces

| Token | Dark | Light | Use |
|---|---|---|---|
| `--surface-0` | `#0a0a0b` | `#f6f7f9` | Page |
| `--surface-1` | `#111113` | `#ffffff` | Card |
| `--surface-2` | `#17171a` | `#ffffff` | Raised: hover, popover, sheet |
| `--surface-3` | `#202024` | `#eef0f4` | Input wells, pressed |
| `--line` | `rgba(255,255,255,.1)` | `rgba(15,23,42,.13)` | Border |
| `--line-strong` | `rgba(255,255,255,.18)` | `rgba(15,23,42,.26)` | Hover/focus border |

### Text

| Token | Dark | Light |
|---|---|---|
| `--text-primary` | `#f4f4f8` | `#0f172a` |
| `--text-secondary` | `#a1a1aa` | `#4b5563` |
| `--text-tertiary` | `#81818b` | `#6b7280` |

### Accents — the whole palette is these two

| Token | Dark | Light | Use |
|---|---|---|---|
| `--accent` | `#4da3ff` | `#1668d9` | Primary action, links, focus ring |
| `--accent-ink` | `#06080f` | `#ffffff` | Text on a filled accent surface |
| `--accent-2` | `#a855f7` | `#7c3aed` | **Fills, borders, glows only** |
| `--accent-2-text` | `#c4b5fd` | `#6a45d8` | Purple **text and icons** |

`--accent-2` fails AA as text on its own tint (3.72–4.44:1 measured). That is why
`--accent-2-text` exists. Never set purple text from `--accent-2`.

### Semantic and brand

`--success` · `--warning` · `--danger` · `--info` for status.
`--brand-sakura` · `--brand-gold` for Japanese cultural, seasonal and festival content only.

### Verified contrast

Every pair above was computed against every surface in both themes on 2026-11-15. All meet
**WCAG AA 4.5:1**, except `--text-tertiary` in dark, which is 4.64:1 on `--surface-2` — right
at the line, so keep it for de-emphasised metadata and never for body copy.

Four values were corrected during this pass to reach AA: dark `--text-tertiary`
(`#71717a`→`#81818b`), light `--warning` and `--brand-gold` (`#9a6a08`→`#916408`), light
`--brand-sakura` (`#d63a74`→`#c9376d`).

### Legacy tokens

`--background`, `--panel`, `--sidebar-bg`, `--glass-*`, `--azure`, `--sakura`, `--gold`,
`--mint`, `--neon-purple`, `--lilac`, `--cm-*` are **still live** and still correct. Most of
the 226 components use them. They map onto the new names and will be migrated folder by
folder. `--neon-cyan` has 2 uses and is deprecated — do not add more.

Do not mix systems inside one component: finish a file on the new tokens or leave it on the old.

### Ambient tokens

`--ambient-primary`, `--ambient-secondary`, `--ambient-glow` are rewritten at runtime from
the local JST hour. Atmosphere only — glows, washes. **Never** text, icons or focus rings;
their value is unknowable at authoring time.

---

## 4. Typography

Loaded with `next/font/google` in `src/app/layout.tsx`. Never add `@import` font URLs.

| Role | Family | Token |
|---|---|---|
| UI, headings, body | Space Grotesk | `--font-space-grotesk` → `font-sans` |
| Japanese | Noto Sans JP | `--font-jp` → `font-jp` |

Apply `font-jp` to any Japanese text. Space Grotesk has no CJK coverage.

### Scale

| Step | Size | Use |
|---|---|---|
| `text-xs` | 12px | Timestamps, axis labels, chip text — **the floor** |
| `text-sm` | 14px | Dense rows, metadata, captions |
| `text-base` | 16px | Body — the floor for any paragraph |
| `text-lg` | 18px | Card titles |
| `text-xl`–`2xl` | 20–24px | Section headings |
| `text-3xl`+ | 30px+ | Page heroes |

**Known debt:** 339 arbitrary `text-[Npx]` values remain, and **328 are below 12px**
(`11px`×227, `10px`×85, `9px`×16) across 110 files. Scheduled for the typography phase. Do not
add more; use the scale.

No serif display face. The reference data suggests Playfair Display for "premium", but its own
`Best For` is luxury, fashion and editorial — not a data utility. If a serif is ever used it is
for marketing display type only, never in the app.

---

## 5. Space, radius, motion

**Space** — 4px base: `--space-1..8` (4, 8, 12, 16, 24, 32). Card padding 12–16px, grid gaps
8–12px, 24px+ only between page sections.

**Radius** — `--radius-sm` 8px (controls, chips, inputs) · `--radius-md` 12px (cards) ·
`--radius-lg` 16px (sheets, modals) · `--radius-full` (pills, avatars). `rounded-3xl` and
`rounded-md` are being retired.

**Elevation** is surface + border, not drop shadow:
`--surface-0` → `--surface-1` → `--surface-2`, each with a `1px solid --line`.

**Motion** — `--dur-fast` 150ms (hover, colour) · `--dur-base` 200ms (state) · `--dur-slow`
300ms (entrance) · `--ease-out`. Animate **only** `opacity` and `transform`. At most 1–2
animated elements per view; dense data views get no entrance choreography. Under reduced
motion render the final state immediately — never just shorten the duration.

---

## 6. Components

### Use these

| Component | Notes |
|---|---|
| `Button` / `ButtonLink` | `primary` · `secondary` · `ghost` · `danger`; `sm`/`md`/`lg`, md = 44px |
| `GlassCard` | `glass` (default, unchanged) · `solid` (deep black, preferred for new work) · `quiet` |
| `Input` | Visible label, hint, error wired to `aria-describedby`/`aria-invalid` |
| `Chip` | Interactive pill; selection carried by `aria-pressed`, not colour alone |
| `Badge` | Static label; semantic tones plus `sakura`/`gold` for cultural content |
| `Modal` | `aria-modal`, focus trap and return, Escape, scroll lock, sheet on mobile |
| `EmptyState` | "Nothing here" — distinct from loading and from failure |
| `SectionHeader` | Title + subtitle + action, explicit heading level |
| `RouteError` | Shared body of every `error.tsx` |
| `PageSkeleton` | Route loading UI: `list` · `grid` · `detail` · `canvas` |

### Already existed — keep using

`Tabs`, `SegmentedToggle`, `Reveal`, `ViewAllButton`, `WeatherIcon`, `Logo`,
`AuthField` (auth fields), `FieldInput` (calculator number fields), `CurrencySelect`,
`Thumb`, `ShineBorder`.

### Not built yet

No `Drawer`, `Select`, `StatTile` or `PageHeader` primitive — deliberately. Build one only
when a second surface genuinely needs it. Skeletons use the `cm-skeleton` class, which already
has a light-theme variant and is disabled under reduced motion.

### Known debt

86 files declare their own card shell (151 inline), and 240 distinct raw hex values appear in
components. Both are scheduled for the migration phase.

---

## 7. Accessibility baseline

Measured 2026-11-15 — this is in good shape, keep it that way:
**950** `focus-visible` styles · **530** `aria-hidden` · **269** `aria-label` ·
**30** reduced-motion guards.

- Never remove a focus ring without a ≥3:1 replacement.
- Touch targets ≥44px with ≥8px separation. **Expand the hit area, don't inflate the button** —
  a 44px visual control in a row of 32px controls forces the row taller and reads as broken.
  Keep the visual sized to its neighbours and put the target on an out-of-flow pseudo-element:
  `relative h-8 w-8 … after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11
  after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']`.
  Used by the close buttons in `PlacePicker`, `CalendarApp` and `Modal`.
- Check contrast **on the actual surface**, not just the page background.
- Visible labels on form fields; errors beside the field, never only in a summary.
- Status must not be colour-alone — pair with an icon or text.
- Icons from `lucide-react`. No emoji as controls. Decorative icons get `aria-hidden`;
  icon-only buttons need an accessible name.
- Test at 375px and in landscape. `md:` (768–1024) is under-used — 56 uses against 427 `sm:`.

---

## 8. Next.js conventions

`AGENTS.md` warns this version differs from older ones. **Read `node_modules/next/dist/docs/`
before writing route files.** Confirmed differences:

- **`error.tsx` receives `retry`, not `reset`.** Earlier versions used `reset`; 16.3.5 does not.
- Error boundaries must be Client Components.
- `global-error.tsx` renders its own `<html>`/`<body>` and **does not receive global styles** —
  the theme class never reaches it, so its styling is inlined.
- `error.tsx` wraps `loading.tsx`, `not-found.tsx`, `page.tsx` and nested layouts, but **not**
  the layout in its own segment.
- Push `'use client'` to interactive leaves, never onto `page.tsx`. Currently 0 pages violate
  this — keep it that way.
- Use `next/image`, not `<img>`. 20 files still use raw `<img>`; 16 are Community uploads from
  Supabase storage and need `remotePatterns` in `next.config.ts` first.

Every route group has `error.tsx`; data-heavy groups have `loading.tsx`.

---

## 9. Anti-patterns

- Raw hex in components instead of tokens.
- Purple text from `--accent-2` (use `--accent-2-text`).
- Sakura or gold as general decoration.
- Ambient tokens on text, icons or focus rings.
- Text below 12px; paragraphs below 16px.
- Emoji as controls or status.
- Animating layout properties; entrance animation on dense data views.
- `@import`-ing Google Fonts — fonts come from `next/font`.
- Japanese text without `font-jp`.
- Glass panels over map tiles or imagery without a scrim (`rgba(14,19,36,0.85)` is established).
- A live-data surface with no empty, stale or error state.
- Marketing patterns — hero video, logo carousels, "Contact Sales", pricing tables.

---

## 10. Checklist

- [ ] Tokens throughout — no raw hex
- [ ] Contrast verified on the actual surface
- [ ] Japanese text carries `font-jp`
- [ ] Lucide icons; no emoji controls
- [ ] Targets ≥44px via hit-area expansion, ≥8px apart
- [ ] Visible focus everywhere
- [ ] Tested at 375px and landscape, in **both** themes
- [ ] Reduced motion verified
- [ ] Only `opacity`/`transform` animated
- [ ] Loading, empty, stale **and** error states exist
- [ ] `'use client'` on leaves, not pages
- [ ] Glass over non-uniform backdrops has a scrim

---

## Migration status

| Phase | State |
|---|---|
| 1 — Error & loading boundaries | **Done** (2026-11-15) |
| 2 — Tokens, primitives, this document | **Done** (2026-11-15) |
| 3 — Typography floor (328 sub-12px, 110 files) | Not started |
| 4 — Card migration (86 files), retire 240 raw hex | Not started |
| 5 — Decoration pass (92 gradients, 40 glows) | Not started |
| 6 — Accent reduction, dark default, welcome gate | Not started |
| 7 — `next/image` (20 files), `md:` breakpoints | Not started |

Phases 3–7 are **not approved**. Do not start one without the owner's go-ahead.

---

## Provenance

Counts, token values and contrast ratios were read and computed from this repository on
2026-11-15 — not proposed by a generator. The direction in §2 was decided by the project owner.

The `ui-ux-pro-max` generator's `--design-system` output was **not** used: asked twice, it
returned light-mode marketing systems (an enterprise "Contact Sales" palette, then Minimalism
on `#F8FAFC`) that do not fit a dark, consumer, data-dense utility. Its own query contract says
not to persist unverified output. Individual domain searches *were* used and are cited where
they apply: the `minimalism-and-swiss-style` record, UX guidance on 16px body text and
consistent scales, and the `nextjs` stack rules on `next/image` and `loading.tsx`.
