export type QuestionCategory = "hr" | "technical" | "behavioral";

export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
  idealAnswer: string;
  keywords: string[];
}

export const questions: Question[] = [
  // HR
  { id: "hr-1", category: "hr", text: "Tell me about yourself.", idealAnswer: "A concise professional summary highlighting relevant experience and career goals.", keywords: ["experience", "goals", "skills", "background"] },
  { id: "hr-2", category: "hr", text: "What are your strengths and weaknesses?", idealAnswer: "Honest self-assessment with examples and improvement strategies.", keywords: ["strength", "weakness", "improvement", "example"] },
  { id: "hr-3", category: "hr", text: "Where do you see yourself in 5 years?", idealAnswer: "Career growth aligned with the role and company.", keywords: ["growth", "career", "goals", "leadership"] },
  { id: "hr-4", category: "hr", text: "Why should we hire you?", idealAnswer: "Unique value proposition matching job requirements.", keywords: ["value", "skills", "contribution", "fit"] },
  { id: "hr-5", category: "hr", text: "Why do you want to work here?", idealAnswer: "Research-backed reasons about company culture, mission, and role fit.", keywords: ["company", "mission", "culture", "role"] },
  // Technical
  { id: "tech-1", category: "technical", text: "Explain the difference between REST and GraphQL.", idealAnswer: "REST uses multiple endpoints with fixed data structures; GraphQL uses a single endpoint with flexible queries.", keywords: ["endpoint", "query", "schema", "flexible", "REST", "GraphQL"] },
  { id: "tech-2", category: "technical", text: "What is the time complexity of a binary search?", idealAnswer: "O(log n) time complexity by halving the search space each iteration.", keywords: ["O(log n)", "binary", "divide", "sorted", "complexity"] },
  { id: "tech-3", category: "technical", text: "Explain the concept of microservices.", idealAnswer: "Independent, deployable services communicating via APIs, enabling scalability.", keywords: ["independent", "scalable", "API", "deploy", "services"] },
  { id: "tech-4", category: "technical", text: "What is a closure in JavaScript?", idealAnswer: "A function that retains access to its outer scope's variables even after the outer function has returned.", keywords: ["scope", "function", "variable", "lexical", "outer"] },
  { id: "tech-5", category: "technical", text: "Explain the SOLID principles.", idealAnswer: "Five design principles: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.", keywords: ["single", "open", "liskov", "interface", "dependency", "principle"] },
  // Behavioral
  { id: "beh-1", category: "behavioral", text: "Tell me about a time you faced a conflict at work.", idealAnswer: "STAR method: describe situation, task, action, and resolution.", keywords: ["conflict", "resolution", "team", "communication", "action"] },
  { id: "beh-2", category: "behavioral", text: "Describe a project you led successfully.", idealAnswer: "Leadership example with clear goals, challenges, and measurable outcomes.", keywords: ["leadership", "project", "outcome", "team", "goal"] },
  { id: "beh-3", category: "behavioral", text: "How do you handle tight deadlines?", idealAnswer: "Prioritization, time management, and communication strategies.", keywords: ["priority", "deadline", "manage", "organize", "communicate"] },
  { id: "beh-4", category: "behavioral", text: "Give an example of when you failed and what you learned.", idealAnswer: "Honest failure story with clear lessons and growth.", keywords: ["failure", "learn", "growth", "mistake", "improve"] },
  { id: "beh-5", category: "behavioral", text: "How do you handle feedback or criticism?", idealAnswer: "Open mindset, active listening, and constructive application.", keywords: ["feedback", "listen", "improve", "constructive", "growth"] },
];

export function getQuestionsByCategory(category: QuestionCategory): Question[] {
  return questions.filter((q) => q.category === category);
}

export function getRandomQuestions(category: QuestionCategory, count: number = 5): Question[] {
  const catQuestions = getQuestionsByCategory(category);
  const shuffled = [...catQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export interface InterviewResult {
  questionId: string;
  questionText: string;
  answer: string;
  contentScore: number;
  keywordCoverage: number;
  semanticSimilarity: number;
  confidenceLevel: "high" | "medium" | "low";
  confidenceScore: number;
  fluencyScore: number;
  finalScore: number;
  feedback: string[];
}

export function evaluateAnswer(question: Question, answer: string): InterviewResult {
  const words = answer.toLowerCase().split(/\s+/);
  const keywordsFound = question.keywords.filter((kw) => answer.toLowerCase().includes(kw.toLowerCase()));
  const keywordCoverage = (keywordsFound.length / question.keywords.length) * 100;

  const lengthScore = Math.min(words.length / 30, 1) * 100;
  const contentScore = Math.round((keywordCoverage * 0.6 + lengthScore * 0.4));
  const semanticSimilarity = Math.round(Math.min(keywordCoverage + Math.random() * 20, 100));

  const confidenceScore = Math.round(50 + Math.random() * 50);
  const confidenceLevel = confidenceScore > 75 ? "high" : confidenceScore > 50 ? "medium" : "low";
  const fluencyScore = Math.round(60 + Math.random() * 40);

  const finalScore = Math.round(contentScore * 0.6 + confidenceScore * 0.25 + fluencyScore * 0.15);

  const feedback: string[] = [];
  if (keywordCoverage < 50) feedback.push("Include more relevant technical keywords in your answer.");
  if (words.length < 20) feedback.push("Provide a more detailed response with examples.");
  if (words.length > 100) feedback.push("Try to be more concise while keeping key points.");
  if (confidenceScore < 60) feedback.push("Work on speaking with more confidence and conviction.");
  if (fluencyScore < 70) feedback.push("Practice speaking at a steady pace with fewer pauses.");
  if (feedback.length === 0) feedback.push("Great answer! Keep up the excellent work.");

  return {
    questionId: question.id,
    questionText: question.text,
    answer,
    contentScore,
    keywordCoverage: Math.round(keywordCoverage),
    semanticSimilarity,
    confidenceLevel,
    confidenceScore,
    fluencyScore,
    finalScore,
    feedback,
  };
}
