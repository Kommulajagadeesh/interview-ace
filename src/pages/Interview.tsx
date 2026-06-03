import { useState, useEffect, useCallback } from "react";
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
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Briefcase,
  Code,
  Database,
  Globe,
  Cpu,
  Wifi,
  Coffee,
  FileCode,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import VoiceControlInterview from "@/components/VoiceControlInterview";
import VoiceAssistant from "@/components/VoiceAssistant";
import VoiceInterviewAssistant from "@/components/VoiceInterviewAssistant";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getInterviewResultsKey, getUserProfile, saveInterviewSession } from "@/lib/auth";
import { toast } from "sonner";
import FaceRecognition from "@/components/FaceRecognition";

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

const Interview = () => {
  const navigate = useNavigate();
  
  // Stages: "select" | "mcq" | "interview" | "complete"
  const [stage, setStage] = useState<"select" | "mcq" | "interview" | "complete">("select");
  const [category, setCategory] = useState<QuestionCategory | "mixed" | null>(null);
  const [questionCount, setQuestionCount] = useState<5 | 10>(5);
  
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

  const handleEyeContactLost = useCallback(() => {
    setHeadTurnWarnings((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setBlocked(true);
        setStage("complete");
        // Save results as flagged
        const session = { 
          date: new Date().toISOString(), 
          category: category || "mixed", 
          results: results.map(r => ({ ...r, flagged: true })), 
          note: "ended-due-to-eye-contact-violations",
          mcqScore: 0,
          mcqResults: [],
          verificationPhoto: verificationPhoto || undefined
        };
        void saveInterviewSession(session);
        toast.error("Interview cancelled due to excessive eye contact violations.");
      } else {
        toast.warning(`Warning: Please keep eye contact with the camera! (Warning ${next}/3)`);
        if (voiceModeEnabled && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("Warning: Please look at the camera.");
            window.speechSynthesis.speak(utterance);
          } catch {
            // ignore
          }
        }
      }
      return next;
    });
  }, [results, category, voiceModeEnabled, verificationPhoto]);

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
  };

  const startMockInterview = (count: 5 | 10) => {
    try {
      const profile = getUserProfile();
      let selectedQuestions: Question[] = [];
      let selectedMCQs: MCQQuestion[] = [];

      if (interviewSource === "resume" && profile?.resumeText) {
        selectedQuestions = generateQuestionsFromResume(profile.resumeText, count);
        selectedMCQs = generateMCQFromResume(profile.resumeText, count);
        setCategory("mixed");
      } else {
        const selectedCats = profile?.learningPrograms || [];
        const catsToUse = selectedCats.length > 0 ? selectedCats : ["dsa", "web", "dbms", "os", "networking", "hr"];

        // Combine questions from all selected categories
        let pool: Question[] = [];
        catsToUse.forEach((cat) => {
          const categoryId = cat as QuestionCategory;
          pool = [...pool, ...getQuestionsByCategory(categoryId)];
        });

        if (pool.length === 0) {
          pool = getQuestionsByCategory("dsa");
        }

        // Shuffle pool and fetch voice questions
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, count);

        // Fetch MCQs
        const catToFetch = catsToUse.length === 1 ? (catsToUse[0] as QuestionCategory) : "mixed";
        selectedMCQs = getMCQQuestions(catToFetch, count);
        setCategory(catsToUse.length === 1 ? (catsToUse[0] as QuestionCategory) : "mixed");
      }

      // Fail-safe fallbacks to guarantee the session never renders empty
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

      // Enter Stage 1: MCQ
      setStage("mcq");

      // Persist that the user has started/attended a mock interview
      const resultsKey = getInterviewResultsKey();
      const hasStartedKey = resultsKey.replace("interviewResults_", "interviewStarted_");
      sessionStorage.setItem(hasStartedKey, "true");
    } catch (error) {
      console.error("Error starting mock interview:", error);
      toast.error(`Failed to launch interview: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleNextStage = () => {
    // Transition from MCQ to Voice Interview Stage
    setStage("interview");
    setTimeLeft(120);
  };

  const handleSubmitAnswer = useCallback(() => {
    if (!currentQuestion) return;
    const finalAnswer = answer.trim() || "(No answer provided)";

    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = finalAnswer === "(No answer provided)" ? "" : finalAnswer;
    setAnswers(updatedAnswers);

    const result = evaluateAnswer(currentQuestion, finalAnswer);
    const updatedResults = [...results];
    updatedResults[currentIndex] = result;
    setResults(updatedResults);

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setAnswer(updatedAnswers[nextIndex] ?? "");
      setTimeLeft(120);
    } else {
      setStage("complete");
      
      // Calculate scores
      let correctCount = 0;
      mcqQuestions.forEach((q) => {
        if (selectedOptions[q.id] === q.correctOptionIndex) {
          correctCount++;
        }
      });
      const mcqScore = mcqQuestions.length > 0 ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;
      
      const mcqResults = mcqQuestions.map((q) => ({
        questionText: q.text,
        selectedOption: q.options[selectedOptions[q.id] ?? -1] || "(No option selected)",
        correctOption: q.options[q.correctOptionIndex],
        isCorrect: selectedOptions[q.id] === q.correctOptionIndex,
        explanation: q.explanation,
      }));

      // Store results for dashboard
      const session = { 
        date: new Date().toISOString(), 
        category: category || "mixed", 
        results: updatedResults, 
        mcqScore, 
        mcqResults,
        verificationPhoto: verificationPhoto || undefined
      };
      void saveInterviewSession(session);
    }
  }, [answer, answers, currentIndex, currentQuestion, questions, results, category, mcqQuestions, selectedOptions, verificationPhoto]);

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

  // Timer running during Voice Interview stage
  useEffect(() => {
    if (stage !== "interview") return;
    if (timeLeft <= 0) {
      handleSubmitAnswer();
      return;
    }
    if (!isWindowFocused) return; // pause timer while tab/window not focused
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, isWindowFocused, timeLeft, handleSubmitAnswer]);

  // Detect visibility/blur events and count switches during active exam
  useEffect(() => {
    const onVisibility = () => {
      if (stage !== "mcq" && stage !== "interview") return;
      if (document.visibilityState === "hidden") {
        setIsWindowFocused(false);
        setTabSwitchCount((c) => c + 1);
        setBlocked(true);
      } else {
        setIsWindowFocused(true);
      }
    };

    const onBlur = () => {
      if (stage !== "mcq" && stage !== "interview") return;
      setIsWindowFocused(false);
      setTabSwitchCount((c) => c + 1);
    };
    
    const onFocus = () => {
      if (stage !== "mcq" && stage !== "interview") return;
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

  // Handle Tab Switch Violations
  useEffect(() => {
    const MAX_SWITCHES = 3;
    const activeExam = stage === "mcq" || stage === "interview";
    if (!activeExam) return;

    if (blocked || tabSwitchCount >= MAX_SWITCHES) {
      const flagged = results.map((r) => ({ ...r, flagged: true }));
      setResults(flagged);
      setStage("complete");

      // Calculate MCQ score
      let correctCount = 0;
      mcqQuestions.forEach((q) => {
        if (selectedOptions[q.id] === q.correctOptionIndex) {
          correctCount++;
        }
      });
      const mcqScore = mcqQuestions.length > 0 ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;
      
      const mcqResults = mcqQuestions.map((q) => ({
        questionText: q.text,
        selectedOption: q.options[selectedOptions[q.id] ?? -1] || "(No option selected)",
        correctOption: q.options[q.correctOptionIndex],
        isCorrect: selectedOptions[q.id] === q.correctOptionIndex,
        explanation: q.explanation,
      }));

      const session = { 
        date: new Date().toISOString(), 
        category: category || "mixed", 
        results: flagged, 
        note: blocked ? "blocked-due-to-tab-switch" : "ended-due-to-tab-switching",
        mcqScore,
        mcqResults,
        verificationPhoto: verificationPhoto || undefined
      };
      void saveInterviewSession(session);
    }
  }, [tabSwitchCount, stage, results, category, blocked, mcqQuestions, selectedOptions, verificationPhoto]);

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
                  {/* Your Interview Profile & Categories OR Resume details overview */}
                  {interviewSource === "resume" ? (
                    <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                      
                      <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">Active Resume Context</h2>
                      <p className="text-sm text-muted-foreground font-medium mb-4">
                        The AI interviewer will formulate MCQ & conversational questions based on skills and projects extracted from your resume:
                      </p>
                      
                      <div className="p-4 rounded-xl border border-success/30 bg-success/5 flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-success shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-success">Resume File Active</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{getUserProfile()?.resumeFileName || "Custom Uploaded Resume"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                      
                      <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">Your Target Interview Track</h2>
                      <p className="text-sm text-muted-foreground font-medium mb-6">
                        Your mock interview is customized based on your selected categories in Profile Setup:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {getUserProfile()?.learningPrograms && getUserProfile()!.learningPrograms.length > 0 ? (
                          getUserProfile()!.learningPrograms.map((catId) => {
                            const info = categoryInfoMap[catId] || { label: catId.toUpperCase(), icon: Code, desc: "Custom category" };
                            return (
                              <div key={catId} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/30">
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
                      <p className="text-sm text-muted-foreground mb-4 font-medium">Choose the number of questions for each stage</p>
                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        <Button
                          variant={questionCount === 5 ? "default" : "outline"}
                          onClick={() => setQuestionCount(5)}
                          className={`h-12 font-medium ${questionCount === 5 ? "shadow-md shadow-primary/20" : "bg-background/50 hover:bg-background border-border/50"}`}
                        >
                          5 Questions / Stage
                        </Button>
                        <Button
                          variant={questionCount === 10 ? "default" : "outline"}
                          onClick={() => setQuestionCount(10)}
                          className={`h-12 font-medium ${questionCount === 10 ? "shadow-md shadow-primary/20" : "bg-background/50 hover:bg-background border-border/50"}`}
                        >
                          10 Questions / Stage
                        </Button>
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

          {/* ACTIVE INTERVIEW STAGES (MCQ & VOICE Q&A) */}
          {(stage === "mcq" || stage === "interview") && (
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
                  {stage === "mcq" && currentMCQ && (
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

                  {stage === "interview" && currentQuestion && (
                    <motion.div
                      key={`q-${currentIndex}`}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="space-y-6"
                    >
                      {/* Progress Header */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <Badge className="bg-primary/10 border-primary/30 text-primary capitalize px-3 py-1">
                            Stage 2: Voice Interview
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Question {currentIndex + 1} of {questions.length}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs sm:text-sm font-mono ${timeLeft < 30 ? "text-destructive font-bold animate-pulse" : "text-muted-foreground"}`}>
                          <Clock className="w-4 h-4" />
                          {formatTime(timeLeft)}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        />
                      </div>

                      {/* Voice Toggle bar */}
                      <div className="flex items-center justify-between bg-card/30 border border-border/40 rounded-xl p-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${voiceModeEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Onee Voice Assistant Mode</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{voiceModeEnabled ? "On" : "Off"}</span>
                          <Switch
                            checked={voiceModeEnabled}
                            onCheckedChange={setVoiceModeEnabled}
                          />
                        </div>
                      </div>

                      {/* Question display */}
                      <div className="glass-card p-6 sm:p-8">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{currentQuestion.category} category</span>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mt-1 text-foreground leading-snug">
                          {currentQuestion.text}
                        </h2>
                      </div>

                      {/* Voice assistant component */}
                      {voiceModeEnabled ? (
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
                          enabled={voiceModeEnabled}
                          autoSpeak={autoSpeakEnabled}
                          setAutoSpeak={setAutoSpeakEnabled}
                          autoListen={autoListenEnabled}
                          setAutoListen={setAutoListenEnabled}
                          isMuted={isVoiceMuted}
                          setIsMuted={setIsVoiceMuted}
                        />
                      ) : (
                        <VoiceControlInterview
                          onTranscript={() => {}}
                          onFinal={(text) => {
                            handleAnswerChange((answer ? answer + " " : "") + text);
                          }}
                        />
                      )}

                      {/* Text area */}
                      <div className="space-y-2">
                        <Label htmlFor="answer-input" className="text-xs font-bold text-muted-foreground">
                          Your Answer (Speak or Type to edit)
                        </Label>
                        <Textarea
                          id="answer-input"
                          value={answer}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          placeholder={voiceModeEnabled ? "Click the microphone orb to speak your answer, or type here directly..." : "Type your answer here..."}
                          className="min-h-[150px] bg-card border-border/50 focus:border-primary/50 text-sm"
                        />
                      </div>

                      {/* Controls footer */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          {answer.split(/\s+/).filter(Boolean).length} words
                        </span>
                        <div className="flex w-full sm:w-auto gap-2">
                          <Button
                            variant="outline"
                            onClick={handlePreviousQuestion}
                            className="w-full sm:w-auto"
                            disabled={currentIndex === 0}
                          >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Previous
                          </Button>
                          <Button variant="hero" onClick={handleSubmitAnswer} className="w-full sm:w-auto">
                            {currentIndex < questions.length - 1 ? "Next Question" : "Finish Interview"}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
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
