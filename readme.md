# 🌐 YUVATA — Youth Digital Literacy Assessment Platform

> *"Growing up with technology ≠ digital literacy."*

**YUVATA** is an AI-powered digital literacy assessment and mentoring platform designed for youth aged 13–25. It evaluates real-world digital skills — not just tech familiarity — and provides personalized learning roadmaps to bridge skill gaps.

Built for the hackathon problem statement: *Does growing up with technology automatically lead to digital literacy?*

---

## 🎯 Problem Statement

Frequent use of smartphones, social media, and online platforms **does not necessarily mean strong digital literacy**. Youth may scroll Instagram daily but fall for phishing links, share passwords, or believe deepfake news. YUVATA quantifies this gap and fixes it.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    YUVATA Platform                        │
├──────────────┬───────────────────┬───────────────────────┤
│  Frontend    │  Backend (API)    │  AI Engine             │
│  HTML/CSS/JS │  Express.js       │  Groq LLaMA 3 / 3.1   │
│              │  SQLite           │  Fallback: Gemini,     │
│              │  Rate Limiting    │  Deepseek, OpenAI      │
├──────────────┴───────────────────┴───────────────────────┤
│              Deployment: Render / Vercel                  │
└──────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. 🎮 Skill Selection Onboarding
Users pick the digital skills they want to be assessed on before starting — no one-size-fits-all tests.

| Skill Category | What It Tests |
|---|---|
| 🔒 Online Safety | Phishing detection, password hygiene, 2FA awareness |
| 📰 Spotting Fake News | Source verification, deepfake awareness, media bias |
| 🛡️ Privacy & Data | Data sharing risks, app permissions, digital footprint |
| 📱 Social Media Literacy | Algorithm awareness, cyberbullying response, screen time |
| 🔍 Search & Research | Boolean search, source evaluation, academic integrity |
| 💻 Coding Basics | HTML/CSS awareness, computational thinking, automation |

### 2. 🤖 AI-Adaptive Assessment Engine
- Generates **8–10 contextual questions** per session using Groq LLaMA
- **60% MCQ + 40% short answer** (tests understanding, not just recall)
- Questions adapt based on selected skills — never generic
- Real-world scenario-based (e.g., "You receive this email — what do you do?")

### 3. 📊 Digital Literacy Scoring & Levels

| Score | Level | Badge | What It Means |
|---|---|---|---|
| 0–40% | Digital Novice | 🟢 | Needs foundational internet safety training |
| 41–65% | Digital Explorer | 🔵 | Aware but has critical gaps in privacy/verification |
| 66–85% | Digital Native | 🟣 | Strong skills, needs advanced media literacy |
| 86–100% | Digital Champion | 🟡 | Ready to teach others and create responsibly |

### 4. 🗺️ Personalized Learning Roadmap
AI generates a **skill-gap analysis** with:
- Specific weak areas identified per skill category
- Curated free resources (courses, videos, tools)
- Estimated time to level up
- Progress milestones

### 5. 💬 Digital Literacy AI Coach
A conversational mentor that:
- Explains *why* an answer was wrong
- Gives real-world examples of digital risks
- Suggests daily habits for better digital hygiene
- Available 24/7 for follow-up questions

### 6. 📄 Digital Literacy Report Card (Export)
- Export results as `.txt` or `.pdf`
- Shareable with teachers, parents, or schools
- Includes score breakdown, skill gaps, and recommendations

### 7. 🏆 Advanced Challenge Mode
For experienced or older users (18–25):
- Harder scenario-based questions
- Includes ethical hacking awareness, data rights, GDPR basics
- Competitive scoring with percentile ranking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Groq API key ([get one free](https://console.groq.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/team-thunderbuddies/yuvata.git
cd yuvata

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server
npm start
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for LLaMA model |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |

---

## 📁 Project Structure

```
yuvata/
├── public/                 # Frontend assets
│   ├── index.html          # Main UI with skill selection
│   ├── style.css           # Educational theme (blue/green palette)
│   └── script.js           # Client-side logic & skill tracking
├── server/
│   ├── app.js              # Express.js server setup
│   ├── chat_funcs.js       # AI prompt engineering & assessment logic
│   ├── routes/             # API endpoints
│   ├── middleware/          # Rate limiting, security
│   └── db/                 # SQLite schema & queries
├── .env.example            # Environment template
├── package.json
├── PRD.md                  # Product Requirements Document
└── README.md               # You are here
```

---

## 🛡️ Security

- Rate limiting on all API endpoints
- Input sanitization against prompt injection
- No PII stored — assessments are session-based
- API keys never exposed to frontend
- CORS configured for production deployment

---

## 🧪 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | Fast, no build step, hackathon-friendly |
| Backend | Express.js (Node.js) | Lightweight, rapid API development |
| Database | SQLite | Zero-config, portable, serverless |
| AI Model | Groq LLaMA 3.1 | Free tier, fastest inference, open-source model |
| Deployment | Render | Free tier, auto-deploy from GitHub |

---

## 🤝 Team Thunderbuddies

Built with ❤️ for the hackathon.

---

## 📜 License

MIT License — free to use, modify, and distribute.
