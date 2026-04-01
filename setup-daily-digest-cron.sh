#!/bin/bash

echo "📰 Setting up Daily Digest Cron Job"
echo "==================================="

# Get the absolute path to this directory
AUTOMATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_LOG="$AUTOMATION_DIR/daily-digest.log"

echo "📁 Automation directory: $AUTOMATION_DIR"
echo "📝 Log file: $CRON_LOG"

# Create the cron job command
CRON_COMMAND="cd $AUTOMATION_DIR && ./run-daily-digest-integration.sh >> $CRON_LOG 2>&1"

echo ""
echo "📅 Daily Digest Schedule:"
echo "Recommended: 18:00 UTC (6 PM) - After Trend Research completes"
echo ""

read -p "Enter cron schedule (default: 0 18 * * *): " cron_schedule
cron_schedule=${cron_schedule:-"0 18 * * *"}

echo ""
echo "📋 Configuration Summary:"
echo "   Schedule: $cron_schedule"
echo "   Command: $CRON_COMMAND"
echo "   Log file: $CRON_LOG"
echo ""

read -p "Proceed with setup? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled."
    exit 1
fi

echo "⏳ Setting up cron job..."

# Check if cron job already exists
CRON_JOB="$cron_schedule $CRON_COMMAND"
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
    echo "1. The digest will run at 18:00 UTC daily"
    echo "2. Check logs: tail -f $CRON_LOG"
    echo "3. Test manually: cd $AUTOMATION_DIR && ./run-daily-digest-integration.sh"
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
echo "📋 Current crontab:"
crontab -l 2>/dev/null | grep -A2 -B2 "digest"