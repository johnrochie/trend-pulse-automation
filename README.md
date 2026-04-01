# 🚀 Trend Pulse Automation

AI-powered news automation pipeline that fetches, generates, and publishes articles automatically.

## 📋 Features

- **📰 News Fetching**: Fetches real news from NewsAPI.org (tech, business, entertainment categories)
- **🤖 AI Content Generation**: Uses DeepSeek AI to write comprehensive articles
- **📤 Auto-Publishing**: Publishes articles to JSON files for website integration
- **⏰ Scheduled Automation**: Cron job support for automatic runs
- **🗄️ Database Tracking**: SQLite database to track article status and prevent duplicates

## 🛠️ Setup

### 1. Prerequisites
- Node.js 16+
- npm or yarn
- NewsAPI.org API key (free tier: 100 requests/day)
- DeepSeek API key (for AI content generation)

### 2. Installation
```bash
# Clone or navigate to the automation directory
cd trend-pulse-automation

# Install dependencies
npm install

# Copy environment file and add your API keys
cp .env.example .env
# Edit .env with your API keys
```

### 3. Configure Environment (.env)
```bash
# NewsAPI Configuration
NEWSAPI_KEY=your_newsapi_key_here

# AI Configuration (DeepSeek)
DEEPSEEK_API_KEY=your_deepseek_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Database Configuration
DATABASE_PATH=./articles.db

# Site Configuration
SITE_URL=http://localhost:4002

# Scheduling
FETCH_INTERVAL_HOURS=6
MAX_ARTICLES_PER_CYCLE=5

# Categories to fetch (comma-separated)
CATEGORIES=technology,business,entertainment
```

## 🚀 Usage

### Manual Runs
```bash
# Run full automation cycle (fetch → generate → publish)
node index.js full

# Run individual steps
node index.js fetch      # Fetch news only
node index.js generate   # Generate AI content only
node index.js publish    # Publish to site only

# Check statistics
node index.js stats
```

### Automated Scheduling
```bash
# Set up cron job (interactive)
./setup-cron.sh

# Or manually add to crontab
# Runs every 6 hours
0 */6 * * * cd /path/to/trend-pulse-automation && node index.js full >> automation.log 2>&1
```

## 📁 Output Files

Articles are saved to:
- `output/articles.json` - All articles in JSON format
- `output/articles/` - Individual article files
- `output/api/articles.json` - API endpoint format

## 🔗 Integration with Trend Pulse Site

The Trend Pulse website needs to read the generated articles. Options:

### Option 1: File Copy (Simplest)
```bash
# Copy articles to site's public directory
cp output/articles.json /path/to/trend-pulse-site/public/data/
```

### Option 2: Symlink
```bash
# Create symlink in site directory
ln -s /path/to/automation/output/articles.json /path/to/site/public/data/articles.json
```

### Option 3: API Endpoint
Modify the Trend Pulse site to fetch from:
```
http://your-server:port/output/api/articles.json
```

## 📊 Database Schema

The SQLite database (`articles.db`) tracks:
- Article metadata (title, source, URL, category)
- Processing status (fetched, generated, published)
- AI-generated content
- Publication timestamps

## 🎯 Workflow

1. **Fetch**: Gets news from NewsAPI, filters duplicates, saves to database
2. **Generate**: Uses AI to write comprehensive articles based on news
3. **Publish**: Formats articles for website and saves to JSON files
4. **Schedule**: Cron job runs the cycle automatically

## ⚙️ Configuration Options

### Categories
Edit `CATEGORIES` in `.env`:
- `technology`, `business`, `entertainment`, `sports`, `science`, `health`

### Rate Limiting
- Free NewsAPI tier: 100 requests/day
- Adjust `FETCH_INTERVAL_HOURS` to stay within limits
- Default: 6 hours (4 runs/day = ~20 requests/day)

### Article Limits
- `MAX_ARTICLES_PER_CYCLE`: Controls how many articles to process each run
- Default: 5 articles (balanced for quality vs. quantity)

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Check `.env` file has correct API keys
   - Verify NewsAPI key is active at newsapi.org
   - Check DeepSeek key balance

2. **Database Issues**
   - Delete `articles.db` to reset
   - Check file permissions

3. **Rate Limiting**
   - NewsAPI free tier: 100 requests/day
   - Reduce frequency or article count
   - Check `automation.log` for errors

4. **AI Generation Fails**
   - Check DeepSeek API key
   - Verify internet connection
   - Check API response in logs

### Logs
- Check `automation.log` for scheduled runs
- Console output for manual runs
- Database can be inspected with SQLite tools

## 📈 Monitoring

### Check Status
```bash
# View database statistics
node index.js stats

# Check log file
tail -f automation.log

# View recent articles
cat output/articles.json | jq '.articles[0:3]'
```

### Performance Metrics
- Articles processed per day
- AI generation success rate
- NewsAPI request count
- Database size and growth

## 🌐 GitHub Deployment

### Deploy to GitHub for Automated Cloud Execution

The automation system can run entirely on GitHub, eliminating the need for a local server:

#### Quick Setup:
```bash
# Make the setup script executable
chmod +x setup-github.sh

# Run the setup script
./setup-github.sh
```

#### Manual Setup:
1. Create a new GitHub repository: `trend-pulse-automation`
2. Push this code to the repository
3. Add API keys as GitHub Secrets:
   - `NEWSAPI_KEY`: Your NewsAPI.org API key
   - `DEEPSEEK_API_KEY`: Your DeepSeek API key
4. GitHub Actions will run automatically every 6 hours

#### Access Generated Articles:
Articles will be available at:
```
https://raw.githubusercontent.com/johnrochie/trend-pulse-automation/main/output/articles.json
```

#### Update Your Website:
Change your Trend Pulse website to fetch from the GitHub URL instead of local files.

## 🔮 Future Enhancements

Planned features:
- [ ] Twitter/X auto-posting
- [ ] Email newsletter integration
- [ ] Multiple AI model support
- [ ] Image generation for articles
- [ ] SEO optimization
- [ ] Analytics tracking
- [ ] Webhook notifications

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review logs for errors
3. Open a GitHub issue
4. Contact maintainers

---

**🎯 Happy Automating! Your news site will now update itself automatically from the cloud!**