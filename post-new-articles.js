#!/usr/bin/env node

/**
 * Simple Article Announcement System
 * Generates social media posts for new articles (can be manually posted)
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class ArticleAnnouncer {
  constructor() {
    this.articlesFile = path.join(__dirname, 'output', 'articles.json');
    this.postedFile = path.join(__dirname, 'output', 'posted-articles.json');
    this.siteUrl = process.env.SITE_URL || 'https://www.trendpulse.life';
    this.outputDir = path.join(__dirname, 'output', 'social-posts');
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async loadArticles() {
    try {
      const data = await fs.readFile(this.articlesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error loading articles:', error.message);
      return { articles: [] };
    }
  }

  async loadPostedArticles() {
    try {
      const data = await fs.readFile(this.postedFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { posted: [], lastCheck: new Date().toISOString() };
    }
  }

  async getNewArticles(hours = 24) {
    const allArticles = await this.loadArticles();
    const postedData = await this.loadPostedArticles();
    const postedIds = new Set(postedData.posted.map(p => p.id));

    const newArticles = allArticles.articles.filter(article => {
      const publishedDate = new Date(article.publishedAtSite || article.publishedAt);
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
      return publishedDate > timeAgo && !postedIds.has(article.id);
    });

    // Sort by newest first
    return newArticles.sort((a, b) => 
      new Date(b.publishedAtSite || b.publishedAt) - new Date(a.publishedAtSite || a.publishedAt)
    );
  }

  generateSocialPosts(article) {
    const url = `${this.siteUrl}/article/${article.slug}`;
    
    // Twitter/X post (280 chars)
    const twitterPost = this.generateTwitterPost(article, url);
    
    // LinkedIn post (longer, more professional)
    const linkedinPost = this.generateLinkedInPost(article, url);
    
    // Facebook/Instagram post
    const facebookPost = this.generateFacebookPost(article, url);
    
    // Plain text for Telegram/Discord
    const plainPost = this.generatePlainPost(article, url);
    
    return {
      twitter: twitterPost,
      linkedin: linkedinPost,
      facebook: facebookPost,
      plain: plainPost,
      article: {
        id: article.id,
        title: article.title,
        url: url,
        category: article.category,
        publishedAt: article.publishedAtSite || article.publishedAt
      }
    };
  }

  generateTwitterPost(article, url) {
    const hashtags = this.generateHashtags(article);
    const maxLength = 280;
    const urlLength = 23;
    
    let tweet = `${article.title}\n\n${url}\n\n${hashtags}`;
    
    if (tweet.length > maxLength) {
      const available = maxLength - urlLength - hashtags.length - 10;
      const truncated = article.title.substring(0, available - 3) + '...';
      tweet = `${truncated}\n\n${url}\n\n${hashtags}`;
    }
    
    return tweet;
  }

  generateLinkedInPost(article, url) {
    const hashtags = this.generateHashtags(article);
    return `📰 New on Trend Pulse: ${article.title}

${article.excerpt || 'Read the full analysis on our site.'}

🔗 Read more: ${url}

${hashtags}

#TrendPulse #NewsAnalysis #${article.category || 'News'}`;
  }

  generateFacebookPost(article, url) {
    const hashtags = this.generateHashtags(article);
    return `🚀 New article published!

"${article.title}"

${article.excerpt || 'Click to read the full story with our AI analysis.'}

👉 ${url}

${hashtags}`;
  }

  generatePlainPost(article, url) {
    return `New article: "${article.title}"
${article.excerpt || ''}
Read: ${url}`;
  }

  generateHashtags(article) {
    const baseTags = ['TrendPulse', 'News', 'AI'];
    const category = article.category || 'News';
    const tags = [...baseTags, category];
    
    if (article.tags && article.tags.length > 0) {
      tags.push(...article.tags.slice(0, 2));
    }
    
    return tags.map(tag => `#${tag.replace(/\s+/g, '')}`).slice(0, 5).join(' ');
  }

  async savePosts(posts, articleId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `article-${articleId}-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(posts, null, 2));
    return filepath;
  }

  async updatePostedArticles(articleId) {
    const postedData = await this.loadPostedArticles();
    postedData.posted.push({
      id: articleId,
      postedAt: new Date().toISOString(),
      automated: false // Set to true if using actual API
    });
    
    postedData.lastCheck = new Date().toISOString();
    await fs.writeFile(this.postedFile, JSON.stringify(postedData, null, 2));
  }

  async run() {
    console.log('🚀 Generating social media posts for new articles...');
    console.log('='.repeat(60));
    
    await this.init();
    
    const newArticles = await this.getNewArticles(24); // Last 24 hours
    
    if (newArticles.length === 0) {
      console.log('✅ No new articles in the last 24 hours.');
      return;
    }
    
    console.log(`📰 Found ${newArticles.length} new article(s):`);
    
    for (const article of newArticles) {
      console.log(`\n📋 "${article.title.substring(0, 60)}..."`);
      console.log(`   Category: ${article.category}`);
      console.log(`   Published: ${new Date(article.publishedAtSite || article.publishedAt).toLocaleString()}`);
      
      const posts = this.generateSocialPosts(article);
      const savedFile = await this.savePosts(posts, article.id);
      
      console.log(`   ✅ Posts saved to: ${savedFile}`);
      console.log(`   Twitter post (${posts.twitter.length} chars):`);
      console.log(`   "${posts.twitter.substring(0, 80)}..."`);
      
      // Mark as "posted" (for tracking)
      await this.updatePostedArticles(article.id);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Generated posts for ${newArticles.length} article(s)`);
    console.log(`📁 Posts saved in: ${this.outputDir}`);
    console.log('\n📢 NEXT STEPS:');
    console.log('1. Review the generated posts in the output directory');
    console.log('2. Manually post to Twitter/X, LinkedIn, etc.');
    console.log('3. Or set up automatic posting with API keys');
    console.log('\n🔧 To automate posting, add Twitter API keys to .env file:');
    console.log('   TWITTER_API_KEY=your_key_here');
    console.log('   TWITTER_API_SECRET=your_secret_here');
    console.log('   TWITTER_ACCESS_TOKEN=your_token_here');
    console.log('   TWITTER_ACCESS_SECRET=your_token_secret_here');
  }
}

// Run the announcer
const announcer = new ArticleAnnouncer();
announcer.run().catch(console.error);
