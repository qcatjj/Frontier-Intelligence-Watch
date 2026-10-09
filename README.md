# Frontier Intelligence Watch

**Live public website:** https://frontier-intelligence-watch.vercel.app/  
**Code repository:** https://github.com/qcatjj/Frontier-Intelligence-Watch

An independent-minded, evidence-first learning and research site about frontier AI, AGI / ASI, AI safety, autonomous agents, and geopolitics. Written for everyday readers.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Public landing page, intelligence dashboard, research-library links |
| `learn.html` | Reader-friendly weekly issues, guide detail pages, archive and AI dictionary |
| `data/content.json` | Published issue records, editorial summaries, dictionary terms |
| `api/research.js` | Live OpenAlex scholarly discovery feed, clearly labeled **unreviewed** |
| `vercel.json` | Vercel route rewrites for `/archive`, `/dictionary`, `/issue/:id`, `/guide/:id` |
| `scripts/validate-site.mjs` | Prevents cut-off HTML, malformed page scripts and broken article/dictionary references |
| `.github/workflows/site-checks.yml` | Runs repository validation on every push and pull request |
| `scripts/weekly-candidates.mjs` | Collects primary-source paper candidates for editorial review |
| `.github/workflows/weekly-candidates.yml` | Creates a weekly GitHub editorial issue (not a public publication) on Sundays |

## Publishing an issue

1. Read and independently check the original papers and incident reports.
2. Draft 4–8 accessible articles in `data/content.json` with `happened`, `matters`, `limits`, `analogy`, `terms` and primary-source links.
3. Add a new entry to the `issues` array with a unique three-digit `id` and matching `guideIds`. Do not delete prior issues: they form the archive.
4. Run `node scripts/validate-site.mjs`. After Vercel Git integration is connected, merges to `main` will build the website.
5. Verify `/issue/NNN`, `/archive`, `/dictionary`, and the individual guide pages on the public domain.

**Editorial rule:** automated discovery is not a confirmed result. AI claims about AGI, superintelligence, military escalation, and incidents need a source, limits and confidence qualifications.

## Link this existing Vercel project to GitHub

The Vercel project already exists and was initially deployed using its API without Git integration. To link the **existing** public project, do **not** import as a second new project:

1. Open the existing **frontier-intelligence-watch** project on Vercel under team **tjohnscdx-2421**.
2. Choose **Settings → Git → Connect Git Repository**.
3. Select **qcatjj/Frontier-Intelligence-Watch** with production branch **main**.
4. Verify the production alias `https://frontier-intelligence-watch.vercel.app/` still routes to the ready deployment.
5. Verify Git-push auto-deploy is active.

Vercel's repository-linking action is not currently exposed by the connected assistant integration for an API-created project; this one-time connection must be completed through the Vercel interface.

## Supabase

No Supabase project is attached to this repo yet. A separate Supabase database is recommended for future editorial workflows, but a new project's cost and user approval are required before creation. Do not reuse databases belonging to other user apps without explicit approval.

No secret API keys or service-role credentials belong in this repository.
