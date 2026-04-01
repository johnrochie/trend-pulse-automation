# WEEKLY QUIZ SYSTEM

## 🎯 Overview

A fully automated weekly quiz system for Trend Pulse that:
- **Generates new quiz every Thursday** at 9:00 AM
- **20 questions** based on articles that appeared on the site during the week
- **Automatic updates** to website and GitHub
- **Professional analytics** with leaderboards and badges

## 📅 Schedule

### **Weekly Automation:**
- **Day:** Every Thursday
- **Time:** 9:00 AM (local server time)
- **Duration:** Quiz is available Thursday → Wednesday (7 days)
- **Next Quiz:** New quiz generated automatically each Thursday

### **Quiz Lifecycle:**
```
Thursday 9:00 AM: New quiz generated
Thursday 9:05 AM: Quiz live on website
Thursday → Wednesday: Quiz available
Wednesday 23:59: Quiz expires
Thursday 9:00 AM: New quiz cycle begins
```

## 🔧 Technical Implementation

### **Files Created:**

#### **1. Automation Script:**
- `weekly-quiz-automation.js` (16807 bytes)
  - Main quiz generation logic
  - Thursday detection and scheduling
  - 20 question generation from weekly articles
  - GitHub integration

#### **2. Setup Script:**
- `setup-quiz-cron.sh` (2439 bytes)
  - Easy cron job setup
  - Log directory creation
  - Verification and testing

#### **3. Enhanced Quiz Component:**
- `EnhancedQuizComponent.tsx` (15623 bytes)
  - 20 question support
  - Weekly quiz data loading
  - Professional analytics dashboard
  - Badge and leaderboard system

#### **4. Data Files:**
- `data/current-quiz.json` - Current quiz data
- `output/quiz/week-{N}.json` - Historical quiz archives
- `logs/quiz-YYYY-MM-DD.log` - Automation logs

### **Quiz Generation Logic:**

#### **Question Sources:**
1. **This Week's Articles:** Articles published in last 7 days
2. **Category Balance:** Questions distributed across 8 categories
3. **Article Relevance:** Questions based on actual article content
4. **Difficulty Mix:** Easy (5 pts), Medium (10 pts), Hard (15 pts)

#### **Question Types:**
1. **Multiple Choice** (40%) - Standard 4-option questions
2. **True/False** (30%) - Binary true/false statements
3. **Statistics** (20%) - Percentage/number based questions
4. **Fill in Blank** (10%) - Complete the statement questions

#### **Scoring System:**
- **Easy:** 5 points each
- **Medium:** 10 points each
- **Hard:** 15 points each
- **Total:** 200 points possible (20 questions)
- **Percentage:** Score = (points earned / 200) × 100

## 🚀 Setup Instructions

### **1. Install Dependencies:**
```bash
cd ~/.openclaw/workspace/trend-pulse-automation
npm install  # If any new dependencies
```

### **2. Set Up Cron Job:**
```bash
# Make setup script executable
chmod +x setup-quiz-cron.sh

# Run setup script
./setup-quiz-cron.sh

# Or manually add to crontab:
# 0 9 * * 4 cd /home/jr/.openclaw/workspace/trend-pulse-automation && node weekly-quiz-automation.js >> /home/jr/.openclaw/workspace/trend-pulse-automation/logs/quiz-$(date +\%Y-\%m-\%d).log 2>&1
```

### **3. Test Manually:**
```bash
cd ~/.openclaw/workspace/trend-pulse-automation
node weekly-quiz-automation.js
```

### **4. Verify Setup:**
```bash
# Check cron job
crontab -l | grep quiz

# Check logs
ls -la ~/.openclaw/workspace/trend-pulse-automation/logs/

# Test website
curl https://www.trendpulse.life/quiz
```

## 📊 Quiz Features

### **User Experience:**

#### **Before Starting:**
- **Week Number:** Clear identification (Week 8, Week 9, etc.)
- **Question Count:** 20 questions displayed
- **Category Breakdown:** Questions by category shown
- **Time Remaining:** Countdown to next quiz
- **Leaderboard:** Top players from current week

#### **During Quiz:**
- **Progress Bar:** Visual progress indicator
- **Question Number:** Current/total display
- **Difficulty Badges:** Easy/Medium/Hard indicators
- **Category Tags:** Question category display
- **Points Display:** Points per question shown

#### **After Completion:**
- **Score Display:** Percentage and points earned
- **Badges Earned:** Achievement badges
- **Rank Calculation:** Estimated leaderboard position
- **Share Functionality:** Social media sharing
- **Next Quiz Info:** When next quiz starts

### **Analytics & Tracking:**

#### **Player Statistics:**
- **Total Players:** Number of quiz participants
- **Average Score:** Mean score across all players
- **Top Score:** Highest score achieved
- **Completion Rate:** Percentage who finish quiz
- **Time Analysis:** Average completion time

#### **Category Performance:**
- **Technology:** How players perform on tech questions
- **Business:** Business question performance
- **Entertainment:** Entertainment question accuracy
- **All Categories:** Full breakdown by category

#### **Leaderboard System:**
- **Weekly Leaders:** Top 5 players each week
- **Score + Time:** Ranking based on both factors
- **Badge Display:** Player achievements shown
- **Historical Data:** Previous week leaders archived

## 🎯 Business Benefits

### **User Engagement:**
✅ **Weekly Return Visits:** Users come back every Thursday  
✅ **Increased Time on Site:** 20 questions = 10-15 minutes engagement  
✅ **Social Sharing:** Results sharing = free promotion  
✅ **Community Building:** Leaderboard creates competition  
✅ **Content Discovery:** Quiz drives traffic to articles  

### **Ad Revenue (When AdSense Approved):**
✅ **More Page Views:** Quiz = additional pages for ads  
✅ **Longer Sessions:** More time = more ad impressions  
✅ **Higher Engagement:** Interactive = better ad performance  
✅ **Repeat Traffic:** Weekly = regular ad views  
✅ **Premium Placement:** Quiz pages can have strategic ad placement  

### **SEO Benefits:**
✅ **Fresh Content:** Weekly quiz updates help SEO  
✅ **User Signals:** Engagement metrics improve rankings  
✅ **Social Signals:** Shares generate backlinks  
✅ **Structured Data:** Quiz schema ready for implementation  
✅ **Return Visitors:** Regular traffic boosts domain authority  

## 🔧 Maintenance & Monitoring

### **Daily Checks:**
```bash
# Check if quiz is running
ps aux | grep weekly-quiz

# Check logs
tail -f ~/.openclaw/workspace/trend-pulse-automation/logs/quiz-*.log

# Verify website
curl -I https://www.trendpulse.life/quiz
```

### **Weekly Tasks:**
1. **Thursday Morning:** Verify quiz generation (9:00 AM)
2. **Thursday Afternoon:** Check player participation
3. **Weekly Review:** Analyze quiz performance metrics
4. **Content Check:** Ensure questions match weekly articles
5. **Backup:** Archive previous week's quiz data

### **Monthly Review:**
1. **Performance Analysis:** Quiz completion rates, scores
2. **User Feedback:** Analyze any user comments/issues
3. **Technical Updates:** Update dependencies if needed
4. **Feature Planning:** Consider quiz enhancements
5. **Revenue Tracking:** Ad performance on quiz pages

## 🚨 Troubleshooting

### **Common Issues:**

#### **1. Quiz Not Generating:**
```bash
# Check cron job
crontab -l

# Check script permissions
ls -la weekly-quiz-automation.js

# Test manually
node weekly-quiz-automation.js

# Check logs
cat ~/.openclaw/workspace/trend-pulse-automation/logs/quiz-*.log
```

#### **2. Website Quiz Not Updating:**
```bash
# Check data file
ls -la ~/.openclaw/workspace/digital-growth-insider/data/current-quiz.json

# Check GitHub commit
cd ~/.openclaw/workspace/digital-growth-insider
git log --oneline -5

# Check Vercel deployment
# Visit Vercel dashboard for deployment status
```

#### **3. Questions Not Loading:**
```bash
# Check API endpoint
curl https://www.trendpulse.life/api/quiz

# Check data file
cat ~/.openclaw/workspace/digital-growth-insider/data/current-quiz.json | head -20

# Check browser console for errors
# (Open DevTools on quiz page)
```

### **Error Messages & Solutions:**

#### **"No articles found from this week"**
- **Cause:** Automation hasn't run or articles file missing
- **Solution:** Run main automation system first
- **Command:** `cd trend-pulse-automation && node index.js`

#### **"GitHub update failed"**
- **Cause:** Git credentials or network issues
- **Solution:** Check git config and internet connection
- **Command:** `git config --list` and `ping github.com`

#### **"Quiz component not found"**
- **Cause:** Website files not in sync
- **Solution:** Pull latest changes from GitHub
- **Command:** `cd digital-growth-insider && git pull origin main`

## 📈 Performance Metrics

### **Success Indicators:**

#### **Technical Success:**
- ✅ Quiz generates every Thursday automatically
- ✅ 20 questions created from weekly articles
- ✅ Website updates within 5 minutes
- ✅ No errors in browser console
- ✅ Mobile responsive design

#### **User Success:**
- ✅ 20%+ of visitors attempt quiz
- ✅ Average score: 60-80%
- ✅ Average time: 8-12 minutes
- ✅ 15%+ share results
- ✅ 30%+ return for next quiz

#### **Business Success:**
- ✅ Increased page views per session
- ✅ Higher time on site metrics
- ✅ Improved AdSense performance
- ✅ Better SEO rankings
- ✅ Growing user community

### **Monitoring Dashboard:**
- **Live at:** `https://www.trendpulse.life/analytics`
- **Quiz Metrics:** Participation, scores, completion rates
- **User Analytics:** Demographics, behavior, patterns
- **Revenue Tracking:** Ad performance on quiz pages
- **System Health:** Automation success, errors, uptime

## 🔮 Future Enhancements

### **Phase 2 (Next Month):**
1. **User Accounts:** Save scores, track progress over time
2. **Email Collection:** Opt-in for quiz results newsletter
3. **Advanced Analytics:** Detailed performance insights
4. **Customization:** User preferences for quiz topics
5. **Social Features:** Challenge friends, create groups

### **Phase 3 (Next Quarter):**
1. **Community Features:** Comment on questions, discuss answers
2. **Quiz Creation:** Users suggest quiz questions
3. **Tournaments:** Weekly competitions with prizes
4. **Integration:** Quiz results in user profiles
5. **Mobile App:** Dedicated quiz application

### **Phase 4 (Long-term):**
1. **AI Personalization:** Questions tailored to user interests
2. **Live Competitions:** Real-time quiz events
3. **Sponsorship:** Branded quiz opportunities
4. **Educational Content:** Learning modules based on quiz results
5. **Global Expansion:** Multi-language quiz support

## 🎉 Launch Checklist

### **Pre-Launch:**
- [ ] Automation script tested manually
- [ ] Cron job configured and verified
- [ ] Website component deployed and working
- [ ] Sample quiz data loaded
- [ ] Analytics tracking configured
- [ ] Error monitoring set up

### **Launch Day (Thursday):**
- [ ] Automation runs at 9:00 AM
- [ ] Quiz generates successfully
- [ ] Website updates within 5 minutes
- [ ] All 20 questions display correctly
- [ ] Leaderboard initializes properly
- [ ] Share functionality works

### **Post-Launch (First Week):**
- [ ] Monitor player participation
- [ ] Track quiz completion rates
- [ ] Analyze user feedback
- [ ] Fix any technical issues
- [ ] Prepare for next Thursday

## 📚 Documentation

### **Related Files:**
1. **`WEEKLY-QUIZ-SYSTEM.md`** - This document
2. **`weekly-quiz-automation.js`** - Main automation script
3. **`setup-quiz-cron.sh`** - Cron setup script
4. **`EnhancedQuizComponent.tsx`** - Website component
5. **`app/quiz/page.tsx`** - Quiz page
6. **`app/api/quiz/route.ts`** - Quiz API endpoint

### **Integration Points:**
- **Automation System:** Reads from `output/articles.json`
- **Website:** Uses `data/current-quiz.json`
- **GitHub:** Commits quiz data to repository
- **Vercel:** Auto-deploys from GitHub
- **Analytics:** Tracks quiz performance metrics

---

**Last Updated:** 2026-02-23 22:15 UTC
**Status:** Ready for deployment
**Next Quiz:** Thursday, February 26, 2026 at 9:00 AM
**Live URL:** `https://www.trendpulse.life/quiz`