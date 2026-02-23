import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import {
  type QuestionCategory,
  type InterviewResult,
  getRandomQuestions,
  evaluateAnswer,
  type Question,
} from "@/data/questions";
import { Clock, ArrowRight, CheckCircle, Briefcase, Code, Users } from "lucide-react";

const categories: { id: QuestionCategory; label: string; icon: typeof Briefcase; desc: string }[] = [
  { id: "hr", label: "HR", icon: Briefcase, desc: "General & personality questions" },
  { id: "technical", label: "Technical", icon: Code, desc: "Coding & system design" },
  { id: "behavioral", label: "Behavioral", icon: Users, desc: "Situational & STAR method" },
];

const Interview = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"select" | "interview" | "complete">("select");
  const [category, setCategory] = useState<QuestionCategory | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (stage !== "interview") return;
    if (timeLeft <= 0) {
      handleSubmitAnswer();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  const startInterview = (cat: QuestionCategory) => {
    setCategory(cat);
    setQuestions(getRandomQuestions(cat, 5));
    setCurrentIndex(0);
    setResults([]);
    setAnswer("");
    setTimeLeft(120);
    setStage("interview");
  };

  const handleSubmitAnswer = useCallback(() => {
    if (!currentQuestion) return;
    const result = evaluateAnswer(currentQuestion, answer || "(No answer provided)");
    const newResults = [...results, result];
    setResults(newResults);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswer("");
      setTimeLeft(120);
    } else {
      setStage("complete");
      // Store results for dashboard
      const existing = JSON.parse(localStorage.getItem("interviewResults") || "[]");
      localStorage.setItem(
        "interviewResults",
        JSON.stringify([
          ...existing,
          { date: new Date().toISOString(), category, results: newResults },
        ])
      );
    }
  }, [answer, currentIndex, currentQuestion, questions, results, category]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-6 pt-28 pb-16">
        <AnimatePresence mode="wait">
          {stage === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">
                Choose Interview <span className="text-gradient">Category</span>
              </h1>
              <p className="text-center text-muted-foreground mb-10">
                Select the type of questions you want to practice
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => startInterview(cat.id)}
                    className="group p-8 rounded-xl glass hover:border-primary/40 transition-all duration-300 text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <cat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "interview" && currentQuestion && (
            <motion.div
              key={`q-${currentIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="max-w-3xl mx-auto"
            >
              {/* Progress */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {category?.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-sm font-mono ${timeLeft < 30 ? "text-destructive" : "text-muted-foreground"}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-secondary rounded-full mb-8">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="glass rounded-xl p-8 mb-6">
                <h2 className="text-xl md:text-2xl font-semibold">{currentQuestion.text}</h2>
              </div>

              {/* Answer */}
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="min-h-[200px] bg-card border-border/50 focus:border-primary/50 text-base mb-6"
              />

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground self-center">
                  {answer.split(/\s+/).filter(Boolean).length} words
                </span>
                <Button variant="hero" onClick={handleSubmitAnswer}>
                  {currentIndex < questions.length - 1 ? "Next Question" : "Finish Interview"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {stage === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Interview Complete!</h1>
              <p className="text-muted-foreground mb-4">
                Average Score:{" "}
                <span className="text-primary font-bold text-2xl">
                  {Math.round(results.reduce((a, r) => a + r.finalScore, 0) / results.length)}%
                </span>
              </p>

              {/* Results summary */}
              <div className="space-y-4 mb-8 text-left">
                {results.map((r, i) => (
                  <div key={i} className="glass rounded-xl p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm">{r.questionText}</h3>
                      <Badge
                        variant="outline"
                        className={
                          r.finalScore >= 70
                            ? "text-success border-success/30"
                            : r.finalScore >= 50
                            ? "text-warning border-warning/30"
                            : "text-destructive border-destructive/30"
                        }
                      >
                        {r.finalScore}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-muted-foreground">
                      <div>Content: <span className="text-foreground font-medium">{r.contentScore}%</span></div>
                      <div>Confidence: <span className="text-foreground font-medium">{r.confidenceScore}%</span></div>
                      <div>Fluency: <span className="text-foreground font-medium">{r.fluencyScore}%</span></div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {r.feedback.map((f, j) => (
                        <p key={j} className="text-xs text-muted-foreground">💡 {f}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="hero" onClick={() => navigate("/dashboard")}>
                  View Dashboard
                </Button>
                <Button variant="hero-outline" onClick={() => setStage("select")}>
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default Interview;
