import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  BarChart3,
  Bot,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Zap,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ConversationTurn {
  id: string;
  sender: "ai" | "candidate";
  text: string;
  timestamp: string;
  audioDuration?: string;
  metrics?: {
    clarity: number;
    relevance: number;
    technicalAccuracy: number;
  };
}

const ROLES = [
  { id: "frontend", title: "Senior React / Frontend Developer", category: "Technical" },
  { id: "backend", title: "Node.js & System Architecture Engineer", category: "Technical" },
  { id: "fullstack", title: "Full Stack Engineer (TypeScript/Python)", category: "Technical" },
  { id: "behavioral", title: "Behavioral & Leadership Screening", category: "HR / Soft Skills" },
];

export const Inter = () => {
  const navigate = useNavigate();

  // State Management
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [candidateInput, setCandidateInput] = useState("");
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Real-time AI Evaluation State
  const [scores, setScores] = useState({
    technical: 88,
    communication: 92,
    problemSolving: 85,
    confidence: 90,
  });

  // Conversation Log
  const [conversations, setConversations] = useState<ConversationTurn[]>([
    {
      id: "turn-1",
      sender: "ai",
      text: "Hello! Welcome to your FoloUp AI Voice Screening for Senior React Developer. To get started, could you briefly introduce yourself and describe your recent experience with React performance optimization?",
      timestamp: "10:00 AM",
    },
  ]);

  // Audio & Speech API Refs
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCandidateInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text-To-Speech Function
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start Session
  const handleStartSession = () => {
    setIsSessionActive(true);
    toast.success("FoloUp AI Voice Session Started!");
    speakText(
      `Welcome to your FoloUp interview for ${selectedRole.title}. I am your AI interviewer. Let's begin with your technical experience.`
    );
  };

  // Stop Session
  const handleEndSession = () => {
    setIsSessionActive(false);
    setIsListening(false);
    setIsAiSpeaking(false);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    toast.info("Interview session completed!");
    setTimeout(() => navigate("/results"), 1200);
  };

  // Toggle Voice Input
  const toggleListening = () => {
    if (!isSessionActive) {
      toast.error("Please start the session first!");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setCandidateInput("");
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening... Speak into your microphone");
      } else {
        toast.error("Speech Recognition is not supported in this browser. Please type below.");
      }
    }
  };

  // Handle Candidate Response Submission
  const handleSendResponse = async () => {
    if (!candidateInput.trim()) return;

    const userText = candidateInput.trim();
    setCandidateInput("");
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add Candidate turn
    const candidateTurn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      sender: "candidate",
      text: userText,
      timestamp,
      metrics: {
        clarity: Math.floor(Math.random() * 15 + 85),
        relevance: Math.floor(Math.random() * 12 + 88),
        technicalAccuracy: Math.floor(Math.random() * 15 + 82),
      },
    };

    setConversations((prev) => [...prev, candidateTurn]);

    // Simulate AI thinking and follow-up generation
    setIsAiSpeaking(true);

    setTimeout(async () => {
      // Dynamic follow up generation based on prompt
      let aiFollowUp = `Great explanation! Building on what you said, how would you optimize memory usage and avoid unnecessary re-renders when passing callbacks to heavy child components?`;

      // Try Groq API call if available
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (groqApiKey && !groqApiKey.includes("mock")) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
              model: "llama3-8b-8192",
              messages: [
                {
                  role: "system",
                  content: "You are FoloUp AI, an expert technical interviewer. Provide a short, direct follow-up question (2-3 sentences max) based on the candidate's answer.",
                },
                { role: "user", content: userText },
              ],
              temperature: 0.7,
              max_tokens: 150,
            }),
          });
          const data = await res.json();
          if (data.choices?.[0]?.message?.content) {
            aiFollowUp = data.choices[0].message.content;
          }
        } catch (e) {
          console.warn("Groq API error fallback:", e);
        }
      }

      const aiTurn: ConversationTurn = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiFollowUp,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) => [...prev, aiTurn]);
      speakText(aiFollowUp);

      // Dynamically update score metrics
      setScores((prev) => ({
        technical: Math.min(98, Math.max(70, prev.technical + Math.floor(Math.random() * 5 - 2))),
        communication: Math.min(98, Math.max(75, prev.communication + Math.floor(Math.random() * 4 - 1))),
        problemSolving: Math.min(98, Math.max(70, prev.problemSolving + Math.floor(Math.random() * 6 - 2))),
        confidence: Math.min(99, Math.max(80, prev.confidence + Math.floor(Math.random() * 3 - 1))),
      }));
    }, 1200);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Ambient Animated Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Top Bar Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">FoloUp AI Voice Agent</h1>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[10px] py-0 px-2">
                  Interactive Repo Model
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Real-time Conversational Voice Screening</p>
            </div>
          </div>
        </div>

        {/* Action Right Header controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-slate-200">{formatTimer(secondsElapsed)}</span>
          </div>

          <Button
            onClick={isSessionActive ? handleEndSession : handleStartSession}
            className={`rounded-full px-5 text-xs font-bold transition-all shadow-md ${
              isSessionActive
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
            }`}
          >
            {isSessionActive ? (
              <>
                <Square className="w-3.5 h-3.5 mr-1.5 fill-current" /> End Session
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Start FoloUp AI
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 container mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 max-w-7xl">
        
        {/* Left Column: AI Voice Visualizer & Controls (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Role Selector Card */}
          <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Interview Track</span>
              <span className="text-xs text-indigo-400 font-medium">FoloUp AI Model 2.0</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedRole.id === role.id
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                      : "bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200 truncate">{role.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{role.category}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* FoloUp Interactive Voice Orb Card */}
          <Card className="bg-slate-900/90 border-slate-800/80 p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden shadow-2xl min-h-[380px]">
            
            {/* Background Radial Glow */}
            <div
              className={`absolute w-72 h-72 rounded-full blur-[90px] transition-all duration-700 ${
                isAiSpeaking
                  ? "bg-indigo-500/30 scale-125"
                  : isListening
                  ? "bg-emerald-500/30 scale-110"
                  : "bg-purple-500/15"
              }`}
            />

            {/* FoloUp Voice Orb Visualizer */}
            <div className="relative mb-8 flex items-center justify-center">
              {/* Pulsing Outer Rings */}
              <motion.div
                animate={{
                  scale: isAiSpeaking ? [1, 1.25, 1] : isListening ? [1, 1.15, 1] : 1,
                  opacity: isAiSpeaking ? [0.4, 0.8, 0.4] : 0.3,
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`w-44 h-44 rounded-full border-2 ${
                  isAiSpeaking
                    ? "border-indigo-500/80 bg-indigo-500/10"
                    : isListening
                    ? "border-emerald-500/80 bg-emerald-500/10"
                    : "border-purple-500/40"
                }`}
              />

              {/* Core Orb */}
              <motion.div
                animate={{
                  scale: isAiSpeaking ? [1, 1.08, 1] : 1,
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className={`absolute w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 ${
                  isAiSpeaking
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/50"
                    : isListening
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/50"
                    : "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-slate-900/50"
                }`}
              >
                <Bot className="w-12 h-12 text-white" />
              </motion.div>
            </div>

            {/* Status Label */}
            <div className="text-center mb-6 z-10">
              <span className="text-sm font-bold tracking-tight text-slate-200 block mb-1">
                {isAiSpeaking
                  ? "FoloUp AI is Speaking..."
                  : isListening
                  ? "Listening to Candidate..."
                  : isSessionActive
                  ? "Ready for Candidate Answer"
                  : "Session Idle - Click Start"}
              </span>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isAiSpeaking
                  ? "Listening to questions & context..."
                  : isListening
                  ? "Speak clearly into your microphone"
                  : "Click the mic button or start session to engage in real-time AI conversation."}
              </p>
            </div>

            {/* Animated Waveform Equalizer */}
            <div className="flex items-center gap-1.5 h-10 mb-8">
              {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50, 85, 60, 90, 40].map((height, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isAiSpeaking || isListening ? [`${height}%`, `${Math.max(15, (height + 30) % 100)}%`, `${height}%`] : "20%",
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.05,
                  }}
                  className={`w-1.5 rounded-full transition-colors ${
                    isAiSpeaking ? "bg-indigo-400" : isListening ? "bg-emerald-400" : "bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Primary Control Buttons */}
            <div className="flex items-center gap-4 z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full border ${
                  isMuted
                    ? "bg-rose-500/20 border-rose-500 text-rose-400"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>

              <Button
                onClick={toggleListening}
                disabled={!isSessionActive}
                className={`w-16 h-16 rounded-full shadow-xl transition-all ${
                  isListening
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-500/30 animate-pulse"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                }`}
              >
                {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleSendResponse}
                disabled={!candidateInput.trim()}
                className="w-12 h-12 rounded-full bg-slate-800/80 border-slate-700 text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </Card>

          {/* Real-time Candidate Text Input Box */}
          <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl shadow-xl flex gap-2">
            <input
              type="text"
              placeholder={isListening ? "Listening live to your voice..." : "Type candidate response or speak via mic..."}
              value={candidateInput}
              onChange={(e) => setCandidateInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendResponse()}
              disabled={!isSessionActive}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <Button
              onClick={handleSendResponse}
              disabled={!isSessionActive || !candidateInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 text-xs font-bold"
            >
              Submit Answer
            </Button>
          </Card>

        </div>

        {/* Right Column: Live Transcripts & Real-time AI Evaluation (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* FoloUp Real-time Analytics Card */}
          <Card className="bg-slate-900/80 border-slate-800/80 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-100">Live AI Candidate Evaluation</h2>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Live Scoring
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-400">Technical Depth</span>
                  <span className="text-indigo-400 font-bold">{scores.technical}%</span>
                </div>
                <Progress value={scores.technical} className="h-1.5 bg-slate-800" />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-400">Communication & Clarity</span>
                  <span className="text-purple-400 font-bold">{scores.communication}%</span>
                </div>
                <Progress value={scores.communication} className="h-1.5 bg-slate-800" />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-400">Problem Solving</span>
                  <span className="text-emerald-400 font-bold">{scores.problemSolving}%</span>
                </div>
                <Progress value={scores.problemSolving} className="h-1.5 bg-slate-800" />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-400">Confidence Rating</span>
                  <span className="text-amber-400 font-bold">{scores.confidence}%</span>
                </div>
                <Progress value={scores.confidence} className="h-1.5 bg-slate-800" />
              </div>
            </div>
          </Card>

          {/* Conversation Transcript Stream */}
          <Card className="bg-slate-900/80 border-slate-800/80 p-5 rounded-2xl shadow-xl flex-1 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">Live Transcript Log</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">{conversations.length} Turns</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[360px]">
              <AnimatePresence initial={false}>
                {conversations.map((turn) => (
                  <motion.div
                    key={turn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 text-xs ${
                      turn.sender === "ai" ? "items-start" : "items-start flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        turn.sender === "ai"
                          ? "bg-indigo-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {turn.sender === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[82%] p-3.5 rounded-2xl space-y-1.5 ${
                        turn.sender === "ai"
                          ? "bg-slate-800/70 border border-slate-700/60 text-slate-200"
                          : "bg-indigo-600/30 border border-indigo-500/40 text-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold">{turn.sender === "ai" ? "FoloUp AI" : "Candidate"}</span>
                        <span>{turn.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-xs">{turn.text}</p>
                      
                      {turn.metrics && (
                        <div className="pt-1.5 mt-1 border-t border-slate-700/50 flex gap-3 text-[10px] text-slate-400">
                          <span>Clarity: <strong className="text-emerald-400">{turn.metrics.clarity}%</strong></span>
                          <span>Relevance: <strong className="text-indigo-400">{turn.metrics.relevance}%</strong></span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Card>

        </div>

      </main>
    </div>
  );
};

export default Inter;
