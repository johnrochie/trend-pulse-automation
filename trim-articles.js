#!/usr/bin/env node
/**
 * Trim automation-output.json to keep at most 100 regular articles
 * while preserving all daily digests.
 * 
 * Steps:
 * 1. Load automation-output.json
 * 2. Split into regular articles and daily digests
 * 3. Sort regular articles by publishedAt (newest first)
 * 4. Keep only 100 most recent regular articles
 * 5. Append all daily digests
 * 6. Write back to file
 */

const fs = require('fs').promises;
const path = require('path');

async function trimArticles() {
  const filePath = path.join(__dirname, 'automation-output.json');
  
  try {
    console.log('📋 Loading automation-output.json...');
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const articles = data.articles || [];
    
    console.log(`📊 Total articles: ${articles.length}`);
    
    // Split articles
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
    
    console.log(`📰 Regular articles: ${regularArticles.length}`);
    console.log(`📅 Daily digests: ${dailyDigests.length}`);
    
    // Sort regular articles by publishedAt (newest first)
    regularArticles.sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.published_at_site || 0);
      const dateB = new Date(b.publishedAt || b.published_at_site || 0);
      return dateB - dateA; // Newest first
    });
    
    // Keep only 100 most recent regular articles
    const trimmedRegularArticles = regularArticles.slice(0, 100);
    
    console.log(`✂️  Trimmed regular articles to: ${trimmedRegularArticles.length}`);
    
    // Combine: trimmed regular articles + all daily digests
    const trimmedArticles = [...trimmedRegularArticles, ...dailyDigests];
    
    console.log(`🎯 Final total articles: ${trimmedArticles.length}`);
    
    // Create backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Write trimmed file
    const trimmedData = { ...data, articles: trimmedArticles };
    await fs.writeFile(filePath, JSON.stringify(trimmedData, null, 2));
    
    console.log('✅ Successfully trimmed automation-output.json');
    console.log('');
    console.log('📈 STATS:');
    console.log(`   Regular articles kept: ${trimmedRegularArticles.length}/100`);
    console.log(`   Daily digests kept: ${dailyDigests.length} (all preserved)`);
    console.log(`   Total after trim: ${trimmedArticles.length}`);
    console.log(`   Articles removed: ${articles.length - trimmedArticles.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  trimArticles();
}

module.exports = trimArticles;