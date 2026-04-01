#!/usr/bin/env node

/**
 * Daily Digest Generator for Trend Pulse
 * Creates AI-generated summary of top daily stories
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// AI Service (using Tensorix/DeepSeek)
const OpenAI = require('openai');

class DailyDigestGenerator {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './articles.db';
    this.db = new sqlite3.Database(this.dbPath);
    this.outputDir = path.join(__dirname, 'output', 'daily-digests');
    
    // Initialize AI client
    this.aiClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.API_BASE_URL || 'https://api.tensorix.ai/v1',
    });
  }

  /**
   * Get top articles from the last 24 hours
   */
  async getTopDailyArticles(limit = 5) {
    return new Promise((resolve, reject) => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const query = `
        SELECT * FROM articles 
        WHERE published_at_site >= ? 
        AND status = 'published'
        ORDER BY trending_score DESC, views DESC
        LIMIT ?
      `;
      
      this.db.all(query, [twentyFourHoursAgo, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Group articles by category
   */
  groupArticlesByCategory(articles) {
    const categories = {};
    
    articles.forEach(article => {
      const category = article.category || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(article);
    });
    
    return categories;
  }

  /**
   * Generate AI summary of articles
   */
  async generateDigestSummary(articles) {
    try {
      // Prepare article summaries for AI
      const articleSummaries = articles.map((article, index) => {
        return `${index + 1}. "${article.title}" - ${article.description?.substring(0, 200) || 'No description available'}`;
      }).join('\n\n');

      const categories = this.groupArticlesByCategory(articles);
      const categorySummary = Object.entries(categories)
        .map(([category, catArticles]) => {
          return `${category.toUpperCase()}: ${catArticles.length} articles`;
        })
        .join(', ');

      const prompt = `You are a news editor creating a daily digest for Trend Pulse, an AI-powered news aggregator.

Today's top stories (${articles.length} articles across ${Object.keys(categories).length} categories):
${articleSummaries}

Categories covered: ${categorySummary}

Please create an engaging daily digest with the following structure:

📰 **DAILY DIGEST: [Today's Date]**

Start with a compelling 2-3 sentence introduction that captures the day's news mood.

🔥 **TOP STORY:** [Select the most important/impactful story and provide 3-4 bullet points of key analysis]

📈 **MARKET MOVERS:** [If there are business/finance articles, summarize key market impacts. Otherwise, skip this section]

💡 **TECH SPOTLIGHT:** [If there are technology articles, highlight key innovations/developments]

🌍 **GLOBAL WATCH:** [If there are international/political articles, summarize global developments]

🎯 **KEY TAKEAWAYS:** [3-5 bullet points summarizing the day's most important insights]

🔮 **TOMORROW'S OUTLOOK:** [What to watch for tomorrow based on today's developments]

📖 **READ THE FULL ARTICLES:**
[For each article, provide: "Title" - Brief 10-word summary]

Make it engaging, informative, and slightly conversational. Use emojis sparingly for visual breaks. Keep paragraphs short (2-3 sentences max).`;

      const response = await this.aiClient.chat.completions.create({
        model: process.env.AI_MODEL || 'z-ai/glm-4.7',
        messages: [
          {
            role: 'system',
            content: 'You are a senior news editor at Trend Pulse, an AI-powered news aggregator. You create engaging, informative daily digests that summarize the top stories with clear analysis and actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI digest:', error);
      // Fallback to simple template
      return this.generateFallbackDigest(articles);
    }
  }

  /**
   * Fallback digest if AI fails
   */
  generateFallbackDigest(articles) {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const categories = this.groupArticlesByCategory(articles);
    
    let digest = `📰 **DAILY DIGEST: ${today}**\n\n`;
    digest += `Today's news roundup features ${articles.length} top stories across ${Object.keys(categories).length} categories.\n\n`;

    // Top story
    if (articles.length > 0) {
      digest += `🔥 **TOP STORY:** ${articles[0].title}\n`;
      digest += `   • ${articles[0].description?.substring(0, 150) || 'Key development making headlines today.'}\n\n`;
    }

    // Category highlights
    Object.entries(categories).forEach(([category, catArticles]) => {
      digest += `📊 **${category.toUpperCase()}:** ${catArticles.length} articles\n`;
      catArticles.forEach(article => {
        digest += `   • ${article.title}\n`;
      });
      digest += '\n';
    });

    // Article links
    digest += `📖 **READ THE FULL ARTICLES:**\n`;
    articles.forEach((article, index) => {
      digest += `${index + 1}. "${article.title}"\n`;
    });

    digest += `\n🔮 **TOMORROW'S OUTLOOK:** Stay tuned for more developments as these stories evolve.`;

    return digest;
  }

  /**
   * Create digest article object
   */
  createDigestArticle(digestContent, articles) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const slug = `daily-digest-${dateStr}`;
    
    return {
      id: `digest-${dateStr}`,
      title: `Daily Digest: ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      excerpt: `Today's top ${articles.length} stories summarized with AI analysis.`,
      content: digestContent,
      category: 'digest',
      readTime: '3 min',
      views: 0,
      trendingScore: 100, // High score for featured content
      tags: ['daily-digest', 'news-summary', 'ai-analysis', 'trending'],
      publishedAt: today.toISOString(),
      publishedAtSite: today.toISOString(),
      color: 'from-purple-600 to-pink-600',
      breaking: true,
      url: `#`,
      imageUrl: this.getDigestImage(),
      sourceName: 'Trend Pulse AI',
      slug: slug,
      type: 'daily-digest'
    };
  }

  /**
   * Get appropriate image for digest
   */
  getDigestImage() {
    // Use a consistent but varied set of digest images
    const digestImages = [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format', // Business meeting
      'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format', // Laptop workspace
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb6?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format', // Team collaboration
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format', // Data visualization
    ];
    
    // Use day of month to cycle through images
    const day = new Date().getDate();
    return digestImages[day % digestImages.length];
  }

  /**
   * Save digest to output directory
   */
  async saveDigest(digestArticle) {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Save individual digest file
      const digestFile = path.join(this.outputDir, `${digestArticle.slug}.json`);
      await fs.writeFile(digestFile, JSON.stringify(digestArticle, null, 2));
      
      // Update main articles.json
      const articlesFile = path.join(__dirname, 'output', 'articles.json');
      let articlesData = { articles: [] };
      
      try {
        const existingData = await fs.readFile(articlesFile, 'utf8');
        articlesData = JSON.parse(existingData);
      } catch (error) {
        console.log('Creating new articles.json file');
      }
      
      // Add digest at the beginning (featured content)
      articlesData.articles.unshift(digestArticle);
      
      // Limit to reasonable size
      if (articlesData.articles.length > 100) {
        articlesData.articles = articlesData.articles.slice(0, 100);
      }
      
      await fs.writeFile(articlesFile, JSON.stringify(articlesData, null, 2));
      
      // Also save to API directory
      const apiDir = path.join(__dirname, 'output', 'api');
      await fs.mkdir(apiDir, { recursive: true });
      await fs.writeFile(
        path.join(apiDir, 'articles.json'),
        JSON.stringify(articlesData, null, 2)
      );
      
      console.log(`✅ Daily digest saved: ${digestFile}`);
      return digestArticle;
    } catch (error) {
      console.error('Error saving digest:', error);
      throw error;
    }
  }

  /**
   * Generate social media posts for the digest
   */
  generateSocialPosts(digestArticle, articles) {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const posts = {
      twitter: `📰 Daily Digest: ${today}\n\nTop ${articles.length} stories summarized with AI analysis.\n\nRead: ${process.env.SITE_URL || 'https://trendpulse.life'}/daily-digest/${digestArticle.slug}\n\n#News #AI #DailyDigest #TrendPulse`,
      
      linkedin: `Today's Daily Digest is live! 📰\n\nI've analyzed ${articles.length} top stories to bring you the key insights and developments from the past 24 hours.\n\nFrom breaking news to market analysis, get caught up in minutes with our AI-powered summary.\n\nRead the full digest: ${process.env.SITE_URL || 'https://trendpulse.life'}/daily-digest/${digestArticle.slug}\n\n#NewsAnalysis #AI #DailyBriefing #TrendPulse`,
      
      facebook: `📰 Your Daily Digest is here!\n\n${digestArticle.excerpt}\n\nRead the full summary: ${process.env.SITE_URL || 'https://trendpulse.life'}/daily-digest/${digestArticle.slug}`
    };
    
    return posts;
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('='.repeat(70));
    console.log('📰 DAILY DIGEST GENERATOR');
    console.log('='.repeat(70));
    console.log('📅', new Date().toLocaleString());
    console.log('='.repeat(70));

    try {
      // Step 1: Get top articles
      console.log('\n📊 STEP 1: FETCHING TOP ARTICLES');
      console.log('-'.repeat(40));
      const topArticles = await this.getTopDailyArticles(5);
      
      if (topArticles.length === 0) {
        console.log('⚠️  No articles published in the last 24 hours.');
        return null;
      }
      
      console.log(`✅ Found ${topArticles.length} articles:`);
      topArticles.forEach((article, i) => {
        console.log(`   ${i + 1}. ${article.title} (${article.category})`);
      });

      // Step 2: Generate AI summary
      console.log('\n🤖 STEP 2: GENERATING AI SUMMARY');
      console.log('-'.repeat(40));
      const digestContent = await this.generateDigestSummary(topArticles);
      console.log('✅ Digest generated successfully');

      // Step 3: Create digest article
      console.log('\n📝 STEP 3: CREATING DIGEST ARTICLE');
      console.log('-'.repeat(40));
      const digestArticle = this.createDigestArticle(digestContent, topArticles);
      console.log(`✅ Digest article created: ${digestArticle.title}`);

      // Step 4: Save digest
      console.log('\n💾 STEP 4: SAVING DIGEST');
      console.log('-'.repeat(40));
      const savedDigest = await this.saveDigest(digestArticle);
      
      // Step 5: Generate social posts
      console.log('\n📱 STEP 5: GENERATING SOCIAL POSTS');
      console.log('-'.repeat(40));
      const socialPosts = this.generateSocialPosts(savedDigest, topArticles);
      console.log('✅ Social media posts generated');

      // Save social posts
      const socialDir = path.join(__dirname, 'output', 'social-content');
      await fs.mkdir(socialDir, { recursive: true });
      
      const socialFile = path.join(socialDir, `daily-digest-${new Date().toISOString().split('T')[0]}.json`);
      await fs.writeFile(socialFile, JSON.stringify({
        digest: savedDigest,
        posts: socialPosts,
        generated_at: new Date().toISOString()
      }, null, 2));
      
      console.log(`✅ Social posts saved: ${socialFile}`);

      console.log('\n' + '='.repeat(70));
      console.log('🎉 DAILY DIGEST GENERATION COMPLETE!');
      console.log('='.repeat(70));
      
      return {
        digest: savedDigest,
        articles: topArticles,
        socialPosts: socialPosts
      };

    } catch (error) {
      console.error('❌ Error generating daily digest:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const generator = new DailyDigestGenerator();
  
  generator.run()
    .then(result => {
      if (result) {
        console.log('\n📊 DIGEST STATS:');
        console.log(`   Articles summarized: ${result.articles.length}`);
        console.log(`   Digest title: ${result.digest.title}`);
        console.log(`   Social posts: ${Object.keys(result.socialPosts).length} platforms`);
        console.log('\n🚀 Ready for publication!');
        process.exit(0);
      } else {
        console.log('No digest generated.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = DailyDigestGenerator;