import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUserEmail, getSelfieKey, syncInterviewSessionsFromDatabase, getInterviewResultsKey, clearUserAuth } from "@/lib/auth";
import { toast } from "sonner";
import LeaderboardRankings from "@/components/LeaderboardRankings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionData {
  date: string;
  category: string;
  results: Array<{
    finalScore: number;
    questionText: string;
    answer: string;
  }>;
  mcqScore?: number;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const isHomeActive = currentPath === "/dashboard" || currentPath === "/home" || currentPath === "/";
  const isExamAreaActive = currentPath === "/exam-area";
  const isInterviewActive = currentPath === "/interview";
  const isInterActive = currentPath === "/inter";
  const [userEmail, setUserEmail] = useState<string>("venkateshpolarathi5@gmail.com");

  const handleLogout = () => {
    clearUserAuth();
    toast.success("Signed out successfully");
    navigate("/login");
  };
  const [profileImage, setProfileImage] = useState<string>(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDAm28F6Nv23C2UBLZUa24Hi_ib1sGC1jbUp1Vtkszto4Qy6f5U5z2j2Rn4EMn7f7OY3AYQiw2HLHvHTz_CiEBwUUixXq-cnjtnEbx-sUXtX2Kk5UhoYwaf8YFH43yi2GZHLToFLCy43ldyXlo1NXDBTA6RufgRflx5HDHGFjXX4k9yhOzSZqwtTfHOoAVE4QVwerOuaRBkbVte8XATJ6grFpIa96b0ZzhPoY0YIcf-JcSgKWcRzoJK"
  );
  const [sessions, setSessions] = useState<SessionData[]>([]);

  // Interactive UI States
  const [leaderboardTab, setLeaderboardTab] = useState<"daily" | "overall">("daily");
  const [resumeTab, setResumeTab] = useState<"analysis" | "goals">("analysis");
  const [showFullLeaderboardModal, setShowFullLeaderboardModal] = useState<boolean>(false);
  const [showAtsModal, setShowAtsModal] = useState<boolean>(false);
  const [showAiCoachModal, setShowAiCoachModal] = useState<boolean>(false);
  const [aiCoachMessage, setAiCoachMessage] = useState<string>("");
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "Hello! I'm your AI     Coach. Ask me how to improve your technical scores or optimize your candidate responses!" },
  ]);

  // Daily goals state
  const [goals, setGoals] = useState([
    { id: 1, text: "Review Q3 Hires", completed: true },
    { id: 2, text: "Update Java Syllabus", completed: false },
    { id: 3, text: "Calibrate Bias Detect", completed: false },
  ]);

  const toggleGoal = (id: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  useEffect(() => {
    const email = getCurrentUserEmail();
    if (email) {
      setUserEmail(email);
    }
    try {
      const rawSelfie = localStorage.getItem(getSelfieKey());
      if (rawSelfie) {
        const parsed = JSON.parse(rawSelfie);
        if (parsed?.imageUrl) {
          setProfileImage(parsed.imageUrl);
        }
      }
    } catch {
      // Default photography avatar if no selfie
    }

    const resultsKey = getInterviewResultsKey();
    let stored: SessionData[] = [];
    try {
      stored = JSON.parse(sessionStorage.getItem(resultsKey) || "[]");
    } catch {
      stored = [];
    }
    setSessions(stored);

    if (email) {
      syncInterviewSessionsFromDatabase(email).then((dbSessions) => {
        if (dbSessions && dbSessions.length > 0) {
          setSessions(dbSessions);
        }
      });
    }

    // Trigger entrance animation for glass panels
    const panels = document.querySelectorAll(".glass-panel");
    panels.forEach((panel, index) => {
      const el = panel as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateY(4px)";
      setTimeout(() => {
        el.style.transition = "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, index * 25);
    });
  }, []);

  const totalInterviews = sessions.length > 0 ? sessions.length : 1;
  const totalQuestionsAnswered = sessions.reduce(
    (acc, s) => acc + (s.results ? s.results.length : 0),
    0
  ) || 3;
  const averageScorePercentage = sessions.length
    ? Math.round(
        (sessions.reduce((acc, s) => {
          const sAvg = s.results && s.results.length
            ? s.results.reduce((sum, r) => sum + r.finalScore, 0) / s.results.length
            : s.mcqScore || 0;
          return acc + sAvg;
        }, 0) / sessions.length) * 10
      )
    : 0;

  const handleSendMessage = () => {
    if (!aiCoachMessage.trim()) return;
    const userMsg = aiCoachMessage.trim();
    setAiChatHistory((prev) => [...prev, { sender: "user", text: userMsg }]);
    setAiCoachMessage("");

    setTimeout(() => {
      let reply = "Great question! Focus on structuring your answers using the STAR method (Situation, Task, Action, Result) for behavioral questions, and explain time complexity upfront in technical rounds.";
      if (userMsg.toLowerCase().includes("resume")) {
        reply = "Your resume score is 742/1000. Adding key Python data structure terms and quantifiable project achievements can boost it past 850+!";
      } else if (userMsg.toLowerCase().includes("java") || userMsg.toLowerCase().includes("code")) {
        reply = "For technical coding tests, ensure you handle edge cases like null inputs and empty collections before writing the core logic.";
      }
      setAiChatHistory((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 500);
  };

  const handleExportReport = () => {
    toast.success("Intelligence Report exported successfully!");
  };

  return (
    <div className="bg-surface-dim text-on-surface h-screen max-h-screen overflow-hidden relative font-['Geist',sans-serif] text-xs flex flex-col justify-between">
      {/* Atmospheric Gradient Background */}
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-surface-dim via-background to-surface-container-low opacity-60 pointer-events-none z-0"></div>

      {/* Top Header Bar - Clean, Distinct, Large & High-Visibility Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between px-6 sm:px-8 py-2 min-h-[60px] shadow-sm">
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Brand Logo & Title - Big & Bold */}
          <div className="flex items-center gap-2.5 cursor-pointer group shrink-0" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <h1 className="font-black text-lg sm:text-xl tracking-tight text-slate-900 hidden sm:inline m-0 leading-none">
              Smart<span className="text-primary">Interview</span>
            </h1>
          </div>

          {/* Search Insights Bar - Improved Size & Legibility */}
          <div className="relative group hidden md:block">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="bg-slate-100/80 border border-slate-300 rounded-full py-2 pl-9 pr-4 w-60 lg:w-72 text-sm font-medium focus:ring-2 ring-primary/40 focus:bg-white text-slate-800 placeholder-slate-400 transition-all shadow-xs"
              placeholder="Search insights, tests, candidates..."
              type="text"
            />
          </div>

          {/* Navigation Links - Big, Bold & Highly Visible Buttons */}
          <nav className="flex items-center gap-2.5 sm:gap-3 hidden md:flex">
            {/* 1. Home Link Button (First) */}
            <button
              onClick={() => navigate("/dashboard")}
              className={`text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 py-1.5 px-3.5 rounded-full shadow-xs active:scale-95 group ${
                isHomeActive
                  ? "text-primary bg-primary/10 border-2 border-primary/30"
                  : "text-slate-800 hover:text-primary bg-slate-100/90 hover:bg-slate-200/80 border border-slate-300/70"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isHomeActive ? "text-primary" : "text-slate-600 group-hover:text-primary"}`}>home</span>
              <span className="tracking-tight">Home</span>
            </button>

            {/* 2. Exam Area Badge Link Button */}
            <button
              onClick={() => navigate("/exam-area")}
              className={`text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 group ${
                isExamAreaActive
                  ? "text-primary bg-primary/10 border-2 border-primary/30"
                  : "text-slate-800 hover:text-primary bg-slate-100/90 hover:bg-slate-200/80 border border-slate-300/70"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isExamAreaActive ? "text-primary" : "text-slate-600 group-hover:text-primary"}`}>verified</span>
              <span className="tracking-tight">Exam Area</span>
            </button>

            {/* 3. Interview Link Button */}
            <button
              onClick={() => navigate("/interview")}
              className={`text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 py-1.5 px-3.5 rounded-full shadow-xs active:scale-95 group ${
                isInterviewActive
                  ? "text-primary bg-primary/10 border-2 border-primary/30"
                  : "text-slate-800 hover:text-primary bg-slate-100/90 hover:bg-slate-200/80 border border-slate-300/70"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isInterviewActive ? "text-primary" : "text-slate-600 group-hover:text-primary"}`}>forum</span>
              <span className="tracking-tight">Interview</span>
            </button>

            {/* 3b. Inter (FoloUp AI Model) Link Button */}
            <button
              onClick={() => navigate("/inter")}
              className={`text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 py-1.5 px-3.5 rounded-full shadow-xs active:scale-95 group ${
                isInterActive
                  ? "text-indigo-600 bg-indigo-50 border-2 border-indigo-300"
                  : "text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200"
              }`}
              title="Try FoloUp Voice AI Interview Model"
            >
              <span className="material-symbols-outlined text-[20px] text-indigo-600 group-hover:scale-110 transition-transform">smart_toy</span>
              <span className="tracking-tight">Inter (FoloUp)</span>
            </button>

            {/* 4. ATS Score Link Button (Right side of Interview) */}
            <button
              onClick={() => {
                setShowAtsModal(true);
                const el = document.getElementById("ats-score-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300/80 flex items-center gap-2 py-1.5 px-3.5 rounded-full shadow-xs active:scale-95 cursor-pointer transition-all group"
            >
              <span className="material-symbols-outlined text-[20px] text-emerald-600 group-hover:scale-110 transition-transform">assessment</span>
              <span className="tracking-tight">ATS Score</span>
            </button>
          </nav>
        </div>

        {/* Right Section Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.info("No unread notifications")}
              className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-full transition-all relative cursor-pointer bg-slate-50 border border-slate-200"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button
              onClick={() => setShowAiCoachModal(true)}
              className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-full transition-all cursor-pointer bg-slate-50 border border-slate-200"
              title="AI Coach Insights"
            >
              <span className="material-symbols-outlined text-[20px] text-amber-500">bolt</span>
            </button>
          </div>

          {/* Big Prominent Create Interview Heading Button Tag */}
          <button
            onClick={() => navigate("/interview")}
            className="px-4 sm:px-5 py-2 bg-gradient-to-r from-primary via-purple-600 to-indigo-600 text-white rounded-full text-sm font-extrabold shadow-md shadow-primary/30 hover:shadow-xl hover:scale-[1.04] active:scale-95 transition-all cursor-pointer border-0 flex items-center gap-1.5 group"
          >
            <span className="material-symbols-outlined text-[22px] font-bold group-hover:rotate-90 transition-transform duration-300">add</span>
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight m-0 p-0 text-white leading-none whitespace-nowrap">
              Create Interview
            </h3>
          </button>

        </div>
      </header>

      {/* Main Single View Dashboard Layout */}
      <main className="flex-1 w-full pt-20 sm:pt-22 pb-14 px-4 sm:px-8 max-w-[1500px] mx-auto flex flex-col justify-between overflow-hidden relative z-10">
        <div className="flex flex-col gap-2.5 h-full justify-between">
          {/* Hero Header Section */}
          <section className="flex items-center justify-between gap-2 shrink-0">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-on-surface leading-tight">Intelligence Dashboard</h1>
              <p className="text-on-surface-variant text-[11px]">
                Real-time analysis of your organization's recruitment performance.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => toast.info("Filter: Last 7 Days applied")}
                className="glass-panel px-2.5 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">calendar_month</span> Last 7 Days
              </button>
              <button
                onClick={handleExportReport}
                className="glass-panel px-2.5 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1 text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">download</span> Export Report
              </button>
            </div>
          </section>

          {/* Metric Cards Row matching reference design */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            {/* Card 1: Average Score */}
            <div className="glass-panel p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between gap-1.5 card-inner-glow group transition-all hover:-translate-y-0.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">trophy</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[11px] font-medium mb-0.5">Average Score</p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight leading-none">
                  {averageScorePercentage}%
                </h2>
              </div>
            </div>

            {/* Card 2: Interviews */}
            <div className="glass-panel p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between gap-1.5 card-inner-glow group transition-all hover:-translate-y-0.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">track_changes</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[11px] font-medium mb-0.5">Interviews</p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight leading-none">
                  {totalInterviews}
                </h2>
              </div>
            </div>

            {/* Card 3: Questions Answered */}
            <div className="glass-panel p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between gap-1.5 card-inner-glow group transition-all hover:-translate-y-0.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[11px] font-medium mb-0.5">Questions Answered</p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight leading-none">
                  {totalQuestionsAnswered}
                </h2>
              </div>
            </div>

            {/* Card 4: Candidates Pipeline */}
            <div className="glass-panel p-2.5 sm:p-3 rounded-2xl flex flex-col justify-between gap-1.5 card-inner-glow group transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg bg-outline/10 flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                </div>
                <span className="text-on-surface-variant text-[10px] font-semibold">
                  {sessions.length > 0 ? `${sessions.length + 48} Total` : "48 Total"}
                </span>
              </div>
              <div>
                <p className="text-on-surface-variant text-[11px] font-medium mb-0.5">Candidates Pipeline</p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight leading-none">
                  32<span className="text-on-surface-variant text-[10px] font-normal"> Active</span>
                </h2>
              </div>
            </div>
          </section>

          {/* Middle Row: Resume Analyzer & Daily Goals (4 cols, 50% compact) | Leaderboard / Test Board (4 cols) | Live Exam (4 cols) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
            {/* Column 1: Resume Analyzer & Daily Goals (Exact screenshot visual style, 50% compact) */}
            <div className="lg:col-span-4 flex flex-col gap-2 justify-between">
              {/* 1st Box (Top): Resume Analyzer */}
              <div className="glass-panel rounded-xl p-2.5 flex flex-col justify-between flex-1" id="ats-score-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-[#006670] rounded-full status-pulse"></div>
                    <h3 className="font-bold text-xs text-on-surface">Resume Analyzer</h3>
                  </div>
                  <div className="bg-[#e6f4f5] text-[#006670] px-2 py-0.5 rounded-full text-[9px] font-bold">
                    742 / 1000
                  </div>
                </div>

                <div className="bg-[#006670] text-white p-2.5 rounded-xl border border-white/10 my-1 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-80 block mb-0.5">RESUME SCORE</span>
                    <div className="flex items-baseline gap-1">
                      <h2 className="text-lg font-extrabold leading-none">742</h2>
                      <span className="text-white/70 text-[9px]">/1000</span>
                    </div>
                    <p className="text-white/80 text-[7.5px] font-bold uppercase tracking-wider mt-0.5">OPTIMIZATION RECOMMENDED</p>
                  </div>
                  <span className="material-symbols-outlined text-white text-[22px]">description</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toast.success("AI Resume Optimizer activated!")}
                    className="flex-1 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 rounded-full py-1 px-2.5 flex items-center justify-center gap-1 text-[9px] font-bold text-on-surface transition-all cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[12px] text-[#006670]">auto_fix_high</span>
                    <span>Optimize</span>
                  </button>
                  <span className="px-2 py-1 bg-[#e6f4f5] text-[#006670] text-[8px] font-bold rounded-full border border-[#006670]/20 shrink-0">
                    + Python
                  </span>
                  <span className="px-2 py-1 bg-[#e6f4f5] text-[#006670] text-[8px] font-bold rounded-full border border-[#006670]/20 shrink-0">
                    + Quantify
                  </span>
                </div>
              </div>

              {/* 2nd Box (Bottom): Daily Goals */}
              <div className="glass-panel rounded-xl p-2.5 flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-[#9f1239] rounded-full status-pulse"></div>
                    <h3 className="font-bold text-xs text-on-surface">Daily Goals</h3>
                  </div>
                  <div className="bg-[#ffe4e6] text-[#9f1239] px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {goals.filter(g => g.completed).length}/{goals.length} Done
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 my-0.5">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className="p-1.5 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 rounded-full flex items-center gap-2 cursor-pointer transition-all text-[10px]"
                    >
                      <input
                        checked={goal.completed}
                        onChange={() => {}}
                        className="w-3 h-3 rounded-md border-outline-variant bg-white text-primary focus:ring-primary/50 cursor-pointer shrink-0 ml-0.5"
                        type="checkbox"
                      />
                      <span className={`truncate flex-1 ${goal.completed ? "line-through opacity-50" : "font-medium text-on-surface"}`}>
                        {goal.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Leaderboard / Test Board Card (Moved to Middle) */}
            <div className="glass-panel rounded-xl p-3 flex flex-col justify-between lg:col-span-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-surface-container-low rounded-lg p-0.5 border border-outline-variant/30">
                  <button
                    onClick={() => setLeaderboardTab("daily")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer border-0 text-[10px] ${leaderboardTab === "daily"
                        ? "bg-on-surface text-white font-bold"
                        : "text-on-surface-variant hover:bg-surface-container-high bg-transparent"
                      }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                    <span>Daily</span>
                  </button>
                  <button
                    onClick={() => setLeaderboardTab("overall")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer border-0 text-[10px] ${leaderboardTab === "overall"
                        ? "bg-on-surface text-white font-bold"
                        : "text-on-surface-variant hover:bg-surface-container-high bg-transparent"
                      }`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-tertiary">emoji_events</span>
                    <span>Overall</span>
                  </button>
                </div>
                <div className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full border border-tertiary/20 text-[9px] font-bold">
                  1st Place
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  {leaderboardTab === "daily" ? "Top 3 Test Marks Today" : "Top Overall Rankers"}
                </h4>
                <div
                  onClick={() => setShowFullLeaderboardModal(true)}
                  className="flex items-center gap-2.5 p-2 bg-surface-container-low rounded-xl border border-outline-variant/30 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">military_tech</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <div className="truncate">
                        <span className="font-bold text-on-surface text-xs block truncate">
                          {userEmail}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {sessions.length > 0 ? `${sessions.length} tests today` : "5 tests today"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-secondary font-bold text-xs block">0% Marks</span>
                        <span className="text-tertiary font-bold text-[9px] uppercase">1st Place</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowFullLeaderboardModal(true)}
                className="w-full py-1.5 px-3 border border-outline-variant/30 rounded-lg flex items-center justify-center gap-1 text-on-surface text-[11px] font-bold hover:bg-surface-container-high transition-all cursor-pointer bg-transparent"
              >
                View Full Leaderboard
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>

            {/* Column 3: Live Exam Area Card */}
            <div
              onClick={() => navigate("/exam-area")}
              className="lg:col-span-4 p-3.5 rounded-xl text-white flex flex-col justify-between card-inner-glow group cursor-pointer hover:opacity-95 transition-all shadow-lg shadow-primary/30 border border-white/20"
              style={{ background: "linear-gradient(135deg, #630ed4 0%, #7c3aed 50%, #5b21b6 100%)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined status-pulse text-amber-300 text-[16px]">radio_button_checked</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">ACTIVE NOW</span>
                </div>
                <span className="material-symbols-outlined text-white/90 group-hover:translate-x-0.5 transition-transform text-[16px]">open_in_new</span>
              </div>

              <div className="my-1">
                <h3 className="text-lg font-bold leading-tight text-white">Live Exam Area</h3>
                <p className="text-white/80 text-[10px] mt-0.5">Real-time monitoring enabled</p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <span className="font-bold text-white text-[10px]">+12 Candidates Active</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-bold text-white group-hover:bg-white/30 transition-all">
                  Enter →
                </span>
              </div>
            </div>
          </section>

          {/* Bottom Row: Clean Standalone Action Buttons (No Card Slide) */}
          <section className="shrink-0 flex items-center justify-center gap-4 py-1">
            <button
              onClick={() => setShowAiCoachModal(true)}
              className="bg-primary text-on-primary px-5 py-2 rounded-full flex items-center gap-2 shadow-md shadow-primary/25 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all border border-white/20 cursor-pointer text-xs font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span>Notebook LLM</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[8px] uppercase tracking-wider font-extrabold">AI</span>
            </button>

            <button
              onClick={() => navigate("/exam-area")}
              className="bg-secondary text-on-primary px-5 py-2 rounded-full flex items-center gap-2 shadow-md shadow-secondary/25 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all border border-white/20 cursor-pointer text-xs font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">sports_esports</span>
              <span>Game Zone</span>
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[8px] uppercase tracking-wider font-extrabold">Practice</span>
            </button>
          </section>
        </div>
      </main>

      {/* Medium Size High-Visibility BottomNavBar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-between px-6 sm:px-8 py-1 min-h-[44px] shadow-sm">
        <div className="flex items-center gap-5 sm:gap-6">
          <button
            onClick={() => toast.info("Smart Interview Help Center: support@smartinterview.ai")}
            className="flex items-center gap-1.5 text-slate-700 hover:text-primary transition-all text-xs sm:text-sm font-extrabold cursor-pointer bg-transparent border-0 py-0.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px]">help</span>
            <span className="inline">Help Center</span>
          </button>
          <button
            onClick={() => navigate("/profile-setup")}
            className="flex items-center gap-1.5 text-slate-700 hover:text-primary transition-all text-xs sm:text-sm font-extrabold cursor-pointer bg-transparent border-0 py-0.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px]">settings</span>
            <span className="inline">Settings</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full cursor-pointer hover:bg-primary/20 transition-all shadow-xs"
            onClick={() => setShowAiCoachModal(true)}
          >
            <div className="w-2 h-2 bg-primary rounded-full status-pulse"></div>
            <span className="text-xs font-bold">AI Coach Active</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 py-1 px-2.5 rounded-full border border-slate-200 transition-all shadow-xs active:scale-95 group"
                title="Profile & Sign Out"
              >
                <img
                  className="w-7 h-7 rounded-full border-2 border-primary/30 object-cover shadow-xs"
                  alt="Profile"
                  src={profileImage}
                />
                <span className="text-xs font-extrabold text-slate-800 hidden sm:inline truncate max-w-[140px]">
                  {userEmail ? userEmail.split("@")[0] : "Profile"}
                </span>
                <span className="material-symbols-outlined text-[16px] text-slate-500 group-hover:text-primary">
                  expand_more
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 shadow-xl border-slate-200/80 rounded-2xl bg-white z-50 mb-2">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                <img
                  className="w-9 h-9 rounded-full border-2 border-primary/40 object-cover shrink-0"
                  alt="Profile"
                  src={profileImage}
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {userEmail ? userEmail.split("@")[0] : "User Account"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate font-medium">
                    {userEmail || "user@smartinterview.ai"}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => navigate("/profile-setup")}
                className="flex items-center gap-2.5 p-2.5 text-xs font-bold text-slate-700 hover:text-primary rounded-xl cursor-pointer hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">person</span>
                <span>Edit Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/profile-setup")}
                className="flex items-center gap-2.5 p-2.5 text-xs font-bold text-slate-700 hover:text-primary rounded-xl cursor-pointer hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">settings</span>
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2.5 p-2.5 text-xs font-extrabold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-rose-600">logout</span>
                <span>Sign Out / Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </footer>

      {/* Floating AI Coach Widget */}
      <div
        className="fixed bottom-14 right-4 w-10 h-10 z-50 glass-panel rounded-full shadow-lg flex items-center justify-center border border-primary/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
        id="ai-coach"
        onClick={() => setShowAiCoachModal(true)}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-primary text-[16px]">smart_toy</span>
        </div>
      </div>

      {/* Full Leaderboard Dialog */}
      <Dialog open={showFullLeaderboardModal} onOpenChange={setShowFullLeaderboardModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">military_tech</span> Candidate Leaderboard
            </DialogTitle>
            <DialogDescription>
              Rankings across all mock interview tracks and daily assessments.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <LeaderboardRankings userSessions={sessions} />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Coach Chat Dialog */}
      <Dialog open={showAiCoachModal} onOpenChange={setShowAiCoachModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span> AI Interview Assistant
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ask for practice feedback and interview improvement tips.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col h-[300px] justify-between gap-2 pt-1">
            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-surface-container-low rounded-xl border border-outline-variant/30">
              {aiChatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl text-xs ${msg.sender === "user"
                        ? "bg-primary text-white rounded-br-none font-medium"
                        : "bg-white text-on-surface border border-outline-variant/30 rounded-bl-none shadow-xs"
                      }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={aiCoachMessage}
                onChange={(e) => setAiCoachMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask your AI Coach..."
                className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 ring-primary"
              />
              <button
                onClick={handleSendMessage}
                className="bg-primary text-white px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity border-0 text-xs font-bold"
              >
                Send
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detailed ATS Score Breakdown Dialog Modal */}
      <Dialog open={showAtsModal} onOpenChange={setShowAtsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-emerald-700">
              <span className="material-symbols-outlined text-[24px]">assessment</span>
              ATS Resume Score Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Real-time Applicant Tracking System (ATS) compatibility analysis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Overall Score Badge */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 block">OVERALL COMPATIBILITY</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black">742</span>
                  <span className="text-white/80 text-sm font-semibold">/ 1000</span>
                </div>
                <span className="inline-block mt-1 bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  Strong Candidate Match (Grade A-)
                </span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-white text-[32px]">fact_check</span>
              </div>
            </div>

            {/* Metric Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Keyword Match</span>
                  <span className="text-xs font-black text-emerald-600">82%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[82%]"></div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Formatting</span>
                  <span className="text-xs font-black text-emerald-600">90%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[90%]"></div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Skills Impact</span>
                  <span className="text-xs font-black text-amber-600">75%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[75%]"></div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Action Verbs</span>
                  <span className="text-xs font-black text-amber-600">68%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[68%]"></div>
                </div>
              </div>
            </div>

            {/* Key Optimization Insights */}
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">auto_awesome</span>
                Optimization Recommendations:
              </h4>
              <ul className="text-xs text-emerald-950 space-y-1 pl-5 list-disc font-medium">
                <li>Add key Python data structure terms to elevate technical match past 850+</li>
                <li>Quantify project impact with specific metrics (e.g. "% performance boost")</li>
                <li>Ensure standard section headers (Experience, Projects, Education)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setShowAtsModal(false);
                  toast.success("AI Resume Optimizer running analysis...");
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border-0"
              >
                <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                Run AI Optimizer
              </button>

              <button
                onClick={() => {
                  setShowAtsModal(false);
                  navigate("/profile-setup");
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-2 px-3 rounded-xl transition-all border border-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Update Resume
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
