#!/bin/bash

echo "🚀 Setting up Trend Pulse Automation"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please edit it with your API keys."
    else
        echo "❌ .env.example not found"
        exit 1
    fi
else
    echo "✅ .env file found"
fi

# Check required environment variables
echo "🔍 Checking environment variables..."
source .env 2>/dev/null || true

if [ -z "$NEWSAPI_KEY" ]; then
    echo "❌ NEWSAPI_KEY is not set in .env"
    exit 1
fi

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "⚠️  DEEPSEEK_API_KEY is not set. AI generation will fail."
fi

echo "✅ Environment variables checked"

# Create output directory
echo "📁 Creating output directories..."
mkdir -p output/articles
mkdir -p output/api

# Test database
echo "🗄️  Testing database..."
node -e "const db = require('./database'); console.log('✅ Database initialized');"

# Create a test script
echo "🧪 Creating test script..."
cat > test-run.js << 'EOF'
const { exec } = require('child_process');

console.log('🧪 Testing Trend Pulse Automation...\n');

// Test fetch only (should work with just NEWSAPI_KEY)
exec('node index.js fetch', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Fetch test failed:', error.message);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log('✅ Fetch test completed');
  console.log(stdout);
  
  // Check if articles were fetched
  if (stdout.includes('Total articles fetched:') && !stdout.includes('Total articles fetched: 0')) {
    console.log('\n🎉 SUCCESS: Articles were fetched!');
    console.log('\nNext steps:');
    console.log('1. Run: node index.js generate (requires DEEPSEEK_API_KEY)');
    console.log('2. Run: node index.js publish');
    console.log('3. Or run full cycle: node index.js full');
  } else {
    console.log('\n⚠️  No articles were fetched. This could be normal if no new articles available.');
  }
});
EOF

echo "✅ Setup complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Edit .env file with your API keys if not already done"
echo "2. Run test: node test-run.js"
echo "3. Run full automation: node index.js full"
echo "4. Set up cron job for automatic runs"
echo ""
echo "📅 Example cron job (runs every 6 hours):"
echo "0 */6 * * * cd /home/jr/.openclaw/workspace/trend-pulse-automation && node index.js full >> automation.log 2>&1"
echo ""
echo "🎯 Ready to automate!"