# YUVATA — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** March 12, 2026  
**Team:** Thunderbuddies  
**Status:** In Development  

---

## 1. Executive Summary

YUVATA is an AI-powered digital literacy assessment platform that challenges the assumption that "digital natives" are digitally literate. It lets youth (13–25) self-select skill areas, take adaptive AI-generated assessments, receive a literacy score with leveling, and get a personalized roadmap to improve — all in under 10 minutes.

**Core Thesis:**  
Owning a smartphone ≠ understanding phishing. Scrolling TikTok ≠ spotting misinformation. YUVATA measures the gap between *technology access* and *technology competence*.

---

## 2. Problem Definition

### 2.1 The Assumption
Society assumes youth are "digital natives" — born into tech, therefore fluent in it. Schools, employers, and parents operate on this assumption.

### 2.2 The Reality (Data Points)
- **71%** of youth aged 15–24 cannot identify a phishing email (Stanford/OECD, 2024)
- **62%** share passwords with at least one friend (McAfee Youth Survey)
- **45%** of Gen Z have fallen for at least one online scam (Social Catfish Report)
- **Only 2%** of students could distinguish a real news article from a sponsored ad (Stanford History Education Group)
- India has **800M+ internet users** but ranks **low on digital literacy indices** (NITI Aayog Digital India Report)

### 2.3 Why Existing Tools Fail
| Existing Solution | Why It Falls Short |
|---|---|
| Google Digital Garage | Generic, not personalized, no AI adaptation |
| ECDL/ICDL Certification | Expensive, focuses on office tools, not real-world safety |
| School ICT Curriculum | Teaches MS Word, not phishing detection or privacy hygiene |
| Random online quizzes | No skill gap analysis, no roadmap, no follow-up |
| Northstar Digital Literacy | US-centric, doesn't cover misinformation or social media |

**Gap:** No free, AI-adaptive, youth-focused tool exists that simultaneously assesses, scores, and provides a learning roadmap across multiple digital literacy dimensions.

---

## 3. Target Users

### 3.1 Primary Users
| Persona | Age | Context | Pain Point |
|---|---|---|---|
| School Student (Riya) | 14 | Uses Instagram/YouTube daily | Doesn't know what cookies track, shares location freely |
| College Student (Arjun) | 20 | Codes in Python, games online | Falls for fake tech support scams, reuses passwords |
| Rural Youth (Priya) | 17 | Just got first smartphone | Doesn't know how to verify WhatsApp forwards |

### 3.2 Secondary Users
- **Teachers** — use YUVATA to assess classroom digital literacy
- **NGOs** — deploy YUVATA in digital literacy camps
- **Parents** — understand their child's actual digital skills

---

## 4. Product Requirements

### 4.1 Functional Requirements

#### FR-1: Skill Selection Screen
- **Priority:** P0 (Must Have)
- Display 6 skill category buttons with icons
- Allow multi-select (minimum 1 required to proceed)
- Visual feedback on selection (toggle highlight)
- "Start Assessment" button enables only when ≥1 skill selected
- Selected skills are passed to the AI assessment engine

#### FR-2: AI-Adaptive Assessment
- **Priority:** P0 (Must Have)
- Generate 20-30 questions dynamically via Groq LLaMA
- Question mix: 60% MCQ, 40% short answer
- Questions scoped ONLY to selected skill areas
- Real-world scenario-based (not textbook definitions)
- Each question has an AI-evaluated correct answer and explanation
- Maximum assessment time: 10 minutes

#### FR-3: Digital Literacy Scoring
- **Priority:** P0 (Must Have)
- Calculate percentage score from AI-evaluated answers
- Map score to one of 4 literacy levels (Novice → Champion)
- Show per-skill breakdown (radar chart or bar graph)
- Display badge/icon for achieved level

#### FR-4: Skill Gap Analysis
- **Priority:** P0 (Must Have)
- AI identifies weak areas per skill category
- Generates specific gap descriptions (e.g., "You can identify spam but not phishing URLs")
- Prioritizes gaps by severity

#### FR-5: Personalized Learning Roadmap
- **Priority:** P1 (Should Have)
- AI recommends free resources per identified gap
- Resources include: YouTube videos, free courses (Coursera, Khan Academy), tools
- Estimated time to complete each resource
- Roadmap can be exported

#### FR-6: AI Mentor / Coach Chat
- **Priority:** P1 (Should Have)
- Conversational AI coach for follow-up questions
- Explains wrong answers with real-world examples
- Proactive tips (e.g., "Did you know you can check if your email was breached at HaveIBeenPwned?")
- System prompt positions AI as a friendly digital literacy coach

#### FR-7: Report Card Export
- **Priority:** P1 (Should Have)
- Export assessment results as `.txt` file
- Include: overall score, level, per-skill breakdown, recommendations
- Shareable format for teachers/parents

#### FR-8: Advanced Challenge Mode
- **Priority:** P2 (Nice to Have)
- Harder questions for 18–25 age group
- Topics: data rights, GDPR basics, ethical hacking awareness, deepfake detection
- Competitive scoring with percentile

### 4.2 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time | < 2 seconds |
| Assessment generation | < 5 seconds (Groq inference) |
| Concurrent users | 50+ (rate-limited) |
| Uptime | 99% (Render free tier) |
| Mobile responsive | Yes, all screens |
| Accessibility | WCAG 2.1 AA (contrast, keyboard nav) |
| Security | No PII stored, API keys server-side only |

---

## 5. Technical Architecture

### 5.1 System Flow

```
User Opens App
     │
     ▼
┌─────────────────────┐
│  Skill Selection     │  ← Pick 1-6 skill categories
│  Screen              │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Assessment Engine   │  ← AI generates questions based on selected skills
│  (Groq LLaMA API)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Answer Evaluation   │  ← AI scores each answer with explanation
│  + Scoring           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Results Dashboard   │  ← Score, level, radar chart, gaps
└─────────┬───────────┘
          │
     ┌────┴────┐
     ▼         ▼
┌─────────┐ ┌──────────┐
│ Export   │ │ AI Coach │  ← Follow-up mentoring chat
│ Report  │ │ Chat     │
└─────────┘ └──────────┘
```

### 5.2 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/assessment/start` | Generate questions for selected skills |
| POST | `/api/assessment/evaluate` | Submit answers, get scores + gaps |
| POST | `/api/roadmap/generate` | Get personalized learning roadmap |
| POST | `/api/chat/mentor` | AI coach conversation |
| GET | `/api/export/report` | Download report card as text |

### 5.3 Database Schema (SQLite)

```sql
CREATE TABLE assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  selected_skills TEXT NOT NULL,       -- JSON array of selected skills
  questions TEXT,                       -- JSON array of generated questions
  answers TEXT,                         -- JSON array of user answers
  scores TEXT,                          -- JSON per-skill scores
  overall_score REAL,
  literacy_level TEXT,                  -- novice/explorer/native/champion
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,                   -- 'user' or 'assistant'
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.4 AI Prompt Templates

**Assessment Generation Prompt:**
```
You are YUVATA, a digital literacy assessment engine for Indian youth aged 13–25.
Generate exactly {count} questions about: {selected_skills}.
Rules:
- 60% multiple choice (4 options, mark correct answer), 40% short answer
- Test PRACTICAL digital skills, not definitions
- Use real-world Indian contexts (UPI scams, WhatsApp forwards, Aadhaar privacy)
- Difficulty: {difficulty_level}
- Return as JSON array with fields: question, type, options (if MCQ), correct_answer, explanation, skill_category
```

**Evaluation Prompt:**
```
You are evaluating a digital literacy assessment. For each question-answer pair:
1. Determine if the answer is correct (for MCQ) or demonstrates understanding (for short answer)
2. Score: 1 (correct), 0.5 (partially correct), 0 (incorrect)
3. Provide a brief explanation of the right answer
4. Identify the specific skill gap if the answer was wrong
Return as JSON.
```

---

## 6. UI/UX Design Specifications

### 6.1 Design Principles
- **Youth-first:** Friendly, emoji-rich, no jargon
- **Gamified:** Levels, badges, progress bars — not clinical test vibes
- **Mobile-first:** 80%+ of youth users will be on phones
- **Fast:** Under 10 minutes from start to report card


### 6.3 Screen Flow

```
[Landing Page] → [Skill Selection] → [Assessment Questions] → [Results + Score] → [Roadmap / Export / Chat]
```

### 6.4 Key UI Components
1. **Skill Buttons** — Large, tappable, icon + label, glow effect on select
2. **Question Cards** — One question per screen, progress bar at top
3. **Score Dial** — Animated circular progress showing percentage
4. **Level Badge** — Visual badge with title (Novice/Explorer/Native/Champion)
5. **Radar Chart** — Skill breakdown across all selected categories
6. **Roadmap Timeline** — Vertical timeline of recommended resources

---

## 7. Differentiation & Competitive Analysis

### 7.1 Competitive Landscape

| Feature | Google Digital Garage | ECDL/ICDL | Northstar | School ICT | **YUVATA** |
|---|---|---|---|---|---|
| AI-adaptive questions | ❌ | ❌ | ❌ | ❌ | ✅ |
| Skill self-selection | ❌ | ❌ | ✅ | ❌ | ✅ |
| Real-world scenarios | ❌ | ❌ | ✅ | ❌ | ✅ |
| Personalized roadmap | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI mentor/coach | ❌ | ❌ | ❌ | ❌ | ✅ |
| Free to use | ✅ | ❌ ($$$) | ✅ | ✅ | ✅ |
| India-contextualized | ❌ | ❌ | ❌ | Partial | ✅ |
| Youth-focused (13-25) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export report card | ❌ | ✅ | ❌ | ❌ | ✅ |
| Under 10 minutes | ❌ | ❌ | ❌ | ❌ | ✅ |

### 7.2 Our Unique Moat (Why We Win)

1. **AI-Adaptive ≠ Static Quiz** — Every assessment is unique. No two students get the same test. This is impossible to cheat on or memorize.

2. **Skill Self-Selection** — Respects user agency. A 14-year-old and a 22-year-old don't need the same test.

3. **India-First Context** — Questions about UPI fraud, WhatsApp misinformation, Aadhaar data leaks — not US-centric GDPR scenarios.

4. **Gap Analysis → Roadmap Pipeline** — We don't just score you. We tell you EXACTLY where you're weak AND how to fix it with free resources.

5. **AI Coach for Follow-up** — After the test, the AI stays available to explain, teach, and guide — like a digital literacy tutor.

6. **Under 10 Minutes** — Designed for attention spans. Complete assessment + get results + get roadmap in one sitting.

---

## 8. Success Metrics

| Metric | Target (Demo) | Target (Scale) |
|---|---|---|
| Assessment completion rate | 90%+ | 75%+ |
| Average time to complete | < 8 minutes | < 10 minutes |
| Users who export report | 50%+ | 30%+ |
| Users who engage AI coach | 40%+ | 25%+ |
| Score accuracy vs manual eval | 85%+ | 90%+ |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Groq API rate limit hit | Assessment fails | Fallback to Gemini/Deepseek API |
| AI generates inaccurate questions | Bad assessment | Prompt engineering + validation layer |
| Youth find it "boring" | Low engagement | Gamification: badges, levels, progress animations |
| Questions too hard/easy | Unfair scoring | Difficulty calibration based on age input |
| Internet required | Excludes offline youth | Future: PWA with cached question banks |

---

## 10. Development Roadmap

### Phase 1: Hackathon MVP (Current Sprint)
- [x] Express.js backend with Groq integration
- [x] SQLite database
- [x] Security middleware & rate limiting
- [x] Export functionality
- [ ] Skill selection UI
- [ ] Digital literacy prompt engineering
- [ ] Scoring & level system
- [ ] Results dashboard
- [ ] Rebranding from OffSec to YUVATA

### Phase 2: Post-Hackathon
- [ ] Radar chart visualization (Chart.js)
- [ ] PWA support for mobile
- [ ] Multi-language support (Hindi, Tamil, Telugu)
- [ ] Teacher dashboard for classroom deployments
- [ ] Leaderboard for schools/organizations

### Phase 3: Scale
- [ ] Partnership with schools & NGOs
- [ ] Offline mode with cached question banks
- [ ] Longitudinal tracking (retake assessments monthly)
- [ ] API for third-party integration

---

## 11. Appendix

### A. Skill Category Descriptions

```javascript
const SKILL_DESCRIPTIONS = {
  'online-safety': 'Identifying phishing, secure passwords, 2FA, safe browsing, recognizing scams',
  'misinformation': 'Fact-checking methods, source verification, deepfake awareness, media bias detection',
  'privacy': 'Data sharing risks, app permissions, digital footprint, right to privacy, Aadhaar safety',
  'social-media': 'Algorithm awareness, cyberbullying, screen time management, online reputation',
  'search-skills': 'Boolean search, evaluating sources, academic integrity, research methodology',
  'coding-basics': 'HTML/CSS concepts, computational thinking, automation awareness, AI literacy'
};
```

### B. Digital Literacy Frameworks Referenced
- UNESCO Digital Literacy Framework
- EU DigComp 2.2
- NITI Aayog Digital Literacy Mission
- OECD PISA Digital Literacy Assessment
- National Digital Literacy Mission (NDLM), India

---

*Document maintained by Team Thunderbuddies*
