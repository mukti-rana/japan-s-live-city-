# Local database tests

These run a real Postgres in memory (PGlite) that imitates the production Supabase project: same roles, `auth` and `storage` schemas, Supabase's default privileges, and every migration in `supabase/migrations` applied in order. **They never connect to Supabase** and need no account or secret.

```
cd supabase/tests
npm install          # once (a small, separate install; not part of the website)
npm test
```

| Test | What it proves |
| --- | --- |
| `migration-0014.test.mjs` | Runs 38 website scenarios (anonymous reading, posting, commenting, liking, reporting, uploads, avatar swap, moderation) on the **current** rules, applies `0014`, runs the same scenarios again and requires identical results; then tests each new protection, then the rollback must restore policies, grants, default privileges, triggers and functions **exactly**. |
| `migration-0015-optional.test.mjs` | The optional `client_key` hiding and its rollback. |
| `backup-tool.test.mjs` | The encrypted backup end to end (encrypt, verify, tamper/wrong-passphrase detection, rotation, restore into a fresh database, byte-for-byte photos). |

**Before writing any future migration** (Phases 2 to 5), add its scenarios here and run the suite; the harness reproduces production closely enough that it has already caught real mistakes (for example a policy that queried its own table).

**What it cannot test:** Supabase's own Storage API (it is modelled by its database tables and policies only) and anything that needs real network or accounts. That is why a migration touching Storage should first be tried on a free scratch Supabase project, with the rollback file ready.
