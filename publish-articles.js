const fs = require('fs').promises;
const path = require('path');
const database = require('./database');
require('dotenv').config();

class ArticlePublisher {
  constructor() {
    this.siteUrl = process.env.SITE_URL || 'http://localhost:4002';
    this.outputDir = path.join(__dirname, 'output');
    this.articlesFile = path.join(this.outputDir, 'articles.json');
    this.maxArticles = parseInt(process.env.MAX_ARTICLES_PER_CYCLE) || 5;
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`📁 Output directory: ${this.outputDir}`);
    } catch (error) {
      console.error('❌ Error creating output directory:', error);
    }
  }

  async loadExistingArticles() {
    try {
      const data = await fs.readFile(this.articlesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid
      return { articles: [], lastUpdated: new Date().toISOString() };
    }
  }

  async saveArticles(articles) {
    try {
      const data = {
        articles: articles,
        lastUpdated: new Date().toISOString(),
        count: articles.length,
        source: 'Trend Pulse Automation'
      };

      await fs.writeFile(this.articlesFile, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${articles.length} articles to ${this.articlesFile}`);
      
      // Also create individual article files for easier access
      await this.createIndividualArticleFiles(articles);
      
      return data;
    } catch (error) {
      console.error('❌ Error saving articles:', error);
      throw error;
    }
  }

  async createIndividualArticleFiles(articles) {
    const articlesDir = path.join(this.outputDir, 'articles');
    await fs.mkdir(articlesDir, { recursive: true });
    
    for (const article of articles) {
      const articleFile = path.join(articlesDir, `article-${article.id}.json`);
      await fs.writeFile(articleFile, JSON.stringify(article, null, 2));
    }
    
    console.log(`📄 Created ${articles.length} individual article files`);
  }

  formatArticleForSite(dbArticle) {
    // Parse tags from comma-separated string
    const tags = dbArticle.tags ? dbArticle.tags.split(',').map(tag => tag.trim()) : [];
    
    // Extract a clean excerpt from AI content
    const excerpt = dbArticle.ai_generated_content 
      ? dbArticle.ai_generated_content.substring(0, 200).replace(/\n/g, ' ') + '...'
      : dbArticle.description || 'Read the full article for details.';
    
    // Generate a slug from the title
    const slug = dbArticle.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return {
      id: dbArticle.id,
      sourceId: dbArticle.source_id,
      title: dbArticle.title,
      excerpt: excerpt,
      content: dbArticle.ai_generated_content || dbArticle.description,
      url: dbArticle.url,
      imageUrl: dbArticle.image_url || this.getDefaultImage(dbArticle.category),
      sourceName: dbArticle.source_name,
      category: dbArticle.category,
      publishedAt: dbArticle.published_at,
      publishedAtSite: dbArticle.published_at_site || new Date().toISOString(),
      tags: tags,
      readTime: this.calculateReadTime(dbArticle.ai_generated_content),
      views: dbArticle.views || 0,
      trendingScore: dbArticle.trending_score || 0,
      slug: slug,
      color: this.getCategoryColor(dbArticle.category)
    };
  }

  getDefaultImage(category) {
    const defaultImages = {
      technology: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&auto=format&fit=crop',
      business: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w-800&auto=format&fit=crop',
      entertainment: 'https://images.unsplash.com/photo-1489599809516-9827b6d1cf13?w=800&auto=format&fit=crop',
      sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop',
      science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop',
      health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&auto=format&fit=crop'
    };
    
    return defaultImages[category] || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop';
  }

  calculateReadTime(content) {
    if (!content) return '3 min';
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min`;
  }

  getCategoryColor(category) {
    const colors = {
      technology: 'from-blue-600 to-cyan-600',
      business: 'from-green-600 to-emerald-600',
      entertainment: 'from-purple-600 to-pink-600',
      sports: 'from-orange-600 to-red-600',
      science: 'from-indigo-600 to-blue-600',
      health: 'from-teal-600 to-green-600'
    };
    
    return colors[category] || 'from-gray-600 to-gray-700';
  }

  async publishBatch() {
    try {
      console.log('🚀 Starting article publishing...');
      
      // Get articles that are generated but not published
      const articles = await database.getArticlesToPublish(this.maxArticles);
      
      if (articles.length === 0) {
        console.log('✅ No articles to publish. All caught up!');
        return [];
      }

      console.log(`📤 Found ${articles.length} articles to publish`);
      
      // Ensure output directory exists
      await this.ensureOutputDir();
      
      // Load existing articles
      const existingData = await this.loadExistingArticles();
      const existingArticles = existingData.articles || [];
      
      // Format new articles for the site
      const newArticles = articles.map(article => this.formatArticleForSite(article));
      
      // Combine with existing articles (new ones first)
      const allArticles = [...newArticles, ...existingArticles].slice(0, 200); // Keep last 50 articles
      
      // Save to file
      await this.saveArticles(allArticles);
      
      // Mark as published in database
      for (const article of articles) {
        await database.markArticlePublished(article.id);
        console.log(`✅ Published: ${article.title.substring(0, 60)}...`);
      }
      
      return newArticles;
    } catch (error) {
      console.error('❌ Publishing batch failed:', error);
      throw error;
    }
  }

  async createApiEndpoint() {
    try {
      const apiFile = path.join(this.outputDir, 'api', 'articles.json');
      const apiDir = path.dirname(apiFile);
      
      await fs.mkdir(apiDir, { recursive: true });
      
      const articles = await this.loadExistingArticles();
      
      // Create API response format
      const apiResponse = {
        success: true,
        data: articles.articles,
        meta: {
          count: articles.articles.length,
          lastUpdated: articles.lastUpdated,
          source: 'Trend Pulse API'
        }
      };
      
      await fs.writeFile(apiFile, JSON.stringify(apiResponse, null, 2));
      console.log(`🌐 Created API endpoint: ${apiFile}`);
      
      return apiFile;
    } catch (error) {
      console.error('❌ Error creating API endpoint:', error);
      return null;
    }
  }

  async run() {
    try {
      console.log('='.repeat(60));
      console.log('📤 TREND PULSE - ARTICLE PUBLISHER');
      console.log('='.repeat(60));
      
      const published = await this.publishBatch();
      
      // Create API endpoint
      await this.createApiEndpoint();
      
      // Get updated stats
      const stats = await database.getStats();
      
      console.log('\n📈 PUBLISHING CYCLE COMPLETE');
      console.log('='.repeat(60));
      console.log(`✅ Articles published: ${published.length}`);
      console.log(`📊 Database stats:`);
      console.log(`   Total articles: ${stats.total_articles}`);
      console.log(`   Fetched: ${stats.fetched}`);
      console.log(`   Generated: ${stats.generated}`);
      console.log(`   Published: ${stats.published}`);
      console.log('='.repeat(60));
      
      if (published.length > 0) {
        console.log('\n🎯 Published articles:');
        published.forEach(article => {
          console.log(`   • ${article.title.substring(0, 60)}... (${article.readTime})`);
        });
        
        console.log(`\n📁 Articles available at: ${this.articlesFile}`);
        console.log(`🌐 API endpoint ready at: ${path.join(this.outputDir, 'api', 'articles.json')}`);
      }
      
      return published;
    } catch (error) {
      console.error('💥 Publishing cycle failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const publisher = new ArticlePublisher();
  publisher.run().then(() => {
    console.log('🎯 Publishing complete. Articles are ready for the site!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ArticlePublisher;