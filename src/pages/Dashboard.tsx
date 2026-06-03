import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import {
  Trophy,
  TrendingUp,
  Target,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import type { InterviewResult } from "@/data/questions";
import DailyTasks from "@/components/DailyTasks";

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
  verificationPhoto?: string;
}

import { getInterviewResultsKey, getCurrentUserEmail, syncInterviewSessionsFromDatabase } from "@/lib/auth";

const categoryLabelMap: Record<string, string> = {
  dsa: "DSA",
  web: "Web",
  dbms: "DBMS",
  os: "OS",
  networking: "Networking",
  hr: "HR",
  java: "Java",
  python: "Python",
  cpp: "C++",
  technical: "Technical",
  behavioral: "Behavioral",
  mixed: "Mixed Tracks",
};

const Dashboard = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<"history" | "mcq_mistakes" | "voice_improvements">("history");

  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const toggleSessionExpand = (date: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const renderSessionDetails = (session: SessionData) => {
    const avgScore = session.results.length
      ? Math.round(session.results.reduce((sum, r) => sum + r.finalScore, 0) / session.results.length)
      : 0;

    return (
      <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20 space-y-6 text-left w-full">
        {/* Summary Info */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h4 className="text-sm font-bold text-foreground">Session Summary</h4>
            <p className="text-xs text-muted-foreground">
              Taken on {new Date(session.date).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[10px] text-muted-foreground uppercase font-bold">Interview Avg</span>
              <Badge className={`${avgScore >= 70 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : avgScore >= 50 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {avgScore}%
              </Badge>
            </div>
            {session.mcqScore !== undefined && (
              <div className="text-right">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">MCQ Score</span>
                <Badge className={`${session.mcqScore >= 70 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : session.mcqScore >= 50 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                  {session.mcqScore}%
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Verification Photo taken at interview start */}
        {session.verificationPhoto && (
          <div className="p-3 rounded-lg border bg-muted/40 border-border/50 max-w-xs">
            <span className="block text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Interview Start Verification Photo</span>
            <div className="w-48 h-48 rounded-md overflow-hidden border border-border/60 shadow-sm bg-black/20">
              <img src={session.verificationPhoto} alt="Webcam verification" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Note if any */}
        {session.note && (
          <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/10 text-xs">
            <span className="font-bold text-amber-600 block mb-1">Session Notes</span>
            <p className="text-muted-foreground italic">"{session.note}"</p>
          </div>
        )}

        {/* Voice Response details */}
        {session.results && session.results.length > 0 && (
          <div className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-primary">Voice Interview Q&A ({session.results.length})</h5>
            <div className="space-y-3">
              {session.results.map((r, rIdx) => (
                <div key={rIdx} className="p-3.5 rounded-lg border border-border/50 bg-card/30 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-foreground">Q{rIdx + 1}: {r.questionText}</span>
                    <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                      Score: {r.finalScore}%
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-muted/40 border">
                      <span className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Your Answer</span>
                      <p className="text-foreground italic">"{r.answer || "(No response)"}"</p>
                    </div>
                    <div className="p-2.5 rounded bg-primary/5 border border-primary/10">
                      <span className="block text-[10px] text-primary/80 font-bold uppercase mb-1">Ideal Expected Answer</span>
                      <p className="text-foreground">"{r.idealAnswer}"</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>Marks: <strong className="text-foreground">{r.marksAwarded}/{r.maxMarks}</strong></span>
                    <span>•</span>
                    <span>Content: <strong className="text-foreground">{r.contentScore}%</strong></span>
                    <span>•</span>
                    <span>Confidence: <strong className="text-foreground">{r.confidenceScore}% ({r.confidenceLevel})</strong></span>
                    <span>•</span>
                    <span>Fluency: <strong className="text-foreground">{r.fluencyScore}%</strong></span>
                    <span>•</span>
                    <span>Keywords: <strong className="text-foreground">{r.keywordCoverage}%</strong></span>
                    <span>•</span>
                    <span>Similarity: <strong className="text-foreground">{r.semanticSimilarity}%</strong></span>
                  </div>

                  {r.feedback && r.feedback.length > 0 && (
                    <div className="text-[11px] p-2.5 rounded border border-warning/10 bg-warning/5 text-muted-foreground">
                      <span className="font-bold text-warning block mb-1">Actionable Feedback:</span>
                      <ul className="list-disc pl-4 space-y-1">
                        {r.feedback.map((f, fIdx) => (
                          <li key={fIdx}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MCQ mistakes / Results details */}
        {session.mcqResults && session.mcqResults.length > 0 && (
          <div className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-primary">MCQ Test Results ({session.mcqResults.length})</h5>
            <div className="space-y-3">
              {session.mcqResults.map((mq, mqIdx) => (
                <div key={mqIdx} className="p-3.5 rounded-lg border border-border/50 bg-card/30 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-foreground">Q{mqIdx + 1}: {mq.questionText}</span>
                    <Badge className={mq.isCorrect ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                      {mq.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className={`p-2.5 rounded border ${mq.isCorrect ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600" : "bg-destructive/5 border-destructive/10 text-destructive"}`}>
                      <span className="block text-[10px] font-bold uppercase mb-1">Your Option</span>
                      <p className="font-medium">{mq.selectedOption}</p>
                    </div>
                    {!mq.isCorrect && (
                      <div className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-600">
                        <span className="block text-[10px] font-bold uppercase mb-1">Correct Option</span>
                        <p className="font-medium">{mq.correctOption}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] p-2.5 rounded border bg-muted/40 text-muted-foreground">
                    <span className="font-bold text-foreground block mb-1">Explanation:</span>
                    <p>{mq.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const incorrectMCQs = useMemo(() => {
    const list: {
      questionText: string;
      selectedOption: string;
      correctOption: string;
      explanation: string;
      category: string;
      date: string;
    }[] = [];

    sessions.forEach((session) => {
      if (session.mcqResults) {
        session.mcqResults.forEach((q) => {
          if (!q.isCorrect) {
            list.push({
              ...q,
              category: session.category,
              date: session.date,
            });
          }
        });
      }
    });

    return list.reverse();
  }, [sessions]);

  const conversationalMistakes = useMemo(() => {
    const list: {
      questionText: string;
      answer: string;
      idealAnswer: string;
      finalScore: number;
      feedback: string[];
      category: string;
      date: string;
    }[] = [];

    sessions.forEach((session) => {
      if (session.results) {
        session.results.forEach((r) => {
          if (r.finalScore < 70) {
            list.push({
              questionText: r.questionText,
              answer: r.answer,
              idealAnswer: r.idealAnswer,
              finalScore: r.finalScore,
              feedback: r.feedback || [],
              category: session.category,
              date: session.date,
            });
          }
        });
      }
    });

    return list.reverse();
  }, [sessions]);

  const formatCategoryLabel = (category: string) => categoryLabelMap[category] ?? category;

  useEffect(() => {
    const resultsKey = getInterviewResultsKey();
    const hasStartedKey = resultsKey.replace("interviewResults_", "interviewStarted_");
    const startedVal = sessionStorage.getItem(hasStartedKey) === "true";
    let stored: SessionData[] = [];
    try {
      stored = JSON.parse(sessionStorage.getItem(resultsKey) || "[]");
    } catch {
      stored = [];
    }
    setSessions(stored);
    setHasStarted(startedVal || stored.length > 0);

    const email = getCurrentUserEmail();
    if (email) {
      syncInterviewSessionsFromDatabase(email).then((dbSessions) => {
        if (dbSessions && dbSessions.length > 0) {
          setSessions(dbSessions);
          setHasStarted(true);
        }
      });
    }
  }, []);

  const allResults = sessions.flatMap((s) => s.results);
  const avgScore = allResults.length ? Math.round(allResults.reduce((a, r) => a + r.finalScore, 0) / allResults.length) : 0;
  const avgContent = allResults.length ? Math.round(allResults.reduce((a, r) => a + r.contentScore, 0) / allResults.length) : 0;
  const avgConfidence = allResults.length ? Math.round(allResults.reduce((a, r) => a + r.confidenceScore, 0) / allResults.length) : 0;
  const avgFluency = allResults.length ? Math.round(allResults.reduce((a, r) => a + r.fluencyScore, 0) / allResults.length) : 0;

  const radarData = [
    { subject: "Content", value: avgContent },
    { subject: "Keywords", value: allResults.length ? Math.round(allResults.reduce((a, r) => a + r.keywordCoverage, 0) / allResults.length) : 0 },
    { subject: "Confidence", value: avgConfidence },
    { subject: "Fluency", value: avgFluency },
    { subject: "Similarity", value: allResults.length ? Math.round(allResults.reduce((a, r) => a + r.semanticSimilarity, 0) / allResults.length) : 0 },
  ];

  const sessionBarData = sessions.map((s, i) => ({
    name: `Session ${i + 1}`,
    score: Math.round(s.results.reduce((a, r) => a + r.finalScore, 0) / s.results.length),
  }));

  const stats = [
    { icon: Trophy, label: "Average Score", value: `${avgScore}%`, color: "text-primary", bg: "bg-primary/10" },
    { icon: Target, label: "Interviews", value: sessions.length.toString(), color: "text-success", bg: "bg-success/10" },
    { icon: TrendingUp, label: "Questions Answered", value: allResults.length.toString(), color: "text-warning", bg: "bg-warning/10" },
  ];

  const primaryColor = "hsl(var(--primary))";
  const axisColor = "hsl(var(--muted-foreground))";
  const gridColor = "hsl(var(--border))";

  return (
    <div className="w-full">
      <main className="container px-4 sm:px-6 pt-24 sm:pt-32 pb-16 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 sm:mb-12">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 text-foreground">
                Performance <span className="text-gradient">Dashboard</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium">Track your interview preparation progress</p>
            </div>
            {(hasStarted || sessions.length > 0) && (
              <Link to="/interview">
                <Button variant="default" className="rounded-full font-medium">
                  New Interview <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>

          {!hasStarted && sessions.length === 0 ? (
            <div className="glass-card p-12 sm:p-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Target className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3 tracking-tight">No interviews yet</h2>
              <p className="text-lg text-muted-foreground mb-8 font-medium max-w-md mx-auto">
                Complete your first mock interview to see detailed analytics, scoring, and progress tracking here.
              </p>
              <Link to="/interview">
                <Button variant="hero" size="lg" className="rounded-xl px-8 h-14 text-base">
                  Start First Interview <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Top Row: Stats + Daily Tasks */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="glass-card p-6 flex flex-col items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="lg:col-span-1">
                  <DailyTasks />
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold tracking-tight mb-6 text-foreground">Score Breakdown</h3>
                  <div className="h-64 sm:h-80 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="80%">
                        <PolarGrid stroke={gridColor} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: axisColor, fontSize: 13, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="value" stroke={primaryColor} fill={primaryColor} fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold tracking-tight mb-6 text-foreground">Session Progress</h3>
                  <div className="h-64 sm:h-80 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[0, 100]} tick={{ fill: axisColor, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)" }}
                          itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        />
                        <Bar dataKey="score" fill={primaryColor} radius={[6, 6, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Tab Switcher & Details */}
              <div className="glass-card p-6">
                {/* Tabs Header */}
                <div className="flex flex-wrap gap-2 border-b border-border/20 pb-4 mb-6">
                  <button
                    onClick={() => setDashboardTab("history")}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                      dashboardTab === "history"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    Session History ({sessions.length})
                  </button>

                  <button
                    onClick={() => setDashboardTab("mcq_mistakes")}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                      dashboardTab === "mcq_mistakes"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    MCQ Mistakes ({incorrectMCQs.length})
                  </button>

                  <button
                    onClick={() => setDashboardTab("voice_improvements")}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                      dashboardTab === "voice_improvements"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Voice Improvements ({conversationalMistakes.length})
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="space-y-4">
                  {/* TAB 1: HISTORY */}
                  {dashboardTab === "history" && (
                    <div className="space-y-4">
                      {sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No session history found yet.</p>
                      ) : (
                        sessions.map((session, i) => ({ session, i })).reverse().map(({ session, i }) => {
                          const avg = Math.round(session.results.reduce((a, r) => a + r.finalScore, 0) / Math.max(session.results.length, 1));
                          const sKey = session.date;
                          const isExpanded = expandedSessions[sKey];

                          return (
                            <div key={i} className="p-5 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 text-sm font-medium">
                                    {formatCategoryLabel(session.category)}
                                  </Badge>
                                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    {session.results.length} questions
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground">Avg Score:</span>
                                    <span className={`text-xl font-extrabold tracking-tight ${avg >= 70 ? "text-success" : avg >= 50 ? "text-warning" : "text-destructive"}`}>
                                      {avg}%
                                    </span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleSessionExpand(sKey)}
                                    className="h-8 text-xs font-semibold"
                                  >
                                    {isExpanded ? "Hide Details" : "View Details"}
                                  </Button>
                                </div>
                              </div>
                              {isExpanded && renderSessionDetails(session)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 2: MCQ MISTAKES */}
                  {dashboardTab === "mcq_mistakes" && (
                    <div className="space-y-4">
                      {incorrectMCQs.length === 0 ? (
                        <div className="p-8 rounded-xl border border-success/20 bg-success/5 text-center flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-10 h-10 text-success" />
                          <h4 className="font-bold text-success text-base">Perfect MCQ Record!</h4>
                          <p className="text-xs text-muted-foreground max-w-sm">No multiple choice mistakes registered. You have solved all MCQs correctly.</p>
                        </div>
                      ) : (
                        incorrectMCQs.map((item, idx) => (
                          <div key={idx} className="p-5 rounded-xl bg-background/50 border border-border/50 space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-destructive/10 border-destructive/20 text-destructive text-[10px] uppercase font-bold tracking-wider">Mistake</Badge>
                                <Badge variant="outline" className="text-[10px] font-semibold">{formatCategoryLabel(item.category)}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                              {item.questionText}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                              <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive font-medium">
                                <span className="block text-[10px] text-destructive/80 font-bold uppercase tracking-wider mb-1">Your Selection</span>
                                {item.selectedOption}
                              </div>
                              <div className="p-3.5 rounded-lg border border-success/30 bg-success/5 text-success font-medium">
                                <span className="block text-[10px] text-success/80 font-bold uppercase tracking-wider mb-1">Correct Answer</span>
                                {item.correctOption}
                              </div>
                            </div>

                            <div className="p-3.5 rounded-lg border bg-muted/40 text-xs text-muted-foreground space-y-1.5">
                              <div className="flex items-center gap-1.5 text-foreground font-bold text-[10px] uppercase tracking-wider text-primary">
                                <Lightbulb className="w-3.5 h-3.5" /> Explanation & Solution
                              </div>
                              <p className="leading-relaxed font-medium">{item.explanation}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: VOICE IMPROVEMENTS */}
                  {dashboardTab === "voice_improvements" && (
                    <div className="space-y-4">
                      {conversationalMistakes.length === 0 ? (
                        <div className="p-8 rounded-xl border border-success/20 bg-success/5 text-center flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-10 h-10 text-success" />
                          <h4 className="font-bold text-success text-base">Exceptional Communication!</h4>
                          <p className="text-xs text-muted-foreground max-w-sm">You scored 70% or higher in all voice responses. No weak points recorded.</p>
                        </div>
                      ) : (
                        conversationalMistakes.map((item, idx) => (
                          <div key={idx} className="p-5 rounded-xl bg-background/50 border border-border/50 space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-warning/10 border-warning/20 text-warning text-[10px] uppercase font-bold tracking-wider">Improvement Area</Badge>
                                <Badge variant="outline" className="text-[10px] font-semibold">{formatCategoryLabel(item.category)}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <Badge className="bg-destructive/10 border-destructive/20 text-destructive font-mono font-bold">{item.finalScore}%</Badge>
                              </div>
                            </div>

                            <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                              {item.questionText}
                            </h4>

                            <div className="space-y-3 text-xs sm:text-sm">
                              <div className="p-3.5 rounded-lg border border-border/50 bg-card/45">
                                <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Your Answer</span>
                                <p className="text-foreground leading-relaxed italic">"{item.answer}"</p>
                              </div>
                              
                              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5">
                                <span className="block text-[10px] text-primary/80 font-bold uppercase tracking-wider mb-1">Ideal Expected Answer</span>
                                <p className="text-foreground leading-relaxed">{item.idealAnswer}</p>
                              </div>
                            </div>

                            {item.feedback && item.feedback.length > 0 && (
                              <div className="p-4 rounded-lg border border-warning/10 bg-warning/5 space-y-2">
                                <div className="flex items-center gap-1.5 text-warning font-bold text-[10px] uppercase tracking-wider">
                                  <Sparkles className="w-3.5 h-3.5 text-warning" /> AI Actionable Improvement Points
                                </div>
                                <ul className="space-y-1.5 text-xs text-muted-foreground pl-1 list-none font-medium">
                                  {item.feedback.map((feed, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-2 leading-relaxed">
                                      <span className="text-warning shrink-0 mt-0.5">✦</span>
                                      <span>{feed}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
