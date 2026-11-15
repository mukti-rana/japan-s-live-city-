# Page overrides

Files here override `../MASTER.md` for a single page. Create one only when a page genuinely
needs to deviate — if a rule should apply everywhere, change MASTER.md instead.

**Convention:** name the file after the route segment, e.g. `map.md` for `/map`,
`ai-assistant.md` for `/ai-assistant`, `jlpt.md` for `/jlpt` and its `[level]` children.

**Retrieval order** when building a page:

1. Read `../MASTER.md`
2. If `<page>.md` exists here, its rules win on any point of conflict
3. Otherwise MASTER.md applies exclusively

**Document only the delta** — the rule being overridden and why. Do not restate MASTER.md.

Likely candidates in this project, based on where the global rules strain:

- `map.md` — glass over non-uniform Leaflet tiles needs scrims; Leaflet's own chrome is
  restyled in `globals.css`; touch targets on zoom/marker controls
- `ai-assistant.md` — `--neon-purple` is the surface accent but fails AA as text on panel and
  glass (MASTER.md §2); streaming/token-by-token output needs its own loading semantics
- `earthquakes.md` / `emergency.md` — alert severity colour needs a non-colour channel too,
  and these surfaces can legitimately return nothing
