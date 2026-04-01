const fs = require('fs');
const path = require('path');

// Mock article templates by category
const articleTemplates = {
  Technology: {
    titles: [
      'AI Regulation and Ethics: What 2026 Holds for Artificial Intelligence Governance',
      'Quantum Computing Breakthroughs: How New Processors Are Changing Computing',
      'Metaverse Development Trends: The Future of Virtual Interaction',
      'Cybersecurity in 2026: Emerging Threats and Advanced Solutions',
      '5G to 6G Transition: What the Next Generation of Networks Will Enable'
    ],
    content: `The technology landscape continues to evolve at an unprecedented pace. Recent developments in {topic} are reshaping industries and consumer experiences alike. Industry analysts predict significant growth in this sector, with major players investing heavily in research and development.

Key trends include increased automation, enhanced user interfaces, and greater integration with existing systems. The market response has been overwhelmingly positive, with adoption rates climbing steadily quarter over quarter.

Experts suggest that businesses should prepare for these changes by updating their infrastructure and training their teams on new technologies. The long-term implications could fundamentally alter how we work, communicate, and interact with digital systems.`
  },
  Business: {
    titles: [
      'Remote Work Productivity: Tools and Strategies for Distributed Teams in 2026',
      'Sustainable Business Practices: How Companies Are Reducing Environmental Impact',
      'E-commerce Growth Strategies: Winning in the Competitive Online Marketplace',
      'Startup Funding Landscape: Where Venture Capital Is Flowing This Year',
      'Supply Chain Optimization: Leveraging Technology for Efficiency Gains'
    ],
    content: `The business world faces new challenges and opportunities in the current economic climate. {topic} has emerged as a critical focus area for organizations seeking competitive advantage.

Companies that have successfully implemented these strategies report improved operational efficiency, enhanced customer satisfaction, and stronger financial performance. The data shows a clear correlation between adoption of these practices and business success metrics.

Industry leaders emphasize the importance of strategic planning and continuous improvement. As market conditions evolve, businesses must remain agile and responsive to changing consumer demands and technological advancements.`
  },
  Entertainment: {
    titles: [
      'Streaming Service Evolution: How Price Wars Are Reshaping Entertainment',
      'Virtual Reality Concerts: The Future of Live Music Experiences',
      'Gaming Industry Revenue: Trends Driving Record-Breaking Growth',
      'Film Production Technology: Innovations Changing How Movies Are Made',
      'Music Streaming Royalties: The Economics of Digital Music Distribution'
    ],
    content: `The entertainment industry continues to innovate, with {topic} at the forefront of recent developments. Consumer preferences are shifting toward more immersive and personalized experiences.

Content creators are leveraging new technologies to engage audiences in novel ways. The results have been impressive, with record-breaking viewership numbers and unprecedented audience engagement metrics.

Analysts predict continued growth in this sector, driven by technological advancements and changing consumption patterns. The intersection of entertainment and technology promises to deliver increasingly sophisticated experiences to global audiences.`
  },
  Lifestyle: {
    titles: [
      'Mental Health and Wellness: How Apps Are Supporting Better Mental Health',
      'Sustainable Living Trends: Practical Steps for Environmentally Conscious Living',
      'Digital Nomad Lifestyle: Balancing Work and Travel in the Modern Era',
      'Home Office Ergonomics: Creating Productive and Healthy Workspaces',
      'Mindfulness and Meditation: The Science Behind Stress Reduction Techniques'
    ],
    content: `Modern lifestyles are evolving to prioritize well-being and sustainability. {topic} represents a growing movement toward more conscious and intentional living.

Research indicates significant benefits for individuals who adopt these practices, including improved mental health, increased productivity, and enhanced overall quality of life. The data supports what many have experienced firsthand.

Experts recommend starting with small, manageable changes and building sustainable habits over time. The cumulative impact of these lifestyle adjustments can be profound, leading to lasting positive changes in both personal and professional domains.`
  },
  Finance: {
    titles: [
      'Cryptocurrency Regulation: Global Approaches to Digital Asset Governance',
      'ESG Investing Performance: How Sustainable Investments Are Performing',
      'Fintech Innovation: Technologies Transforming Financial Services',
      'Personal Finance Automation: Tools for Smarter Money Management',
      'Real Estate Market Predictions: Trends Shaping Property Investment'
    ],
    content: `The financial sector is undergoing significant transformation, with {topic} playing a central role in current developments. Regulatory changes, technological advancements, and shifting investor preferences are driving this evolution.

Data from recent quarters shows promising trends for informed investors. Those who understand these dynamics and adapt their strategies accordingly are positioned to achieve superior returns while managing risk effectively.

Financial advisors emphasize the importance of diversification and staying informed about market developments. As the landscape continues to change, proactive planning and strategic decision-making become increasingly valuable.`
  },
  Health: {
    titles: [
      'Telemedicine Adoption: How Virtual Healthcare Is Changing Patient Access',
      'Wearable Health Technology: Devices Monitoring and Improving Wellness',
      'Mental Health Awareness: Breaking Stigmas and Improving Access to Care',
      'Nutrition and Diet Trends: Evidence-Based Approaches to Healthy Eating',
      'Fitness Technology: Innovations Supporting Active Lifestyles'
    ],
    content: `Healthcare continues to evolve with technological advancements and improved understanding of wellness. {topic} represents significant progress in making healthcare more accessible, effective, and personalized.

Clinical studies demonstrate measurable benefits for patients who engage with these new approaches. Improved outcomes, reduced costs, and enhanced patient satisfaction are among the documented advantages.

Medical professionals stress the importance of evidence-based practices and personalized care plans. As research continues to advance, these innovations promise to further improve health outcomes and quality of life for populations worldwide.`
  },
  Science: {
    titles: [
      'Climate Change Research: Latest Findings and Implications for Policy',
      'Space Exploration Milestones: Recent Achievements and Future Missions',
      'Medical Research Breakthroughs: Promising Developments in Treatment',
      'Renewable Energy Advances: Technologies Powering a Sustainable Future',
      'Biotechnology Innovations: Applications Across Medicine and Industry'
    ],
    content: `Scientific progress continues to accelerate, with {topic} yielding important discoveries and practical applications. Researchers across disciplines are collaborating to address complex challenges and expand human knowledge.

The implications of these findings extend beyond academic circles, influencing policy decisions, industrial practices, and everyday life. The interdisciplinary nature of modern science enables breakthroughs that might have been impossible in more siloed research environments.

Scientists emphasize the importance of continued investment in research and education. As our understanding deepens, new questions emerge, driving further investigation and discovery in an ongoing cycle of scientific advancement.`
  },
  Sports: {
    titles: [
      'Esports Industry Growth: How Competitive Gaming Became Mainstream',
      'Sports Technology: Innovations Enhancing Performance and Safety',
      'Athlete Mental Health: The Growing Focus on Psychological Well-being',
      'Sustainable Sports Events: Reducing Environmental Impact of Major Competitions',
      'Sports Broadcasting Trends: How Viewing Experiences Are Evolving'
    ],
    content: `The world of sports continues to evolve, with {topic} representing significant changes in how athletes train, compete, and engage with fans. Technological advancements and shifting cultural attitudes are driving this transformation.

Data analytics, improved training methods, and enhanced fan experiences are among the areas seeing rapid development. The results include better performance, reduced injury rates, and more engaging spectator experiences.

Industry experts predict continued innovation in these areas, with technology playing an increasingly central role. As sports organizations adapt to these changes, they're finding new ways to connect with audiences and optimize performance at all levels.`
  }
};

// Generate mock articles
function generateMockArticles() {
  console.log('📝 Generating mock content for Trend Pulse...\n');
  
  // Load existing articles
  const articlesPath = path.join(__dirname, 'output/articles.json');
  let existingArticles = [];
  
  if (fs.existsSync(articlesPath)) {
    const data = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    existingArticles = data.articles || [];
    console.log(`📊 Loaded ${existingArticles.length} existing articles`);
  }
  
  const newArticles = [];
  const usedTitles = new Set(existingArticles.map(a => a.title.toLowerCase()));
  
  // Generate articles for each category
  Object.entries(articleTemplates).forEach(([category, template]) => {
    template.titles.forEach((title, index) => {
      // Skip if title already exists
      if (usedTitles.has(title.toLowerCase())) {
        return;
      }
      
      console.log(`✅ Generating: ${title} (${category})`);
      
      // Extract topic from title (remove after colon)
      const topic = title.split(':')[0] || title;
      
      const article = {
        id: existingArticles.length + newArticles.length + 1,
        title: title,
        excerpt: `Analysis of ${topic.toLowerCase()} and its impact on the ${category.toLowerCase()} sector. Key trends, data, and future predictions.`,
        content: template.content.replace('{topic}', topic),
        category: category,
        readTime: `${Math.floor(Math.random() * 3) + 3} min`,
        views: Math.floor(Math.random() * 8000) + 2000,
        trendingScore: Math.floor(Math.random() * 25) + 75, // 75-100
        tags: [category, 'Trends', 'Analysis', '2026', 'Market'],
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        publishedAtSite: 'Trend Pulse',
        color: getCategoryColor(category),
        url: `/article/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        imageUrl: getCategoryImage(category, index),
        sourceName: 'Trend Pulse Analysis',
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        seoTitle: `${title} | ${category} News - Trend Pulse`,
        metaDescription: `Comprehensive analysis of ${topic.toLowerCase()}. Latest trends, data, and expert insights from Trend Pulse.`,
        canonicalUrl: `https://www.trendpulse.life/article/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        ogImage: getCategoryImage(category, index),
        updatedAt: new Date().toISOString()
      };
      
      newArticles.push(article);
      usedTitles.add(title.toLowerCase());
    });
  });
  
  // Combine with existing articles (new articles first)
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
  
  console.log(`\n🎉 SUCCESS: Generated ${newArticles.length} new articles`);
  console.log(`📈 Total articles now: ${allArticles.length}`);
  console.log(`📁 Saved to: ${articlesPath}`);
  
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
  
  console.log(`🔧 Updated API directory with ${allArticles.length} articles`);
  
  // Show category breakdown
  console.log('\n📊 Category Breakdown:');
  const categoryCount = {};
  allArticles.forEach(article => {
    categoryCount[article.category] = (categoryCount[article.category] || 0) + 1;
  });
  
  Object.entries(categoryCount).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} articles`);
  });
  
  return {
    newArticles: newArticles.length,
    totalArticles: allArticles.length,
    categories: Object.keys(categoryCount).length
  };
}

// Helper functions
function getCategoryColor(category) {
  const colors = {
    Technology: 'from-blue-600 to-cyan-600',
    Business: 'from-purple-600 to-pink-600',
    Entertainment: 'from-orange-600 to-red-600',
    Lifestyle: 'from-green-600 to-emerald-600',
    Finance: 'from-yellow-600 to-amber-600',
    Health: 'from-teal-600 to-cyan-600',
    Science: 'from-indigo-600 to-blue-600',
    Sports: 'from-red-600 to-orange-600'
  };
  return colors[category] || 'from-gray-600 to-gray-800';
}

function getCategoryImage(category, index) {
  // Using Unsplash category-based images
  const images = {
    Technology: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format'
    ],
    Business: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format'
    ],
    Entertainment: [
      'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format'
    ],
    Lifestyle: [
      'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
      'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format'
    ]
  };
  
  // Default to generic images for other categories
  const defaultImages = [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
    'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format',
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=450&fit=crop&crop=entropy&q=80&auto=format'
  ];
  
  const categoryImages = images[category] || defaultImages;
  return categoryImages[index % categoryImages.length];
}

// Run if called directly
if (require.main === module) {
  generateMockArticles();
}

module.exports = { generateMockArticles };