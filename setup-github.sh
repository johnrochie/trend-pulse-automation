#!/bin/bash

# Trend Pulse Automation - GitHub Setup Script
# This script helps set up the automation system on GitHub

set -e

echo "🚀 Setting up Trend Pulse Automation on GitHub"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI."
    echo "Please run: gh auth login"
    exit 1
fi

# Create repository
echo "📦 Creating GitHub repository..."
gh repo create trend-pulse-automation --public --description "AI-powered news automation pipeline" --confirm

# Initialize git if not already
if [ ! -d .git ]; then
    echo "📝 Initializing git repository..."
    git init
    git branch -M main
fi

# Add remote if not already added
if ! git remote get-url origin &> /dev/null; then
    git remote add origin https://github.com/johnrochie/trend-pulse-automation.git
fi

# Add all files
echo "📁 Adding files to git..."
git add .

# Commit
echo "💾 Committing files..."
git commit -m "Initial commit: Trend Pulse Automation System" || echo "No changes to commit"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Repository created: https://github.com/johnrochie/trend-pulse-automation"
echo ""
echo "🔑 Next steps:"
echo "1. Go to https://github.com/johnrochie/trend-pulse-automation/settings/secrets/actions"
echo "2. Add the following secrets:"
echo "   - NEWSAPI_KEY: Your NewsAPI.org API key"
echo "   - DEEPSEEK_API_KEY: Your DeepSeek API key"
echo ""
echo "3. The automation will run automatically every 6 hours via GitHub Actions"
echo "4. Articles will be available at:"
echo "   https://raw.githubusercontent.com/johnrochie/trend-pulse-automation/main/output/articles.json"
echo ""
echo "5. Update your Trend Pulse website to fetch from the GitHub URL"
echo ""
echo "🎉 Setup complete! The system will now run automatically on GitHub."