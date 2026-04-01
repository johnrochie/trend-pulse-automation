const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function fixGitHub() {
  console.log('🚀 FIXING GITHUB ARTICLES LIMIT');
  
  // Load ALL articles from automation output
  const outputPath = path.join(__dirname, 'output', 'articles.json');
  const outputData = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  const allArticles = outputData.articles;
  
  console.log(`📚 Loaded ${allArticles.length} articles from automation output`);
  
  // Sort by date (newest first)
  const sortedArticles = allArticles.sort((a, b) => 
    new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  
  // Keep ALL articles (no limit)
  const finalArticles = sortedArticles;
  
  console.log(`🎯 Keeping ${finalArticles.length} articles (NO LIMIT)`);
  
  // Create final data
  const finalData = {
    articles: finalArticles,
    lastUpdated: new Date().toISOString(),
    count: finalArticles.length,
    source: 'Trend Pulse Automation - Fixed Unlimited'
  };
  
  // Save to trend-pulse directory
  const trendPulsePath = '/home/jr/.openclaw/workspace/trend-pulse/automation-output.json';
  await fs.writeFile(trendPulsePath, JSON.stringify(finalData, null, 2));
  console.log(`💾 Saved ${finalArticles.length} articles to ${trendPulsePath}`);
  
  // Push to GitHub
  console.log('🚀 Pushing to GitHub...');
  const gitDir = '/home/jr/.openclaw/workspace/trend-pulse';
  
  try {
    await execPromise(`cd ${gitDir} && git add automation-output.json`);
    await execPromise(`cd ${gitDir} && git commit -m "Fix: Unlimited articles (${finalArticles.length} total)"`);
    await execPromise(`cd ${gitDir} && git push origin main`);
    console.log('✅ Successfully pushed to GitHub!');
  } catch (error) {
    console.error('❌ GitHub push failed:', error.message);
  }
  
  console.log(`📈 FINAL: ${finalArticles.length} articles now on GitHub`);
  console.log(`🌐 URL: https://raw.githubusercontent.com/johnrochie/trend-pulse/main/automation-output.json`);
}

fixGitHub().catch(console.error);
