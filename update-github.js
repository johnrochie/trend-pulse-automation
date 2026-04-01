#!/usr/bin/env node

/**
 * GitHub Articles Updater
 * 
 * This script updates the GitHub repository with new articles
 * while preserving existing ones.
 * 
 * Steps:
 * 1. Fetch current articles from GitHub
 * 2. Load new articles from local automation
 * 3. Merge (new articles first, remove duplicates)
 * 4. Keep only N articles (e.g., 50 for performance)
 * 5. Push updated file back to GitHub
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

require('dotenv').config();

class GitHubUpdater {
  constructor() {
    this.repoPath = process.env.GITHUB_REPO_PATH || '/home/jr/.openclaw/workspace/digital-growth-insider';
    this.automationPath = process.env.AUTOMATION_PATH || '/home/jr/.openclaw/workspace/trend-pulse-automation';
    this.outputFile = 'automation-output.json';
    this.maxArticles = 200; // Initial limit before final trim (trimArticles handles final limit)
    this.gitUser = process.env.GIT_USER || 'johnrochie';
    this.gitEmail = process.env.GIT_EMAIL || 'john.roche@ictservices.ie';
    this.githubToken = process.env.GITHUB_TOKEN || '';
  }

  async loadCurrentArticles() {
    try {
      const filePath = path.join(this.repoPath, this.outputFile);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      console.log(`📚 Loaded ${data.articles?.length || 0} current articles from ${filePath}`);
      return data.articles || [];
    } catch (error) {
      console.log('📚 No existing articles file found, starting fresh');
      return [];
    }
  }

  async loadNewArticles() {
    try {
      const automationFile = path.join(this.automationPath, 'output', 'articles.json');
      const content = await fs.readFile(automationFile, 'utf8');
      const data = JSON.parse(content);
      
      console.log(`🆕 Loaded ${data.articles?.length || 0} new articles from automation`);
      return data.articles || [];
    } catch (error) {
      console.error('❌ Error loading new articles:', error.message);
      return [];
    }
  }

  /**
   * Merge articles with new ones first, remove duplicates
   */
  mergeArticles(currentArticles, newArticles) {
    // Create a map of existing articles by ID for quick lookup
    const existingIds = new Set();
    const merged = [];
    
    // Add new articles first (most recent)
    for (const article of newArticles) {
      if (article.id && !existingIds.has(article.id)) {
        existingIds.add(article.id);
        merged.push(article);
      } else if (article.title) {
        // Use title as fallback identifier
        const titleKey = article.title.toLowerCase().trim();
        if (!existingIds.has(titleKey)) {
          existingIds.add(titleKey);
          merged.push(article);
        }
      }
    }
    
    // Add existing articles (excluding duplicates)
    for (const article of currentArticles) {
      if (article.id && !existingIds.has(article.id)) {
        existingIds.add(article.id);
        merged.push(article);
      } else if (article.title) {
        const titleKey = article.title.toLowerCase().trim();
        if (!existingIds.has(titleKey)) {
          existingIds.add(titleKey);
          merged.push(article);
        }
      }
    }
    
    // Keep only the most recent N articles
    const finalArticles = merged.slice(0, this.maxArticles);
    
    console.log(`🔄 Merge result: ${newArticles.length} new + ${currentArticles.length} existing = ${merged.length} total → ${finalArticles.length} kept (max ${this.maxArticles})`);
    
    return finalArticles;
  }

  async saveArticles(articles) {
    const filePath = path.join(this.repoPath, this.outputFile);
    
    // Trim articles: keep max 100 regular articles, all daily digests
    const trimmedArticles = this.trimArticles(articles);
    
    const data = {
      articles: trimmedArticles,
      lastUpdated: new Date().toISOString(),
      count: trimmedArticles.length,
      source: 'Trend Pulse Automation',
      metadata: {
        maxArticles: this.maxArticles,
        updateMethod: 'github-updater',
        updateTimestamp: new Date().toISOString(),
        trimStats: {
          originalCount: articles.length,
          trimmedCount: trimmedArticles.length,
          regularArticlesKept: trimmedArticles.filter(a => 
            (a.type !== 'daily-digest') && 
            (!a.slug || !a.slug.startsWith('daily-digest-'))
          ).length,
          dailyDigestsKept: trimmedArticles.filter(a => 
            (a.type === 'daily-digest') || 
            (a.slug && a.slug.startsWith('daily-digest-'))
          ).length
        }
      }
    };
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${trimmedArticles.length} articles to ${filePath}`);
    console.log(`   (Trimmed from ${articles.length} → ${trimmedArticles.length})`);
    
    return filePath;
  }

  /**
   * Trim articles to keep at most 100 regular articles while preserving all daily digests
   */
  trimArticles(articles) {
    const regularArticles = [];
    const dailyDigests = [];
    
    for (const article of articles) {
      const slug = article.slug || '';
      const type = article.type || '';
      
      // Check if it's a daily digest
      const isDailyDigest = type === 'daily-digest' || slug.startsWith('daily-digest-');
      
      if (isDailyDigest) {
        dailyDigests.push(article);
      } else {
        regularArticles.push(article);
      }
    }
    
    // Sort regular articles by publishedAt (newest first)
    regularArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.published_at_site || 0);
      const dateB = new Date(b.publishedAt || b.published_at_site || 0);
      return dateB - dateA; // Newest first
    });
    
    // Keep only 100 most recent regular articles
    const trimmedRegularArticles = regularArticles.slice(0, 100);
    
    // Combine: trimmed regular articles + all daily digests
    return [...trimmedRegularArticles, ...dailyDigests];
  }

  async setupGitConfig() {
    try {
      await execPromise(`cd ${this.repoPath} && git config user.name "${this.gitUser}"`);
      await execPromise(`cd ${this.repoPath} && git config user.email "${this.gitEmail}"`);
      console.log('✅ Git config set');
    } catch (error) {
      console.error('❌ Error setting git config:', error.message);
    }
  }

  async commitAndPush() {
    try {
      console.log('🚀 Committing and pushing to GitHub...');
      
      // Ensure git is configured
      await execPromise(`cd ${this.repoPath} && git config user.name "${this.gitUser}"`);
      await execPromise(`cd ${this.repoPath} && git config user.email "${this.gitEmail}"`);
      console.log('✅ Git configured:', this.gitUser, this.gitEmail);
      
      // First check if there are any changes
      const { stdout: statusOutput } = await execPromise(`cd ${this.repoPath} && git status --porcelain`);
      if (statusOutput.trim() === '') {
        console.log('ℹ️  No changes to commit (file unchanged)');
        return true;
      }
      
      console.log('📋 Changes detected:', statusOutput.trim());
      
      // Add the file
      await execPromise(`cd ${this.repoPath} && git add ${this.outputFile}`);
      console.log('✅ File added to git');
      
      // Commit
      const commitMessage = `Update articles: ${new Date().toISOString()}`;
      const { stdout: commitOutput, stderr: commitError } = await execPromise(`cd ${this.repoPath} && git commit -m "${commitMessage}"`);
      console.log('✅ Changes committed');
      if (commitOutput) console.log('   Commit output:', commitOutput.trim());
      
      // Push with more verbose output
      console.log('🚀 Pushing to GitHub...');
      
      let pushCommand = `cd ${this.repoPath} && git push origin main`;
      
      // Use GitHub token if available (for CI/CD environments)
      if (this.githubToken) {
        const remoteUrl = `https://${this.githubToken}@github.com/johnrochie/trend-pulse.git`;
        pushCommand = `cd ${this.repoPath} && git push ${remoteUrl} main`;
        console.log('   Using GitHub token authentication');
      } else {
        console.log('   Using stored credentials');
      }
      
      const { stdout: pushOutput, stderr: pushError } = await execPromise(`${pushCommand} 2>&1`);
      
      if (pushOutput && pushOutput.trim() !== 'Everything up-to-date') {
        console.log('✅ Changes pushed to GitHub');
        console.log('   Push output:', pushOutput.trim());
      } else if (pushOutput && pushOutput.trim() === 'Everything up-to-date') {
        console.log('ℹ️  Already up to date');
      }
      
      if (pushError && pushError.trim()) {
        console.log('⚠️  Push warnings:', pushError.trim());
      }
      
      return true;
    } catch (error) {
      console.error('❌ Git error:', error.message);
      console.error('❌ Error stdout:', error.stdout);
      console.error('❌ Error stderr:', error.stderr);
      
      return false;
    }
  }

  async run() {
    try {
      console.log('='.repeat(70));
      console.log('🚀 GITHUB ARTICLES UPDATER');
      console.log('='.repeat(70));
      console.log('📅', new Date().toLocaleString());
      console.log('='.repeat(70));
      
      // Step 1: Load current articles from GitHub repo
      console.log('\n📚 STEP 1: LOADING CURRENT ARTICLES');
      console.log('-'.repeat(40));
      const currentArticles = await this.loadCurrentArticles();
      
      // Step 2: Load new articles from automation
      console.log('\n🆕 STEP 2: LOADING NEW ARTICLES');
      console.log('-'.repeat(40));
      const newArticles = await this.loadNewArticles();
      
      if (newArticles.length === 0) {
        console.log('⚠️  No new articles to add. Exiting.');
        return { success: true, message: 'No new articles' };
      }
      
      // Step 3: Merge articles
      console.log('\n🔄 STEP 3: MERGING ARTICLES');
      console.log('-'.repeat(40));
      const mergedArticles = this.mergeArticles(currentArticles, newArticles);
      
      // Step 4: Save to file
      console.log('\n💾 STEP 4: SAVING ARTICLES');
      console.log('-'.repeat(40));
      await this.saveArticles(mergedArticles);
      
      // Step 5: Setup git config
      console.log('\n⚙️  STEP 5: SETTING UP GIT');
      console.log('-'.repeat(40));
      await this.setupGitConfig();
      
      // Step 6: Commit and push
      console.log('\n🚀 STEP 6: COMMITTING AND PUSHING');
      console.log('-'.repeat(40));
      const pushed = await this.commitAndPush();
      
      // Final results
      console.log('\n📈 FINAL RESULTS');
      console.log('='.repeat(70));
      console.log(`✅ Articles processed: ${mergedArticles.length}`);
      console.log(`✅ New articles added: ${newArticles.length}`);
      console.log(`✅ GitHub push: ${pushed ? 'Success' : 'Failed/No changes'}`);
      console.log(`✅ File: ${path.join(this.repoPath, this.outputFile)}`);
      console.log(`✅ GitHub URL: https://raw.githubusercontent.com/johnrochie/trend-pulse/main/${this.outputFile}`);
      console.log('='.repeat(70));
      
      return {
        success: true,
        articles: mergedArticles.length,
        newArticles: newArticles.length,
        pushed: pushed,
        githubUrl: `https://raw.githubusercontent.com/johnrochie/trend-pulse/main/${this.outputFile}`
      };
      
    } catch (error) {
      console.error('\n💥 GITHUB UPDATER FAILED');
      console.error('='.repeat(70));
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.log('='.repeat(70));
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Command line interface
async function main() {
  const updater = new GitHubUpdater();
  
  try {
    const result = await updater.run();
    
    if (result.success) {
      console.log('\n🎯 GITHUB UPDATE COMPLETE');
      console.log('='.repeat(70));
      if (result.pushed) {
        console.log('✅ Articles are now live on GitHub!');
        console.log(`🌐 Vercel will fetch from: ${result.githubUrl}`);
      } else {
        console.log('ℹ️  No changes to push (articles already up to date)');
      }
      process.exit(0);
    } else {
      console.error('❌ GitHub update failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = GitHubUpdater;