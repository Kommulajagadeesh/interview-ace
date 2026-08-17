import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  type QuestionCategory,
  type InterviewResult,
  getRandomQuestions,
  evaluateAnswer,
  type Question,
  getQuestionsByCategory,
  generateQuestionsFromResume,
} from "@/data/questions";
import {
  type MCQQuestion,
  getMCQQuestions,
  generateMCQFromResume,
} from "@/data/mcq";
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Briefcase, Code, Database, Globe, Cpu, Wifi, Coffee, FileCode, CheckCircle2, XCircle, HelpCircle, Layers, Sparkles, Loader2, Camera, Mic, VideoOff, MicOff, User, MessageSquare, Sparkle, AlertTriangle, Volume2, VolumeX, Type, FileText, Link as LinkIcon, Brain, Edit3, ThumbsUp, TrendingUp, Terminal, Play, Settings as SettingsIcon, Bot } from "lucide-react";
import VoiceControlInterview from "@/components/VoiceControlInterview";
import VoiceAssistant from "@/components/VoiceAssistant";
import VoiceInterviewAssistant from "@/components/VoiceInterviewAssistant";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getInterviewResultsKey, getUserProfile, saveInterviewSession } from "@/lib/auth";
import { getSSOSession, logInterviewActivity } from "@/lib/sso";
import { toast } from "sonner";
import FaceRecognition from "@/components/FaceRecognition";
import { saveVideoRecording } from "@/lib/indexedDb";
import { generateGroqQuestions, evaluateAnswerWithGroq } from "@/lib/groq";

interface SessionData {
  date: string;
  category: string;
  results: InterviewResult[];
  note?: string;
  mcqScore?: number;
  mcqResults?: {
    questionText: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  recordingId?: string;
  cvMetrics?: {
    eyeContact: number;
    posture: number;
    calmness: number;
    confidence: number;
  };
  strengths?: string[];
  weaknesses?: string[];
  feedbackSuggestions?: string[];
}

const technicalCategories: { id: QuestionCategory; label: string; icon: typeof Briefcase; desc: string }[] = [
  { id: "dsa", label: "DSA", icon: Code, desc: "Algorithms and data structures" },
  { id: "web", label: "Web", icon: Globe, desc: "Frontend and web fundamentals" },
  { id: "dbms", label: "DBMS", icon: Database, desc: "Database concepts and SQL" },
  { id: "os", label: "OS", icon: Cpu, desc: "Operating systems and processes" },
  { id: "networking", label: "Networking", icon: Wifi, desc: "Protocols and network basics" },
  { id: "hr", label: "HR", icon: Briefcase, desc: "Behavioral and personal questions" },
];

const categoryInfoMap: Record<string, { label: string; icon: typeof Code; desc: string }> = {
  dsa: { label: "DSA Foundations", icon: Code, desc: "Algorithms & complexity" },
  web: { label: "Web Development", icon: Globe, desc: "HTML/CSS, JS & React" },
  dbms: { label: "Database Systems", icon: Database, desc: "SQL & schema design" },
  os: { label: "Operating Systems", icon: Cpu, desc: "Scheduling & memory" },
  networking: { label: "Computer Networks", icon: Wifi, desc: "Protocols & internet" },
  hr: { label: "HR & Behavioral", icon: Briefcase, desc: "STAR answering method" },
};

const makeQuestionConversational = (question: Question): Question => {
  if (question.category === "hr") return question;

  const text = question.text.trim();
  let conversationalText = text;

  if (text.startsWith("What is ")) {
    conversationalText = `In your own words, could you explain ${text.replace("What is ", "")} and how you would apply it in a real-world scenario?`;
  } else if (text.startsWith("What does ")) {
    conversationalText = `Could you walk me through ${text.replace("What does ", "what ")}? Please share a practical example.`;
  } else if (text.startsWith("Explain ")) {
    conversationalText = `Could you explain ${text.replace("Explain ", "")}? I'd love to hear how you explain this concept to a team member.`;
  } else if (text.startsWith("Difference between ")) {
    conversationalText = `How would you describe the main differences between ${text.replace("Difference between ", "")}? Which one do you prefer and why?`;
  } else if (text.startsWith("Difference ")) {
    conversationalText = `How would you describe the main difference ${text.replace("Difference ", "")}? Which one do you prefer and why?`;
  } else {
    conversationalText = `Could you share your understanding of this topic: ${text}? How would you design or work with this in a production project?`;
  }

  return {
    ...question,
    text: conversationalText
  };
};

const Interview = () => {
  const navigate = useNavigate();
  
  // Stages: "select" | "mcq" | "interview" | "complete"
  const [stage, setStage] = useState<"select" | "mcq" | "interview" | "complete">("select");
  const [category, setCategory] = useState<QuestionCategory | "mixed" | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(5);
  
  // MCQ States
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [currentMCQIndex, setCurrentMCQIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState<Record<string, boolean>>({});

  // Voice Interview Q&A States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  
  // Security checks (tab focus)
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  
  // Preferences
  const [showSettings, setShowSettings] = useState(true);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(true);
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [interviewSource, setInterviewSource] = useState<"profile" | "resume">("profile");

  // Top header level tab selection
  const [topActiveTab, setTopActiveTab] = useState<"prep" | "settings" | "live" | "scorecard">("prep");

  // Completion results tab selection
  const [resultsTab, setResultsTab] = useState<"mcq" | "voice">("mcq");

  const [headTurnWarnings, setHeadTurnWarnings] = useState(0);
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Expanded Context Upload & Prep States
  const [uploadTab, setUploadTab] = useState<"onboarding" | "resume" | "job_desc" | "online_test" | "knowledge" | "custom_qs">("onboarding");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [customQuestionsText, setCustomQuestionsText] = useState("");
  const [localResumeText, setLocalResumeText] = useState("");
  const [localResumeFileName, setLocalResumeFileName] = useState("");
  const [onlineLinkText, setOnlineLinkText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<"basics" | "intermediate" | "advanced" | null>(null);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Heuristic CV Metrics State & History
  const [cvMetrics, setCvMetrics] = useState({ eyeContact: 100, posture: 100, calmness: 100, confidence: 100 });
  const cvMetricsHistory = useRef<{ eyeContact: number; posture: number; calmness: number; confidence: number }[]>([]);

  // Video/Audio Media Recording States
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sessionId, setSessionId] = useState("");
  
  // Meeting Controls
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserListening, setIsUserListening] = useState(false);
  const [userMicVolume, setUserMicVolume] = useState(0);
  const [liveUserTranscript, setLiveUserTranscript] = useState("");
  const [showTextEditor, setShowTextEditor] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleEyeContactLost = useCallback(() => {
    // Record eye contact metrics silently; no real-time warnings or interruptions during the session
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentMCQ = mcqQuestions[currentMCQIndex];

  const resetInterviewState = () => {
    setQuestions([]);
    setMcqQuestions([]);
    setCurrentMCQIndex(0);
    setSelectedOptions({});
    setMcqSubmitted({});
    setCurrentIndex(0);
    setAnswer("");
    setAnswers([]);
    setResults([]);
    setTimeLeft(120);
    setVerificationPhoto(null);
    setCvMetrics({ eyeContact: 100, posture: 100, calmness: 100, confidence: 100 });
    cvMetricsHistory.current = [];
    setSessionId("");
  };

  const startMockInterview = async (count: number) => {
    try {
      const activeSessionId = `session_${new Date().getTime()}`;
      setSessionId(activeSessionId);
      cvMetricsHistory.current = [];

      const profile = getUserProfile();
      let selectedQuestions: Question[] = [];
      let selectedMCQs: MCQQuestion[] = [];

      // Determine active context for Groq / generation
      const activeResumeText = uploadTab === "resume" ? localResumeText : (interviewSource === "resume" ? (profile?.resumeText || "") : "");
      const activeJobDescText = uploadTab === "job_desc" ? jobDescriptionText : "";
      const activeCustomQuestions = uploadTab === "custom_qs" ? customQuestionsText : "";
      const activeLink = uploadTab === "online_test" ? onlineLinkText : "";
      const activeTopic = uploadTab === "knowledge" ? (selectedTopic || "") : "";
      const activeLevel = uploadTab === "knowledge" ? (selectedLevel || "basics") : "";

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      
      // If we have an API Key, try Groq generation first
      if (apiKey) {
        setIsLoadingQuestions(true);
        toast.info("Grok AI is customizing your interview questions...");
        
        try {
          let catsToUse = profile?.learningPrograms || [];
          if (uploadTab === "knowledge" && selectedTopic) {
            catsToUse = [selectedTopic];
          } else if (catsToUse.length === 0) {
            catsToUse = ["dsa", "web", "dbms", "os", "networking", "hr"];
          }
          
          const context = {
            resume: activeResumeText,
            jobDescription: activeJobDescText,
            customQuestions: activeCustomQuestions,
            link: activeLink,
            topic: activeTopic,
            level: activeLevel,
            tracks: catsToUse
          };
          const groqQs = await generateGroqQuestions(context, count);
          if (groqQs && groqQs.length > 0) {
            selectedQuestions = groqQs;
            if (activeResumeText) {
              selectedMCQs = generateMCQFromResume(activeResumeText, count);
            } else {
              selectedMCQs = getMCQQuestions(catsToUse.length === 1 ? (catsToUse[0] as QuestionCategory) : "mixed", count);
            }
            setCategory(catsToUse.length === 1 ? (catsToUse[0] as QuestionCategory) : "mixed");
          }
        } catch (e) {
          console.error("Failed to generate custom questions via Groq, falling back to local dataset", e);
        } finally {
          setIsLoadingQuestions(false);
        }
      }

      // Local / Offline Fallback question matching if Groq was not triggered or returned empty
      if (selectedQuestions.length === 0) {
        if (interviewSource === "resume" && profile?.resumeText) {
          selectedQuestions = generateQuestionsFromResume(profile.resumeText, count).map(makeQuestionConversational);
          selectedMCQs = generateMCQFromResume(profile.resumeText, count);
          setCategory("mixed");
        } else {
          let catsToUse = profile?.learningPrograms || [];
          if (uploadTab === "knowledge" && selectedTopic) {
            catsToUse = [selectedTopic];
          } else if (catsToUse.length === 0) {
            catsToUse = ["dsa", "web", "dbms", "os", "networking", "hr"];
          }

          let pool: Question[] = [];
          catsToUse.forEach((cat) => {
            const categoryId = cat as QuestionCategory;
            pool = [...pool, ...getQuestionsByCategory(categoryId)];
          });

          if (pool.length === 0) {
            pool = getQuestionsByCategory("dsa");
          }

          const shuffled = [...pool].sort(() => Math.random() - 0.5);
          selectedQuestions = shuffled.slice(0, count).map(makeQuestionConversational);

          const catToFetch = catsToUse.length === 1 ? (catsToUse[0] as QuestionCategory) : "mixed";
          selectedMCQs = getMCQQuestions(catToFetch, count);
          setCategory(catsToUse.length === 1 ? (catsToUse[0] as QuestionCategory) : "mixed");
        }
      }

      if (!selectedMCQs || selectedMCQs.length === 0) {
        selectedMCQs = getMCQQuestions("dsa", count);
      }
      if (!selectedQuestions || selectedQuestions.length === 0) {
        selectedQuestions = getRandomQuestions("dsa", count);
      }

      setMcqQuestions(selectedMCQs);
      setCurrentMCQIndex(0);
      setSelectedOptions({});
      setMcqSubmitted({});
      setHeadTurnWarnings(0);

      setQuestions(selectedQuestions);
      setCurrentIndex(0);
      setResults([]);
      setAnswers([]);
      setAnswer("");
      setTimeLeft(120);

      setStage("interview");

      const resultsKey = getInterviewResultsKey();
      const hasStartedKey = resultsKey.replace("interviewResults_", "interviewStarted_");
      sessionStorage.setItem(hasStartedKey, "true");
    } catch (error) {
      console.error("Error starting mock interview:", error);
      toast.error(`Failed to launch interview: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleNextStage = () => {
    setStage("interview");
    setTimeLeft(120);
  };

  const finishAndNavigate = useCallback(async (finalResults: InterviewResult[]) => {
    // 1. Calculate CV Metrics average
    let avgEyeContact = 100;
    let avgPosture = 100;
    let avgCalmness = 100;
    let avgConfidence = 100;

    if (cvMetricsHistory.current.length > 0) {
      const sumEye = cvMetricsHistory.current.reduce((acc, m) => acc + m.eyeContact, 0);
      const sumPos = cvMetricsHistory.current.reduce((acc, m) => acc + m.posture, 0);
      const sumCalm = cvMetricsHistory.current.reduce((acc, m) => acc + m.calmness, 0);
      const sumConf = cvMetricsHistory.current.reduce((acc, m) => acc + m.confidence, 0);

      avgEyeContact = Math.round(sumEye / cvMetricsHistory.current.length);
      avgPosture = Math.round(sumPos / cvMetricsHistory.current.length);
      avgCalmness = Math.round(sumCalm / cvMetricsHistory.current.length);
      avgConfidence = Math.round(sumConf / cvMetricsHistory.current.length);
    }

    // 2. Stop and save Media Recording
    let activeRecordingId = "";
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      activeRecordingId = `rec_${sessionId || new Date().getTime()}`;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      const recorder = mediaRecorderRef.current;
      recorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        await saveVideoRecording(activeRecordingId, videoBlob);
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
      };
    }

    // Calculate scores
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    const validResults = finalResults.filter(Boolean);
    const avgFinalScore = validResults.length 
      ? validResults.reduce((a, r) => a + r.finalScore, 0) / validResults.length 
      : 0;

    if (avgFinalScore >= 75) {
      strengths.push("Excellent technical understanding and content correctness.");
    } else if (avgFinalScore >= 50) {
      strengths.push("Solid foundation in core concepts, with some minor knowledge gaps.");
      weaknesses.push("Missing core key phrases or detailed explanations in answers.");
      suggestions.push("Focus on including precise terminology.");
    } else {
      weaknesses.push("Weak core understanding of key topics requested.");
      suggestions.push("Revise target curriculum guides and re-take the mock interviews.");
    }

    // Body Language / CV Evaluation
    if (avgEyeContact >= 75) {
      strengths.push("Strong eye contact and high engagement with the camera.");
    } else {
      weaknesses.push("Frequent eye drift or distraction.");
      suggestions.push("Try to focus directly on the webcam while answering conversational questions.");
    }

    if (avgPosture >= 75) {
      strengths.push("Confident, upright posture during response delivery.");
    } else {
      weaknesses.push("Unstable posture or noticeable slouching.");
      suggestions.push("Adjust your chair and webcam height to help maintain a straight posture.");
    }

    if (avgCalmness >= 75) {
      strengths.push("Calm body language, showing high composure and confidence.");
    } else {
      weaknesses.push("Excessive movement or fidgeting.");
      suggestions.push("Practice keeping hand gestures contained and maintain a stable body position.");
    }

    // Store results in history database
    const session: SessionData = { 
      date: new Date().toISOString(), 
      category: category || "mixed", 
      results: validResults, 
      mcqScore: 0, 
      mcqResults: [],
      verificationPhoto: verificationPhoto || undefined,
      recordingId: activeRecordingId,
      cvMetrics: {
        eyeContact: avgEyeContact,
        posture: avgPosture,
        calmness: avgCalmness,
        confidence: avgConfidence,
      },
      strengths,
      weaknesses,
      feedbackSuggestions: suggestions,
    };

    void saveInterviewSession(session);

    const ssoUser = getSSOSession();
    const userProfile = getUserProfile();
    const studentEmail = ssoUser?.email || userProfile?.email || "";
    const studentName = ssoUser?.fullName || userProfile?.name || "Student";
    const studentUid = ssoUser?.uid || "";

    void logInterviewActivity(
      { uid: studentUid, fullName: studentName, email: studentEmail },
      "Completed Mock Technical Interview",
      `Achieved score of ${Math.round(avgFinalScore)}% in ${category || "mixed"} track with ${validResults.length} questions answered.`
    );

    // Navigate to Results page immediately
    const resultsState = {
      category: category || "mixed",
      totalQuestions: questions.length,
      results: validResults.map((r) => ({
        question: r.question,
        idealAnswer: r.idealAnswer,
        userAnswer: r.userAnswer,
        feedback: r.feedback,
        finalScore: r.finalScore,
        contentScore: r.contentScore,
        fluencyScore: r.fluencyScore,
        confidenceScore: r.confidenceScore,
        keywords: r.keywords,
      })),
      cvMetrics: {
        eyeContact: avgEyeContact,
        posture: avgPosture,
        calmness: avgCalmness,
        confidence: avgConfidence,
      },
      strengths,
      weaknesses,
      feedbackSuggestions: suggestions,
      recordingId: activeRecordingId,
    };

    navigate("/results", { state: resultsState });
  }, [category, verificationPhoto, sessionId, questions, navigate]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion) return;
    const finalAnswer = answer.trim() || "(No answer provided)";

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = finalAnswer === "(No answer provided)" ? "" : finalAnswer;
    setAnswers(updatedAnswers);

    setIsEvaluating(true);
    let result = evaluateAnswer(currentQuestion, finalAnswer);

    // If Groq API Key is available, run Groq Evaluation
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (groqKey && finalAnswer !== "(No answer provided)") {
      try {
        const groqEval = await evaluateAnswerWithGroq(
          currentQuestion.text,
          currentQuestion.idealAnswer,
          finalAnswer,
          currentQuestion.keywords || []
        );
        if (groqEval) {
          result = {
            ...result,
            finalScore: groqEval.finalScore,
            contentScore: groqEval.contentScore,
            fluencyScore: groqEval.fluencyScore,
            confidenceScore: groqEval.confidenceScore,
            confidenceLevel: groqEval.confidenceLevel,
            feedback: groqEval.feedback || result.feedback,
          };
        }
      } catch (err) {
        console.error("Failed to evaluate answer via Groq", err);
      }
    }
    setIsEvaluating(false);

    const updatedResults = [...results];
    updatedResults[currentIndex] = result;
    setResults(updatedResults);

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setAnswer(updatedAnswers[nextIndex] ?? "");
      setTimeLeft(120);
    } else {
      void finishAndNavigate(updatedResults);
    }
  }, [answer, answers, currentIndex, currentQuestion, questions, results, finishAndNavigate]);

  // Load profile defaults on mount
  useEffect(() => {
    const profile = getUserProfile();
    if (profile) {
      setProfilePhoto(profile.profilePhoto || null);
      if (profile.resumeText) {
        setInterviewSource("resume");
      } else {
        setInterviewSource("profile");
      }
    }
  }, []);

  // Manage MediaRecorder initialization
  useEffect(() => {
    if (stage === "interview" && cameraStream && !mediaRecorderRef.current) {
      recordedChunksRef.current = [];
      try {
        let options = { mimeType: "video/webm;codecs=vp9,opus" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm;codecs=vp8,opus" };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/webm" };
        }
        
        const recorder = new MediaRecorder(cameraStream, options);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to initialize MediaRecorder:", err);
      }
    }
    return () => {
      // clean up recorder on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stage, cameraStream]);

  // PDF.js Client-side parser utilities
  const extractTextFromPDF = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && !(window as any).pdfjsLib) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
          readPDFData(file).then(resolve).catch(reject);
        };
        script.onerror = () => reject(new Error("Failed to load PDF parser from CDN"));
        document.body.appendChild(script);
      } else {
        readPDFData(file).then(resolve).catch(reject);
      }
    });
  };

  const readPDFData = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          const pdfjsLib = (window as any).pdfjsLib;
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
          }
          
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    setLocalResumeFileName(file.name);

    if (ext === "pdf") {
      const loadingToast = toast.loading("Parsing resume PDF file...");
      try {
        const parsedText = await extractTextFromPDF(file);
        setLocalResumeText(parsedText);
        toast.dismiss(loadingToast);
        toast.success("Resume PDF parsed successfully!");
      } catch (err) {
        toast.dismiss(loadingToast);
        console.error("PDF Parsing error", err);
        toast.error("Failed to parse PDF automatically. Please upload a TXT file or paste details below.");
      }
    } else if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setLocalResumeText(text);
        toast.dismiss(loadingToast);
        toast.success("Resume text file loaded successfully!");
      };
      reader.readAsText(file);
    } else {
      toast.info(`Uploaded "${file.name}". Please paste your resume text details below.`);
    }
  };

  // Timer running during Voice Interview stage
  useEffect(() => {
    if (stage !== "interview") return;
    if (timeLeft <= 0) {
      return; // Do not auto-submit! Let the user choose to add time or skip
    }
    if (!isWindowFocused) return; // pause timer while tab/window not focused
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, isWindowFocused, timeLeft]);

  // Vocal prompt on timer expiry
  useEffect(() => {
    if (stage === "interview" && timeLeft === 0) {
      if (window.speechSynthesis && !isVoiceMuted) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("Time is up. Would you like to skip this question, or do you need more time?");
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("Failed to play time up warning", e);
        }
      }
    }
  }, [timeLeft, stage, isVoiceMuted]);

  // Detect visibility/blur events to pause/resume the timer during the interview
  useEffect(() => {
    const onVisibility = () => {
      if (stage !== "interview") return;
      if (document.visibilityState === "hidden") {
        setIsWindowFocused(false);
      } else {
        setIsWindowFocused(true);
      }
    };

    const onBlur = () => {
      if (stage !== "interview") return;
      setIsWindowFocused(false);
    };
    
    const onFocus = () => {
      if (stage !== "interview") return;
      setIsWindowFocused(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [stage]);

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = value;
      return updated;
    });
  };

  const handlePreviousQuestion = () => {
    if (currentIndex === 0) return;
    const previousIndex = currentIndex - 1;
    setCurrentIndex(previousIndex);
    setAnswer(answers[previousIndex] ?? results[previousIndex]?.answer ?? "");
    setTimeLeft(120);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="w-full min-h-screen bg-background">
      <main className="container max-w-6xl mx-auto px-3 sm:px-6 pt-16 sm:pt-18 pb-6">
        <AnimatePresence mode="wait">
          
          {/* STAGE: SELECT (SETUP & ONBOARDING) */}
          {stage === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full mx-auto"
            >
              {/* Return Button */}
              <div className="mb-2 flex items-center justify-start">
                <button
                  onClick={() => navigate("/")}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:text-primary hover:border-primary/40 hover:bg-primary/10 shadow-sm hover:scale-105 transition-all duration-200 cursor-pointer group"
                  title="Return to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-0.5 transition-transform duration-200" />
                </button>
              </div>

              {/* Top Compact Header Title */}
              <div className="text-center py-2 sm:py-3 mb-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-foreground mb-1.5 font-extrabold leading-tight">
                  Prepare for <span className="text-purple-600 dark:text-purple-400">Mock Interview</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                  Configure your session settings to start your diagnostic mock interview assessment.
                </p>
              </div>

              {/* Tab Navigation (Prep Module, Interview Settings, Live Interview, Scorecard) */}
              <div className="pb-2 mb-4 border-b border-slate-200 dark:border-slate-800 flex gap-6 overflow-x-auto text-xs sm:text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => { setTopActiveTab("prep"); if (stage !== "select") setStage("select"); }}
                  className={`pb-2 border-b-[3px] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    topActiveTab === "prep" && stage === "select"
                      ? "border-purple-600 text-purple-600 dark:text-purple-400 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  }`}
                >
                  Prep Module
                </button>
                <button
                  type="button"
                  onClick={() => { setTopActiveTab("settings"); if (stage !== "select") setStage("select"); }}
                  className={`pb-2 border-b-[3px] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    topActiveTab === "settings" && stage === "select"
                      ? "border-purple-600 text-purple-600 dark:text-purple-400 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  }`}
                >
                  Interview Settings
                </button>
                <button
                  type="button"
                  disabled={stage === "select"}
                  onClick={() => { setTopActiveTab("live"); }}
                  className={`pb-2 border-b-[3px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    stage === "mcq" || stage === "interview"
                      ? "border-purple-600 text-purple-600 dark:text-purple-400 font-bold"
                      : "border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60 font-medium"
                  }`}
                >
                  Live Interview
                </button>
                <button
                  type="button"
                  disabled={stage !== "complete"}
                  onClick={() => { setTopActiveTab("scorecard"); }}
                  className={`pb-2 border-b-[3px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    stage === "complete"
                      ? "border-purple-600 text-purple-600 dark:text-purple-400 font-bold"
                      : "border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60 font-medium"
                  }`}
                >
                  Scorecard
                </button>
              </div>

              {/* TAB 1: Prep Module View */}
              {topActiveTab === "prep" && (
                <section className="space-y-4 animate-in fade-in duration-200">
                  <div className="mb-3 text-left">
                    <h2 className="text-lg sm:text-xl text-foreground mb-1 font-bold tracking-tight">Interview Context Prep</h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Customize where the AI gets its question pool. You can use your onboarding track list, upload a resume, target a job description, or paste custom questions.
                    </p>
                  </div>

                  {/* Compact Button Grid */}
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {[
                      { id: "onboarding", label: "Onboarding Track", icon: Globe, source: "profile" },
                      { id: "resume", label: "Resume Upload", icon: FileText, source: "resume" },
                      { id: "job_desc", label: "Job Description", icon: Briefcase, source: "profile" },
                      { id: "online_test", label: "Online Test / Link", icon: LinkIcon, source: "profile" },
                      { id: "knowledge", label: "My Knowledge (LLM Mind)", icon: Brain, source: "profile" },
                      { id: "custom_qs", label: "Custom Questions", icon: Edit3, source: "profile" },
                    ].map((tab) => {
                      const isSelected = uploadTab === tab.id;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setUploadTab(tab.id as any);
                            setInterviewSource(tab.source as any);
                          }}
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-700 dark:bg-purple-600 text-white border-purple-700 dark:border-purple-600 shadow-sm"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-white/20 text-white" : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <span className={`block text-xs sm:text-sm ${isSelected ? "font-bold" : "font-semibold"}`}>{tab.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Context Panel Details */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm text-left mb-4">
                    {uploadTab === "onboarding" && (
                      <div className="space-y-3">
                        <h3 className="text-[11px] text-slate-500 dark:text-slate-400 tracking-widest uppercase font-bold">DEFAULT TRACK CATEGORIES</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {getUserProfile()?.learningPrograms && getUserProfile()!.learningPrograms.length > 0 ? (
                            getUserProfile()!.learningPrograms.map((catId) => {
                              const info = categoryInfoMap[catId] || { label: catId.toUpperCase(), icon: Code, desc: "Custom category" };
                              const IconComp = info.icon;
                              return (
                                <div key={catId} className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:shadow-sm transition-shadow">
                                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                    <IconComp className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-foreground">{info.label}</h4>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{info.desc}</p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:shadow-sm transition-shadow">
                              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-foreground">Web Development</h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">HTML/CSS, JS & React</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {uploadTab === "resume" && (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors relative cursor-pointer">
                          <Briefcase className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                          <p className="text-base font-bold text-foreground">Upload Resume File (PDF, TXT)</p>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Vedyasetu dynamic parser will auto-extract key skills and experience</p>
                          <input
                            type="file"
                            accept=".pdf,.txt"
                            onChange={handlePdfUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            id="resume-file-upload-input"
                          />
                          {localResumeFileName && (
                            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-3 font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Selected: {localResumeFileName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Or paste resume text contents:</Label>
                          <Textarea
                            value={localResumeText}
                            onChange={(e) => setLocalResumeText(e.target.value)}
                            placeholder="Paste text contents here..."
                            className="min-h-[140px] text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {uploadTab === "job_desc" && (
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Paste Target Job Description Detail:</Label>
                        <Textarea
                          value={jobDescriptionText}
                          onChange={(e) => setJobDescriptionText(e.target.value)}
                          placeholder="Paste role description or job criteria here... Groq AI will customize behavioral & technical questions targeting this post."
                          className="min-h-[180px] text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    )}

                    {uploadTab === "online_test" && (
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Paste Job Post or Online Test Link / URL:</Label>
                        <Textarea
                          value={onlineLinkText}
                          onChange={(e) => setOnlineLinkText(e.target.value)}
                          placeholder="Paste LinkedIn job link, LeetCode problem URL, or online test description link here..."
                          className="min-h-[180px] text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    )}

                    {uploadTab === "knowledge" && (
                      <div className="space-y-6">
                        <div>
                          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-3">Select Core Topic:</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                              { id: "python", label: "Python", icon: Code, desc: "GIL, decorators, decorators & GIL" },
                              { id: "dsa", label: "DSA", icon: FileCode, desc: "Algorithms & complexity" },
                              { id: "web", label: "Web Dev", icon: Globe, desc: "HTML/CSS, JS & React" },
                              { id: "dbms", label: "Database / SQL", icon: Database, desc: "SQL queries & schemas" },
                              { id: "os", label: "Operating Systems", icon: Cpu, desc: "Processes, threads & memory" },
                              { id: "networking", label: "Computer Networks", icon: Wifi, desc: "Protocols & architecture" },
                            ].map((topic) => {
                              const isSelected = selectedTopic === topic.id;
                              return (
                                <button
                                  key={topic.id}
                                  type="button"
                                  onClick={() => setSelectedTopic(topic.id)}
                                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                    isSelected
                                      ? "bg-purple-100/50 dark:bg-purple-950/50 border-purple-600 text-purple-600 dark:text-purple-400 font-bold"
                                      : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300"
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-purple-600 text-white" : "bg-purple-100 dark:bg-purple-950 text-purple-600"}`}>
                                    <topic.icon className="w-4 h-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-xs sm:text-sm font-bold truncate">{topic.label}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{topic.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {uploadTab === "custom_qs" && (
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Custom Questions (One per line):</Label>
                        <Textarea
                          value={customQuestionsText}
                          onChange={(e) => setCustomQuestionsText(e.target.value)}
                          placeholder="Type or paste your custom questions list here..."
                          className="min-h-[180px] text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setTopActiveTab("settings")}
                      className="bg-purple-700 hover:bg-purple-800 text-white font-bold h-12 px-8 rounded-xl shadow-md shadow-purple-700/20"
                    >
                      Next: Interview Settings <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </section>
              )}

              {/* TAB 2: Interview Settings View */}
              {topActiveTab === "settings" && (
                <section className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto text-left">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <SettingsIcon className="w-5 h-5" />
                      </div>
                      Interview Session Settings
                    </h2>

                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-foreground">Number of questions per interview stage</p>
                        <Badge className="bg-purple-700 text-white font-bold px-3 py-1 text-xs">
                          {questionCount} Questions
                        </Badge>
                      </div>

                      {/* Quick selection grid */}
                      <div className="grid grid-cols-4 gap-3">
                        {[5, 10, 15, 20].map((num) => {
                          const isSelected = questionCount === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setQuestionCount(num)}
                              className={`h-11 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-purple-700 text-white shadow-md shadow-purple-700/20"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {num} Qs
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Range Slider */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Custom Question Count Range:</span>
                          <span>{questionCount} Qs (range 3 - 25)</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="25"
                          step="1"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="voice-mode-toggle" className="font-bold text-sm text-foreground">Onee Voice Assistant Mode</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Enable voice speech recognition and audio question playback during stage 2 Q&A</p>
                        </div>
                        <Switch
                          id="voice-mode-toggle"
                          checked={voiceModeEnabled}
                          onCheckedChange={setVoiceModeEnabled}
                        />
                      </div>
                    </div>

                    {/* Primary CTA Button */}
                    <div className="pt-4">
                      <Button
                        type="button"
                        onClick={() => startMockInterview(questionCount)}
                        className="w-full h-14 bg-purple-700 hover:bg-purple-800 text-white text-base rounded-2xl font-bold shadow-lg shadow-purple-700/25 hover:scale-[1.01] transition-transform"
                      >
                        Start Mock Interview <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* ACTIVE MCQ STAGE (MCQ Core) */}
          {stage === "mcq" && (
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
              {blocked && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                  <div className="bg-background p-6 rounded-lg max-w-md text-center border border-border">
                    <h3 className="text-lg font-bold mb-2">Session Blocked</h3>
                    <p className="text-sm text-muted-foreground mb-4">You navigated away from the assessment. This session is locked for exam integrity.</p>
                    <Button onClick={() => navigate("/home")}>Return to Home</Button>
                  </div>
                </div>
              )}

              {/* Left Column: Interactive Q&A content */}
              <div className="flex-1 w-full space-y-6">
                <AnimatePresence mode="wait">
                  {currentMCQ && (
                    <motion.div
                      key={`mcq-${currentMCQIndex}`}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="space-y-6"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 border-primary/30 text-primary capitalize px-3 py-1">
                            Stage 1: MCQ Core
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Question {currentMCQIndex + 1} of {mcqQuestions.length}
                          </span>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          Exam Mode Active
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${((currentMCQIndex + 1) / mcqQuestions.length) * 100}%` }}
                        />
                      </div>

                      {/* Question Display */}
                      <div className="glass-card p-6 sm:p-8">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{currentMCQ.category} category</span>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mt-1 text-foreground leading-snug">
                          {currentMCQ.text}
                        </h2>

                        {/* Options */}
                        <div className="grid grid-cols-1 gap-4 mt-6">
                          {currentMCQ.options.map((option, idx) => {
                            const isSelected = selectedOptions[currentMCQ.id] === idx;
                            const isSubmitted = mcqSubmitted[currentMCQ.id];
                            const isCorrectOption = idx === currentMCQ.correctOptionIndex;
                            
                            let optionStyle = "border-border/50 bg-background/30 hover:border-primary/50 hover:bg-background/50";
                            if (isSubmitted) {
                              if (isCorrectOption) {
                                  optionStyle = "border-success bg-success/10 text-success font-semibold shadow-md shadow-success/10";
                              } else if (isSelected) {
                                  optionStyle = "border-destructive bg-destructive/10 text-destructive font-semibold shadow-md shadow-destructive/10";
                              } else {
                                  optionStyle = "border-border/30 bg-background/10 text-muted-foreground opacity-60 cursor-not-allowed";
                              }
                            } else if (isSelected) {
                              optionStyle = "border-primary bg-primary/10 text-primary font-semibold shadow-md shadow-primary/10";
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (!isSubmitted) {
                                    setSelectedOptions({
                                      ...selectedOptions,
                                      [currentMCQ.id]: idx
                                    });
                                  }
                                }}
                                disabled={isSubmitted}
                                className={`w-full p-4 rounded-xl border text-left text-sm sm:text-base transition-all duration-300 flex items-center justify-between gap-3 ${optionStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-7 h-7 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center font-bold text-xs shrink-0">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span>{option}</span>
                                </div>
                                {isSubmitted && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                                {isSubmitted && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation Block */}
                        {mcqSubmitted[currentMCQ.id] && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 rounded-xl border bg-muted/40 text-xs sm:text-sm text-muted-foreground"
                          >
                            <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider text-success">
                              <Sparkles className="w-3.5 h-3.5" /> Explanation
                            </p>
                            {currentMCQ.explanation}
                          </motion.div>
                        )}
                      </div>

                      {/* Footer Controls */}
                      <div className="flex items-center justify-between gap-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (currentMCQIndex > 0) {
                              setCurrentMCQIndex(currentMCQIndex - 1);
                            }
                          }}
                          disabled={currentMCQIndex === 0}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>

                        <div className="flex gap-2">
                          {/* Submit Check button */}
                          {!mcqSubmitted[currentMCQ.id] ? (
                            <Button
                              onClick={() => {
                                  if (selectedOptions[currentMCQ.id] !== undefined) {
                                    setMcqSubmitted({
                                      ...mcqSubmitted,
                                      [currentMCQ.id]: true
                                    });
                                  }
                              }}
                              disabled={selectedOptions[currentMCQ.id] === undefined}
                              variant="hero"
                            >
                              Submit & Check
                            </Button>
                          ) : currentMCQIndex < mcqQuestions.length - 1 ? (
                            <Button
                              onClick={() => setCurrentMCQIndex(currentMCQIndex + 1)}
                              variant="default"
                            >
                              Next Question <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              onClick={handleNextStage}
                              variant="hero"
                              className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10"
                            >
                              Proceed to Stage 2: Voice Q&A <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Column: Persistent Security Monitor & Camera */}
              <div className="w-full lg:w-[360px] shrink-0 sticky top-28 space-y-4">
                <div className="glass-card p-5 border border-border/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Security Monitor</p>
                  <h4 className="text-sm font-bold text-foreground mt-1">Eye Contact Check Active</h4>
                  
                  {/* Visual Warning Lights */}
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    {[1, 2, 3].map((num) => (
                      <div
                        key={num}
                        className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                          headTurnWarnings >= num
                            ? "bg-destructive border-destructive shadow-md shadow-destructive/50 animate-pulse"
                            : "bg-muted border-border"
                        }`}
                        title={`Warning ${num}`}
                      />
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                    {headTurnWarnings === 0
                      ? "You are allowed 3 warnings for looking away before the interview auto-cancels."
                      : `Warning ${headTurnWarnings} of 3 issued. Keep eye contact with the screen.`}
                  </p>
                </div>

                <FaceRecognition
                  mode="monitor"
                  selfieImageUrl={profilePhoto}
                  onEyeContactChange={(hasEyeContact) => {
                    if (!hasEyeContact) {
                      handleEyeContactLost();
                    }
                  }}
                  onVerificationCapture={(imageUrl) => {
                    setVerificationPhoto(imageUrl);
                  }}
                />
              </div>
            </div>
          )}

          {/* ACTIVE INTERVIEW STAGES (Zoom virtual meeting room layout) */}
          {stage === "interview" && currentQuestion && (
            <div className="max-w-6xl mx-auto space-y-6">
              {blocked && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                  <div className="bg-background p-6 rounded-lg max-w-md text-center border border-border">
                    <h3 className="text-lg font-bold mb-2">Session Blocked</h3>
                    <p className="text-sm text-muted-foreground mb-4">You navigated away from the assessment. This session is locked for exam integrity.</p>
                    <Button onClick={() => navigate("/home")}>Return to Home</Button>
                  </div>
                </div>
              )}

              {/* Evaluation loading overlay */}
              {isEvaluating && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
                  <div className="flex flex-col items-center space-y-4 p-8 rounded-2xl bg-card border border-border/80 max-w-sm text-center shadow-2xl">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <h3 className="text-lg font-bold text-foreground">Evaluating Answer</h3>
                    <p className="text-sm text-muted-foreground">Groq AI is reviewing your response against the technical rubric...</p>
                  </div>
                </div>
              )}

              {/* TAB 2: Live Interview Combined Split Layout matching reference HTML */}
              <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] text-left">
                
                {/* Left Panel: Problem Statement & AI Agent (1/3 width) */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                  {/* AI Agent Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-[230px] shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" /> AI Interviewer
                      </span>
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase rounded flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 block"></span> Recording
                      </span>
                    </div>

                    <div className="flex-1 bg-slate-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
                      {isCameraOff ? (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <VideoOff className="w-8 h-8" />
                          <span className="text-xs font-semibold">Camera Off</span>
                        </div>
                      ) : (
                        <FaceRecognition
                          mode="monitor"
                          selfieImageUrl={profilePhoto}
                          onEyeContactChange={(hasEyeContact) => {
                            if (!hasEyeContact) {
                              handleEyeContactLost();
                            }
                          }}
                          onVerificationCapture={(imageUrl) => {
                            setVerificationPhoto(imageUrl);
                          }}
                          onStreamActive={(stream) => setCameraStream(stream)}
                          onMetricsUpdate={(metrics) => {
                            setCvMetrics(metrics);
                            cvMetricsHistory.current.push(metrics);
                          }}
                        />
                      )}

                      {/* Animated Bouncing Audio Wave Bars Overlay */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">
                        <div className={`w-1 bg-purple-500 rounded-full ${isAiSpeaking || isUserListening ? "h-4 animate-bounce" : "h-2"}`}></div>
                        <div className={`w-1 bg-purple-500 rounded-full ${isAiSpeaking || isUserListening ? "h-5 animate-[bounce_1.2s_infinite]" : "h-3"}`}></div>
                        <div className={`w-1 bg-purple-500 rounded-full ${isAiSpeaking || isUserListening ? "h-3 animate-[bounce_0.8s_infinite]" : "h-1.5"}`}></div>
                        <div className={`w-1 bg-purple-500 rounded-full ${isAiSpeaking || isUserListening ? "h-4 animate-[bounce_1.1s_infinite]" : "h-2"}`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Problem Description Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex-1 overflow-y-auto shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        Question {currentIndex + 1} of {questions.length}
                      </h3>
                      <Badge variant="secondary" className="text-xs font-bold font-mono">
                        <Clock className="w-3 h-3 mr-1" /> {formatTime(timeLeft)}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded">Technical</span>
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[11px] font-bold rounded">AI Recruiter</span>
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1">
                      <p className="font-semibold text-foreground leading-relaxed">
                        {currentQuestion?.text || "Explain your technical solution and approach."}
                      </p>

                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                        <span className="text-slate-500 block mb-1 font-bold">Sample Context / Constraints:</span>
                        <code className="text-purple-600 dark:text-purple-400">Time limit: 120s | Language: Python 3 / Pseudocode</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Code Editor & Terminal (2/3 width) */}
                <div className="flex-1 flex flex-col bg-[#0f172a] text-slate-200 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                  {/* Editor Top Bar */}
                  <div className="bg-[#1e293b] border-b border-slate-800 p-2.5 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm border border-slate-700">
                        Solution.py
                      </button>
                      <button className="px-3 py-1 text-slate-400 hover:text-white text-xs font-medium rounded-md">
                        Notes.txt
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowTextEditor(!showTextEditor)}
                        className="text-slate-400 hover:text-white"
                        title="Toggle Textarea mode"
                      >
                        <Type className="w-4 h-4" />
                      </button>
                      <Button
                        type="button"
                        onClick={() => {
                          setLiveUserTranscript("");
                          handleSubmitAnswer();
                        }}
                        className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Run Code / Submit
                      </Button>
                    </div>
                  </div>

                  {/* Code Area */}
                  <div className="flex-1 p-4 font-mono text-xs sm:text-sm overflow-y-auto bg-[#0f172a] text-slate-300 flex">
                    <div className="w-8 text-right pr-3 text-slate-600 select-none border-r border-slate-800 mr-3">
                      1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9<br />10
                    </div>
                    <textarea
                      value={answer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="# Write your Python / pseudo-code solution here...&#10;class Solution:&#10;    def solve(self, input_data):&#10;        # TODO: Implement approach&#10;        pass"
                      className="flex-1 bg-transparent text-slate-200 font-mono text-xs sm:text-sm resize-none focus:outline-none min-h-[260px] leading-relaxed"
                    />
                  </div>

                  {/* Headless Voice Controller Assistant */}
                  <div className="hidden">
                    <VoiceInterviewAssistant
                      questionText={currentQuestion?.text || ""}
                      answer={answer}
                      onAnswerChange={(val) => {
                        if (typeof val === "function") {
                          const nextVal = val(answer);
                          handleAnswerChange(nextVal);
                        } else {
                          handleAnswerChange(val);
                        }
                      }}
                      enabled={!isMicMuted}
                      autoSpeak={autoSpeakEnabled}
                      setAutoSpeak={setAutoSpeakEnabled}
                      autoListen={autoListenEnabled}
                      setAutoListen={setAutoListenEnabled}
                      isMuted={isVoiceMuted}
                      setIsMuted={setIsVoiceMuted}
                      onSpeakingChange={(speaking) => setIsAiSpeaking(speaking)}
                      onListeningChange={(listening) => setIsUserListening(listening)}
                      onMicVolumeChange={(volume) => setUserMicVolume(volume)}
                      onTranscriptChange={(transcript) => setLiveUserTranscript(transcript)}
                      onPauseSubmit={() => {
                        setLiveUserTranscript("");
                        handleSubmitAnswer();
                      }}
                    />
                  </div>

                  {/* Console/Terminal Output Bar */}
                  <div className="h-44 bg-[#1e293b] border-t border-slate-800 flex flex-col">
                    <div className="flex bg-[#0f172a] border-b border-slate-800 text-xs font-semibold">
                      <button className="px-4 py-2 text-white border-b-2 border-purple-500 font-bold">Console Terminal</button>
                      <button className="px-4 py-2 text-slate-400 hover:text-white border-b-2 border-transparent">Test Evaluation</button>
                    </div>
                    <div className="p-3.5 text-slate-400 font-mono text-xs overflow-y-auto flex-1 space-y-1">
                      <p className="text-emerald-400 font-semibold">&gt; Console initialized. Ready to execute code.</p>
                      {answer.trim() && (
                        <p className="text-slate-300">&gt; Draft Answer Captured ({answer.trim().length} chars).</p>
                      )}
                      <p className="text-slate-500">&gt; Click 'Run Code / Submit' to evaluate answer with Groq AI recruiter.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STAGE: COMPLETION & SCORE REPORT CARD */}
          {stage === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">Interview Complete</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Here is a comprehensive summary of your performance assessment.</p>
              </div>

              {/* Main Score Overview Card with Circular Progress Gauge & 4 Metrics */}
              {(() => {
                const mcqCorrect = mcqQuestions.filter((q) => selectedOptions[q.id] === q.correctOptionIndex).length;
                const mcqPct = mcqQuestions.length > 0 ? (mcqCorrect / mcqQuestions.length) * 100 : 80;
                const voiceAvg = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.finalScore, 0) / results.length) : 85;
                const overallScore = Math.round((mcqPct + voiceAvg) / 2);
                const isStrongHire = overallScore >= 75;

                return (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row items-center gap-8 text-left">
                    <div className="relative w-40 h-40 shrink-0 flex items-center justify-center mx-auto md:mx-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100 dark:text-slate-800"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className="text-purple-600 dark:text-purple-400 transition-all duration-1000 ease-out"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray={`${overallScore}, 100`}
                          strokeLinecap="round"
                          strokeWidth="3"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-extrabold text-foreground">{overallScore}%</span>
                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mt-0.5">
                          {isStrongHire ? "Strong Hire" : "Hire Candidate"}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                          <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>Problem Solving</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{Math.min(100, Math.round(overallScore * 1.05))}/100</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                          <Code className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>Code Quality</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{Math.round(mcqPct)}/100</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                          <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>Communication</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{Math.round(voiceAvg)}/100</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>Efficiency</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{Math.min(100, Math.round(overallScore * 0.95))}/100</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* AI Feedback Breakdown Cards */}
              <div className="space-y-4 mb-8 text-left">
                <h3 className="text-base font-bold text-foreground border-b border-slate-200 dark:border-slate-800 pb-2">AI Feedback Breakdown</h3>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <ThumbsUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-1">What went well</h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        You clearly communicated your thought process before answering. Keyword coverage and core concept definitions were accurate and structured logically.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-full text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-1">Areas for Improvement</h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Consider sharing deeper real-world project examples when explaining architecture decisions. For coding problems, double-check edge cases such as empty input arrays and space complexity optimization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Toggle */}
              <div className="flex justify-center gap-2 mb-6 max-w-sm mx-auto bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setResultsTab("mcq")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    resultsTab === "mcq"
                      ? "bg-purple-700 dark:bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-foreground"
                  }`}
                >
                  Stage 1: MCQ Core
                </button>
                <button
                  onClick={() => setResultsTab("voice")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    resultsTab === "voice"
                      ? "bg-purple-700 dark:bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-foreground"
                  }`}
                >
                  Stage 2: Voice Q&A
                </button>
              </div>

              {/* Stage 1: MCQ Detailed Report */}
              {resultsTab === "mcq" && (
                <div className="space-y-4 mb-8 text-left">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Stage 1 Accuracy</p>
                    <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
                      {Math.round(
                        (mcqQuestions.filter((q) => selectedOptions[q.id] === q.correctOptionIndex).length /
                          Math.max(1, mcqQuestions.length)) *
                          100
                      )}%
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {mcqQuestions.filter((q) => selectedOptions[q.id] === q.correctOptionIndex).length} of {mcqQuestions.length} questions correct
                    </p>
                  </div>

                  {mcqQuestions.map((q, idx) => {
                    const isCorrect = selectedOptions[q.id] === q.correctOptionIndex;
                    const selectedText = q.options[selectedOptions[q.id] ?? -1] || "(No option selected)";
                    const correctText = q.options[q.correctOptionIndex];
                    return (
                      <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-sm sm:text-base flex-1">
                            {idx + 1}. {q.text}
                          </h3>
                          <Badge
                            variant="outline"
                            className={isCorrect ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40"}
                          >
                            {isCorrect ? "Correct" : "Incorrect"}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <p className="text-muted-foreground">
                            Your answer: <span className={isCorrect ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{selectedText}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-muted-foreground">
                              Correct answer: <span className="text-emerald-600 font-semibold">{correctText}</span>
                            </p>
                          )}
                          <p className="text-muted-foreground mt-3 pt-2 border-t border-border/20 text-xs italic">
                            💡 <strong>Explanation:</strong> {q.explanation}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stage 2: Voice Interview Detailed Report */}
              {resultsTab === "voice" && (
                <div className="space-y-4 mb-8 text-left">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Stage 2 Average Score</p>
                    <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
                      {results.length > 0
                        ? Math.round(results.reduce((a, r) => a + r.finalScore, 0) / results.length)
                        : 0}%
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Evaluated by keyword coverage, confidence level, and content matching.
                    </p>
                  </div>

                  {results.length === 0 ? (
                    <div className="p-6 text-center border rounded-2xl bg-background/50 text-muted-foreground text-sm">
                      No conversational questions completed.
                    </div>
                  ) : (
                    results.map((r, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <h3 className="font-semibold text-sm sm:text-base flex-1">{r.questionText}</h3>
                          <Badge
                            variant="outline"
                            className={
                              r.finalScore >= 70
                                ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                                : r.finalScore >= 50
                                ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40"
                                : "text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40"
                            }
                          >
                            {r.finalScore}%
                          </Badge>
                        </div>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <p className="text-muted-foreground"><strong className="text-foreground">Your Answer:</strong> {r.answer || "(No answer provided)"}</p>
                          <p className="text-muted-foreground"><strong className="text-foreground">Ideal Answer:</strong> {r.idealAnswer}</p>
                          <div className="mt-3 space-y-1 pt-2 border-t border-border/20">
                            {r.feedback.map((f, j) => (
                              <p key={j} className="text-xs text-muted-foreground">💡 {f}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold h-12 px-8 rounded-xl shadow-md shadow-purple-700/20"
                >
                  View Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setStage("select"); setTopActiveTab("prep"); }}
                  className="border-slate-300 dark:border-slate-700 font-bold h-12 px-8 rounded-xl"
                >
                  Start New Interview
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      {stage === "select" && (
        <VoiceAssistant
          onRemoveSettings={() => setShowSettings(false)}
          onAddSettings={() => setShowSettings(true)}
          onStartInterview={() => startMockInterview(questionCount)}
          onNavigate={(path) => navigate(path)}
          showSettings={showSettings}
        />
      )}
    </div>
  );
};

export default Interview;
