# Daily Digest Automation

This guide covers the full daily digest flow: generation, publishing, newsletter, and social sharing.

**Architecture (Option 4):** `trend-pulse-automation` is the single writer. It generates both articles and daily digests, then pushes to GitHub. The website only reads.

## Overview

| Step | When | What |
|------|------|------|
| 1. Generate + publish | 6:00 PM GMT | `trend-pulse-automation` generates digest, merges into `automation-output.json`, pushes to GitHub |
| 2. Site update | ~2 min after push | Vercel redeploys; new digest appears on site |
| 3. Newsletter | 6:05 PM GMT | Vercel cron sends digest to subscribers via Resend Broadcast |
| 4. Social (optional) | When you connect | IFTTT/Zapier watches RSS and posts to Twitter, Facebook, Instagram |

## Setup

### 1. Integrate digest into trend-pulse-automation (recommended)

1. Copy `scripts/generate-daily-digest.js` and `scripts/merge-digest-into-articles.js` from this repo into `trend-pulse-automation`.
2. Add a daily cron (6 PM GMT) that:
   - Runs `node generate-daily-digest.js --output /tmp/digest.json` (set `ARTICLES_URL` to local path or GitHub raw URL)
   - Merges: `node merge-digest-into-articles.js /tmp/digest.json path/to/automation-output.json > path/to/merged.json` then replace the original
   - Uses your existing publish step to push to GitHub
3. Ensure `DEEPSEEK_API_KEY` is in the automation `.env`.

See `DAILY-DIGEST-SPEC.md` for the output format.

**Alternative:** Use the GitHub Actions workflow below as a fallback if the automation server is down.

### 2. GitHub Actions (optional fallback)

Add **`DEEPSEEK_API_KEY`** as a repository secret. The workflow runs at 6 PM GMT. Once digest runs in `trend-pulse-automation`, disable this workflow in GitHub → Actions → Daily Digest.

### 3. Resend (newsletter)

1. Go to [resend.com](https://resend.com) and create an Audience (or Segment).
2. Get the **Audience ID** and **Segment ID** from the Resend dashboard.
3. Add these to your Vercel project environment variables:

   - **`RESEND_AUDIENCE_ID`** – Used when subscribers sign up (adds contact to list)
   - **`RESEND_SEGMENT_ID`** – Used when sending the daily digest broadcast
   - **`RESEND_API_KEY`** – Your Resend API key
   - **`RESEND_FROM`** – Sender email (e.g. `Trend Pulse <news@yourdomain.com>`)
   - **`CRON_SECRET`** – Random secret (16+ chars) to protect the cron endpoint

Vercel sends `Authorization: Bearer CRON_SECRET` when calling the cron route. Create a strong random value for `CRON_SECRET`.

### 4. Social sharing (no API cost)

Use **IFTTT** or **Zapier** (free tiers) to auto-post when a new digest is published:

1. **RSS feed for daily digests:**  
   `https://www.trendpulse.life/feed/daily-digest.xml`

2. **IFTTT**  
   - Create Applet: **If** "RSS Feed" → "New feed item" → paste feed URL  
   - **Then** "Twitter" → "Post a tweet" (or Facebook/Instagram)

3. **Zapier**  
   - Trigger: RSS by Zapier → New Item in Feed  
   - Action: Twitter / Facebook / etc. → Create Post

The digest RSS feed updates when a new digest is published. These tools poll the feed and post the new item—no paid social APIs needed.

## Share links in the newsletter

The newsletter includes pre-filled share links (Twitter, Facebook, LinkedIn). Recipients click to share on their own accounts.

## URLs

- **Site:** `https://www.trendpulse.life`
- **Daily digest archive:** `/daily-digest`
- **Digest RSS:** `/feed/daily-digest.xml`
- **Main site RSS:** `/feed.xml`
