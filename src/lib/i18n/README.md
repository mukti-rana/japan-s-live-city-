# Translations

One language choice (English, 日本語, नेपाली, हिन्दी, 简体中文, 한국어) changes the whole site at once, with no reload.
The choice is kept in `localStorage["livecity:language"]` and, for signed-in users, in their account
(`PreferencesSync`).

## Where text lives

| What | Where | How it is used |
| --- | --- | --- |
| Shared interface text (415 keys) | `dictionaries/{en,ja,ne,hi,zh,ko}.ts` | `t("key")` from `useLanguage()`. `en.ts` defines the keys, so a missing key in any other file is a compile error. |
| Everything else — a sentence, label or name written in a component | `translations/{ja,ne,hi,zh,ko}.json` | The key is the **English sentence**. `useTranslate()` → `tr("…")`, `<Tx en="…" />` in server components, `translate("…", language)` in plain functions. |
| A phrase with a number or name in it | the same JSON, written with `{n}`, `{name}`, `{date}`, `{time}` | `tr("Question {n} of {total}").replace("{n}", …)`. A string that differs only by one number (`105K views`) finds its `{n}` entry automatically. |
| Dates and "3 hours ago" | `datetime.ts` | `dateFormatter()` / `relativeTime()` use `Intl`, except Nepali, which some browsers do not ship data for — those are re-labelled with Nepali month/weekday names and digits. |
| Place and publisher names | the JSON (prefectures, cities, agencies, holidays) | `known(name, language)` — translated when known, otherwise shown exactly as received. |
| Page titles (browser tab) | the JSON, applied by `components/i18n/LocalizedTitle.tsx` | |

## Fallbacks — never silent

* A missing entry shows the English text **and** logs `[i18n] missing ne: "…"` to the console in development.
* `known()` / `lookup()` are the quiet variants, for text that may legitimately be outside the memory
  (a town name from an events feed).

## Finding gaps

```bash
npm run i18n:check            # dictionaries, every <Tx>/tr()/translate()/label= sentence, and hard-coded JSX text
npm run i18n:check -- --strict   # list everything
npm run i18n:check -- --list     # write the missing sentences to /tmp/i18n-missing.json for a translator
```

It exits non-zero on any gap, so it can run in CI.

## What is **not** translated (and why)

Content that arrives from outside the site is shown in the language its publisher wrote it in
(news headlines and summaries, event descriptions, Wikipedia introductions, municipal place names,
train-line names). No machine-translation service is connected, so none of it is translated
automatically — see the project notes before adding one, because it has a cost.

Translations were written by an AI and have not been reviewed by native speakers; emergency and
safety wording in particular should get a native review before it is relied on.
