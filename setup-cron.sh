#!/bin/bash

echo "⏰ Setting up Trend Pulse Automation Cron Job"
echo "============================================="

# Get the absolute path to this directory
AUTOMATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_LOG="$AUTOMATION_DIR/automation.log"

echo "📁 Automation directory: $AUTOMATION_DIR"
echo "📝 Log file: $CRON_LOG"

# Create the cron job command
CRON_COMMAND="cd $AUTOMATION_DIR && node index.js full >> $CRON_LOG 2>&1"

echo ""
echo "📅 Available cron schedules:"
echo "1. Every 6 hours: 0 */6 * * *"
echo "2. Every 4 hours: 0 */4 * * *"
echo "3. Every 2 hours: 0 */2 * * *"
echo "4. Every hour: 0 * * * *"
echo "5. Custom schedule"
echo ""

read -p "Choose schedule (1-5): " schedule_choice

case $schedule_choice in
    1)
        CRON_SCHEDULE="0 */6 * * *"
        echo "✅ Selected: Every 6 hours"
        ;;
    2)
        CRON_SCHEDULE="0 */4 * * *"
        echo "✅ Selected: Every 4 hours"
        ;;
    3)
        CRON_SCHEDULE="0 */2 * * *"
        echo "✅ Selected: Every 2 hours"
        ;;
    4)
        CRON_SCHEDULE="0 * * * *"
        echo "✅ Selected: Every hour"
        ;;
    5)
        read -p "Enter custom cron schedule (e.g., '0 */6 * * *'): " custom_schedule
        CRON_SCHEDULE="$custom_schedule"
        echo "✅ Selected: Custom schedule $CRON_SCHEDULE"
        ;;
    *)
        echo "❌ Invalid choice. Using default: Every 6 hours"
        CRON_SCHEDULE="0 */6 * * *"
        ;;
esac

# Create the full cron line
CRON_LINE="$CRON_SCHEDULE $CRON_COMMAND"

echo ""
echo "📋 Cron job to be added:"
echo "$CRON_LINE"
echo ""

read -p "Add this cron job? (y/n): " confirm_add

if [[ $confirm_add == "y" || $confirm_add == "Y" ]]; then
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "$AUTOMATION_DIR"; then
        echo "⚠️  Cron job for this directory already exists. Removing old entry..."
        (crontab -l 2>/dev/null | grep -v "$AUTOMATION_DIR") | crontab -
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ Cron job added successfully!"
        echo ""
        echo "📊 Current cron jobs:"
        crontab -l
    else
        echo "❌ Failed to add cron job"
        exit 1
    fi
else
    echo "❌ Cron job not added"
    echo ""
    echo "💡 You can manually add it later with:"
    echo "crontab -e"
    echo "Then add this line:"
    echo "$CRON_LINE"
fi

echo ""
echo "🎯 MANUAL TESTING:"
echo "To test the automation manually:"
echo "1. Run full cycle: cd $AUTOMATION_DIR && node index.js full"
echo "2. Run fetch only: cd $AUTOMATION_DIR && node index.js fetch"
echo "3. Run generate only: cd $AUTOMATION_DIR && node index.js generate"
echo "4. Run publish only: cd $AUTOMATION_DIR && node index.js publish"
echo "5. Check stats: cd $AUTOMATION_DIR && node index.js stats"
echo ""
echo "📁 OUTPUT FILES:"
echo "Articles will be saved to: $AUTOMATION_DIR/output/articles.json"
echo "Individual articles: $AUTOMATION_DIR/output/articles/"
echo "API endpoint: $AUTOMATION_DIR/output/api/articles.json"
echo "Log file: $CRON_LOG"
echo ""
echo "🔧 INTEGRATION WITH TREND PULSE SITE:"
echo "The Trend Pulse site needs to read from: $AUTOMATION_DIR/output/articles.json"
echo "You can either:"
echo "1. Copy the file to the site's public directory"
echo "2. Set up a symlink"
echo "3. Modify the site to fetch from the API endpoint"
echo ""
echo "✅ Setup complete!"