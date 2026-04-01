#!/usr/bin/env node

/**
 * Twitter/X Posting Automation for Trend Pulse
 * Posts new articles automatically when they're published
 */

const fs = require('fs').promises;
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

class TwitterPoster {
  constructor() {
    // Twitter API credentials (would be in .env)
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    });
    
    this.rwClient = this.client.readWrite;
    this.articlesFile = path.join(__dirname, 'output', 'articles.json');
    this.postedFile = path.join(__dirname, 'output', 'posted-articles.json');
    this.siteUrl = process.env.SITE_URL || 'https://www.trendpulse.life';
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
      // File doesn't exist yet
      return { posted: [], lastCheck: new Date().toISOString() };
    }
  }

  async savePostedArticles(data) {
    try {
      await fs.writeFile(this.postedFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Error saving posted articles:', error.message);
    }
  }

  async getNewArticles() {
    const allArticles = await this.loadArticles();
    const postedData = await this.loadPostedArticles();
    const postedIds = new Set(postedData.posted.map(p => p.id));

    const newArticles = allArticles.articles.filter(article => {
      // Check if article was published in last 24 hours and not posted yet
      const publishedDate = new Date(article.publishedAtSite || article.publishedAt);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      return publishedDate > twentyFourHoursAgo && !postedIds.has(article.id);
    });

    return newArticles.slice(0, 5); // Limit to 5 new articles per run
  }

  generateTweet(article) {
    const url = `${this.siteUrl}/article/${article.slug}`;
    const hashtags = this.generateHashtags(article);
    
    // Twitter has 280 character limit
    const maxLength = 280;
    const urlLength = 23; // Twitter shortens URLs to ~23 chars
    const hashtagsLength = hashtags.length;
    
    let tweet = `${article.title}\n\n${url}\n\n${hashtags}`;
    
    // Truncate if needed
    if (tweet.length > maxLength) {
      const availableForTitle = maxLength - urlLength - hashtagsLength - 10; // 10 for spacing/newlines
      const truncatedTitle = article.title.substring(0, availableForTitle - 3) + '...';
      tweet = `${truncatedTitle}\n\n${url}\n\n${hashtags}`;
    }
    
    return tweet;
  }

  generateHashtags(article) {
    const baseTags = ['TrendPulse', 'News', 'AI'];
    const categoryTags = {
      'Technology': ['Tech', 'Technology', 'Innovation'],
      'Business': ['Business', 'Finance', 'Economy'],
      'Entertainment': ['Entertainment', 'Movies', 'TV'],
      'Lifestyle': ['Lifestyle', 'Health', 'Wellness'],
      'Finance': ['Finance', 'Money', 'Investing'],
      'Health': ['Health', 'Medicine', 'Wellness'],
      'Science': ['Science', 'Research', 'Discovery'],
      'Sports': ['Sports', 'Athletics', 'Competition']
    };

    const tags = [...baseTags];
    if (article.category && categoryTags[article.category]) {
      tags.push(...categoryTags[article.category]);
    }

    // Add first 2 article tags
    if (article.tags && article.tags.length > 0) {
      tags.push(...article.tags.slice(0, 2));
    }

    // Convert to hashtags and limit to 5
    const hashtags = tags
      .map(tag => `#${tag.replace(/\s+/g, '')}`)
      .slice(0, 5);

    return hashtags.join(' ');
  }

  async postTweet(tweet) {
    try {
      console.log(`📝 Posting tweet: ${tweet.substring(0, 50)}...`);
      
      // In demo mode, just log the tweet
      if (!process.env.TWITTER_API_KEY || process.env.DEMO_MODE === 'true') {
        console.log('🔧 DEMO MODE - Tweet would be:');
        console.log('='.repeat(50));
        console.log(tweet);
        console.log('='.repeat(50));
        return { success: true, id: `demo-${Date.now()}`, text: tweet };
      }

      // Real Twitter API call
      const response = await this.rwClient.v2.tweet(tweet);
      console.log(`✅ Tweet posted: https://twitter.com/user/status/${response.data.id}`);
      return { success: true, id: response.data.id, text: tweet };
      
    } catch (error) {
      console.error('❌ Error posting tweet:', error.message);
      return { success: false, error: error.message };
    }
  }

  async run() {
    console.log('🚀 Starting Twitter posting automation...');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log('='.repeat(50));

    const newArticles = await this.getNewArticles();
    
    if (newArticles.length === 0) {
      console.log('✅ No new articles to post (all recent articles already posted)');
      return;
    }

    console.log(`📰 Found ${newArticles.length} new article(s) to post:`);
    
    const postedData = await this.loadPostedArticles();
    const postedToday = [];

    for (const article of newArticles) {
      console.log(`\n📋 Article: ${article.title.substring(0, 60)}...`);
      
      const tweet = this.generateTweet(article);
      const result = await this.postTweet(tweet);
      
      if (result.success) {
        postedToday.push({
          id: article.id,
          tweetId: result.id,
          title: article.title,
          postedAt: new Date().toISOString(),
          url: `${this.siteUrl}/article/${article.slug}`
        });
        
        // Wait 2 minutes between tweets to avoid rate limits
        if (newArticles.length > 1) {
          console.log('⏳ Waiting 2 minutes before next tweet...');
          await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
        }
      }
    }

    // Update posted articles file
    if (postedToday.length > 0) {
      postedData.posted = [...postedData.posted, ...postedToday];
      postedData.lastCheck = new Date().toISOString();
      postedData.lastRun = new Date().toISOString();
      postedData.totalPosted = postedData.posted.length;
      
      await this.savePostedArticles(postedData);
      console.log(`\n✅ Posted ${postedToday.length} new article(s) to Twitter`);
      console.log(`📊 Total articles posted: ${postedData.totalPosted}`);
    }

    console.log('\n🎉 Twitter posting automation complete!');
  }
}

// Run the automation
const poster = new TwitterPoster();
poster.run().catch(console.error);
