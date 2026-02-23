import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Trophy, TrendingUp, Target, ArrowRight } from "lucide-react";
import type { InterviewResult } from "@/data/questions";

interface SessionData {
  date: string;
  category: string;
  results: InterviewResult[];
}

const Dashboard = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("interviewResults") || "[]");
    setSessions(stored);
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
    { icon: Trophy, label: "Average Score", value: `${avgScore}%`, color: "text-primary" },
    { icon: Target, label: "Interviews", value: sessions.length.toString(), color: "text-success" },
    { icon: TrendingUp, label: "Questions Answered", value: allResults.length.toString(), color: "text-warning" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-6 pt-28 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Performance <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mb-10">Track your interview preparation progress</p>

          {sessions.length === 0 ? (
            <div className="glass rounded-xl p-16 text-center">
              <h2 className="text-xl font-semibold mb-3">No interviews yet</h2>
              <p className="text-muted-foreground mb-6">Complete your first mock interview to see analytics here.</p>
              <Link to="/interview">
                <Button variant="hero">
                  Start Interview <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {stats.map((stat) => (
                  <div key={stat.label} className="glass rounded-xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6 mb-10">
                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Score Breakdown</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(222 30% 16%)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="value" stroke="hsl(187 90% 51%)" fill="hsl(187 90% 51%)" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Session Progress</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionBarData}>
                        <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                        />
                        <Bar dataKey="score" fill="hsl(187 90% 51%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent sessions */}
              <h3 className="font-semibold mb-4">Recent Sessions</h3>
              <div className="space-y-3">
                {sessions.slice(-5).reverse().map((session, i) => {
                  const avg = Math.round(session.results.reduce((a, r) => a + r.finalScore, 0) / session.results.length);
                  return (
                    <div key={i} className="glass rounded-xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-primary border-primary/30 capitalize">
                          {session.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(session.date).toLocaleDateString()} · {session.results.length} questions
                        </span>
                      </div>
                      <span className={`font-bold ${avg >= 70 ? "text-success" : avg >= 50 ? "text-warning" : "text-destructive"}`}>
                        {avg}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
