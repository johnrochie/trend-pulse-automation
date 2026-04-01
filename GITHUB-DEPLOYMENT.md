# Trend Pulse Article Generation System - GitHub Deployment

## Complete System Overview

### Location:
- **Automation System**: `/home/jr/.openclaw/workspace/trend-pulse-automation/`
- **Website**: `/home/jr/.openclaw/workspace/trend-pulse/`
- **Sync Script**: `/home/jr/.openclaw/workspace/sync-trend-pulse-articles.sh`

## Article Generation Pipeline

### 1. 📰 News Fetching (`fetch-news.js`)
- Fetches breaking news from NewsAPI (categories: technology, business, entertainment)
- Uses API key: `your_newsapi_key_here`
- Saves to SQLite database (`articles.db`)

### 2. 🤖 AI Content Generation (`generate-articles.js`)
- Uses DeepSeek AI (API key: `your_deepseek_api_key_here`)
- Transforms news headlines into 800-1200 word articles
- Adds analysis, context, and expert perspectives

### 3. 📤 Publishing (`publish-articles.js`)
- Formats articles for website display
- Creates JSON files in output directory
- Updates `articles.json` and individual article files

### 4. 🔄 GitHub Sync (`update-github.js`)
- Pushes `automation-output.json` to GitHub repo
- GitHub URL: `https://raw.githubusercontent.com/johnrochie/trend-pulse/main/automation-output.json`

### 5. 🌐 Website Integration
- Trend Pulse website fetches from GitHub URL
- API endpoint: `/api/articles` in the Trend Pulse site
- Articles displayed dynamically on the website

## Current Status
- **Last run**: March 25, 2026 at 18:13 UTC
- **Articles in database**: 2,119+ articles
- **Latest article**: "Exclusive: Trader made nearly $1 million on Polymarket with remarkably accurate Iran bets"
- **Output file**: `articles.json` (1.6MB, 3,818 lines)

## Automation Orchestration

### Main Script: `index.js`
Runs full cycle: fetch → generate → publish → github

### Commands:
```bash
node index.js full      # Run complete cycle
node index.js fetch     # Just fetch news
node index.js generate  # Just generate AI content
node index.js publish   # Just publish articles
node index.js github    # Just update GitHub
node index.js digest    # Generate daily digest
```

## Sync to Website
- **Sync script**: `sync-trend-pulse-articles.sh`
- Copies `articles.json` from automation to website
- Commits and pushes to GitHub
- Website automatically updates from GitHub

## Key Files
- **Automation config**: `.env` (API keys, categories, limits)
- **Database**: `articles.db` (SQLite, tracks all articles)
- **Output**: `output/articles.json` (all published articles)
- **Website API**: `lib/articles-api.ts` (fetches from GitHub)

## Scheduling
- **Cron setup**: `setup-cron.sh` (configures automatic runs)
- **Suggested**: Every 6 hours (4 runs/day)
- **Cost**: ~$0.25/month (within free tier limits)

## GitHub Deployment Instructions

### 1. Create GitHub Repository
```bash
gh repo create trend-pulse-automation --public --description "AI-powered news automation pipeline"
```

### 2. Initialize and Push
```bash
cd trend-pulse-automation-github
git init
git add .
git commit -m "Initial commit: Trend Pulse Automation System"
git branch -M main
git remote add origin https://github.com/johnrochie/trend-pulse-automation.git
git push -u origin main
```

### 3. Set Up GitHub Actions for Automation
Create `.github/workflows/automation.yml`:
```yaml
name: Run Trend Pulse Automation

on:
  schedule:
    # Run every 6 hours (4 times per day)
    - cron: '0 */6 * * *'
  workflow_dispatch:  # Allow manual triggers

jobs:
  automate:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run automation
      env:
        NEWSAPI_KEY: ${{ secrets.NEWSAPI_KEY }}
        DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
      run: node index.js full
    
    - name: Commit and push generated articles
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add output/
        git commit -m "Automated article update $(date)" || echo "No changes to commit"
        git push
```

### 4. Set Up GitHub Secrets
Add the following secrets in GitHub repository settings:
- `NEWSAPI_KEY`: Your NewsAPI.org API key
- `DEEPSEEK_API_KEY`: Your DeepSeek API key

### 5. Update Website to Fetch from GitHub
Modify the Trend Pulse website to fetch articles from:
```
https://raw.githubusercontent.com/johnrochie/trend-pulse-automation/main/output/articles.json
```

## Benefits of GitHub Deployment

### 1. **Centralized Storage**
- Articles stored in GitHub repository
- Version history for all articles
- Easy rollback if needed

### 2. **Automated Updates**
- GitHub Actions runs automation on schedule
- No local server required
- Free automation hosting

### 3. **Global Access**
- Website can fetch from anywhere
- CDN caching via GitHub Pages
- No server maintenance

### 4. **Collaboration**
- Multiple contributors can manage
- Pull request review for articles
- Issue tracking for automation

## Migration from Local to GitHub

### Step 1: Export Existing Articles
```bash
# From local automation directory
cp output/articles.json /path/to/github-repo/output/
```

### Step 2: Update Website Configuration
Change the website's API endpoint to point to GitHub:
```typescript
// In lib/articles-api.ts
const ARTICLES_URL = 'https://raw.githubusercontent.com/johnrochie/trend-pulse-automation/main/output/articles.json';
```

### Step 3: Set Up GitHub Actions
- Create workflow file as shown above
- Add API keys as secrets
- Test manual trigger

### Step 4: Monitor and Verify
- Check GitHub Actions runs
- Verify articles are being generated
- Confirm website fetches from GitHub

## Cost Analysis
- **NewsAPI**: Free tier (100 requests/day) = $0/month
- **DeepSeek API**: ~$0.25/month (estimated)
- **GitHub Actions**: Free (within limits)
- **GitHub Storage**: Free (within limits)
- **Total**: ~$0.25/month

## Troubleshooting

### Common Issues:
1. **GitHub Actions failing**
   - Check API keys in secrets
   - Verify workflow file syntax
   - Check action logs

2. **Website not loading articles**
   - Verify GitHub URL is correct
   - Check CORS settings
   - Test direct URL access

3. **Rate limiting**
   - NewsAPI: 100 requests/day
   - DeepSeek: Check API usage
   - GitHub: 2,000 minutes/month free

### Monitoring:
- GitHub Actions dashboard
- Repository insights
- Website error logs
- API response times

## Next Steps

1. **Immediate**:
   - Create GitHub repository
   - Push automation code
   - Set up GitHub Actions

2. **Short-term**:
   - Update website to fetch from GitHub
   - Test end-to-end flow
   - Monitor for 24 hours

3. **Long-term**:
   - Add analytics tracking
   - Implement article quality checks
   - Expand to more news categories

---

**The system is fully operational and ready to generate fresh AI-powered news articles automatically from GitHub!**