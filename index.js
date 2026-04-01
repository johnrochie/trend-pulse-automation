#!/usr/bin/env node
/**
 * Trend Pulse Automation — Single-file stateless pipeline
 *
 * Flow each run:
 *   1. Load processed-urls.json  (dedup state, committed to this repo)
 *   2. Fetch news from NewsAPI   (5 categories)
 *   3. Filter already-seen URLs
 *   4. Generate AI articles      (DeepSeek, in-memory)
 *   5. Fetch + merge + push      (automation-output.json in trend-pulse repo via GitHub API)
 *   6. Save updated processed-urls.json
 *
 * No database. No git CLI. No local file paths.
 */

'use strict';
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  newsapi: {
    key: process.env.NEWSAPI_KEY,
    baseUrl: 'https://newsapi.org/v2',
    categories: (process.env.CATEGORIES || 'technology,business,entertainment,science,health').split(',').map(s => s.trim()),
    pageSize: 20,
  },
  deepseek: {
    key: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    maxTokens: parseInt(process.env.MAX_TOKENS || '2500'),
    temperature: 0.7,
  },
  automation: {
    maxArticlesPerCycle: parseInt(process.env.MAX_ARTICLES_PER_CYCLE || '5'),
    maxStoredArticles: 100,   // Regular articles kept in automation-output.json
    maxProcessedUrls: 2000,   // URLs tracked for dedup (ring buffer)
  },
  github: {
    token: process.env.TREND_PULSE_TOKEN,
    repo: 'johnrochie/trend-pulse',
    outputFile: 'automation-output.json',
    apiBase: 'https://api.github.com',
  },
  stateFile: path.join(__dirname, 'processed-urls.json'),
};

// ─── Utilities ─────────────────────────────────────────────────────────────

function hashUrl(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/-$/, '');
}

function calcReadTime(content) {
  const words = (content || '').split(/\s+/).length;
  return `${Math.max(3, Math.ceil(words / 200))} min`;
}

function categoryColor(category) {
  const map = {
    technology:    'from-blue-600 to-cyan-600',
    business:      'from-green-600 to-emerald-600',
    entertainment: 'from-purple-600 to-pink-600',
    science:       'from-indigo-600 to-violet-600',
    health:        'from-teal-600 to-green-600',
  };
  return map[category] || 'from-gray-600 to-gray-700';
}

function defaultImage(category) {
  const map = {
    technology:    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&auto=format&fit=crop',
    business:      'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&auto=format&fit=crop',
    entertainment: 'https://images.unsplash.com/photo-1489599809516-9827b6d1cf13?w=800&auto=format&fit=crop',
    science:       'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop',
    health:        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&auto=format&fit=crop',
  };
  return map[category] || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── State: processed URLs ─────────────────────────────────────────────────

function loadProcessedUrls() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    return new Set(data.urls || []);
  } catch {
    return new Set();
  }
}

function saveProcessedUrls(urlSet) {
  // Trim to max size (keep most recently added)
  const urls = Array.from(urlSet).slice(-CONFIG.automation.maxProcessedUrls);
  fs.writeFileSync(
    CONFIG.stateFile,
    JSON.stringify({ urls, updatedAt: new Date().toISOString() }, null, 2)
  );
  console.log(`  💾 Saved ${urls.length} processed URLs to state file`);
}

// ─── Step 1: Fetch news ────────────────────────────────────────────────────

async function fetchCategory(category) {
  try {
    const res = await axios.get(`${CONFIG.newsapi.baseUrl}/top-headlines`, {
      params: {
        country: 'us',
        category,
        pageSize: CONFIG.newsapi.pageSize,
        apiKey: CONFIG.newsapi.key,
      },
    });
    if (res.data.status !== 'ok') throw new Error(res.data.message);
    console.log(`  ✅ ${category}: ${res.data.articles.length} articles`);
    return res.data.articles.map(a => ({ ...a, category }));
  } catch (err) {
    console.error(`  ❌ ${category}: ${err.message}`);
    return [];
  }
}

async function fetchNews(processedUrls) {
  console.log('\n📰 STEP 1: Fetching news');
  console.log(`  Categories: ${CONFIG.newsapi.categories.join(', ')}`);

  const candidates = [];

  for (const category of CONFIG.newsapi.categories) {
    const articles = await fetchCategory(category);
    for (const a of articles) {
      // Skip removed articles, duplicates, already-processed
      if (!a.url || !a.title || a.title === '[Removed]') continue;
      if (processedUrls.has(a.url)) continue;
      candidates.push(a);
    }
    await sleep(500); // brief pause between NewsAPI calls
  }

  console.log(`  → ${candidates.length} new unseen articles available`);
  return candidates;
}

// ─── Step 2: Generate AI articles ─────────────────────────────────────────

function buildPrompt(article) {
  const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return `Write a comprehensive news article based on this story:

HEADLINE: ${article.title}
SOURCE: ${article.source?.name || 'Unknown'}
CATEGORY: ${article.category}
DATE: ${date}
DESCRIPTION: ${article.description || article.content?.substring(0, 300) || 'No description provided'}

Write an 800–1,200 word article with these exact sections using markdown formatting:

## Introduction
A compelling 2–3 sentence overview explaining the story and why it matters right now.

## Key Facts
A bulleted list (use -) of 4–6 specific facts: names, numbers, dates, organisations involved.

## Analysis
3–4 paragraphs of original analysis covering: context, broader implications, and what this means for the industry or society. Be specific — cite real companies, people, and figures.

## What's Next
2–3 paragraphs on upcoming developments, key dates, decisions, or events to watch. Give readers a concrete reason to follow this story.

## Related Trends
2 paragraphs connecting this story to 2–3 broader trends in ${article.category}.

## Conclusion
A 2–3 sentence takeaway that summarises the core significance.

TAGS: [4–5 relevant comma-separated tags]

Rules:
- Use ## for section headings and ** for bold emphasis
- Be specific: include real names, figures, and dates
- Analytical, professional news tone
- Do not invent quotes or facts not present in the description
- Do not add an AI disclosure footer`;
}

async function generateArticle(rawArticle) {
  try {
    console.log(`  🤖 ${rawArticle.title.substring(0, 70)}...`);

    const res = await axios.post(
      `${CONFIG.deepseek.baseUrl}/v1/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior news writer and analyst. Write substantive, well-structured articles with original analysis. Use specific names, numbers, and facts. Never use vague filler language like "it is worth noting" or "this is significant because".',
          },
          { role: 'user', content: buildPrompt(rawArticle) },
        ],
        max_tokens: CONFIG.deepseek.maxTokens,
        temperature: CONFIG.deepseek.temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.deepseek.key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiContent = res.data.choices?.[0]?.message?.content?.trim();
    if (!aiContent) throw new Error('No content returned from DeepSeek');

    // Extract and clean tags
    const tagMatch = aiContent.match(/^TAGS?:?\s*(.+)$/im);
    const tags = tagMatch
      ? tagMatch[1].split(',').map(t => t.trim()).filter(Boolean).slice(0, 5)
      : [rawArticle.category, 'news', 'analysis'];

    // Remove the TAGS line from body content
    const cleanContent = aiContent.replace(/^TAGS?:.*$/im, '').trim();

    // Build excerpt from first real paragraph (skip headings)
    const firstPara = cleanContent
      .split('\n')
      .map(l => l.replace(/^#+\s*/, '').replace(/\*+/g, '').trim())
      .find(l => l.length > 60) || '';
    const excerpt = firstPara.substring(0, 200) + (firstPara.length > 200 ? '...' : '');

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      sourceId: `${rawArticle.category}_${hashUrl(rawArticle.url)}`,
      title: rawArticle.title,
      excerpt,
      content: cleanContent,
      url: rawArticle.url,
      imageUrl: rawArticle.urlToImage || defaultImage(rawArticle.category),
      sourceName: rawArticle.source?.name || 'Unknown',
      category: rawArticle.category,
      publishedAt: rawArticle.publishedAt || new Date().toISOString(),
      publishedAtSite: new Date().toISOString(),
      tags,
      readTime: calcReadTime(cleanContent),
      views: 0,
      trendingScore: 0,
      slug: makeSlug(rawArticle.title),
      color: categoryColor(rawArticle.category),
    };
  } catch (err) {
    console.error(`  ❌ Generation failed: ${err.message}`);
    return null;
  }
}

async function generateArticles(candidates) {
  console.log('\n🤖 STEP 2: Generating AI articles');
  const batch = candidates.slice(0, CONFIG.automation.maxArticlesPerCycle);
  console.log(`  Processing ${batch.length} of ${candidates.length} candidates`);

  const articles = [];
  for (const candidate of batch) {
    const article = await generateArticle(candidate);
    if (article) {
      articles.push(article);
      console.log(`  ✅ ${article.slug} (${article.readTime})`);
    }
    await sleep(2000); // avoid DeepSeek rate limits
  }

  console.log(`  → ${articles.length} articles generated`);
  return articles;
}

// ─── Step 3: Update automation-output.json via GitHub API ─────────────────

async function fetchCurrentOutput() {
  const url = `${CONFIG.github.apiBase}/repos/${CONFIG.github.repo}/contents/${CONFIG.github.outputFile}`;
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `token ${CONFIG.github.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const content = Buffer.from(res.data.content, 'base64').toString('utf8');
    const data = JSON.parse(content);
    return { articles: data.articles || [], sha: res.data.sha };
  } catch (err) {
    if (err.response?.status === 404) {
      console.log('  ⚠️  automation-output.json not found — will create it');
      return { articles: [], sha: null };
    }
    throw err;
  }
}

function mergeAndTrim(newArticles, existingArticles) {
  const seen = new Set();
  const merged = [];

  for (const a of [...newArticles, ...existingArticles]) {
    const key = a.id?.toString() || a.slug || a.title?.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(a);
    }
  }

  // Preserve all daily digests; trim regular articles to max
  const digests = merged.filter(
    a => a.type === 'daily-digest' || a.slug?.startsWith('daily-digest-')
  );
  const regular = merged
    .filter(a => a.type !== 'daily-digest' && !a.slug?.startsWith('daily-digest-'))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, CONFIG.automation.maxStoredArticles);

  return [...regular, ...digests];
}

async function pushToGitHub(articles, sha) {
  const payload = {
    articles,
    lastUpdated: new Date().toISOString(),
    count: articles.length,
    source: 'Trend Pulse Automation',
  };

  const body = {
    message: `Update articles: ${new Date().toISOString()}`,
    content: Buffer.from(JSON.stringify(payload, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha; // Required for updates; omit for initial create

  const url = `${CONFIG.github.apiBase}/repos/${CONFIG.github.repo}/contents/${CONFIG.github.outputFile}`;
  await axios.put(url, body, {
    headers: {
      Authorization: `token ${CONFIG.github.token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function updateGitHub(newArticles) {
  console.log('\n🚀 STEP 3: Pushing to GitHub');

  const { articles: existing, sha } = await fetchCurrentOutput();
  console.log(`  Existing: ${existing.length} articles`);

  const merged = mergeAndTrim(newArticles, existing);
  const regular = merged.filter(a => a.type !== 'daily-digest' && !a.slug?.startsWith('daily-digest-'));
  const digests = merged.filter(a => a.type === 'daily-digest' || a.slug?.startsWith('daily-digest-'));
  console.log(`  After merge: ${regular.length} articles + ${digests.length} digests`);

  await pushToGitHub(merged, sha);
  console.log('  ✅ Pushed → Vercel will redeploy automatically');

  return merged.length;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 TREND PULSE AUTOMATION');
  console.log(`📅 ${new Date().toUTCString()}`);
  console.log('═'.repeat(60));

  // Validate required environment variables
  const required = ['NEWSAPI_KEY', 'DEEPSEEK_API_KEY', 'TREND_PULSE_TOKEN'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('   Add these as GitHub Actions secrets (Settings → Secrets → Actions)');
    process.exit(1);
  }

  // Load dedup state
  const processedUrls = loadProcessedUrls();
  console.log(`\n📋 State: ${processedUrls.size} previously processed URLs`);

  // Step 1: Fetch news
  const candidates = await fetchNews(processedUrls);
  if (candidates.length === 0) {
    console.log('\n⚠️  No new articles found. All recent news already processed.');
    console.log('   This is normal — try again in 6 hours.');
    process.exit(0);
  }

  // Step 2: Generate articles
  const newArticles = await generateArticles(candidates);
  if (newArticles.length === 0) {
    console.log('\n⚠️  Article generation produced no results. Check DeepSeek API key/quota.');
    process.exit(1);
  }

  // Step 3: Push to GitHub
  const totalArticles = await updateGitHub(newArticles);

  // Save updated state — mark processed candidates as seen
  const processed = candidates.slice(0, CONFIG.automation.maxArticlesPerCycle);
  for (const c of processed) processedUrls.add(c.url);
  saveProcessedUrls(processedUrls);

  // Done
  console.log('\n' + '═'.repeat(60));
  console.log('✅ CYCLE COMPLETE');
  console.log(`   New articles generated : ${newArticles.length}`);
  console.log(`   Total articles in store: ${totalArticles}`);
  console.log(`   Processed URLs tracked : ${processedUrls.size}`);
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  if (err.response?.data) {
    console.error('   API response:', JSON.stringify(err.response.data, null, 2));
  }
  console.error(err.stack);
  process.exit(1);
});
