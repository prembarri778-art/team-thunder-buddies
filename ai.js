const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_API_KEY = "YOUR_GROQ_API_KEY_HERE";
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
        const prompt = `You are a digital literacy mentor reviewing a user's performance.
Overall Score: ${overallScorePct}%
Literacy Level: ${literacyLevel}

Assessment Details:
${JSON.stringify(answers.map(a => ({
    question: a.question,
    userWasCorrect: a.isCorrect,
    skill: a.skill
})), null, 2)}

Provide a personalized evaluation.
Output MUST be a JSON object with this exact structure:
{
  "strengths": ["Identify 2 specific strengths based on their correct answers"],
  "weaknesses": ["Identify 2 specific areas for improvement based on incorrect answers (or suggest general growth if perfect)"],
  "roadmap": [
    { "title": "Actionable Step 1", "desc": "Brief explanation of what to learn or do next" },
    { "title": "Actionable Step 2", "desc": "Brief explanation of what to learn or do next" },
    { "title": "Actionable Step 3", "desc": "Brief explanation of what to learn or do next" }
  ]
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
              content: "You are 'KaliGuru', the YUVATA Digital Literacy Mentor. You are helpful, encouraging, and expert in digital safety, privacy, fake news spotting, and healthy technology habits. Keep your answers concise, engaging, and directly applicable. Do NOT use markdown bolding obsessively. Be warm and supportive." 
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
    }
};
