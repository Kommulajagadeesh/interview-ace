import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, XCircle, AlertCircle, ArrowRight, Download, Camera, Sparkles } from "lucide-react";
import type { InterviewResult } from "@/data/questions";
import { getVideoRecording } from "@/lib/indexedDb";

interface ResultsPageState {
  category: string;
  results: InterviewResult[];
  totalQuestions: number;
  averageScore: number;
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

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<ResultsPageState | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const passedState = location.state as ResultsPageState | null;
    if (passedState) {
      setState(passedState);
    } else {
      // Fallback: redirect to dashboard if no state passed
      navigate("/dashboard");
    }
  }, [location, navigate]);

  useEffect(() => {
    const recordingId = state?.recordingId;
    if (recordingId) {
      getVideoRecording(recordingId).then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      }).catch((err) => {
        console.error("Failed to load video recording from IDB", err);
      });
    }
  }, [state?.recordingId]);

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  const {
    category,
    results,
    totalQuestions,
    averageScore,
    recordingId,
    cvMetrics,
    strengths,
    weaknesses,
    feedbackSuggestions
  } = state;

  const passedCount = results.filter((r) => r.finalScore >= 70).length;
  const partialCount = results.filter((r) => r.finalScore >= 50 && r.finalScore < 70).length;
  const failedCount = results.filter((r) => r.finalScore < 50).length;

  const downloadResults = () => {
    const csv = [
      ["Question", "Your Answer", "Ideal Answer", "Score", "Feedback"].join(","),
      ...results.map((r) => [
        `"${r.questionText.replace(/"/g, '""')}"`,
        `"${r.answer.replace(/"/g, '""')}"`,
        `"${r.idealAnswer.replace(/"/g, '""')}"`,
        r.finalScore,
        `"${r.feedback.join(" | ").replace(/"/g, '""')}"`,
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-results-${category}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return "bg-success/10";
    if (score >= 50) return "bg-warning/10";
    return "bg-destructive/10";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-3 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-10 sm:mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 sm:w-10 h-8 sm:h-10 text-success" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Interview Completed!</h1>
            <p className="text-muted-foreground mb-6">
              <span className="text-primary font-bold text-2xl">{averageScore}%</span>
              <span className="ml-2">Average Score</span>
            </p>
            <p className="text-sm text-muted-foreground space-x-4">
              <span className="inline-block">✓ <span className="font-semibold text-success">{passedCount}</span> Great</span>
              <span className="inline-block">◐ <span className="font-semibold text-warning">{partialCount}</span> Fair</span>
              <span className="inline-block">✗ <span className="font-semibold text-destructive">{failedCount}</span> Needs Work</span>
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 text-center"
            >
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Questions Answered</p>
              <p className="text-3xl sm:text-4xl font-bold">{totalQuestions}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 text-center"
            >
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Category</p>
              <Badge className="mx-auto text-sm">{category.toUpperCase()}</Badge>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-lg sm:rounded-xl p-4 sm:p-6 text-center"
            >
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Date</p>
              <p className="text-sm font-semibold">{new Date().toLocaleDateString()}</p>
            </motion.div>
          </div>

          {/* Video Recording & body language HUD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 sm:mb-12 items-start text-left">
            {/* Left 2 columns: Video Player if available */}
            {videoUrl && (
              <div className="lg:col-span-2 glass rounded-lg sm:rounded-xl p-5 border border-border/20">
                <h2 className="text-sm sm:text-base font-bold mb-3 flex items-center gap-1.5">
                  <Camera className="w-4.5 h-4.5 text-primary" /> Interview Video Recording
                </h2>
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border/10 relative">
                  <video src={videoUrl} controls className="w-full h-full" />
                </div>
              </div>
            )}

            {/* Right column: CV Heuristic dashboard */}
            {cvMetrics && (
              <div className={`glass rounded-lg sm:rounded-xl p-5 border border-border/20 relative overflow-hidden ${videoUrl ? "lg:col-span-1" : "lg:col-span-3 grid grid-cols-2 gap-4"}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                
                <h2 className="text-sm sm:text-base font-bold mb-4 flex items-center gap-1.5 col-span-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Body Language HUD
                </h2>

                <div className="space-y-3 col-span-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Eye Contact</span>
                      <span className="text-primary font-bold">{cvMetrics.eyeContact}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${cvMetrics.eyeContact}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Posture Stability</span>
                      <span className="text-primary font-bold">{cvMetrics.posture}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${cvMetrics.posture}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Body Calmness</span>
                      <span className="text-primary font-bold">{cvMetrics.calmness}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${cvMetrics.calmness}%` }} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/20 flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Confidence Score:</span>
                    <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                      {cvMetrics.confidence}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strengths, Weaknesses, suggestions lists */}
          {(strengths?.length || weaknesses?.length || feedbackSuggestions?.length) ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 sm:mb-12 text-left">
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  ✓ Core Strengths
                </h4>
                <ul className="space-y-2">
                  {strengths && strengths.length > 0 ? (
                    strengths.map((str, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-slate-300 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
                        {str}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted-foreground italic">No specific strengths flagged.</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  ✗ Areas for Improvement
                </h4>
                <ul className="space-y-2">
                  {weaknesses && weaknesses.length > 0 ? (
                    weaknesses.map((weak, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-slate-300 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                        {weak}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted-foreground italic">No major vulnerabilities identified.</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-amber-405 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  💡 Action Suggestions
                </h4>
                <ul className="space-y-2">
                  {feedbackSuggestions && feedbackSuggestions.length > 0 ? (
                    feedbackSuggestions.map((sug, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-slate-300 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                        {sug}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted-foreground italic">Maintain current pacing.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}

          {/* Detailed Results */}
          <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-bold">Detailed Results</h2>
            {results.map((result, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/20 ${getScoreBgColor(result.finalScore)}`}
              >
                {/* Question */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-mono text-muted-foreground">Q{idx + 1}</span>
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                        Marks: {result.marksAwarded}/{result.maxMarks}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold">{result.questionText}</h3>
                  </div>
                  <div className={`text-right flex-shrink-0`}>
                    <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(result.finalScore)}`}>
                      {result.finalScore}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {result.finalScore >= 70 ? "Excellent" : result.finalScore >= 50 ? "Good" : "Needs work"}
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 pb-4 border-b border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Content</p>
                    <p className="text-sm font-semibold">{result.contentScore}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Keywords</p>
                    <p className="text-sm font-semibold">{result.keywordCoverage}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Similarity</p>
                    <p className="text-sm font-semibold">{result.semanticSimilarity}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Fluency</p>
                    <p className="text-sm font-semibold">{result.fluencyScore}%</p>
                  </div>
                </div>

                {/* Your Answer */}
                <div className="mb-4">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">Your Answer:</p>
                  <div className="bg-background/50 rounded p-3 text-xs sm:text-sm leading-relaxed border border-border/20">
                    {result.answer || <span className="text-muted-foreground italic">No answer provided</span>}
                  </div>
                </div>

                {/* Ideal Answer */}
                <div className="mb-4">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">Ideal Answer:</p>
                  <div className="bg-primary/5 rounded p-3 text-xs sm:text-sm leading-relaxed border border-primary/20">
                    {result.idealAnswer}
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Feedback:</p>
                  {result.feedback.length > 0 ? (
                    <ul className="space-y-1">
                      {result.feedback.map((f, i) => (
                        <li key={i} className="text-xs sm:text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">💡</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground italic">No additional feedback</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button variant="outline" onClick={downloadResults} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download Results
            </Button>
            <Button variant="hero" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
              View Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="hero-outline" onClick={() => navigate("/interview")} className="w-full sm:w-auto">
              Try Again
            </Button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Results;
