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
