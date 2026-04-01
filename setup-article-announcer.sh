#!/bin/bash

# Setup Article Announcer Cron Job

echo "📢 Setting up Article Announcer for Trend Pulse"
echo "=============================================="

# Create necessary directories
mkdir -p output/social-posts

# Check if .env has SITE_URL
if ! grep -q "SITE_URL" .env; then
  echo "SITE_URL=https://www.trendpulse.life" >> .env
  echo "✅ Added SITE_URL to .env"
fi

# Add Twitter API placeholders (commented out)
if ! grep -q "TWITTER_API" .env; then
  echo "" >> .env
  echo "# Twitter/X API for automatic posting" >> .env
  echo "# TWITTER_API_KEY=your_key_here" >> .env
  echo "# TWITTER_API_SECRET=your_secret_here" >> .env
  echo "# TWITTER_ACCESS_TOKEN=your_token_here" >> .env
  echo "# TWITTER_ACCESS_SECRET=your_token_secret_here" >> .env
  echo "# DEMO_MODE=true  # Set to false when using real API keys" >> .env
  echo "✅ Added Twitter API placeholders to .env"
fi

# Install Twitter API package if needed
echo "📦 Checking for required packages..."
if ! npm list twitter-api-v2 2>/dev/null | grep -q twitter-api-v2; then
  echo "Installing twitter-api-v2..."
  npm install twitter-api-v2
fi

# Make scripts executable
chmod +x post-new-articles.js
chmod +x post-to-twitter.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 QUICK START:"
echo "1. Run manually to test:"
echo "   node post-new-articles.js"
echo ""
echo "2. Check generated posts:"
echo "   ls -la output/social-posts/"
echo ""
echo "3. To automate (every 2 hours):"
echo "   Add to crontab:"
echo "   0 */2 * * * cd $(pwd) && node post-new-articles.js >> automation.log 2>&1"
echo ""
echo "4. For automatic Twitter posting:"
echo "   - Get Twitter API keys from developer.twitter.com"
echo "   - Add them to .env file"
echo "   - Set DEMO_MODE=false"
echo "   - Run: node post-to-twitter.js"
echo ""
echo "📢 Your articles will now be announced automatically!"
