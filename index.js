#!/usr/bin/env node

const NewsFetcher = require('./fetch-news');
const ArticleGenerator = require('./generate-articles');
const ArticlePublisher = require('./publish-articles');
const GitHubUpdater = require('./update-github');
const DailyDigestGenerator = require('./generate-daily-digest');
const database = require('./database');
require('dotenv').config();

class AutomationOrchestrator {
  constructor() {
    this.fetcher = new NewsFetcher();
    this.generator = new ArticleGenerator();
    this.publisher = new ArticlePublisher();
    this.githubUpdater = new GitHubUpdater();
    this.digestGenerator = new DailyDigestGenerator();
  }

  async runFullCycle() {
    console.log('='.repeat(70));
    console.log('🚀 TREND PULSE - FULL AUTOMATION CYCLE');
    console.log('='.repeat(70));
    console.log('📅', new Date().toLocaleString());
    console.log('='.repeat(70));

    try {
      // Step 1: Fetch news
      console.log('\n📰 STEP 1: FETCHING NEWS');
      console.log('-'.repeat(40));
      const fetchedArticles = await this.fetcher.run();
      
      if (fetchedArticles.length === 0) {
        console.log('⚠️  No new articles fetched. Checking for existing articles to process...');
      }

      // Step 2: Generate AI content
      console.log('\n🤖 STEP 2: GENERATING AI CONTENT');
      console.log('-'.repeat(40));
      const generatedArticles = await this.generator.run();
      
      if (generatedArticles.length === 0) {
        console.log('⚠️  No articles needed AI generation.');
      }

      // Step 3: Publish to site
      console.log('\n📤 STEP 3: PUBLISHING ARTICLES');
      console.log('-'.repeat(40));
      const publishedArticles = await this.publisher.run();

      // Step 4: Update GitHub (for Vercel deployment)
      console.log('\n🚀 STEP 4: UPDATING GITHUB');
      console.log('-'.repeat(40));
      const githubResult = await this.githubUpdater.run();

      // Final stats
      console.log('\n📈 FINAL RESULTS');
      console.log('='.repeat(70));
      
      const stats = await database.getStats();
      
      console.log('📊 DATABASE STATISTICS:');
      console.log(`   Total Articles: ${stats.total_articles}`);
      console.log(`   Status: Fetched=${stats.fetched}, Generated=${stats.generated}, Published=${stats.published}`);
      console.log(`   Date Range: ${stats.oldest_article ? new Date(stats.oldest_article).toLocaleDateString() : 'N/A'} to ${stats.newest_article ? new Date(stats.newest_article).toLocaleDateString() : 'N/A'}`);
      
      console.log('\n🎯 THIS CYCLE:');
      console.log(`   Fetched: ${fetchedArticles.length} articles`);
      console.log(`   Generated: ${generatedArticles.length} articles`);
      console.log(`   Published: ${publishedArticles.length} articles`);
      console.log(`   GitHub Updated: ${githubResult.success ? 'Yes' : 'No'}`);
      
      console.log('\n📁 OUTPUT FILES:');
      console.log(`   Articles JSON: ${this.publisher.articlesFile}`);
      console.log(`   API Endpoint: ${require('path').join(this.publisher.outputDir, 'api', 'articles.json')}`);
      console.log(`   GitHub File: ${githubResult.githubUrl || 'Not updated'}`);
      
      console.log('\n✅ AUTOMATION CYCLE COMPLETE');
      console.log('='.repeat(70));
      
      return {
        fetched: fetchedArticles.length,
        generated: generatedArticles.length,
        published: publishedArticles.length,
        github: githubResult,
        stats: stats
      };

    } catch (error) {
      console.error('\n💥 AUTOMATION CYCLE FAILED');
      console.error('='.repeat(70));
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.log('='.repeat(70));
      
      throw error;
    }
  }

  async runSingleStep(step) {
    switch (step) {
      case 'fetch':
        return await this.fetcher.run();
      case 'generate':
        return await this.generator.run();
      case 'publish':
        return await this.publisher.run();
      case 'github':
        return await this.githubUpdater.run();
      case 'digest':
        return await this.digestGenerator.run();
      default:
        throw new Error(`Unknown step: ${step}. Use 'fetch', 'generate', 'publish', 'github', or 'digest'`);
    }
  }
}

// Command line interface
async function main() {
  const orchestrator = new AutomationOrchestrator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  
  try {
    switch (command) {
      case 'full':
        await orchestrator.runFullCycle();
        break;
      case 'fetch':
        await orchestrator.runSingleStep('fetch');
        break;
      case 'generate':
        await orchestrator.runSingleStep('generate');
        break;
      case 'publish':
        await orchestrator.runSingleStep('publish');
        break;
      case 'github':
        await orchestrator.runSingleStep('github');
        break;
      case 'digest':
        await orchestrator.runSingleStep('digest');
        break;
      case 'stats':
        const stats = await database.getStats();
        console.log('📊 DATABASE STATISTICS:');
        console.log(JSON.stringify(stats, null, 2));
        break;
      case 'help':
        showHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
    
    // Close database connection
    database.close();
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    database.close();
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🚀 TREND PULSE AUTOMATION - COMMANDS

Usage: node index.js [command]

Commands:
  full        Run full cycle (fetch → generate → publish → github)
  fetch       Fetch news articles only
  generate    Generate AI content only
  publish     Publish articles to site only
  github      Update GitHub repository only
  digest      Generate daily digest (summarizes top articles)
  stats       Show database statistics
  help        Show this help message

Examples:
  node index.js full      # Run complete automation
  node index.js fetch     # Just fetch news
  node index.js github    # Just update GitHub
  node index.js digest    # Generate daily digest
  node index.js stats     # Show current stats

Environment:
  Make sure .env file is configured with:
  - NEWSAPI_KEY
  - DEEPSEEK_API_KEY
  - DATABASE_PATH
  - SITE_URL
  - GITHUB_REPO_PATH (optional, defaults to digital-growth-insider)
  - GIT_USER (optional, defaults to johnrochie)
  - GIT_EMAIL (optional, defaults to john.roche@ictservices.ie)
  `);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AutomationOrchestrator;