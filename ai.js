const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_API_KEY = ""; // Enter your Groq API key in the app Settings modal
const MODEL = "llama-3.1-8b-instant";

function getApiKey() {
    return localStorage.getItem('yuvata_groq_key') || DEFAULT_API_KEY;
}

const YuvataAI = {
    /**
     * Generates a set of unique scenario-based questions based on selected skills.
     */
    async generateQuestions(skills) {
        if (!skills || skills.length === 0) skills = ['Digital Basics'];
        
        const prompt = `You are an expert digital literacy examiner. Generate exactly 6 realistic, scenario-based multiple-choice questions focusing on these skills: ${skills.join(', ')}.
Make the scenarios highly relevant to a youth/young adult audience (e.g., social media, gaming, online shopping, study research).

You MUST output a JSON object with a single key "questions" containing an array of objects.
Each object must have exactly this structure:
{
  "skillCategory": "The specific skill being tested (choose from the input list)",
  "q": "The realistic scenario question text (2-3 sentences)",
  "opts": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "ans": 0
}
Note: "ans" must be an integer (0-3) representing the index of the correct option in the "opts" array.

Output ONLY valid JSON.`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: "system", content: "You are an API that outputs only valid JSON objects." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.5,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "Failed to generate questions.");
            }

            const data = await response.json();
            const parsed = JSON.parse(data.choices[0].message.content);
            return parsed.questions;
        } catch (err) {
            console.error("[YUVATA AI] Error generating questions:", err);
            throw err;
        }
    },

    /**
     * Generates a report card and learning roadmap based on assessment performance.
     */
    async generateReport(answers, overallScorePct, literacyLevel) {
        const prompt = `You are 'KaliGuru', a digital literacy mentor reviewing a youth's assessment results for YUVATA \u2014 India's PMGDISHA 2.0 platform.

Overall Score: ${overallScorePct}%
Literacy Level: ${literacyLevel}

Assessment Details:
${JSON.stringify(answers.map(a => ({
    question: a.question,
    userWasCorrect: a.isCorrect,
    skill: a.skill
})), null, 2)}

Provide a comprehensive, personalized evaluation with an actionable, phased learning roadmap.
Output MUST be a JSON object with EXACTLY this structure:
{
  "strengths": ["Specific strength 1 based on correct answers", "Specific strength 2"],
  "weaknesses": ["Specific blindspot 1 based on incorrect answers", "Specific blindspot 2"],
  "mentorMessage": "A short, empathetic 1-2 sentence personal message from KaliGuru addressing the user directly based on their score.",
  "roadmap": [
    {
      "phase": 1,
      "phaseLabel": "Foundation \u2014 Fix Your Blindspots",
      "emoji": "\ud83d\udee0\ufe0f",
      "steps": [
        {
          "title": "Specific action step title",
          "desc": "2-3 sentence specific explanation of what to learn and why it matters for this user based on their mistakes",
          "difficulty": "Beginner",
          "timeEstimate": "15 mins",
          "tags": ["skill category"],
          "resourceTitle": "Recommended free resource name",
          "resourceUrl": "https://google.com/search?q=digital+literacy+phishing"
        }
      ]
    },
    {
      "phase": 2,
      "phaseLabel": "Build \u2014 Deepen Your Knowledge",
      "emoji": "\ud83d\udcda",
      "steps": [
        {
          "title": "Intermediate skill to build",
          "desc": "Explanation focused on practical application",
          "difficulty": "Intermediate",
          "timeEstimate": "30 mins",
          "tags": ["skill category"],
          "resourceTitle": "Resource name",
          "resourceUrl": "https://google.com/search?q=digital+privacy+guide"
        }
      ]
    },
    {
      "phase": 3,
      "phaseLabel": "Lead \u2014 Become a Cyber Champion",
      "emoji": "\ud83c\udfc6",
      "steps": [
        {
          "title": "Advanced challenge or action",
          "desc": "How to apply this knowledge to protect others or achieve mastery",
          "difficulty": "Advanced",
          "timeEstimate": "1 hour",
          "tags": ["leadership"],
          "resourceTitle": "Resource name",
          "resourceUrl": "https://cybercrime.gov.in"
        }
      ]
    }
  ]
}

IMPORTANT: Generate 1-2 steps per phase. Be specific to the user's weak skills. Make resourceUrl a real, relevant URL.
Output ONLY valid JSON.`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: "system", content: "You output only valid JSON objects." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.4,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("API request failed");
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (err) {
            console.error("[YUVATA AI] Error generating report:", err);
            throw err;
        }
    },

    /**
     * Chat completion for the AI Mentor.
     */
    async chatWithMentor(history) {
        // Build message payload
        const messages = [
            { 
              role: "system", 
              content: `You are 'KaliGuru', the YUVATA Digital Literacy Mentor − a certified Cyber Jaagrookta (Cyber Awareness) Ambassador aligned with India's I4C (Indian Cyber Crime Coordination Centre) under the Ministry of Home Affairs.

You are helpful, encouraging, and expert in digital safety, privacy, fake news spotting, and healthy technology habits.

Very important: If the user has been tricked by a phishing attempt, scam, deepfake, or any cyber attack — or if they report being a victim — ALWAYS include these real resources:
- 🚨 National Cybercrime Helpline: 1930 (call anytime, free)
- 🌐 Report online at: cybercrime.gov.in
- Mention that India's DPDP Act (Digital Personal Data Protection Act, 2023) protects their data rights.

If discussing data privacy, explain their rights as a "Digital Nagrik" under the DPDP Act.
If discussing the assessment, know that YUVATA is India's PMGDISHA 2.0 — moving beyond basic device literacy to real-world internet survival skills.

Keep your answers concise, engaging, and directly applicable. Be warm, supportive, and use simple language appropriate for youth aged 13-25.` 
            },
            ...history.map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            }))
        ];

        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile", // Use a smarter model for chat if available, or stick to 8b
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 250
                })
            });

            if (!response.ok) throw new Error("Chat request failed");
            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (err) {
            console.error("[YUVATA AI] Error in chat:", err);
            return "I'm having trouble connecting to the network right now. Please check your API key settings or try again later!";
        }
    },

    /**
     * Generates a "Two Truths and a Lie" scenario for the Danger Lab
     */
    async generateLabScenario() {
        const prompt = `You are a cybersecurity expert creating a "Spot the Fake" challenge for a digital literacy platform.
Generate 3 short, highly realistic digital artifacts (e.g., email snippets, sms messages, news headlines, or social media posts).
Exactly TWO must be legitimate/safe, and EXACTLY ONE must be a dangerous fake/phishing attempt/scam.

You MUST output a JSON object with this exact structure:
{
  "scenarioType": "e.g., Email Phishing, Fake News, SMS Scam",
  "items": [
    { "id": 1, "text": "Content of item 1", "isFake": false, "explanation": "Why this is safe/real" },
    { "id": 2, "text": "Content of item 2", "isFake": true, "explanation": "Why this is the fake/scam" },
    { "id": 3, "text": "Content of item 3", "isFake": false, "explanation": "Why this is safe/real" }
  ]
}
Make sure exactly one has "isFake": true. Randomize which ID gets the fake one. Make the texts highly plausible and trick the user.
Output ONLY valid JSON.`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: "system", content: "You output only valid JSON objects." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.8, // higher temp for creative scenarios
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "Failed to generate lab scenario.");
            }
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (err) {
            console.error("[YUVATA AI] Error generating lab scenario:", err);
            throw err;
        }
    },

    /**
     * Generates a Campaign Graphic Slogan and Caption
     */
    async generateCampaignAssets(topic) {
        const prompt = `You are a Gen Z creative director running a viral digital literacy campaign.
The user wants to spread awareness about this topic: "${topic}"

Generate:
1. A very short, punchy 3-8 word slogan for a poster/graphic. Give it impact.
2. A single emoji that represents the theme perfectly.
3. A short, highly engaging Instagram/TikTok caption that explains the issue clearly to other youth and ends with a call to action. Include 2-3 relevant hashtags.

You MUST output a JSON object with this exact structure:
{
  "slogan": "The punchy short text",
  "emoji": "🛑",
  "caption": "The social media caption..."
}

Output ONLY valid JSON.`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [
                        { role: "system", content: "You output only valid JSON objects." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.8,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error("Failed to generate campaign.");
            }
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (err) {
            console.error("[YUVATA AI] Error generating campaign:", err);
            throw err;
        }
    },

    /**
     * Generates a Multi-part Cyber Mystery for Squad Mode
     */
    async generateSquadMystery() {
        const prompt = `You are a Game Master for a "Cyber Escape Room" multiplayer game.
Generate a scenario where a squad of friends has to investigate a viral digital threat.
Give them a Scenario Description, and exactly 3 "Artifacts" (pieces of evidence like a text message, an email, or a URL).
One specific detail in the artifacts proves that the entire scenario is a fake/scam/phishing attempt.

You MUST output a JSON object with this exact structure:
{
  "title": "Name of the Mystery",
  "description": "The setup (e.g., 'A viral video claims the university is shutting down...')",
  "artifacts": [
    "Artifact 1: ...",
    "Artifact 2: ...",
    "Artifact 3: ..."
  ],
  "solution": "The hidden clue that proves it's fake or real, and the final verdict."
}

Output ONLY valid JSON.`;

        try {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [
                        { role: "system", content: "You output only valid JSON objects." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.8,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error("Failed to generate squad mystery.");
            }
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (err) {
            console.error("[YUVATA AI] Error generating squad mystery:", err);
            throw err;
        }
    }
};
