#!/bin/bash

echo "📰 Setting up Daily Digest Cron Job (Simple)"
echo "============================================"

# Get the absolute path to this directory
AUTOMATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_LOG="$AUTOMATION_DIR/daily-digest.log"

echo "📁 Automation directory: $AUTOMATION_DIR"
echo "📝 Log file: $CRON_LOG"

# Create the cron job command
CRON_COMMAND="cd $AUTOMATION_DIR && node index.js digest >> $CRON_LOG 2>&1"
CRON_SCHEDULE="0 18 * * *"  # Daily at 18:00 UTC
CRON_JOB="$CRON_SCHEDULE $CRON_COMMAND"

echo ""
echo "📋 Configuration:"
echo "   Schedule: $CRON_SCHEDULE (Daily at 18:00 UTC)"
echo "   Command: $CRON_COMMAND"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$CRON_COMMAND"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    (crontab -l 2>/dev/null | grep -v "$CRON_COMMAND") | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Daily Digest cron job added successfully!"
    echo ""
    echo "📊 Next steps:"
    echo "1. The digest will run at 18:00 UTC daily (starting tomorrow)"
    echo "2. Check logs: tail -f $CRON_LOG"
    echo "3. Test manually: cd $AUTOMATION_DIR && node index.js digest"
    echo "4. View output: ls -la $AUTOMATION_DIR/output/daily-digests/"
    echo ""
    echo "🎯 Daily Digest will:"
    echo "   • Summarize top 5 articles from last 24 hours"
    echo "   • Generate AI analysis (or fallback template)"
    echo "   • Create social media posts"
    echo "   • Update website articles.json"
    echo "   • Feature digest on homepage"
    echo ""
    echo "🚀 Ready for daily publication!"
else
    echo "❌ Failed to add cron job."
    exit 1
fi

# Show current crontab
echo "📋 Current crontab (digest jobs only):"
crontab -l 2>/dev/null | grep -A2 -B2 "digest"