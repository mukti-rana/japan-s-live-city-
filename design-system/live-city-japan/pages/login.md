# /login and /signup (AuthShell) — overrides to MASTER.md

Only the deltas. Everything not listed here follows MASTER.md.

| Rule in MASTER | Override here | Why |
|---|---|---|
| Body/heading font is Space Grotesk only | The page heading ("Welcome", "Create your account") uses **Playfair Display** (`next/font/google`, loaded in `AuthShell.tsx`). Japanese uses `font-jp`. | The sign-in page is a front door, not a data screen; a serif heading gives it a calmer, premium tone. Body, labels and buttons stay Space Grotesk. |
| Primary action uses azure → purple | Guest button is **lilac → sakura** with `text-background` (dark) text; the sign-in button is a quiet lilac outline. | Muted lavender/pink/navy palette for this page. Dark text on the light gradient is ≥ 7:1; purple is not used as text. |
| Photography is self-hosted / none | The Fuji background is loaded at runtime from Wikimedia Commons (`Fuji_Kawaguchi_475.JPG`, CC0, Marion & Christoph Aistl). A drawn SVG Fuji and lake is always underneath, so the page never depends on the photo. The credit and file link show only while the photo is on screen. | No licensing cost, nothing added to the repo. To self-host later, save a copy under `public/images/` and change `thumb()` in `FujiBackdrop.tsx`. |
| ≤ 1–2 animated elements (shine border) | The sign-in panel has a 2px **shine border** (`ShineBorder.tsx`): a lilac → sakura → gold gradient that turns around the card (3.5s, two travelling highlights, `transform` only). It pauses with hidden tabs and stays still for reduced motion. | Adopted from the Magic UI "Shine Border" idea, rebuilt without shadcn or any new dependency. Colours are the page palette, not new tokens. |
| Glass fill 5–8% white | The panel is `bg-panel/80` + `backdrop-blur-xl` over the photo. | MASTER §5: an opaque-ish scrim is required behind text over imagery. |
| ≤ 1–2 animated elements | Slow photo zoom, drifting mist, shimmer on the water and 9 sakura petals — all decorative, `transform`/`opacity` only, stopped for reduced motion and hidden tabs. | Ambient atmosphere; none of it carries information. |

Behaviour rules for this page:

- Guest = a plain link to `/`. No session, no cookie, no account is created.
- Sign-in and create-account use the existing server actions unchanged.
- Language menu is in-page (top right) because the app's own switcher is covered by this full-screen page.
