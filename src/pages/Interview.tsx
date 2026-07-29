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
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Briefcase, Code, Database, Globe, Cpu, Wifi, Coffee, FileCode, CheckCircle2, XCircle, HelpCircle, Layers, Sparkles, Loader2, Camera, Mic, VideoOff, MicOff, User, MessageSquare, Sparkle, AlertTriangle, Volume2, VolumeX, Type } from "lucide-react";
import VoiceControlInterview from "@/components/VoiceControlInterview";
import VoiceAssistant from "@/components/VoiceAssistant";
import VoiceInterviewAssistant from "@/components/VoiceInterviewAssistant";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getInterviewResultsKey, getUserProfile, saveInterviewSession } from "@/lib/auth";
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
    <div className="w-full">
      <main className="container px-3 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
        <AnimatePresence mode="wait">
          
          {/* STAGE: SELECT (SETUP & ONBOARDING) */}
          {stage === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-10 sm:mb-12">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
                  Prepare for <span className="text-gradient">Mock Interview</span>
                </h1>
                <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
                  Configure your session settings to start your diagnostic mock interview assessment.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                {/* Main Content (Left) */}
                <div className="flex-1 space-y-8">
                  {/* Preparation Tabs Container */}
                  <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">Interview Context Prep</h2>
                    <p className="text-sm text-muted-foreground font-medium mb-6">
                      Customize where the AI gets its question pool. You can use your onboarding track list, upload a resume, target a job description, or paste custom questions.
                    </p>

                    {/* Tabs Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-border/20 pb-4">
                      <Button
                        variant={uploadTab === "onboarding" ? "default" : "outline"}
                        onClick={() => { setUploadTab("onboarding"); setInterviewSource("profile"); }}
                        className="text-xs font-semibold h-9 px-3 rounded-lg"
                      >
                        Onboarding Track
                      </Button>
                      <Button
                        variant={uploadTab === "resume" ? "default" : "outline"}
                        onClick={() => { setUploadTab("resume"); setInterviewSource("resume"); }}
                        className="text-xs font-semibold h-9 px-3 rounded-lg"
                      >
                        Resume Upload
                      </Button>
                      <Button
                        variant={uploadTab === "job_desc" ? "default" : "outline"}
                        onClick={() => { setUploadTab("job_desc"); setInterviewSource("profile"); }}
                        className="text-xs font-semibold h-9 px-3 rounded-lg"
                      >
                        Job Description
                      </Button>
                      <Button
                        variant={uploadTab === "online_test" ? "default" : "outline"}
                        onClick={() => { setUploadTab("online_test"); setInterviewSource("profile"); }}
                        className="text-xs font-semibold h-9 px-3 rounded-lg"
                      >
                        Online Test / Link
                      </Button>
                      <Button
                        variant={uploadTab === "knowledge" ? "default" : "outline"}
                        onClick={() => { setUploadTab("knowledge"); setInterviewSource("profile"); }}
                        className="text-xs font-semibold h-9 px-3 rounded-lg"
                      >
                        My Knowledge (LLM Mind)
                      </Button>
                      <Button
                        variant={uploadTab === "custom_qs" ? "default" : "outline"}
                        onClick={() => { setUploadTab("custom_qs"); setInterviewSource("profile"); }}
                        className="text-xs font-semibold h-9 px-3 rounded-lg"
                      >
                        Custom Questions
                      </Button>
                    </div>

                    {/* Tab panels */}
                    {uploadTab === "onboarding" && (
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Default Track Categories</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {getUserProfile()?.learningPrograms && getUserProfile()!.learningPrograms.length > 0 ? (
                            getUserProfile()!.learningPrograms.map((catId) => {
                              const info = categoryInfoMap[catId] || { label: catId.toUpperCase(), icon: Code, desc: "Custom category" };
                              return (
                                <div key={catId} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/30 text-left">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <info.icon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-foreground text-sm">{info.label}</h4>
                                    <p className="text-xs text-muted-foreground">{info.desc}</p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-2 text-center p-6 text-muted-foreground text-sm border border-dashed rounded-xl">
                              No tracks selected in profile. Defaulting to all categories.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {uploadTab === "resume" && (
                      <div className="space-y-4 text-left">
                        <div className="border-2 border-dashed border-border/60 bg-muted/20 rounded-2xl p-6 text-center hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer relative">
                          <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="text-sm font-bold">Upload Resume File (PDF, TXT)</p>
                          <p className="text-xs text-muted-foreground mt-1">Vedyasetu dynamic PDF parser will extract details</p>
                          <input
                            type="file"
                            accept=".pdf,.txt"
                            onChange={handlePdfUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            id="resume-file-upload-input"
                          />
                          {localResumeFileName && (
                            <p className="text-xs text-emerald-400 mt-2 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {localResumeFileName}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-muted-foreground">Or paste resume details directly:</Label>
                          <Textarea
                            value={localResumeText}
                            onChange={(e) => setLocalResumeText(e.target.value)}
                            placeholder="Paste text contents here..."
                            className="min-h-[140px] text-xs bg-slate-900/30 border-border/50 text-left"
                          />
                        </div>
                      </div>
                    )}

                    {uploadTab === "job_desc" && (
                      <div className="space-y-3 text-left">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-muted-foreground">Paste Target Job Description Detail:</Label>
                          <Textarea
                            value={jobDescriptionText}
                            onChange={(e) => setJobDescriptionText(e.target.value)}
                            placeholder="Paste role description or job criteria here... Groq AI will customize behavioral & technical questions targeting this post."
                            className="min-h-[180px] text-xs bg-slate-900/30 border-border/50 text-left"
                          />
                        </div>
                      </div>
                    )}

                    {uploadTab === "online_test" && (
                      <div className="space-y-3 text-left">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-muted-foreground">Paste Job Post or Online Test Link / URL:</Label>
                          <Textarea
                            value={onlineLinkText}
                            onChange={(e) => setOnlineLinkText(e.target.value)}
                            placeholder="Paste LinkedIn job link, LeetCode problem URL, or online test description link here... Groq AI will parse and customize questions based on it."
                            className="min-h-[180px] text-xs bg-slate-900/30 border-border/50 text-left"
                          />
                        </div>
                      </div>
                    )}

                    {uploadTab === "knowledge" && (
                      <div className="space-y-4 text-left">
                        <div>
                          <Label className="text-xs font-bold text-muted-foreground block mb-2">Select Core Topic:</Label>
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
                                  className={`p-3 rounded-xl border text-left transition-all duration-300 flex items-start gap-2 h-full ${
                                    isSelected
                                      ? "bg-primary/10 border-primary text-primary animate-pulse"
                                      : "bg-background/30 border-border/50 text-muted-foreground hover:border-primary/30"
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                                    <topic.icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-bold truncate text-foreground">{topic.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{topic.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {selectedTopic && (
                          <div className="space-y-2 pt-2 border-t border-border/20">
                            <Label className="text-xs font-bold text-muted-foreground block">Select Interview Difficulty Level:</Label>
                            <div className="grid grid-cols-3 gap-3 max-w-md">
                              {[
                                { id: "basics", label: "Basics / Foundations" },
                                { id: "intermediate", label: "Intermediate concepts" },
                                { id: "advanced", label: "Advanced / Hard topics" },
                              ].map((lvl) => {
                                const isSelected = selectedLevel === lvl.id;
                                return (
                                  <Button
                                    key={lvl.id}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => setSelectedLevel(lvl.id as any)}
                                    className={`h-10 text-xs font-semibold ${
                                      isSelected ? "shadow-md shadow-primary/20" : "bg-background/40 hover:bg-background border-border/50 text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {lvl.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {uploadTab === "custom_qs" && (
                      <div className="space-y-3 text-left">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-muted-foreground">Custom Interview Questions (One per line):</Label>
                          <Textarea
                            value={customQuestionsText}
                            onChange={(e) => setCustomQuestionsText(e.target.value)}
                            placeholder="Type or paste your own list of interview questions here. Each question must be on a separate line."
                            className="min-h-[180px] text-xs bg-slate-900/30 border-border/50 text-left"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  {showSettings && (
                    <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                      <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Code className="w-4 h-4" />
                        </div>
                        Interview Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground font-medium">Number of questions for each stage</p>
                          <Badge variant="default" className="text-xs font-bold px-2.5 py-0.5">
                            {questionCount} Questions
                          </Badge>
                        </div>
                        
                        {/* Quick Picks */}
                        <div className="grid grid-cols-4 gap-2">
                          {[5, 10, 15, 20].map((num) => {
                            const isSelected = questionCount === num;
                            return (
                              <Button
                                key={num}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => setQuestionCount(num)}
                                className={`h-10 text-xs font-bold ${
                                  isSelected ? "shadow-md shadow-primary/20" : "bg-background/40 hover:bg-background border-border/50 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {num} Qs
                              </Button>
                            );
                          })}
                        </div>

                        {/* Custom Slider */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                            <span>Adjust Custom Count:</span>
                            <span>{questionCount} Qs (range: 3 - 25)</span>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="25"
                            step="1"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                            className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>

                      {/* Voice assistant pre-selection toggle */}
                      <div className="pt-4 border-t border-border/20 mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="pre-voice-toggle" className="font-semibold text-sm">Onee Voice Assistant Mode</Label>
                            <p className="text-xs text-muted-foreground">Speak answers & hear questions read out loud in Stage 2</p>
                          </div>
                          <Switch
                            id="pre-voice-toggle"
                            checked={voiceModeEnabled}
                            onCheckedChange={setVoiceModeEnabled}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Start Button */}
                  <div className="pt-2">
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full h-14 text-base rounded-xl font-semibold shadow-lg shadow-primary/20 animate-pulse"
                      onClick={() => startMockInterview(questionCount)}
                    >
                      Start Mock Interview <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* Sidebar (Right): Session Blueprint */}
                <div className="w-full lg:w-[380px] shrink-0">
                  <div className="sticky top-28 space-y-6">
                    <div className="glass-card p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                      
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">Interview Structure</h3>
                          <p className="text-xs text-muted-foreground font-medium">Two distinct review stages</p>
                        </div>
                      </div>

                      <div className="space-y-6 text-sm">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                          <div>
                            <h4 className="font-bold text-foreground">Stage 1: MCQ Core</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              5 to 10 interactive multiple choice questions to assess coding fundamentals, database design, and key terminology.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                          <div>
                            <h4 className="font-bold text-foreground">Stage 2: Voice Chat</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              Dynamic oral Q&A conducted by Onee. Speak or type answers. Assesses context depth, communication, and explanation flow.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">✓</div>
                          <div>
                            <h4 className="font-bold text-foreground">Comprehensive Dashboard</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              Both scores are calculated, plotted, and cached in your history for complete metric tracking.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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

              {/* Immersive Video-Call Layout (Full Width, No Sidebar, Theme-Aware) */}
              <div className="w-full flex flex-col justify-between bg-background border border-border rounded-2xl relative min-h-[520px] md:min-h-[600px] shadow-2xl overflow-hidden">
                
                {/* Full Screen Webcam Feed (Main immersive background) */}
                <div className="absolute inset-0 z-0 bg-muted/30 flex items-center justify-center">
                  {isCameraOff ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <VideoOff className="w-12 h-12" />
                      <span className="text-sm font-semibold">Camera Off</span>
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
                </div>

                {/* Glassmorphic Meeting Header (Overlaid at top) */}
                <div className="flex justify-between items-center bg-background/70 backdrop-blur-md px-5 py-3.5 border-b border-border/50 z-10 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground/80 uppercase tracking-widest">Live AI Interview Session</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold">
                      Q{currentIndex + 1} of {questions.length}
                    </Badge>
                    <div className={`flex items-center gap-1.5 text-xs font-mono font-bold ${timeLeft < 30 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                </div>

                {/* Floating AI Assistant Orb (Siri-style dot visualizer floating top-right) */}
                <div className="absolute top-16 right-4 z-20 shadow-xl rounded-2xl p-3 bg-background/80 backdrop-blur-md border border-border flex items-center gap-3 select-none">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* Pulsing visualizer circles */}
                    <AnimatePresence>
                      {isAiSpeaking && (
                        <motion.div
                          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.1, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 rounded-full bg-primary/20"
                        />
                      )}
                      {isUserListening && (
                        <motion.div
                          animate={{ scale: [1, 1.4 + userMicVolume * 0.6, 1], opacity: [0.6, 0.1, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          className="absolute inset-0 rounded-full bg-purple-500/20"
                        />
                      )}
                    </AnimatePresence>
                    
                    <motion.div
                      animate={
                        isAiSpeaking
                          ? { scale: [1, 1.1, 1], rotate: 360 }
                          : isUserListening
                          ? { scale: [1, 1.05 + userMicVolume * 0.2, 1], rotate: -180 }
                          : { scale: [1, 1.02, 1] }
                      }
                      transition={{ repeat: Infinity, duration: isAiSpeaking ? 3 : 1.5 }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isAiSpeaking
                          ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white"
                          : isUserListening
                          ? "bg-gradient-to-tr from-purple-600 to-pink-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isAiSpeaking ? (
                        <Volume2 className="w-4 h-4 animate-pulse" />
                      ) : isUserListening ? (
                        <Mic className="w-4 h-4 animate-bounce" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                    </motion.div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Olivia (AI)</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {isAiSpeaking ? "Speaking..." : isUserListening ? "Listening..." : "Idle"}
                    </p>
                  </div>
                </div>

                {/* Floating Dialogue Bubbles & Collapsible Editor (Z-Index Overlays) */}
                <div className="flex-1 flex flex-col justify-end p-6 relative pointer-events-none z-10">
                  
                  {/* Floating Dialogue Bubbles Container */}
                  <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 mb-4 w-full">
                    
                    {/* 1. Olivia's Bubble (Left side) */}
                    <div className="flex-1 max-w-sm bg-background/85 backdrop-blur-md border border-border text-foreground p-4 rounded-2xl rounded-bl-none text-left shadow-xl text-xs leading-relaxed pointer-events-auto">
                      <div className="text-[9px] uppercase tracking-wider font-bold text-primary mb-1 flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-primary" /> Olivia (AI Recruiter)
                      </div>
                      <p className="font-medium">{currentQuestion.text}</p>
                    </div>

                    {/* 2. Your Bubble (Right side) */}
                    <div className="flex-1 max-w-sm bg-primary/10 backdrop-blur-md border border-primary/20 text-foreground p-4 rounded-2xl rounded-br-none text-left shadow-xl text-xs leading-relaxed pointer-events-auto md:self-end">
                      <div className="text-[9px] uppercase tracking-wider font-bold text-purple-500 mb-1 flex items-center gap-1">
                        <Mic className="w-3 h-3 text-purple-500" /> You (Candidate)
                      </div>
                      <p className="font-medium italic text-foreground">
                        {liveUserTranscript.trim() 
                          ? (answer.trim() ? `${answer} ${liveUserTranscript}` : liveUserTranscript)
                          : (answer.trim() ? answer : "Listening to your voice...")}
                      </p>
                    </div>

                  </div>

                  {/* Collapsible Text Editor Overlay */}
                  {showTextEditor && (
                    <div className="w-full max-w-2xl mx-auto bg-background/90 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl pointer-events-auto mb-2 text-left space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold text-muted-foreground">Edit Your Answer Transcript:</Label>
                        <Button variant="ghost" size="xs" onClick={() => setShowTextEditor(false)}>Close</Button>
                      </div>
                      <Textarea
                        value={answer}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="Type or correct your speech answer here..."
                        className="bg-background border-border text-foreground text-xs min-h-[80px] resize-none"
                      />
                    </div>
                  )}

                </div>

                {/* Headless/Invisible Voice Controller */}
                <div className="hidden">
                  <VoiceInterviewAssistant
                    questionText={currentQuestion.text}
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

                {/* Meeting Room Bottom Controls Bar */}
                <div className="bg-background/80 backdrop-blur-md border-t border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10">
                  
                  {/* Mic & Cam toggle switches */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isMicMuted ? "destructive" : "outline"}
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={() => setIsMicMuted(!isMicMuted)}
                      title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    <Button
                      variant={isCameraOff ? "destructive" : "outline"}
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={() => setIsCameraOff(!isCameraOff)}
                      title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                      {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </Button>

                    <Button
                      variant={showTextEditor ? "default" : "outline"}
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={() => setShowTextEditor(!showTextEditor)}
                      title="Edit Answer Text"
                    >
                      <Type className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Navigation inside Meeting stage */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="h-10 px-4"
                      onClick={handlePreviousQuestion}
                      disabled={currentIndex === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Prev
                    </Button>
                    
                    <Button
                      variant="hero"
                      className="h-10 px-5 shadow-lg shadow-primary/20"
                      onClick={() => {
                        setLiveUserTranscript("");
                        handleSubmitAnswer();
                      }}
                    >
                      {currentIndex < questions.length - 1 ? "Submit Answer" : "Complete Interview"}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>

                  {/* Terminate Meeting Button */}
                  <div>
                    <Button
                      variant="outline"
                      className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground h-10 px-4 rounded-xl"
                      onClick={() => {
                        if (confirm("Are you sure you want to end the interview early?")) {
                          void finishAndNavigate(results);
                        }
                      }}
                    >
                      End Call
                    </Button>
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
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">Assessment Complete!</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your performance report has been compiled successfully.
              </p>

              {/* Tab Switcher */}
              <div className="flex justify-center gap-2 mb-6 max-w-sm mx-auto bg-muted/40 p-1.5 rounded-xl border border-border/60">
                <button
                  onClick={() => setResultsTab("mcq")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    resultsTab === "mcq"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Stage 1: MCQ Core
                </button>
                <button
                  onClick={() => setResultsTab("voice")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    resultsTab === "voice"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Stage 2: Voice Q&A
                </button>
              </div>

              {/* Stage 1: MCQ Detailed Report */}
              {resultsTab === "mcq" && (
                <div className="space-y-4 mb-8 text-left">
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Stage 1 Accuracy</p>
                    <p className="text-3xl font-black text-primary mt-1">
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
                      <div key={q.id} className="glass rounded-xl p-5 border border-border/40">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-sm sm:text-base flex-1">
                            {idx + 1}. {q.text}
                          </h3>
                          <Badge
                            variant="outline"
                            className={isCorrect ? "text-success border-success/30 bg-success/5" : "text-destructive border-destructive/30 bg-destructive/5"}
                          >
                            {isCorrect ? "Correct" : "Incorrect"}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <p className="text-muted-foreground">
                            Your answer: <span className={isCorrect ? "text-success font-semibold" : "text-destructive font-semibold"}>{selectedText}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-muted-foreground">
                              Correct answer: <span className="text-success font-semibold">{correctText}</span>
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
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Stage 2 Average Score</p>
                    <p className="text-3xl font-black text-primary mt-1">
                      {results.length > 0
                        ? Math.round(results.reduce((a, r) => a + r.finalScore, 0) / results.length)
                        : 0}%
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Evaluated by keyword coverage, confidence level, and content matching.
                    </p>
                  </div>

                  {results.length === 0 ? (
                    <div className="p-6 text-center border rounded-xl bg-background/50 text-muted-foreground text-sm">
                      No conversational questions completed.
                    </div>
                  ) : (
                    results.map((r, i) => (
                      <div key={i} className="glass rounded-xl p-5 border border-border/40">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <h3 className="font-semibold text-sm sm:text-base flex-1">{r.questionText}</h3>
                          <Badge
                            variant="outline"
                            className={
                              r.finalScore >= 70
                                ? "text-success border-success/30 bg-success/5"
                                : r.finalScore >= 50
                                ? "text-warning border-warning/30 bg-warning/5"
                                : "text-destructive border-destructive/30 bg-destructive/5"
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

              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <Button variant="hero" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                  View Dashboard
                </Button>
                <Button variant="hero-outline" onClick={() => setStage("select")} className="w-full sm:w-auto">
                  Try Again
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
