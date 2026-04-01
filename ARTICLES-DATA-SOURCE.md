# Where Articles Come From

This document clarifies how Trend Pulse gets its articles and daily digests.

## Summary

| What | Where it runs | What it does |
|------|---------------|--------------|
| **Article storage** | GitHub (`automation-output.json`) | Single source of truth; all articles live here |
| **Website** | Vercel (trendpulse.life) | Reads from GitHub via `/api/articles`; no local storage |
| **Article creation + Daily digest** | `trend-pulse-automation` (separate repo) | **Single writer** – articles and digest, pushes to GitHub |

---

## Flow

```
[NewsAPI + DeepSeek]  →  trend-pulse-automation  →  Pushes to GitHub  →  trend-pulse (Vercel) reads
       (articles + daily digest at 6 PM GMT)              (single writer)
```

## 1. Regular news articles

- **Produced by:** `trend-pulse-automation` (separate repository)
- **Where it runs:** Typically a cron job on a server (e.g. every 6 hours), or a local machine
- **Steps:**
  1. Fetch news from NewsAPI
  2. Generate full articles with DeepSeek
  3. Merge with existing articles
  4. Push `automation-output.json` to the `trend-pulse` GitHub repo

- **Config:** Automation uses its own `.env` (e.g. `NEWSAPI_KEY`, `DEEPSEEK_API_KEY`, `GITHUB_*`).

## 2. Daily digests

- **Produced by:** `trend-pulse-automation` (same repo as articles)
- **Where it runs:** Same server/machine, on a daily cron (e.g. 6 PM GMT)
- **Steps:**
  1. Run digest script (copy `scripts/generate-daily-digest.js` and `scripts/merge-digest-into-articles.js` from this repo)
  2. Merge digest into articles output
  3. Push to GitHub (or include in existing publish step)

- **Config:** Same `.env` as articles (`DEEPSEEK_API_KEY`).

## 3. How the website gets articles

- **Source:** `automation-output.json` in the `trend-pulse` GitHub repo
- **Fetch path:** `lib/articles-api.ts` → GitHub raw URL  
  `https://raw.githubusercontent.com/johnrochie/trend-pulse/main/automation-output.json`
- **Usage:** `/api/articles` route in this Next.js app calls `fetchArticles()`, which uses that URL
- **Fallback:** If GitHub fails, mock articles are used

The Vercel site does not run the automation or digest generation; it only reads the JSON file from GitHub.

## 4. Local development

- In dev, the site still uses the GitHub raw URL (or mock data if offline)
- To point at local automation output, you can override `ARTICLES_URL` when running scripts
- The site itself has no dependency on a local `trend-pulse-automation` instance

## Quick reference

| Question | Answer |
|----------|--------|
| Is there an API on the site? | Yes – `/api/articles` fetches from GitHub and serves the data |
| Are articles stored in a database? | No – only in `automation-output.json` in GitHub |
| Where does all content come from? | `trend-pulse-automation` – articles and daily digest are produced there, pushed to GitHub |

## GitHub Actions (optional fallback)

The `.github/workflows/daily-digest.yml` workflow in this repo can run the digest if `trend-pulse-automation` is unavailable. Once digest generation is integrated into `trend-pulse-automation`, you can disable that workflow in GitHub → Actions → Daily Digest → Disable workflow.
