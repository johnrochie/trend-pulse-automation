#!/usr/bin/env node
/**
 * Generate Daily Digest for Trend Pulse
 *
 * Fetches top articles from automation-output.json, uses DeepSeek to create
 * an AI-powered daily summary, outputs a digest article in the format
 * required by DAILY-DIGEST-SPEC.md.
 *
 * Usage:
 *   node scripts/generate-daily-digest.js
 *   node scripts/generate-daily-digest.js --date 2026-03-06
 *   node scripts/generate-daily-digest.js --articles-url ./automation-output.json
 *
 * Env: DEEPSEEK_API_KEY (required for AI generation)
 */

const ARTICLES_URL =
  process.env.ARTICLES_URL ||
  'https://raw.githubusercontent.com/johnrochie/trend-pulse/main/automation-output.json';
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { date: null, articlesUrl: null, output: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) opts.date = args[++i];
    else if (args[i] === '--articles-url' && args[i + 1])
      opts.articlesUrl = args[++i];
    else if (args[i] === '--output' && args[i + 1]) opts.output = args[++i];
  }
  return opts;
}

function getDate(opts) {
  if (opts.date) {
    const d = new Date(opts.date);
    if (isNaN(d.getTime())) throw new Error(`Invalid date: ${opts.date}`);
    return d;
  }
  return new Date();
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatDatePretty(d) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function fetchArticles(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.articles || [];
  return list.filter((a) => a.type !== 'daily-digest');
}

function pickTopArticles(articles, limit = 10) {
  return articles
    .filter((a) => !a.slug?.startsWith('daily-digest-'))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, limit);
}

function buildPrompt(articles, dateStr, datePretty) {
  const summaries = articles.map(
    (a, i) =>
      `${i + 1}. [${a.category}] ${a.title}\n   ${(a.excerpt || '').slice(0, 200)}...`
  );

  return `You are a professional news editor creating a daily digest for Trend Pulse. Create an AI-powered summary of the top stories for ${datePretty}.

Here are today's top articles (title + excerpt):

${summaries.join('\n\n')}

Write a digest in the following EXACT format. Use the markers exactly as shown. Keep each section concise (2-4 sentences). Include 3-5 bullet points with • for Today's Highlights.

**DAILY DIGEST:** ${datePretty}

🔥 **TOP STORY:**
[Summarize the single most important/impactful story in 2-4 sentences]

• [Key highlight 1]
• [Key highlight 2]
• [Key highlight 3]

📈 **MARKET MOVERS:**
[Brief summary of any business/finance/market news from the articles - 2-3 sentences. If none, write "Markets had a quiet day with no major moves reported."]

💡 **TECH SPOTLIGHT:**
[Summarize the main technology stories - 2-3 sentences]

🌍 **GLOBAL WATCH:**
[Summarize international/global stories - 2-3 sentences. If none, write a brief note on global context from the stories.]

🔮 **TOMORROW'S OUTLOOK:**
[1-2 sentences on what to watch next or expected developments]

📖 **READ THE FULL ARTICLES:**
- ${articles.map((a) => a.title).join('\n- ')}`;
}

async function callDeepSeek(prompt, apiKey) {
  const res = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional news editor. Output only the digest content, no extra commentary. Use the exact section markers provided.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No content in DeepSeek response');
  return content;
}

function buildDigestArticle(content, dateStr, datePretty, topArticle) {
  const lines = content.split('\n').filter((l) => l.trim());
  const bulletLines = lines.filter(
    (l) => l.trim().startsWith('•') || l.trim().startsWith('-')
  );
  const excerpt =
    bulletLines.length > 0
      ? bulletLines.slice(0, 2).join(' ').replace(/^[•\-]\s*/, '').trim()
      : 'Your AI-powered summary of today\'s top stories across tech, business, and markets.';

  const id = 900000 + parseInt(dateStr.replace(/-/g, '').slice(0, 8), 10);

  return {
    id,
    title: `Daily Digest: ${datePretty} - Top Stories Summary`,
    excerpt: excerpt.slice(0, 200) + (excerpt.length > 200 ? '...' : ''),
    content,
    category: 'General',
    readTime: '5 min',
    views: 0,
    trendingScore: 90,
    tags: ['Daily Digest', 'AI Summary', 'News'],
    publishedAt: `${dateStr}T18:00:00.000Z`,
    publishedAtSite: `${dateStr}T18:00:00.000Z`,
    color: 'from-purple-600 to-pink-600',
    url: `https://www.trendpulse.life/daily-digest/${dateStr}`,
    imageUrl: topArticle?.imageUrl || '',
    sourceName: 'Trend Pulse AI',
    slug: `daily-digest-${dateStr}`,
    type: 'daily-digest',
  };
}

async function main() {
  const opts = parseArgs();
  const date = getDate(opts);
  const dateStr = formatDate(date);
  const datePretty = formatDatePretty(date);

  const articlesUrl = opts.articlesUrl || ARTICLES_URL;
  console.error(`Fetching articles from ${articlesUrl}...`);

  const articles = await fetchArticles(articlesUrl);
  const topArticles = pickTopArticles(articles);

  if (topArticles.length === 0) {
    throw new Error('No articles available to generate digest');
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is required. Set it in .env or environment.'
    );
  }

  console.error(`Generating digest for ${datePretty} from ${topArticles.length} articles...`);

  const prompt = buildPrompt(topArticles, dateStr, datePretty);
  const content = await callDeepSeek(prompt, apiKey);
  const digest = buildDigestArticle(
    content,
    dateStr,
    datePretty,
    topArticles[0]
  );

  const output = JSON.stringify(digest, null, 2);

  if (opts.output) {
    const fs = await import('fs');
    fs.writeFileSync(opts.output, output);
    console.error(`Wrote digest to ${opts.output}`);
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
