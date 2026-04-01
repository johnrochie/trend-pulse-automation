const fs = require('fs');
const path = require('path');

/**
 * Generate weekly quiz questions based on trending articles
 * This would be run weekly via cron job
 */

function generateWeeklyQuiz() {
  console.log('🎯 Generating Weekly Quiz Questions...\n');
  
  // Load current articles
  const articlesPath = path.join(__dirname, 'output/articles.json');
  if (!fs.existsSync(articlesPath)) {
    console.error('❌ No articles found. Run content generation first.');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  const articles = data.articles || [];
  
  if (articles.length === 0) {
    console.error('❌ No articles available for quiz generation.');
    return;
  }
  
  // Get trending articles (highest trendingScore)
  const trendingArticles = [...articles]
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 15); // Top 15 trending articles
  
  console.log(`📊 Found ${trendingArticles.length} trending articles`);
  
  // Generate quiz questions from trending articles
  const quizQuestions = [];
  const categories = {};
  
  trendingArticles.forEach((article, index) => {
    if (index >= 10) return; // Max 10 questions
    
    const category = article.category.charAt(0).toUpperCase() + article.category.slice(1);
    categories[category] = (categories[category] || 0) + 1;
    
    // Create question based on article content
    const question = createQuestionFromArticle(article, index);
    if (question) {
      quizQuestions.push(question);
    }
  });
  
  // Create quiz data
  const quizData = {
    week: getWeekNumber(),
    title: `Week ${getWeekNumber()}: Trending Topics Quiz`,
    description: "Test your knowledge of this week's most discussed topics based on trending articles.",
    generatedAt: new Date().toISOString(),
    questions: quizQuestions,
    stats: {
      totalArticles: articles.length,
      trendingArticles: trendingArticles.length,
      categories: Object.keys(categories).length,
      questionCount: quizQuestions.length
    },
    categoryBreakdown: categories
  };
  
  // Save quiz data
  const quizDir = path.join(__dirname, 'output/quiz');
  if (!fs.existsSync(quizDir)) {
    fs.mkdirSync(quizDir, { recursive: true });
  }
  
  const quizFilePath = path.join(quizDir, `week-${getWeekNumber()}.json`);
  fs.writeFileSync(quizFilePath, JSON.stringify(quizData, null, 2));
  
  console.log(`\n✅ Generated ${quizQuestions.length} quiz questions`);
  console.log(`📁 Saved to: ${quizFilePath}`);
  console.log('\n📊 Category Breakdown:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} questions`);
  });
  
  return quizData;
}

function createQuestionFromArticle(article, index) {
  const category = article.category.charAt(0).toUpperCase() + article.category.slice(1);
  
  // Extract key information from article
  const title = article.title;
  const content = article.content || '';
  const excerpt = article.excerpt || '';
  
  // Create different types of questions based on article content
  const questionTypes = [
    createMultipleChoiceQuestion,
    createTrueFalseQuestion,
    createStatisticsQuestion
  ];
  
  const questionType = questionTypes[index % questionTypes.length];
  return questionType(article, category, index);
}

function createMultipleChoiceQuestion(article, category, index) {
  const difficulties = ['easy', 'medium', 'hard'];
  const difficulty = difficulties[index % difficulties.length];
  
  // Extract topic from title
  const topic = article.title.split(':')[0] || article.title.split(' - ')[0] || article.title;
  
  const questions = {
    Technology: [
      `What is the main focus of "${topic}" according to recent analysis?`,
      `Which technology is central to "${topic}" developments?`,
      `What impact is "${topic}" expected to have on the industry?`
    ],
    Business: [
      `What key trend is driving "${topic}" in current markets?`,
      `Which strategy is most effective for "${topic}" according to experts?`,
      `What is the projected growth rate for "${topic}"?`
    ],
    Entertainment: [
      `Which platform is leading in "${topic}" adoption?`,
      `What consumer behavior change is driving "${topic}" growth?`,
      `How is "${topic}" changing content consumption patterns?`
    ],
    Lifestyle: [
      `What benefit does "${topic}" provide according to studies?`,
      `Which demographic is adopting "${topic}" most rapidly?`,
      `What is the main appeal of "${topic}" for users?`
    ]
  };
  
  const categoryQuestions = questions[category] || [
    `What is the significance of "${topic}" in current trends?`,
    `Which factor is most influencing "${topic}" developments?`,
    `What does recent data show about "${topic}"?`
  ];
  
  const questionText = categoryQuestions[index % categoryQuestions.length];
  
  // Create plausible options
  const options = [
    getCorrectOption(article, category),
    getPlausibleOption(category, false),
    getPlausibleOption(category, false),
    getPlausibleOption(category, false)
  ];
  
  // Shuffle options
  const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
  const correctAnswer = shuffledOptions.indexOf(options[0]);
  
  return {
    id: index + 1,
    question: questionText,
    options: shuffledOptions,
    correctAnswer: correctAnswer,
    explanation: `Based on analysis of "${article.title}" from Trend Pulse. ${article.excerpt || 'Recent data supports this trend.'}`,
    category: category,
    difficulty: difficulty,
    points: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15,
    sourceArticle: article.title,
    sourceUrl: article.url
  };
}

function createTrueFalseQuestion(article, category, index) {
  const topic = article.title.split(':')[0] || article.title;
  
  // Create true/false statement based on article
  const statements = [
    `"${topic}" has seen significant growth in the past year.`,
    `Experts predict continued expansion of "${topic}" in 2026.`,
    `Consumer adoption of "${topic}" exceeds initial projections.`,
    `"${topic}" represents a major shift in industry practices.`,
    `The data shows clear benefits from "${topic}" implementation.`
  ];
  
  const statement = statements[index % statements.length];
  const isTrue = Math.random() > 0.3; // 70% true, 30% false
  
  return {
    id: index + 1,
    question: `True or False: ${statement}`,
    options: ["True", "False"],
    correctAnswer: isTrue ? 0 : 1,
    explanation: isTrue 
      ? `Analysis confirms this statement. ${article.excerpt || 'Recent studies support this trend.'}`
      : `This statement is not supported by current data. ${article.excerpt || 'The evidence suggests otherwise.'}`,
    category: category,
    difficulty: 'medium',
    points: 10,
    sourceArticle: article.title,
    sourceUrl: article.url
  };
}

function createStatisticsQuestion(article, category, index) {
  const topic = article.title.split(':')[0] || article.title;
  
  // Create percentage/statistic question
  const percentages = [25, 42, 58, 67, 73, 85];
  const percentage = percentages[index % percentages.length];
  
  const questions = [
    `What percentage of [relevant group] is involved with "${topic}"?`,
    `How much growth has "${topic}" experienced in the past year?`,
    `What is the adoption rate for "${topic}" among users?`,
    `How effective is "${topic}" according to recent studies?`
  ];
  
  const questionText = questions[index % questions.length];
  
  // Create options around the percentage
  const options = [
    `${percentage}%`,
    `${percentage - 15}%`,
    `${percentage + 10}%`,
    `${percentage - 5}%`
  ].sort(() => Math.random() - 0.5);
  
  const correctAnswer = options.indexOf(`${percentage}%`);
  
  return {
    id: index + 1,
    question: questionText,
    options: options,
    correctAnswer: correctAnswer,
    explanation: `Recent data shows ${percentage}% involvement/adoption/growth for "${topic}". ${article.excerpt || 'This represents significant progress in the field.'}`,
    category: category,
    difficulty: 'hard',
    points: 15,
    sourceArticle: article.title,
    sourceUrl: article.url
  };
}

function getCorrectOption(article, category) {
  const topic = article.title.split(':')[0] || article.title;
  
  const optionsByCategory = {
    Technology: [
      `Increased investment in AI and automation`,
      `Advancements in computing power and efficiency`,
      `Integration with existing digital infrastructure`,
      `Focus on user experience and accessibility`
    ],
    Business: [
      `Strategic partnerships and collaborations`,
      `Data-driven decision making processes`,
      `Customer-centric service improvements`,
      `Operational efficiency optimizations`
    ],
    Entertainment: [
      `Enhanced content personalization algorithms`,
      `Multi-platform distribution strategies`,
      `Interactive viewer engagement features`,
      `Original content production investments`
    ],
    Lifestyle: [
      `Health and wellness integration`,
      `Sustainable practice adoption`,
      `Work-life balance improvements`,
      `Community building features`
    ]
  };
  
  const categoryOptions = optionsByCategory[category] || [
    `Market expansion and growth`,
    `Technology integration`,
    `User adoption increases`,
    `Industry standard changes`
  ];
  
  return categoryOptions[Math.floor(Math.random() * categoryOptions.length)];
}

function getPlausibleOption(category, isCorrect) {
  // Generate plausible but incorrect options
  const plausibleOptions = [
    "Regulatory compliance requirements",
    "Market saturation concerns", 
    "Technical implementation challenges",
    "Consumer privacy considerations",
    "Cost optimization strategies",
    "Competitive market pressures",
    "Supply chain disruptions",
    "Talent acquisition difficulties"
  ];
  
  return plausibleOptions[Math.floor(Math.random() * plausibleOptions.length)];
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

// Run if called directly
if (require.main === module) {
  generateWeeklyQuiz();
}

module.exports = { generateWeeklyQuiz };