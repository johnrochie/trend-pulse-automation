#!/bin/bash
# Daily Digest Integration Script
# This script integrates the new daily digest system into trend-pulse-automation
# Based on ARTICLES-DATA-SOURCE.md and DAILY-DIGEST-AUTOMATION.md

set -e

echo "📋 DAILY DIGEST INTEGRATION SETUP"
echo "=================================="

# Check if we have the new scripts
if [ ! -f "../trend-pulse/scripts/generate-daily-digest.js" ]; then
    echo "❌ Error: trend-pulse/scripts/generate-daily-digest.js not found"
    echo "Please make sure trend-pulse repository is cloned"
    exit 1
fi

if [ ! -f "merge-digest-into-articles.js" ]; then
    echo "❌ Error: merge-digest-into-articles.js not found in automation directory"
    echo "Please copy it from trend-pulse/scripts/"
    exit 1
fi

echo ""
echo "✅ Prerequisites checked"
echo ""

# Create updated generate-daily-digest.js that works with local automation
echo "🔄 Creating updated digest script for local automation..."
cat > generate-daily-digest-local.js << 'EOF'
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
EOF

echo "✅ Created generate-daily-digest-local.js"
echo ""

# Make it executable
chmod +x generate-daily-digest-local.js

# Create integration script
echo "🔄 Creating daily digest integration script..."
cat > run-daily-digest-integration.sh << 'EOF'
#!/bin/bash
# Daily Digest Integration Runner
# Run this from cron at 18:00 UTC daily

set -e

echo "🚀 DAILY DIGEST INTEGRATION - $(date)"
echo "====================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Generate daily digest
echo ""
echo "📝 STEP 1: Generating daily digest..."
node generate-daily-digest-local.js \
  --articles-url "file://$SCRIPT_DIR/output/articles.json" \
  --output "/tmp/daily-digest-$(date +%Y-%m-%d).json"

# Step 2: Merge into articles
echo ""
echo "🔄 STEP 2: Merging digest into articles..."
if [ -f "/tmp/daily-digest-$(date +%Y-%m-%d).json" ]; then
  # Backup current articles
  cp output/articles.json output/articles.json.backup
  
  # Merge digest
  cat output/articles.json | node merge-digest-into-articles.js "/tmp/daily-digest-$(date +%Y-%m-%d).json" > output/articles-merged.json
  
  # Replace with merged version
  mv output/articles-merged.json output/articles.json
  
  echo "✅ Digest merged into articles.json"
  
  # Also save to daily-digests directory
  mkdir -p output/daily-digests
  cp "/tmp/daily-digest-$(date +%Y-%m-%d).json" "output/daily-digests/daily-digest-$(date +%Y-%m-%d).json"
  echo "✅ Saved to output/daily-digests/daily-digest-$(date +%Y-%m-%d).json"
else
  echo "❌ No digest file generated"
  exit 1
fi

# Step 3: Update GitHub (if configured)
echo ""
echo "📤 STEP 3: Updating GitHub..."
if [ -f ".env" ] && grep -q "GITHUB_REPO_PATH" .env; then
  echo "Running GitHub update..."
  node index.js github
  echo "✅ GitHub updated"
else
  echo "⚠️  GitHub update not configured (no GITHUB_REPO_PATH in .env)"
  echo "To enable GitHub updates, add to .env:"
  echo "GITHUB_REPO_PATH=/path/to/trend-pulse"
  echo "GIT_USER=your-username"
  echo "GIT_EMAIL=your-email"
fi

echo ""
echo "🎉 DAILY DIGEST INTEGRATION COMPLETE!"
echo "Digest available at: output/daily-digests/daily-digest-$(date +%Y-%m-%d).json"
echo "Merged into: output/articles.json"
EOF

chmod +x run-daily-digest-integration.sh

echo "✅ Created run-daily-digest-integration.sh"
echo ""

# Update cron setup
echo "🔄 Updating cron setup..."
if [ -f "setup-daily-digest-cron.sh" ]; then
  # Update existing cron setup
  sed -i 's|node index.js digest|./run-daily-digest-integration.sh|g' setup-daily-digest-cron.sh
  echo "✅ Updated setup-daily-digest-cron.sh"
else
  echo "⚠️  setup-daily-digest-cron.sh not found, creating new one..."
  cat > setup-daily-digest-cron-simple.sh << 'EOF'
#!/bin/bash
# Setup Daily Digest Cron Job

AUTOMATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_LOG="$AUTOMATION_DIR/daily-digest.log"

echo "📁 Automation directory: $AUTOMATION_DIR"
echo "📝 Log file: $CRON_LOG"

# Create the cron job command
CRON_COMMAND="cd $AUTOMATION_DIR && ./run-daily-digest-integration.sh >> $CRON_LOG 2>&1"

echo ""
echo "⏰ Proposed cron job (runs at 18:00 UTC / 6 PM GMT):"
echo "0 18 * * * $CRON_COMMAND"
echo ""
echo "To install, run:"
echo "crontab -e"
echo ""
echo "Then add this line:"
echo "0 18 * * * $CRON_COMMAND"
echo ""
echo "Or run this one-liner:"
echo "(crontab -l 2>/dev/null; echo \"0 18 * * * $CRON_COMMAND\") | crontab -"
EOF
  chmod +x setup-daily-digest-cron-simple.sh
  echo "✅ Created setup-daily-digest-cron-simple.sh"
fi

echo ""
echo "========================================"
echo "🎉 DAILY DIGEST INTEGRATION SETUP COMPLETE"
echo "========================================"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Test the integration:"
echo "   ./run-daily-digest-integration.sh"
echo ""
echo "2. Check the output:"
echo "   ls -la output/daily-digests/"
echo "   ls -la output/articles.json"
echo ""
echo "3. Update cron job (if needed):"
echo "   ./setup-daily-digest-cron-simple.sh"
echo ""
echo "4. Verify GitHub update works:"
echo "   Check .env has GITHUB_REPO_PATH configured"
echo ""
echo "📚 Documentation:"
echo "   - ARTICLES-DATA-SOURCE.md"
echo "   - DAILY-DIGEST-AUTOMATION.md"
echo ""