import { evaluateAnswer } from "@/data/questions";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqQuestion {
  id: string;
  category: string;
  difficulty: string;
  text: string;
  idealAnswer: string;
  keywords: string[];
}

interface GroqEvaluation {
  finalScore: number;
  contentScore: number;
  fluencyScore: number;
  confidenceScore: number;
  confidenceLevel: "high" | "medium" | "low";
  feedback: string[];
}

export async function generateGroqQuestions(
  context: { 
    resume?: string; 
    jobDescription?: string; 
    customQuestions?: string; 
    link?: string; 
    topic?: string; 
    level?: string; 
    tracks?: string[] 
  },
  count: number = 5
): Promise<any[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.warn("Groq API key not found. Using client-side local question generator.");
    return [];
  }

  const prompt = `
You are an expert HR and technical interviewer. Generate a list of exactly ${count} highly realistic, open-ended, conversational interview questions based on the candidate's background and target tracks.
Context provided:
- Resume details: ${context.resume || "Not provided"}
- Job Description: ${context.jobDescription || "Not provided"}
- Custom Questions provided: ${context.customQuestions || "Not provided"}
- Online Job / Test Link: ${context.link || "Not provided"}
- Target Topic (Knowledge Mode): ${context.topic || "Not provided"}
- Target Difficulty Level: ${context.level || "Not provided"}
- Target Learning Tracks: ${context.tracks ? context.tracks.join(", ") : "Not provided"}

Instructions:
1. Generate exactly ${count} questions.
2. The questions must be open-ended, conversational, and conversational in style (designed for a live voice/audio interview).
3. If a resume is provided, the first question MUST be a warm recruiter greeting requesting self-introduction and project details, e.g., "To start off, could you introduce yourself, state your name, and walk me through the key projects on your resume?" Follow up with detailed, open-ended questions about their specific projects, technologies, and work experience from the resume.
4. Avoid multiple-choice or short factual questions like "What is the time complexity of binary search?" or "What does ACID stand for?". Instead, ask about practical implementation, design decisions, coding problem-solving approaches, and behavioral situations (using the STAR method).
5. Each question must contain:
   - "id": A unique string (e.g. "groq-q-1", "groq-q-2", etc.)
   - "category": "web" | "dsa" | "dbms" | "os" | "networking" | "hr"
   - "difficulty": "Easy" | "Medium" | "Hard"
   - "text": The conversational question string
   - "idealAnswer": A concise ideal expected answer outline (2-3 sentences) detailing key points.
   - "keywords": A list of 4-6 essential keywords that should be mentioned in the user's answer.
6. Return the response strictly as a JSON object containing a "questions" key which holds the array of questions. Do not output any other text or explanation.
7. If a Target Topic and Target Difficulty Level are provided, all generated questions must focus strictly on that topic (e.g. Python, SQL, React) and match the requested difficulty (Basics/Foundations maps to 'Easy', Intermediate maps to 'Medium', Advanced maps to 'Hard').

Example JSON output format:
{
  "questions": [
    {
      "id": "groq-q-1",
      "category": "hr",
      "difficulty": "Easy",
      "text": "To start off, could you introduce yourself, state your name, and walk me through the key projects on your resume?",
      "idealAnswer": "Introduce your background, state your name clearly, and describe the core stack/role in projects, showing ownership and impact.",
      "keywords": ["projects", "experience", "background", "technologies", "myself"]
    }
  ]
}
`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultString = data.choices[0]?.message?.content;
    const resultObj = JSON.parse(resultString);
    if (resultObj.questions && Array.isArray(resultObj.questions)) {
      return resultObj.questions;
    }
    return [];
  } catch (error) {
    console.error("Failed to generate questions using Groq API, returning empty for client-side fallback", error);
    return [];
  }
}

export async function evaluateAnswerWithGroq(
  questionText: string,
  idealAnswer: string,
  userAnswer: string,
  keywords: string[]
): Promise<any> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.warn("Groq API key not found. Using client-side local evaluator.");
    return null;
  }

  const prompt = `
You are an AI Interviewer and expert evaluator. Evaluate the user's response to the given question.
Question: "${questionText}"
Ideal Expected Answer: "${idealAnswer}"
Expected Keywords: ${JSON.stringify(keywords)}
User's Answer: "${userAnswer}"

Instructions:
1. Grade the answer objectively based on technical correctness, completeness, and clarity.
2. Return a JSON object with:
   - "finalScore": Overall score from 0 to 100
   - "contentScore": Content accuracy score from 0 to 100
   - "fluencyScore": Language clarity/fluency score from 0 to 100
   - "confidenceScore": Overall speech confidence score (0 to 100) estimated from the response structure
   - "confidenceLevel": "high" | "medium" | "low"
   - "feedback": An array of 2-3 specific, constructive tips on how to improve this answer (e.g. key concepts missed, better phrasing).
3. Return ONLY the JSON object. Do not output markdown code blocks or extra text.

Example format:
{
  "finalScore": 85,
  "contentScore": 88,
  "fluencyScore": 82,
  "confidenceScore": 85,
  "confidenceLevel": "high",
  "feedback": [
    "Good explanation of the Virtual DOM, but missed mentioning the concept of reconciliation.",
    "Try to explain how React performs the diffing algorithm between the Virtual DOM and real DOM."
  ]
}
`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultString = data.choices[0]?.message?.content;
    return JSON.parse(resultString);
  } catch (error) {
    console.error("Failed to evaluate answer using Groq API, using local fallback", error);
    return null;
  }
}
