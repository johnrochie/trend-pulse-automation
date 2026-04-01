const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./generate-articles');

// Categories we need more content for
const categories = [
  'Technology',
  'Business', 
  'Entertainment',
  'Lifestyle',
  'Finance',
  'Health',
  'Science',
  'Sports'
];

// Trending topics for each category
const trendingTopics = {
  Technology: [
    'AI Regulation and Ethics in 2026',
    'Quantum Computing Breakthroughs',
    'Metaverse Development Trends',
    'Cybersecurity Threats and Solutions',
    '5G and 6G Network Expansion'
  ],
  Business: [
    'Remote Work Productivity Tools',
    'Sustainable Business Practices',
    'E-commerce Growth Strategies',
    'Startup Funding Landscape 2026',
    'Supply Chain Optimization'
  ],
  Entertainment: [
    'Streaming Service Price Wars',
    'Virtual Reality Concerts',
    'Gaming Industry Revenue Trends',
    'Film Production Technology',
    'Music Streaming Royalties'
  ],
  Lifestyle: [
    'Mental Health and Wellness Apps',
    'Sustainable Living Trends',
    'Digital Nomad Lifestyle',
    'Home Office Ergonomics',
    'Mindfulness and Meditation'
  ],
  Finance: [
    'Cryptocurrency Regulation Updates',
    'ESG Investing Performance',
    'Fintech Innovation Trends',
    'Personal Finance Automation',
    'Real Estate Market Predictions'
  ],
  Health: [
    'Telemedicine Adoption Rates',
    'Wearable Health Technology',
    'Mental Health Awareness',
    'Nutrition and Diet Trends',
    'Fitness Technology Innovation'
  ],
  Science: [
    'Climate Change Research Updates',
    'Space Exploration Milestones',
    'Medical Research Breakthroughs',
    'Renewable Energy Advances',
    'Biotechnology Innovations'
  ],
  Sports: [
    'Esports Industry Growth',
    'Sports Technology Advancements',
    'Athlete Mental Health Focus',
    'Sustainable Sports Events',
    'Sports Broadcasting Trends'
  ]
};

async function generateMoreContent() {
  console.log('Generating additional content for Trend Pulse...');
  
  // Load existing articles
  const articlesPath = path.join(__dirname, 'output/articles.json');
  let existingArticles = [];
  
  if (fs.existsSync(articlesPath)) {
    const data = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    existingArticles = data.articles || [];
    console.log(`Loaded ${existingArticles.length} existing articles`);
  }
  
  const newArticles = [];
  const usedTitles = new Set(existingArticles.map(a => a.title.toLowerCase()));
  
  // Generate 2 articles for each category
  for (const category of categories) {
    const topics = trendingTopics[category] || [];
    
    for (let i = 0; i < 2 && i < topics.length; i++) {
      const topic = topics[i];
      const title = `${topic}: Trends and Analysis`;
      
      // Skip if title already exists
      if (usedTitles.has(title.toLowerCase())) {
        console.log(`Skipping duplicate title: ${title}`);
        continue;
      }
      
      console.log(`Generating article: ${title} (${category})`);
      
      try {
        const article = await generateArticle({
          title: topic,
          category: category.toLowerCase(),
          source: 'Trend Pulse Analysis',
          includeSeo: true
        });
        
        // Add additional metadata
        article.id = existingArticles.length + newArticles.length + 1;
        article.trendingScore = Math.floor(Math.random() * 30) + 70; // 70-100
        article.views = Math.floor(Math.random() * 5000) + 1000;
        article.readTime = `${Math.floor(Math.random() * 4) + 3} min`;
        article.tags = [category, 'Trends', 'Analysis', '2026'];
        
        newArticles.push(article);
        usedTitles.add(title.toLowerCase());
        
        console.log(`✓ Generated: ${article.title}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error generating article for ${topic}:`, error.message);
      }
    }
  }
  
  // Combine with existing articles
  const allArticles = [...newArticles, ...existingArticles];
  
  // Update IDs to be sequential
  allArticles.forEach((article, index) => {
    article.id = index + 1;
  });
  
  // Save to file
  const outputData = {
    generatedAt: new Date().toISOString(),
    articleCount: allArticles.length,
    articles: allArticles
  };
  
  fs.writeFileSync(articlesPath, JSON.stringify(outputData, null, 2));
  console.log(`\n✅ Generated ${newArticles.length} new articles`);
  console.log(`📊 Total articles: ${allArticles.length}`);
  console.log(`💾 Saved to: ${articlesPath}`);
  
  // Also update the API directory
  const apiDir = path.join(__dirname, 'output/api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }
  
  // Save individual article files
  allArticles.forEach(article => {
    const articleFile = path.join(apiDir, `${article.id}.json`);
    fs.writeFileSync(articleFile, JSON.stringify(article, null, 2));
  });
  
  console.log(`📁 Updated API directory with ${allArticles.length} articles`);
  
  return {
    newArticles: newArticles.length,
    totalArticles: allArticles.length,
    categories: categories.length
  };
}

// Run if called directly
if (require.main === module) {
  generateMoreContent().catch(console.error);
}

module.exports = { generateMoreContent };