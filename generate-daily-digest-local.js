#!/usr/bin/env node
/**
 * Daily Digest Generator for Trend Pulse Automation (Local Version)
 * Modified to work with local automation system
 * Based on trend-pulse/scripts/generate-daily-digest.js
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const ARTICLES_URL = process.env.ARTICLES_URL || 'file://' + path.join(__dirname, 'output', 'articles.json');
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
  console.log(`📥 Fetching articles from: ${url}`);
  
  if (url.startsWith('file://')) {
    const filePath = url.replace('file://', '');
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } else {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch articles: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}

function pickTopArticles(data) {
  // Get articles array from data structure
  const articles = data.articles || data;
  
  // Sort by date (newest first) and take top 10
  return articles
    .filter(a => a.type !== 'daily-digest') // Exclude existing digests
    .sort((a, b) => new Date(b.publishedAt || b.published_at_site || 0) - new Date(a.publishedAt || a.published_at_site || 0))
    .slice(0, 10);
}

function buildPrompt(articles, dateStr, datePretty) {
  const articleSummaries = articles.map((a, i) => 
    `${i + 1}. ${a.title}\n   ${a.excerpt || a.content?.substring(0, 200) || 'No excerpt'}`
  ).join('\n\n');

  return `You are a news editor creating a daily digest for Trend Pulse (trendpulse.life).

Today's date: ${datePretty}

Here are today's top news stories:

${articleSummaries}

Please create a daily digest with these sections:

**DAILY DIGEST:** [Date] - Brief introduction

🔥 **TOP STORY:** [Most important story with 2-3 bullet points]

📈 **MARKET MOVERS:** [Financial/business updates]

💡 **TECH SPOTLIGHT:** [Technology news]

🌍 **GLOBAL WATCH:** [International news]

🔮 **TOMORROW'S OUTLOOK:** [What to watch for tomorrow]

📖 **READ THE FULL ARTICLES:** [List of article titles]

Make it engaging, professional, and concise (about 500-700 words total).
Use bullet points (•) for key takeaways.
Include emojis for visual appeal.`;
}

async function callDeepSeek(prompt, apiKey) {
  const response = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional news editor creating engaging daily digests.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function buildDigestArticle(content, dateStr, datePretty, topArticle) {
  const digestId = 1000 + Math.floor(Math.random() * 1000);
  
  return {
    id: digestId,
    title: `Daily Digest: ${datePretty} - Top Stories Summary`,
    excerpt: `Your AI-powered summary of today's top stories across tech, business, and markets.`,
    content: content,
    category: "General",
    readTime: "5 min",
    views: 0,
    trendingScore: 90,
    tags: ["Daily Digest", "AI Summary", "News"],
    publishedAt: new Date().toISOString(),
    publishedAtSite: new Date().toISOString(),
    color: "from-purple-600 to-pink-600",
    url: `https://www.trendpulse.life/daily-digest/${dateStr}`,
    imageUrl: "",
    sourceName: "Trend Pulse AI",
    slug: `daily-digest-${dateStr}`,
    type: "daily-digest"
  };
}

async function main() {
  const opts = parseArgs();
  const date = getDate(opts);
  const dateStr = formatDate(date);
  const datePretty = formatDatePretty(date);

  const articlesUrl = opts.articlesUrl || ARTICLES_URL;
  console.log(`📥 Fetching articles from ${articlesUrl}...`);

  const articlesData = await fetchArticles(articlesUrl);
  const topArticles = pickTopArticles(articlesData);

  if (topArticles.length === 0) {
    throw new Error('No articles available to generate digest');
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is required. Set it in .env or environment.'
    );
  }

  console.log(`🤖 Generating digest for ${datePretty} from ${topArticles.length} articles...`);

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
    await fs.writeFile(opts.output, output);
    console.log(`✅ Wrote digest to ${opts.output}`);
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
