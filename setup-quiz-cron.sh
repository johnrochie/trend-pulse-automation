#!/bin/bash

# Weekly Quiz Cron Setup Script
# Sets up automatic quiz generation every Thursday at 9:00 AM

echo "🎯 Setting up Weekly Quiz Automation"
echo "==================================="
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if script exists
SCRIPT_PATH="$HOME/.openclaw/workspace/trend-pulse-automation/weekly-quiz-automation.js"
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Quiz automation script not found at: $SCRIPT_PATH"
    exit 1
fi

echo "✅ Found quiz automation script: $SCRIPT_PATH"

# Create log directory
LOG_DIR="$HOME/.openclaw/workspace/trend-pulse-automation/logs"
mkdir -p "$LOG_DIR"
echo "✅ Created log directory: $LOG_DIR"

# Create cron job entry
CRON_JOB="0 9 * * 4 cd $HOME/.openclaw/workspace/trend-pulse-automation && node weekly-quiz-automation.js >> $LOG_DIR/quiz-$(date +\%Y-\%m-\%d).log 2>&1"

echo ""
echo "📅 Proposed Cron Job:"
echo "-------------------"
echo "$CRON_JOB"
echo ""

echo "📋 This will run:"
echo "   • Every Thursday at 9:00 AM"
echo "   • Generate 20 questions based on week's articles"
echo "   • Update the website quiz"
echo "   • Commit and push to GitHub"
echo ""

# Ask for confirmation
read -p "Do you want to add this cron job? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add to crontab
    (crontab -l 2>/dev/null; echo "# Trend Pulse Weekly Quiz - Runs every Thursday at 9:00 AM"; echo "$CRON_JOB") | crontab -
    
    echo ""
    echo "✅ Cron job added successfully!"
    echo ""
    echo "📊 To verify:"
    echo "   crontab -l"
    echo ""
    echo "📝 To remove:"
    echo "   crontab -e"
    echo "   (then delete the Trend Pulse lines)"
    echo ""
    echo "📁 Logs will be saved to:"
    echo "   $LOG_DIR/quiz-YYYY-MM-DD.log"
    echo ""
    echo "🚀 Next quiz will run: Next Thursday at 9:00 AM"
else
    echo ""
    echo "⚠️  Cron job not added."
    echo "You can manually run the quiz generator with:"
    echo "   cd ~/.openclaw/workspace/trend-pulse-automation"
    echo "   node weekly-quiz-automation.js"
fi

echo ""
echo "🎯 Manual Test:"
echo "--------------"
echo "To test the quiz generator manually:"
echo "1. cd ~/.openclaw/workspace/trend-pulse-automation"
echo "2. node weekly-quiz-automation.js"
echo ""
echo "This will generate a quiz if today is Thursday,"
echo "or show when the next quiz will be generated."