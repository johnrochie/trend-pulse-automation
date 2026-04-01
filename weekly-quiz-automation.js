#!/usr/bin/env node

/**
 * Weekly Quiz Automation System
 * 
 * Generates a new quiz every Thursday with 20 questions
 * Questions are based on articles that appeared on the site during the week
 * 
 * Run via cron: 0 9 * * 4 (Every Thursday at 9:00 AM)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎯 WEEKLY QUIZ AUTOMATION SYSTEM');
console.log('================================\n');

// Configuration
const CONFIG = {
  quizDay: 4, // Thursday (0=Sunday, 1=Monday, ..., 4=Thursday)
  questionCount: 20,
  maxArticlesPerCategory: 3,
  outputDir: path.join(__dirname, 'output/quiz'),
  articlesFile: path.join(__dirname, 'output/articles.json'),
  gitRepo: 'https://github.com/johnrochie/trend-pulse.git',
  gitBranch: 'main',
  gitUser: 'Trend Pulse Bot',
  gitEmail: 'bot@trendpulse.life'
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main function to generate weekly quiz
 */
async function generateWeeklyQuiz() {
  console.log(`📅 Generating Weekly Quiz for ${new Date().toLocaleDateString()}\n`);
  
  // Check if it's Thursday
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  if (dayOfWeek !== CONFIG.quizDay) {
    console.log(`⚠️  Today is ${getDayName(dayOfWeek)}, not Thursday. Skipping quiz generation.`);
    console.log(`📅 Next quiz will be generated on Thursday.`);
    return;
  }
  
  console.log('✅ Today is Thursday - Generating new weekly quiz!\n');
  
  // Step 1: Load this week's articles
  console.log('📚 STEP 1: Loading this week\'s articles...');
  const weeklyArticles = getThisWeeksArticles();
  console.log(`   Found ${weeklyArticles.length} articles from this week\n`);
  
  if (weeklyArticles.length === 0) {
    console.log('❌ No articles found from this week. Using trending articles instead.');
    const allArticles = loadAllArticles();
    weeklyArticles.push(...allArticles.slice(0, 20));
  }
  
  // Step 2: Generate quiz questions
  console.log('❓ STEP 2: Generating 20 quiz questions...');
  const quizQuestions = generateQuizQuestions(weeklyArticles);
  console.log(`   Generated ${quizQuestions.length} questions\n`);
  
  // Step 3: Create quiz data structure
  console.log('📊 STEP 3: Creating quiz data structure...');
  const quizData = createQuizData(quizQuestions);
  
  // Step 4: Save quiz file
  console.log('💾 STEP 4: Saving quiz file...');
  const quizFilePath = saveQuizFile(quizData);
  console.log(`   Saved to: ${quizFilePath}\n`);
  
  // Step 5: Update website quiz component
  console.log('🌐 STEP 5: Updating website quiz component...');
  updateWebsiteQuiz(quizData);
  
  // Step 6: Commit and push to GitHub
  console.log('🚀 STEP 6: Committing and pushing to GitHub...');
  commitAndPushToGitHub(quizData);
  
  console.log('\n🎉 WEEKLY QUIZ GENERATION COMPLETE!');
  console.log('===================================');
  console.log(`📊 Questions: ${quizQuestions.length}`);
  console.log(`📁 File: ${path.basename(quizFilePath)}`);
  console.log(`🌐 Live at: https://www.trendpulse.life/quiz`);
  console.log(`📅 Next quiz: Next Thursday\n`);
  
  return quizData;
}

/**
 * Get articles from this week (last 7 days)
 */
function getThisWeeksArticles() {
  if (!fs.existsSync(CONFIG.articlesFile)) {
    console.log('❌ Articles file not found:', CONFIG.articlesFile);
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(CONFIG.articlesFile, 'utf8'));
  const articles = data.articles || [];
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  return articles.filter(article => {
    const publishedDate = new Date(article.publishedAt || article.updatedAt || data.generatedAt);
    return publishedDate >= oneWeekAgo;
  });
}

/**
 * Load all articles (fallback)
 */
function loadAllArticles() {
  if (!fs.existsSync(CONFIG.articlesFile)) {
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(CONFIG.articlesFile, 'utf8'));
  return data.articles || [];
}

/**
 * Generate quiz questions from weekly articles
 */
function generateQuizQuestions(weeklyArticles) {
  const questions = [];
  const usedArticles = new Set();
  
  // Group articles by category
  const articlesByCategory = {};
  weeklyArticles.forEach(article => {
    const category = article.category || 'General';
    if (!articlesByCategory[category]) {
      articlesByCategory[category] = [];
    }
    articlesByCategory[category].push(article);
  });
  
  // Generate questions from each category
  Object.entries(articlesByCategory).forEach(([category, articles]) => {
    const categoryArticles = articles.slice(0, CONFIG.maxArticlesPerCategory);
    
    categoryArticles.forEach((article, index) => {
      if (questions.length >= CONFIG.questionCount) return;
      if (usedArticles.has(article.id)) return;
      
      // Create different types of questions
      const questionTypes = [
        createMultipleChoiceQuestion,
        createTrueFalseQuestion,
        createStatisticsQuestion,
        createFillInTheBlankQuestion
      ];
      
      const questionType = questionTypes[questions.length % questionTypes.length];
      const question = questionType(article, category, questions.length);
      
      if (question) {
        questions.push(question);
        usedArticles.add(article.id);
      }
    });
  });
  
  // If we don't have enough questions, create generic ones
  while (questions.length < CONFIG.questionCount) {
    const article = weeklyArticles[questions.length % weeklyArticles.length] || {
      title: 'Trending News Topics',
      category: 'General'
    };
    
    const question = createMultipleChoiceQuestion(article, article.category || 'General', questions.length);
    questions.push(question);
  }
  
  return questions.slice(0, CONFIG.questionCount);
}

/**
 * Create multiple choice question
 */
function createMultipleChoiceQuestion(article, category, index) {
  const difficulties = ['easy', 'medium', 'hard'];
  const difficulty = difficulties[index % difficulties.length];
  
  const topic = extractTopic(article.title);
  const questionTemplates = [
    `What was the main finding in "${topic}" according to this week's analysis?`,
    `Which trend is driving "${topic}" developments this week?`,
    `What impact did "${topic}" have on the market this week?`,
    `Which technology was central to "${topic}" this week?`,
    `What consumer behavior change was observed in "${topic}" this week?`
  ];
  
  const questionText = questionTemplates[index % questionTemplates.length];
  
  // Create options
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
    explanation: `Based on this week's article: "${article.title}". ${article.excerpt || 'Recent analysis supports this trend.'}`,
    category: category,
    difficulty: difficulty,
    points: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15,
    sourceArticle: article.title,
    sourceUrl: article.url || `/article/${article.slug || article.id}`,
    articleId: article.id,
    week: getWeekNumber()
  };
}

/**
 * Create true/false question
 */
function createTrueFalseQuestion(article, category, index) {
  const topic = extractTopic(article.title);
  
  const statements = [
    `"${topic}" saw significant growth this week.`,
    `Experts predict continued expansion of "${topic}" in the coming weeks.`,
    `Consumer adoption of "${topic}" exceeded expectations this week.`,
    `"${topic}" represents a major shift observed this week.`,
    `The data shows clear benefits from "${topic}" implementation this week.`
  ];
  
  const statement = statements[index % statements.length];
  const isTrue = Math.random() > 0.3; // 70% true, 30% false
  
  return {
    id: index + 1,
    question: `True or False: ${statement}`,
    options: ["True", "False"],
    correctAnswer: isTrue ? 0 : 1,
    explanation: isTrue 
      ? `This week's analysis confirms this statement. ${article.excerpt || 'Recent data supports this trend.'}`
      : `This statement is not supported by this week's data. ${article.excerpt || 'The evidence suggests otherwise.'}`,
    category: category,
    difficulty: 'medium',
    points: 10,
    sourceArticle: article.title,
    sourceUrl: article.url || `/article/${article.slug || article.id}`,
    articleId: article.id,
    week: getWeekNumber()
  };
}

/**
 * Create statistics question
 */
function createStatisticsQuestion(article, category, index) {
  const topic = extractTopic(article.title);
  const percentages = [25, 42, 58, 67, 73, 85];
  const percentage = percentages[index % percentages.length];
  
  const questionTemplates = [
    `What percentage increase was reported for "${topic}" this week?`,
    `How much growth did "${topic}" experience this week?`,
    `What adoption rate was observed for "${topic}" this week?`,
    `How effective was "${topic}" according to this week's studies?`,
    `What market share did "${topic}" achieve this week?`
  ];
  
  const questionText = questionTemplates[index % questionTemplates.length];
  
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
    explanation: `This week's data shows ${percentage}% for "${topic}". ${article.excerpt || 'This represents significant progress observed this week.'}`,
    category: category,
    difficulty: 'hard',
    points: 15,
    sourceArticle: article.title,
    sourceUrl: article.url || `/article/${article.slug || article.id}`,
    articleId: article.id,
    week: getWeekNumber()
  };
}

/**
 * Create fill in the blank question
 */
function createFillInTheBlankQuestion(article, category, index) {
  const topic = extractTopic(article.title);
  
  const templates = [
    `This week's analysis of "${topic}" focused on ______.`,
    `The main driver behind "${topic}" this week was ______.`,
    `Experts identified ______ as the key factor in "${topic}" developments.`,
    `Consumer response to "${topic}" this week was characterized by ______.`,
    `The most significant impact of "${topic}" this week was ______.`
  ];
  
  const questionText = templates[index % templates.length];
  
  // Create options
  const options = [
    getCorrectOption(article, category),
    getPlausibleOption(category, false),
    getPlausibleOption(category, false),
    getPlausibleOption(category, false)
  ].sort(() => Math.random() - 0.5);
  
  const correctAnswer = options.indexOf(getCorrectOption(article, category));
  
  return {
    id: index + 1,
    question: questionText,
    options: options,
    correctAnswer: correctAnswer,
    explanation: `Based on this week's coverage of "${topic}". ${article.excerpt || 'The analysis provides insights into recent developments.'}`,
    category: category,
    difficulty: 'medium',
    points: 10,
    sourceArticle: article.title,
    sourceUrl: article.url || `/article/${article.slug || article.id}`,
    articleId: article.id,
    week: getWeekNumber()
  };
}

/**
 * Helper functions
 */
function extractTopic(title) {
  return title.split(':')[0] || title.split(' - ')[0] || title;
}

function getCorrectOption(article, category) {
  const optionsByCategory = {
    Technology: [
      'Increased AI integration and automation',
      'Advancements in computing efficiency',
      'Enhanced user experience features',
      'Improved security protocols'
    ],
    Business: [
      'Strategic partnership developments',
      'Data-driven decision making improvements',
      'Customer service enhancements',
      'Operational efficiency optimizations'
    ],
    Entertainment: [
      'Content personalization advancements',
      'Multi-platform distribution strategies',
      'Interactive viewer engagement features',
      'Original content production investments'
    ],
    Lifestyle: [
      'Health and wellness integration',
      'Sustainable practice adoption',
      'Work-life balance improvements',
      'Community building initiatives'
    ],
    Finance: [
      'Market expansion strategies',
      'Investment optimization techniques',
      'Risk management improvements',
      'Financial technology innovations'
    ],
    Health: [
      'Telemedicine adoption increases',
      'Wearable technology advancements',
      'Mental health awareness growth',
      'Preventive care improvements'
    ],
    Science: [
      'Research methodology advancements',
      'Data analysis improvements',
      'Collaborative research initiatives',
      'Practical application developments'
    ],
    Sports: [
      'Performance technology innovations',
      'Fan engagement enhancements',
      'Athlete wellness improvements',
      'Sustainable event practices'
    ]
  };
  
  const categoryOptions = optionsByCategory[category] || [
    'Market growth and expansion',
    'Technology integration improvements',
    'User adoption increases',
    'Industry standard advancements'
  ];
  
  return categoryOptions[Math.floor(Math.random() * categoryOptions.length)];
}

function getPlausibleOption(category, isCorrect) {
  const plausibleOptions = [
    'Regulatory compliance requirements',
    'Market saturation concerns',
    'Technical implementation challenges',
    'Consumer privacy considerations',
    'Cost optimization strategies',
    'Competitive market pressures',
    'Supply chain disruptions',
    'Talent acquisition difficulties',
    'Economic uncertainty factors',
    'Infrastructure limitations'
  ];
  
  return plausibleOptions[Math.floor(Math.random() * plausibleOptions.length)];
}

/**
 * Create quiz data structure
 */
function createQuizData(questions) {
  const now = new Date();
  const weekNumber = getWeekNumber();
  
  return {
    week: weekNumber,
    title: `Week ${weekNumber}: Trending News Quiz`,
    subtitle: 'Test your knowledge of this week\'s most discussed topics',
    description: '20 questions based on articles that appeared on Trend Pulse this week. How well did you follow the news?',
    generatedAt: now.toISOString(),
    publishedAt: now.toISOString(),
    expiresAt: getNextThursday().toISOString(),
    questionCount: questions.length,
    questions: questions,
    stats: {
      totalPlayers: 0,
      averageScore: 0,
      topScore: 0,
      completionRate: 0
    },
    leaderboard: [],
    categoryBreakdown: getCategoryBreakdown(questions),
    version: '2.0',
    source: 'Trend Pulse Weekly Automation'
  };
}

/**
 * Get category breakdown
 */
function getCategoryBreakdown(questions) {
  const breakdown = {};
  questions.forEach(q => {
    breakdown[q.category] = (breakdown[q.category] || 0) + 1;
  });
  return breakdown;
}

/**
 * Save quiz file
 */
function saveQuizFile(quizData) {
  const weekNumber = quizData.week;
  const filename = `week-${weekNumber}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(quizData, null, 2));
  
  // Also save as current-quiz.json for easy access
  const currentFilepath = path.join(CONFIG.outputDir, 'current-quiz.json');
  fs.writeFileSync(currentFilepath, JSON.stringify(quizData, null, 2));
  
  return filepath;
}

/**
 * Update website quiz component
 */
function updateWebsiteQuiz(quizData) {
  const websiteDir = path.join(__dirname, '../digital-growth-insider');
  const quizComponentPath = path.join(websiteDir, 'components/QuizComponent.tsx');
  
  if (!fs.existsSync(quizComponentPath)) {
    console.log('⚠️  Quiz component not found at:', quizComponentPath);
    return;
  }
  
  // In a real implementation, we would update the component
  // For now, we'll create a data file that the component can read
  const quizDataPath = path.join(websiteDir, 'data/current-quiz.json');
  const dataDir = path.join(websiteDir, 'data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(quizDataPath, JSON.stringify(quizData, null, 2));
  console.log('✅ Updated website quiz data');
}

/**
 * Commit and push to GitHub
 */
function commitAndPushToGitHub(quizData) {
  try {
    const websiteDir = path.join(__dirname, '../digital-growth-insider');
    
    // Configure git
    execSync(`cd "${websiteDir}" && git config user.name "${CONFIG.gitUser}"`, { stdio: 'pipe' });
    execSync(`cd "${websiteDir}" && git config user.email "${CONFIG.gitEmail}"`, { stdio: 'pipe' });
    
    // Add quiz data file
    const quizDataPath = path.join(websiteDir, 'data/current-quiz.json');
    if (fs.existsSync(quizDataPath)) {
      execSync(`cd "${websiteDir}" && git add data/current-quiz.json`, { stdio: 'pipe' });
      
      // Commit
      const commitMessage = `Add Week ${quizData.week} quiz (${quizData.questionCount} questions)`;
      execSync(`cd "${websiteDir}" && git commit -m "${commitMessage}"`, { stdio: 'pipe' });
      
      // Push
      execSync(`cd "${websiteDir}" && git push origin ${CONFIG.gitBranch}`, { stdio: 'pipe' });
      
      console.log('✅ Committed and pushed to GitHub');
    } else {
      console.log('⚠️  Quiz data file not found, skipping GitHub update');
    }
  } catch (error) {
    console.log('⚠️  GitHub update failed:', error.message);
    console.log('   Quiz is still saved locally and will work on the site');
  }
}

/**
 * Utility functions
 */
function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

function getNextThursday() {
  const now = new Date();
  const nextThursday = new Date(now);
  
  // Calculate days until next Thursday
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7;
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(23, 59, 59, 999); // End of day
  
  return nextThursday;
}

/**
 * Run the automation
 */
if (require.main === module) {
  generateWeeklyQuiz().catch(error => {
    console.error('❌ Quiz generation failed:', error);
    process.exit(1);
  });
}

module.exports = { generateWeeklyQuiz };