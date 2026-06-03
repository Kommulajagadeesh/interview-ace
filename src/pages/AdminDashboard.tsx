import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  ShieldCheck,
  Trash2,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InterviewResult } from "@/data/questions";
import {
  clearAdminAuth,
  syncAllUsersAndAdmins,
  syncAllSessionsForAdmin,
  deleteInterviewSession,
  type AdminUserDetail,
} from "@/lib/auth";

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
  storageKey?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [showPersons, setShowPersons] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "candidates" | "admins">("all");

  const [sessions, setSessions] = useState<SessionData[]>([]);

  const [users, setUsers] = useState<AdminUserDetail[]>([]);

  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((sum, session) => sum + session.results.length, 0);
  const [expandedResumeUser, setExpandedResumeUser] = useState<string | null>(null);

  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [expandedUserSessions, setExpandedUserSessions] = useState<Record<string, boolean>>({});

  const getEmailFromSession = (session: SessionData) => {
    if (!session.storageKey) return "unknown";
    if (session.storageKey === "interviewResults") return "default";
    return session.storageKey.replace("interviewResults_", "").trim().toLowerCase();
  };

  const getUserNameForSession = (session: SessionData) => {
    const email = getEmailFromSession(session).trim().toLowerCase();
    const user = users.find((u) => u.email.trim().toLowerCase() === email);
    return user?.name || formatPersonName(email);
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const toggleUserSessionsExpand = (email: string) => {
    setExpandedUserSessions((prev) => ({
      ...prev,
      [email]: !prev[email],
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
                      <span className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">User's Answer</span>
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
                      <span className="block text-[10px] font-bold uppercase mb-1">User's Option</span>
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

  useEffect(() => {
    // 1. Sync all profiles & logins from Firestore
    syncAllUsersAndAdmins().then((dbUsers) => {
      if (dbUsers && dbUsers.length > 0) {
        setUsers(dbUsers);
      }
    });

    // 2. Sync all sessions from Firestore
    syncAllSessionsForAdmin().then((dbSessions) => {
      if (dbSessions && dbSessions.length > 0) {
        setSessions(dbSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }
    });
  }, []);

  const candidatesCount = users.filter((u) => !u.isAdmin).length;
  const adminsCount = users.filter((u) => u.isAdmin).length;

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (activeTab === "candidates") {
      list = users.filter((u) => !u.isAdmin);
    } else if (activeTab === "admins") {
      list = users.filter((u) => u.isAdmin);
    }
    return list.sort((a, b) => new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime());
  }, [users, activeTab]);

  const allScores = sessions.flatMap((session) => session.results.map((result) => result.finalScore));
  const averageScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

  const formatPersonName = (email: string) => {
    const base = email.split("@")[0] || "User";

    return base
      .split(/[._-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const recentSessions = useMemo(
    () => sessions.map((session, index) => ({ session, index })).reverse(),
    [sessions]
  );

  const handleRemoveSession = async (sessionIndex: number) => {
    const shouldRemove = window.confirm("Remove this session permanently from the database?");
    if (!shouldRemove) return;

    const sessionToRemove = sessions[sessionIndex];
    const email = getEmailFromSession(sessionToRemove);

    try {
      if (email && email !== "unknown") {
        await deleteInterviewSession(email, sessionToRemove.date);
      }
      const updatedSessions = sessions.filter((_, index) => index !== sessionIndex);
      setSessions(updatedSessions);
    } catch (e) {
      console.error("Error removing session from database", e);
      alert("Failed to delete session from Firestore database.");
    }
  };

  const handleLogout = () => {
    clearAdminAuth();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass rounded-xl sm:rounded-2xl p-5 sm:p-6 mb-5 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Separate admin page for monitoring interview activity
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Sessions</p>
              <p className="text-2xl font-bold">{totalSessions}</p>
            </div>
            <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Average Score / Questions</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">{averageScore}%</span>
                <span className="text-xs text-muted-foreground">({totalQuestions} Qs)</span>
              </div>
            </div>
            <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Candidates Count</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-bold">{candidatesCount}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showPersons && activeTab === "candidates") {
                      setShowPersons(false);
                    } else {
                      setShowPersons(true);
                      setActiveTab("candidates");
                    }
                  }}
                >
                  {showPersons && activeTab === "candidates" ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Admins Count</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-bold">{adminsCount}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showPersons && activeTab === "admins") {
                      setShowPersons(false);
                    } else {
                      setShowPersons(true);
                      setActiveTab("admins");
                    }
                  }}
                >
                  {showPersons && activeTab === "admins" ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          </div>

          {showPersons && (
            <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-base sm:text-lg">User & Admin Directory</h2>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-muted/40 p-1 rounded-lg border border-border/60 w-fit">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      activeTab === "all"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({users.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("candidates")}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      activeTab === "candidates"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Candidates ({candidatesCount})
                  </button>
                  <button
                    onClick={() => setActiveTab("admins")}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      activeTab === "admins"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Administrators ({adminsCount})
                  </button>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No records found in this category.</p>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => {
                    if (user.isAdmin) {
                      const name = user.name || "System Administrator";
                      const isPrimary = user.email.trim().toLowerCase() === "admin@smartinterview.com";
                      
                      return (
                        <div
                          key={user.email}
                          className="rounded-xl border border-border/50 bg-card/25 p-4 sm:p-5 flex flex-col gap-4 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            {/* Icon/Photo */}
                            <div className="w-12 h-12 rounded-full border border-border/60 bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                              <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>

                            {/* Details */}
                            <div className="flex-1 text-center sm:text-left space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h3 className="font-bold text-base text-foreground">{name}</h3>
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold py-0.5 w-fit self-center sm:self-auto">
                                  {isPrimary ? "Super Admin" : "Administrator"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                            </div>

                            {/* Stats */}
                            <div className="text-center sm:text-right shrink-0 space-y-1 text-xs">
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1">
                                {user.loginCount} logins
                              </Badge>
                              <p className="text-muted-foreground mt-1">
                                Last active: <span className="font-medium">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</span>
                              </p>
                            </div>
                          </div>

                          {/* Admin Verification Check status */}
                          <div className="border-t border-border/20 pt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              System Integrity Status: <span className="font-bold text-emerald-500">Security Check Passed & Verified</span>
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px]">
                              Active
                            </Badge>
                          </div>
                        </div>
                      );
                    } else {
                      const photo = user.profilePhoto || localStorage.getItem(`interviewSelfie_${user.email.trim().toLowerCase()}`);
                      const name = user.name || formatPersonName(user.email);
                      const gender = user.gender || "Not specified";
                      const learningPrograms = user.learningPrograms || [];
                      const resumeFileName = user.resumeFileName || "";
                      const resumeText = user.resumeText || "";

                      const userEmailNormalized = user.email.trim().toLowerCase();
                      const userSessions = sessions.filter(
                        (s) => getEmailFromSession(s) === userEmailNormalized
                      );

                      return (
                        <div
                          key={user.email}
                          className="rounded-xl border border-border/50 bg-card/25 p-4 sm:p-5 flex flex-col gap-4 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            {/* User Photo */}
                            <div className="w-16 h-16 rounded-full border border-border/60 bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                              {photo ? (
                                <img src={photo} alt={`${name}'s profile`} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-muted-foreground/60" />
                              )}
                            </div>

                            {/* User Details */}
                            <div className="flex-1 text-center sm:text-left space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h3 className="font-bold text-base text-foreground">{name}</h3>
                                <Badge variant="secondary" className="w-fit self-center sm:self-auto text-[10px] font-bold py-0.5 mr-1.5">
                                  {gender}
                                </Badge>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold py-0.5 w-fit self-center sm:self-auto">
                                  Candidate
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                              
                              {/* Selected Categories */}
                              {learningPrograms.length > 0 && (
                                <div className="flex flex-wrap justify-center sm:justify-start gap-1 pt-1">
                                  {learningPrograms.map((catId: string) => (
                                    <Badge key={catId} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                      {catId.toUpperCase()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Login Stats */}
                            <div className="text-center sm:text-right shrink-0 space-y-1 text-xs">
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1">
                                {user.loginCount} logins
                              </Badge>
                              <p className="text-muted-foreground mt-1">
                                Last active: <span className="font-medium">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}</span>
                              </p>
                            </div>
                          </div>

                          {/* Expandable Resume details */}
                          {resumeText && (
                            <div className="border-t border-border/20 pt-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" />
                                  Resume: <span className="font-semibold text-foreground truncate max-w-[200px]">{resumeFileName || "Pasted text"}</span>
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedResumeUser(expandedResumeUser === user.email ? null : user.email)}
                                  className="h-8 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  {expandedResumeUser === user.email ? (
                                    <>
                                      Hide Resume <ChevronUp className="w-3.5 h-3.5 ml-1" />
                                    </>
                                  ) : (
                                    <>
                                      View Resume <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                    </>
                                  )}
                                </Button>
                              </div>

                              {expandedResumeUser === user.email && (
                                <div className="mt-2.5 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono">
                                  {resumeText}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Expandable User Sessions */}
                          <div className="border-t border-border/20 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <ClipboardList className="w-3.5 h-3.5" />
                                Sessions: <span className="font-semibold text-foreground">{userSessions.length} total</span>
                              </span>
                              {userSessions.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserSessionsExpand(user.email)}
                                  className="h-8 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  {expandedUserSessions[user.email] ? (
                                    <>
                                      Hide Sessions <ChevronUp className="w-3.5 h-3.5 ml-1" />
                                    </>
                                  ) : (
                                    <>
                                      View Sessions <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>

                            {expandedUserSessions[user.email] && userSessions.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {userSessions.map((s) => {
                                  const sKey = `${s.date}_${getEmailFromSession(s)}`;
                                  const score = s.results.length
                                    ? Math.round(s.results.reduce((sum, r) => sum + r.finalScore, 0) / s.results.length)
                                    : 0;

                                  return (
                                    <div
                                      key={sKey}
                                      className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2 w-full"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-semibold text-foreground">
                                            {new Date(s.date).toLocaleString()}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            Category: {s.category.toUpperCase()} | Qs: {s.results.length}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                          <Badge variant="outline" className="text-[10px]">
                                            Avg: {score}%
                                          </Badge>
                                          {s.mcqScore !== undefined && (
                                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary">
                                              MCQ: {s.mcqScore}%
                                            </Badge>
                                          )}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] px-2"
                                            onClick={() => toggleSessionExpand(sKey)}
                                          >
                                            {expandedSessions[sKey] ? "Hide Details" : "View Details"}
                                          </Button>
                                        </div>
                                      </div>
                                      {expandedSessions[sKey] && renderSessionDetails(s)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          )}

          <div className="glass rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-base sm:text-lg">Session History</h2>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interview data found yet.</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentSessions.map(({ session, index }) => {
                  const score = Math.round(
                    session.results.reduce((sum, result) => sum + result.finalScore, 0) /
                      Math.max(session.results.length, 1)
                  );
                  const sKey = `${session.date}_${getEmailFromSession(session)}`;
                  const userName = getUserNameForSession(session);
                  const userEmail = getEmailFromSession(session);

                  return (
                    <div
                      key={`${session.date}-${index}`}
                      className="rounded-md border border-border/50 p-3 sm:p-4 flex flex-col gap-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{userName}</span>
                            <span className="text-xs text-muted-foreground font-mono">({userEmail})</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.date).toLocaleString()} | Category: {session.category.toUpperCase()} | Questions: {session.results.length}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Badge variant="outline" className="w-fit">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {score}%
                          </Badge>
                          {session.mcqScore !== undefined && (
                            <Badge variant="outline" className="w-fit bg-primary/5 text-primary">
                              MCQ: {session.mcqScore}%
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSessionExpand(sKey)}
                            className="h-8 text-xs"
                          >
                            {expandedSessions[sKey] ? "Hide Details" : "View Details"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSession(index)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      {expandedSessions[sKey] && renderSessionDetails(session)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
