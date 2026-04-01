#!/bin/bash
# Daily Digest Runner - As per DAILY-DIGEST-AUTOMATION.md documentation
# This follows the recommended approach from the documentation

set -e

echo "🚀 DAILY DIGEST - DOCUMENTATION COMPLIANT VERSION"
echo "=================================================="
echo "Date: $(date)"
echo "Based on: DAILY-DIGEST-AUTOMATION.md"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check required files
REQUIRED_FILES=("generate-daily-digest-website.js" "merge-digest-into-articles.js" ".env")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Check API key
if ! grep -q "DEEPSEEK_API_KEY" .env; then
    echo "❌ DEEPSEEK_API_KEY not found in .env"
    exit 1
fi

echo "✅ All prerequisites checked"
echo ""

# Step 1: Generate daily digest using website-compatible script
echo "📝 STEP 1: GENERATING DAILY DIGEST (Website format)"
echo "--------------------------------------------------"
TODAY=$(date +%Y-%m-%d)
DIGEST_FILE="/tmp/daily-digest-$TODAY.json"

# Set environment variables as per documentation
export DEEPSEEK_API_KEY=$(grep DEEPSEEK_API_KEY .env | cut -d= -f2)
export ARTICLES_URL="https://raw.githubusercontent.com/johnrochie/trend-pulse/main/automation-output.json"

echo "Using articles from: $ARTICLES_URL"
echo "Output file: $DIGEST_FILE"

node generate-daily-digest-website.js \
  --output "$DIGEST_FILE"

if [ ! -f "$DIGEST_FILE" ]; then
    echo "❌ Failed to generate digest"
    exit 1
fi

echo "✅ Digest generated: $(jq -r '.title' "$DIGEST_FILE" 2>/dev/null || echo 'Unknown title')"
echo ""

# Step 2: Merge digest into local articles.json
echo "🔄 STEP 2: MERGING DIGEST INTO ARTICLES"
echo "---------------------------------------"
LOCAL_ARTICLES="output/articles.json"
BACKUP_ARTICLES="output/articles.json.backup.$(date +%Y%m%d_%H%M%S)"

if [ ! -f "$LOCAL_ARTICLES" ]; then
    echo "❌ Local articles.json not found: $LOCAL_ARTICLES"
    exit 1
fi

# Backup current articles
cp "$LOCAL_ARTICLES" "$BACKUP_ARTICLES"
echo "📦 Backup created: $BACKUP_ARTICLES"

# Merge digest
echo "Merging digest into articles..."
cat "$LOCAL_ARTICLES" | node merge-digest-into-articles.js "$DIGEST_FILE" > output/articles-merged.json

# Check if merge was successful
if [ ! -f "output/articles-merged.json" ]; then
    echo "❌ Merge failed - no output file"
    exit 1
fi

# Replace with merged version
mv output/articles-merged.json "$LOCAL_ARTICLES"
echo "✅ Digest merged into $LOCAL_ARTICLES"

# Also save to daily-digests directory
mkdir -p output/daily-digests
cp "$DIGEST_FILE" "output/daily-digests/daily-digest-$TODAY.json"
echo "✅ Saved to output/daily-digests/daily-digest-$TODAY.json"
echo ""

# Step 3: Update GitHub (as per documentation - automation is single writer)
echo "📤 STEP 3: UPDATING GITHUB (Single Writer)"
echo "------------------------------------------"
if grep -q "GITHUB_REPO_PATH" .env; then
    echo "Running GitHub update..."
    node index.js github
    echo "✅ GitHub update completed"
    
    # Verify the update
    GITHUB_REPO_PATH=$(grep GITHUB_REPO_PATH .env | cut -d= -f2)
    if [ -d "$GITHUB_REPO_PATH" ]; then
        echo "📊 GitHub repo path: $GITHUB_REPO_PATH"
        echo "📄 Updated file: automation-output.json"
    fi
else
    echo "⚠️ GitHub update not configured (no GITHUB_REPO_PATH in .env)"
    echo "To enable, add to .env:"
    echo "GITHUB_REPO_PATH=/path/to/trend-pulse"
    echo "GIT_USER=your-username"
    echo "GIT_EMAIL=your-email"
fi

echo ""
echo "=========================================="
echo "🎉 DAILY DIGEST COMPLETE (Documentation Compliant)"
echo "=========================================="
echo ""
echo "📋 SUMMARY:"
echo "• Generated: daily-digest-$TODAY.json"
echo "• Merged into: output/articles.json"
echo "• GitHub: Updated (if configured)"
echo "• Backup: $BACKUP_ARTICLES"
echo ""
echo "📚 Documentation followed:"
echo "• ARTICLES-DATA-SOURCE.md"
echo "• DAILY-DIGEST-AUTOMATION.md"
echo ""
echo "🚀 Next digest: Tomorrow at 18:00 UTC"
echo ""