# `/` (the homepage) — overrides to MASTER.md

Only the deltas. Everything not listed here follows MASTER.md. Approved by the project owner
(2026-11-16): the homepage is a premium, pitch-black, cinematic, vertically scrolling experience.
These overrides apply to the homepage only; MASTER.md is unchanged.

| Rule in MASTER | Override here | Why |
|---|---|---|
| Page surface `--surface-0` is `#0a0a0b` | The page and its shell are **`#000000`** (cards `#0b0b0c`, raised `#141416`) | Cinematic photography needs true black around it. |
| Both themes follow the toggle | The homepage stays **pitch-black in both themes**. Top bar, mobile drawer and footer take the same dark palette while `/` is shown (`[data-home-root]` + `:has`, no flash). Every other page follows the toggle. | A black cinematic page is the point; the toggle still works everywhere else. |
| ≤ 1–2 animated elements; no entrance choreography on dense views | **Chapter reveals**: each chapter fades in with a ≤ 24px rise (`opacity`/`transform`, ~500ms, once). **One** slow hero zoom. Light parallax (≤ 6% travel) on place photographs only — never on text. At most **one** pinned section (none planned). No scroll-jacking. Under reduced motion everything renders in its final state. Animation pauses when the tab is hidden. | Scroll storytelling pattern; the skill's rules for parallax and pinning are followed. |
| No serif display face; serif only for marketing display type | **Playfair Display** (400, 600) for chapter headings and the hero line, loaded with `next/font/google` *inside the homepage module only* (other routes never download it). Display kanji (東京, 京都…) use **Noto Serif JP** (400, not preloaded). Body, UI and Japanese body text stay Space Grotesk / Noto Sans JP. | The homepage is the front door (same reasoning as `login.md`). |
| Photography is self-hosted / none | Eight **CC0** photographs from Wikimedia Commons, self-hosted in `public/images/home/` (2560px WebP, quality 80), served through `next/image`. Each is credited on the page; the full record is `public/images/home/CREDITS.md` and `src/lib/data/homePhotos.ts`. | Free, credited, no runtime dependency. |
| Hero video is an anti-pattern | Still no video. The hero is a photograph with one slow zoom. The live Shibuya camera (YouTube) is unchanged and loads when it scrolls into view. | No bandwidth or autoplay cost in the hero. |
| Glass over imagery needs a scrim | Every text block over a photograph sits on a black gradient scrim (≥ 4.5:1 checked on the darkest-to-lightest part under the text). | MASTER §5. |

Layout rules for this page:

- The **sidebar column is hidden on `/` at ≥ 1024px**. The top bar stays (SOS, search, language, theme, account). The phone menu button and drawer are unchanged. Each chapter heading links to its full page and the footer index lists every destination, so nothing becomes unreachable.
- The **dock is home-only and desktop-only**, with **Community first**, a divider, then the existing eight tools.
- Chapters keep their reading order in the DOM with all motion off. Real data only; every live surface keeps its DEMO / Live / stale / empty / error state.
