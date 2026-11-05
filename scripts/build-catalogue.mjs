#!/usr/bin/env node
// Builds the Explore Japan destination catalogue from open data.
//
//   npm run catalogue:build
//
// Sources (all free, keyless, and permitted for reuse with attribution):
//   • Wikidata (CC0)            — what each place is, where it is (coordinates,
//                                 prefecture, city), names in six languages,
//                                 official website, photo file name.
//   • Wikipedia (CC BY-SA)      — a short introduction in English and Japanese.
//   • Wikimedia Commons         — photo author and licence, for image credits.
//
// Nothing is invented: a field Wikidata/Wikipedia does not have is left null
// and shown as "not yet available" in the app. The script is safe to re-run;
// it rewrites src/data/explore/catalogue.json and catalogue.meta.json. Add a
// source by adding a query to QUERIES or a new enrichment step below.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../src/data/explore/", import.meta.url));
const UA = "LiveCityJapan/1.0 (educational travel project; https://github.com/mukti-rana/japan-s-live-city-)";
const WDQS = "https://query.wikidata.org/sparql";
const PER_PREFECTURE_CATEGORY = Number(process.env.PER_CELL ?? 45);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, init = {}, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) } });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get("retry-after")) * 1000 || 4000 * (i + 1);
        console.log(`  … ${res.status}, waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      throw new Error(`${res.status} ${url.slice(0, 120)}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(3000 * (i + 1));
    }
  }
}

async function sparql(query) {
  const url = `${WDQS}?format=json&query=${encodeURIComponent(query)}`;
  const data = await getJson(url, {}, 6);
  return data.results.bindings;
}

// ── What counts as a destination ────────────────────────────────────────
// category id → Wikidata classes (subclasses are included automatically).
const CATEGORIES = {
  shrine: ["Q845945"],
  temple: ["Q5393308"],
  castle: ["Q23413"],
  museum: ["Q33506"],
  park: ["Q22698", "Q1107656"],
  waterfall: ["Q34038"],
  mountain: ["Q8502"],
  beach: ["Q40080"],
  island: ["Q23442"],
  lake: ["Q23397"],
  gorge: ["Q150784"],
  onsen: ["Q177380", "Q655311"],
  aquarium: ["Q2281788", "Q43501"],
  themepark: ["Q194195", "Q2416723"],
  viewpoint: ["Q177305", "Q1440300", "Q6017969"],
  market: ["Q330284"],
  ski: ["Q130003"],
  attraction: ["Q570116"],
};
// When a place fits several, the first one here is its main category.
const PRIORITY = ["themepark", "aquarium", "castle", "onsen", "ski", "shrine", "temple", "museum", "waterfall", "mountain", "beach", "island", "lake", "gorge", "park", "viewpoint", "market", "attraction"];

function wkt(point) {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(point ?? "");
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}
const qid = (uri) => uri?.split("/").pop() ?? null;
const val = (b, k) => b[k]?.value ?? null;

function placeQuery(classes) {
  const values = classes.map((c) => `wd:${c}`).join(" ");
  // Kept deliberately light: names, titles and the city are fetched afterwards
  // from the Wikidata API, which is far cheaper than doing it in SPARQL.
  return `
SELECT ?item ?links ?coord ?pref ?adm ?image ?site WHERE {
  VALUES ?class { ${values} }
  ?item wdt:P31/wdt:P279* ?class; wdt:P17 wd:Q17; wdt:P625 ?coord; wikibase:sitelinks ?links.
  ?item wdt:P131+ ?pref. ?pref wdt:P31 wd:Q50337.
  OPTIONAL { ?item wdt:P18 ?image. }
  FILTER(?links >= 2 || (?links >= 1 && BOUND(?image)))
  OPTIONAL { ?item wdt:P131 ?adm. }
  OPTIONAL { ?item wdt:P856 ?site. }
}`;
}

// ── Prefectures: Wikidata id → our id ─────────────────────────────────────
async function loadPrefectures(ourPrefs) {
  const rows = await sparql(`SELECT ?p ?en WHERE { ?p wdt:P31 wd:Q50337. ?p rdfs:label ?en FILTER(LANG(?en)="en") }`);
  const map = new Map();
  for (const r of rows) {
    const name = val(r, "en").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ Prefecture$/, "").replace(/ Metropolis$/, "");
    const ours = ourPrefs.find((p) => p.en.toLowerCase() === name.toLowerCase());
    if (ours) map.set(qid(val(r, "p")), ours.id);
  }
  return map;
}

// Our prefecture ids and their region, read from the app's own list so the
// catalogue and the site can never disagree.
async function loadOurPrefectures() {
  const src = await (await import("node:fs/promises")).readFile(new URL("../src/lib/news/places.ts", import.meta.url), "utf8");
  const out = [];
  const re = /\bp\("([a-z]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([a-z]+)"/g;
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], en: m[2], ja: m[3], region: m[4] });
  return out;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const ourPrefs = await loadOurPrefectures();
  console.log("prefectures in app:", ourPrefs.length);
  const prefMap = await loadPrefectures(ourPrefs);
  console.log("prefectures matched in Wikidata:", prefMap.size);

  const places = new Map();
  for (const [category, classes] of Object.entries(CATEGORIES)) {
    console.log(`query: ${category}`);
    let rows;
    try {
      rows = await sparql(placeQuery(classes));
    } catch (e) {
      console.log(`  ! ${category} failed: ${e.message}`);
      continue;
    }
    console.log(`  ${rows.length} rows`);
    for (const r of rows) {
      const id = qid(val(r, "item"));
      const prefId = prefMap.get(qid(val(r, "pref")));
      const point = wkt(val(r, "coord"));
      if (!id || !prefId || !point) continue;
      if (point.lat < 24 || point.lat > 46 || point.lon < 122 || point.lon > 149) continue;
      let p = places.get(id);
      if (!p) {
        p = {
          id,
          names: {},
          prefectureId: prefId,
          admId: qid(val(r, "adm")),
          city: null,
          lat: Math.round(point.lat * 1e5) / 1e5,
          lon: Math.round(point.lon * 1e5) / 1e5,
          categories: new Set(),
          links: Number(val(r, "links")),
          imageFile: null,
          website: val(r, "site"),
          wikiTitle: { en: null, ja: null },
          heritage: false,
        };
        places.set(id, p);
      }
      p.categories.add(category);
      const img = val(r, "image");
      if (img && !p.imageFile) p.imageFile = decodeURIComponent(img.split("/Special:FilePath/").pop());
      if (!p.website) p.website = val(r, "site");
    }
    await sleep(2500);
  }

  // UNESCO World Heritage (a flag, not a category).
  console.log("query: world heritage");
  try {
    const rows = await sparql(`SELECT ?item WHERE { ?item wdt:P1435 wd:Q9259; wdt:P17 wd:Q17. }`);
    for (const r of rows) {
      const p = places.get(qid(val(r, "item")));
      if (p) p.heritage = true;
    }
  } catch (e) {
    console.log(`  ! heritage flag failed: ${e.message}`);
  }

  // ── Names, Wikipedia titles and city names (Wikidata API) ─────────────
  async function entities(ids, props, extra = "") {
    const out = {};
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${batch.join("|")}&props=${props}&languages=en|ja|ne|hi|zh|ko${extra}`;
      try {
        const data = await getJson(url);
        Object.assign(out, data.entities ?? {});
      } catch (e) {
        console.log(`  ! entity batch failed: ${e.message}`);
      }
      await sleep(250);
    }
    return out;
  }

  const rough = [...places.values()];
  console.log("fetching names for", rough.length);
  const ents = await entities(rough.map((p) => p.id), "labels|sitelinks", "&sitefilter=enwiki|jawiki");
  for (const p of rough) {
    const e = ents[p.id];
    if (!e) continue;
    for (const lang of ["ja", "en", "ne", "hi", "zh", "ko"]) {
      const v = e.labels?.[lang]?.value;
      if (v) p.names[lang] = v;
    }
    p.wikiTitle = { en: e.sitelinks?.enwiki?.title ?? null, ja: e.sitelinks?.jawiki?.title ?? null };
  }
  const admIds = [...new Set(rough.map((p) => p.admId).filter(Boolean))];
  console.log("fetching city names for", admIds.length);
  const adms = await entities(admIds, "labels");
  for (const p of rough) {
    const e = adms[p.admId];
    p.city = e?.labels?.en?.value ?? e?.labels?.ja?.value ?? null;
  }

  // Names: keep only places we can label properly.
  let list = [...places.values()].filter((p) => p.names.ja || p.names.en);
  console.log("candidates:", list.length);

  // Fair coverage: the strongest N per prefecture and main category, so small
  // prefectures and quiet towns are not crowded out by a few famous cities.
  for (const p of list) p.category = PRIORITY.find((c) => p.categories.has(c)) ?? [...p.categories][0];
  const cells = new Map();
  for (const p of list) {
    const key = `${p.prefectureId}|${p.category}`;
    (cells.get(key) ?? cells.set(key, []).get(key)).push(p);
  }
  const keep = [];
  for (const group of cells.values()) {
    group.sort((a, b) => b.links + (b.imageFile ? 2 : 0) - (a.links + (a.imageFile ? 2 : 0)));
    keep.push(...group.slice(0, PER_PREFECTURE_CATEGORY));
  }
  list = keep;
  console.log("after balancing:", list.length);

  // ── Wikipedia introductions (CC BY-SA) ────────────────────────────────
  for (const lang of ["en", "ja"]) {
    const withTitle = list.filter((p) => p.wikiTitle[lang]);
    console.log(`extracts ${lang}: ${withTitle.length}`);
    for (let i = 0; i < withTitle.length; i += 20) {
      const batch = withTitle.slice(i, i + 20);
      const titles = batch.map((p) => p.wikiTitle[lang]).join("|");
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=${lang === "en" ? 420 : 200}&exlimit=20&redirects=1&format=json&titles=${encodeURIComponent(titles)}`;
      try {
        const data = await getJson(url);
        const norm = new Map();
        for (const n of data.query?.normalized ?? []) norm.set(n.from, n.to);
        const redir = new Map();
        for (const r of data.query?.redirects ?? []) redir.set(r.from, r.to);
        const byTitle = new Map(Object.values(data.query?.pages ?? {}).map((pg) => [pg.title, pg.extract]));
        for (const p of batch) {
          let t = p.wikiTitle[lang];
          t = norm.get(t) ?? t;
          t = redir.get(t) ?? t;
          const text = byTitle.get(t);
          if (text && text.trim().length > 30) (p.about ??= {})[lang] = text.trim().replace(/\s+/g, " ");
        }
      } catch (e) {
        console.log(`  ! extract batch failed: ${e.message}`);
      }
      if ((i / 20) % 20 === 0) console.log(`  ${i}/${withTitle.length}`);
      await sleep(400);
    }
  }

  // ── Photo credits (Wikimedia Commons) ─────────────────────────────────
  const withImg = list.filter((p) => p.imageFile);
  console.log("image credits:", withImg.length);
  for (let i = 0; i < withImg.length; i += 40) {
    const batch = withImg.slice(i, i + 40);
    const titles = batch.map((p) => `File:${p.imageFile}`).join("|");
    const url = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName&format=json&titles=${encodeURIComponent(titles)}`;
    try {
      const data = await getJson(url);
      const norm = new Map();
      for (const n of data.query?.normalized ?? []) norm.set(n.from, n.to);
      const byTitle = new Map(Object.values(data.query?.pages ?? {}).map((pg) => [pg.title, pg.imageinfo?.[0]?.extmetadata]));
      for (const p of batch) {
        const t0 = `File:${p.imageFile}`;
        const meta = byTitle.get(norm.get(t0) ?? t0);
        const strip = (h) => (h ? h.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80) : null);
        p.imageCredit = { author: strip(meta?.Artist?.value), license: strip(meta?.LicenseShortName?.value) };
      }
    } catch (e) {
      console.log(`  ! credit batch failed: ${e.message}`);
    }
    await sleep(400);
  }

  // ── Write ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const records = list
    .map((p) => ({
      id: p.id,
      n: Object.fromEntries(Object.entries(p.names).filter(([, v]) => v)),
      pref: p.prefectureId,
      city: p.city,
      lat: p.lat,
      lon: p.lon,
      cat: p.category,
      cats: [...p.categories],
      links: p.links,
      img: p.imageFile,
      credit: p.imageCredit ?? null,
      web: p.website,
      wh: p.heritage || undefined,
      about: p.about ?? null,
      wiki: p.wikiTitle,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));

  const byPref = {};
  const byCat = {};
  for (const r of records) {
    byPref[r.pref] = (byPref[r.pref] ?? 0) + 1;
    byCat[r.cat] = (byCat[r.cat] ?? 0) + 1;
  }
  const meta = {
    generatedAt: today,
    total: records.length,
    prefecturesCovered: Object.keys(byPref).length,
    byPrefecture: byPref,
    byCategory: byCat,
    withPhoto: records.filter((r) => r.img).length,
    withDescription: records.filter((r) => r.about).length,
    withWebsite: records.filter((r) => r.web).length,
    sources: ["Wikidata (CC0)", "Wikipedia (CC BY-SA 4.0)", "Wikimedia Commons"],
  };
  writeFileSync(`${OUT}catalogue.json`, JSON.stringify(records));
  writeFileSync(`${OUT}catalogue.meta.json`, JSON.stringify(meta, null, 2));
  console.log("done", meta);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
