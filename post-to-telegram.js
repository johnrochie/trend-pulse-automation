#!/usr/bin/env node

/**
 * Telegram Bot for posting new Trend Pulse articles
 * Easy to set up - just need bot token and channel ID
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class TelegramBot {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '';
    this.articlesFile = path.join(__dirname, 'output', 'articles.json');
    this.postedFile = path.join(__dirname, 'output', 'posted-telegram.json');
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

    return newArticles.sort((a, b) => 
      new Date(b.publishedAtSite || b.publishedAt) - new Date(a.publishedAtSite || a.publishedAt)
    ).slice(0, 10); // Limit to 10 per run
  }

  generateTelegramMessage(article) {
    const url = `${this.siteUrl}/article/${article.slug}`;
    const hashtags = this.generateHashtags(article);
    
    // Telegram supports up to 4096 characters
    return `📰 <b>${article.title}</b>

${article.excerpt || 'Read the full analysis on Trend Pulse.'}

🔗 <a href="${url}">Read full article →</a>

${hashtags}

#TrendPulse #${article.category || 'News'}`;
  }

  generateHashtags(article) {
    const tags = ['TrendPulse', 'News', 'AI', article.category || 'News'];
    if (article.tags && article.tags.length > 0) {
      tags.push(...article.tags.slice(0, 2));
    }
    return tags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
  }

  async sendToTelegram(message) {
    if (!this.botToken || !this.channelId) {
      console.log('🔧 DEMO MODE - Telegram message would be:');
      console.log('='.repeat(50));
      console.log(message.replace(/<[^>]*>/g, '')); // Strip HTML tags for console
      console.log('='.repeat(50));
      return { success: true, demo: true };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await axios.post(url, {
        chat_id: this.channelId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });

      console.log(`✅ Message sent to Telegram: ${response.data.result.message_id}`);
      return { success: true, messageId: response.data.result.message_id };
      
    } catch (error) {
      console.error('❌ Error sending to Telegram:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async updatePostedArticles(articleId, messageId) {
    const postedData = await this.loadPostedArticles();
    postedData.posted.push({
      id: articleId,
      messageId: messageId,
      postedAt: new Date().toISOString()
    });
    
    postedData.lastCheck = new Date().toISOString();
    await fs.writeFile(this.postedFile, JSON.stringify(postedData, null, 2));
  }

  async run() {
    console.log('🤖 Starting Telegram bot for Trend Pulse articles...');
    console.log('='.repeat(60));
    
    const newArticles = await this.getNewArticles(24);
    
    if (newArticles.length === 0) {
      console.log('✅ No new articles in the last 24 hours.');
      return;
    }
    
    console.log(`📰 Found ${newArticles.length} new article(s) for Telegram:`);
    
    for (const article of newArticles) {
      console.log(`\n📋 "${article.title.substring(0, 60)}..."`);
      
      const message = this.generateTelegramMessage(article);
      const result = await this.sendToTelegram(message);
      
      if (result.success) {
        await this.updatePostedArticles(article.id, result.messageId || 'demo');
        console.log(`   ✅ Posted to Telegram`);
        
        // Wait 30 seconds between messages to avoid rate limits
        if (newArticles.length > 1) {
          console.log('   ⏳ Waiting 30 seconds before next message...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Posted ${newArticles.length} article(s) to Telegram`);
    
    if (!this.botToken) {
      console.log('\n🔧 To enable real Telegram posting:');
      console.log('1. Create a bot with @BotFather on Telegram');
      console.log('2. Get your bot token');
      console.log('3. Create a channel and add bot as admin');
      console.log('4. Add to .env file:');
      console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
      console.log('   TELEGRAM_CHANNEL_ID=@your_channel_username');
    }
  }
}

// Run the bot
const bot = new TelegramBot();
bot.run().catch(console.error);
