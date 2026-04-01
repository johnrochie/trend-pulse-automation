const axios = require('axios');
const database = require('./database');
require('dotenv').config();

class NewsFetcher {
  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY;
    this.baseUrl = 'https://newsapi.org/v2';
    this.categories = process.env.CATEGORIES ? process.env.CATEGORIES.split(',') : ['technology', 'business'];
    this.maxArticles = parseInt(process.env.MAX_ARTICLES_PER_CYCLE) || 5;
  }

  async fetchCategory(category) {
    try {
      console.log(`📡 Fetching ${category} news...`);
      
      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params: {
          country: 'us',
          category: category,
          pageSize: 20,
          apiKey: this.apiKey
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`API error: ${response.data.message}`);
      }

      console.log(`✅ Found ${response.data.articles.length} ${category} articles`);
      return response.data.articles;
    } catch (error) {
      console.error(`❌ Error fetching ${category} news:`, error.message);
      return [];
    }
  }

  async processArticle(article, category) {
    // Generate a unique source ID
    const sourceId = `${category}_${article.url.hashCode()}`;
    
    // Check if we've already processed this URL
    const alreadyProcessed = await database.urlProcessed(article.url);
    if (alreadyProcessed) {
      console.log(`⏭️  Skipping already processed: ${article.title.substring(0, 60)}...`);
      return null;
    }

    const processedArticle = {
      sourceId: sourceId,
      title: article.title || 'No title',
      description: article.description || article.content?.substring(0, 200) || 'No description',
      url: article.url,
      imageUrl: article.urlToImage || '',
      sourceName: article.source?.name || 'Unknown',
      category: category,
      publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString()
    };

    // Save to database
    const articleId = await database.saveArticle(processedArticle);
    await database.markUrlProcessed(article.url, 'fetched');
    
    console.log(`💾 Saved: ${processedArticle.title.substring(0, 70)}...`);
    return { ...processedArticle, id: articleId };
  }

  async fetchAllCategories() {
    console.log('🚀 Starting news fetch cycle...');
    console.log(`📊 Categories: ${this.categories.join(', ')}`);
    
    const allArticles = [];
    
    for (const category of this.categories) {
      const articles = await this.fetchCategory(category);
      
      // Process articles for this category
      let processedCount = 0;
      for (const article of articles) {
        if (processedCount >= this.maxArticles / this.categories.length) break;
        
        const processed = await this.processArticle(article, category);
        if (processed) {
          allArticles.push(processed);
          processedCount++;
        }
      }
      
      console.log(`✅ Processed ${processedCount} ${category} articles`);
      
      // Small delay between categories to avoid rate limiting
      if (category !== this.categories[this.categories.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return allArticles;
  }

  async run() {
    try {
      console.log('='.repeat(60));
      console.log('📰 TREND PULSE - NEWS FETCHER');
      console.log('='.repeat(60));
      
      const fetchedArticles = await this.fetchAllCategories();
      
      // Get stats
      const stats = await database.getStats();
      
      console.log('\n📈 FETCH CYCLE COMPLETE');
      console.log('='.repeat(60));
      console.log(`✅ Total articles fetched: ${fetchedArticles.length}`);
      console.log(`📊 Database stats:`);
      console.log(`   Total articles: ${stats.total_articles}`);
      console.log(`   Fetched: ${stats.fetched}`);
      console.log(`   Generated: ${stats.generated}`);
      console.log(`   Published: ${stats.published}`);
      console.log(`   Oldest: ${stats.oldest_article ? new Date(stats.oldest_article).toLocaleDateString() : 'N/A'}`);
      console.log(`   Newest: ${stats.newest_article ? new Date(stats.newest_article).toLocaleDateString() : 'N/A'}`);
      console.log('='.repeat(60));
      
      return fetchedArticles;
    } catch (error) {
      console.error('❌ Fetch cycle failed:', error);
      throw error;
    }
  }
}

// Add hashCode method to String prototype for generating source IDs
String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Run if called directly
if (require.main === module) {
  const fetcher = new NewsFetcher();
  fetcher.run().then(() => {
    console.log('🎯 Fetch complete. Next: Generate articles with AI.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = NewsFetcher;