import React, { useState, useEffect } from "react";
import { Trophy, Award, Medal, ChevronRight, Sparkles, Filter, AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCurrentUserEmail, syncAllSessionsForAdmin, syncAllUsersAndAdmins } from "@/lib/auth";

export interface RankingItem {
  email: string;
  name: string;
  testsAttended: number;
  avgScore: number;
  totalPoints: number;
  rank: number;
  isCurrentUser: boolean;
}

interface LeaderboardRankingsProps {
  userSessions?: any[];
}

const getOrdinalRank = (rank: number) => {
  if (rank === 1) return "1st Place";
  if (rank === 2) return "2nd Place";
  if (rank === 3) return "3rd Place";
  return `${rank}th Place`;
};

export const LeaderboardRankings: React.FC<LeaderboardRankingsProps> = ({ userSessions = [] }) => {
  const [overallRankings, setOverallRankings] = useState<RankingItem[]>([]);
  const [dailyRankings, setDailyRankings] = useState<RankingItem[]>([]);
  const [viewMode, setViewMode] = useState<"daily" | "overall">("daily");
  
  const [userOverallRank, setUserOverallRank] = useState<RankingItem | null>(null);
  const [userDailyRank, setUserDailyRank] = useState<RankingItem | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "high_score" | "most_tests">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const buildOriginalLeaderboard = async () => {
      setIsLoading(true);
      try {
        const currentUserEmail = (getCurrentUserEmail() || "").trim().toLowerCase();
        const todayStr = new Date().toDateString();

        // Fetch real sessions and real registered users from Firestore database
        const allDbSessions = await syncAllSessionsForAdmin();
        const allDbUsers = await syncAllUsersAndAdmins();

        const candidateOverallMap: Record<string, { name: string; sessions: any[] }> = {};
        const candidateDailyMap: Record<string, { name: string; sessions: any[] }> = {};

        // 1. Register real users from database profiles
        allDbUsers.forEach((u) => {
          if (u.email && !u.isAdmin) {
            const emailKey = u.email.trim().toLowerCase();
            candidateOverallMap[emailKey] = { name: u.name || emailKey.split("@")[0], sessions: [] };
            candidateDailyMap[emailKey] = { name: u.name || emailKey.split("@")[0], sessions: [] };
          }
        });

        // Helper to check if date is today
        const isToday = (dateVal: string) => {
          try {
            return new Date(dateVal).toDateString() === todayStr;
          } catch {
            return false;
          }
        };

        // 2. Group real test/interview sessions
        allDbSessions.forEach((s) => {
          const emailKey = (s as any).email?.trim().toLowerCase() || s.storageKey?.replace("interviewResults_", "").trim().toLowerCase() || "";
          if (emailKey && emailKey !== "unknown" && !emailKey.includes("admin")) {
            if (!candidateOverallMap[emailKey]) {
              candidateOverallMap[emailKey] = { name: emailKey.split("@")[0], sessions: [] };
            }
            candidateOverallMap[emailKey].sessions.push(s);

            if (isToday(s.date)) {
              if (!candidateDailyMap[emailKey]) {
                candidateDailyMap[emailKey] = { name: emailKey.split("@")[0], sessions: [] };
              }
              candidateDailyMap[emailKey].sessions.push(s);
            }
          }
        });

        // 3. Include current user's local sessions
        if (currentUserEmail && !currentUserEmail.includes("admin")) {
          if (!candidateOverallMap[currentUserEmail]) {
            candidateOverallMap[currentUserEmail] = { name: currentUserEmail.split("@")[0], sessions: [] };
          }
          if (!candidateDailyMap[currentUserEmail]) {
            candidateDailyMap[currentUserEmail] = { name: currentUserEmail.split("@")[0], sessions: [] };
          }

          userSessions.forEach((us) => {
            const existsOverall = candidateOverallMap[currentUserEmail].sessions.some((s) => s.date === us.date);
            if (!existsOverall) {
              candidateOverallMap[currentUserEmail].sessions.push(us);
            }

            if (isToday(us.date)) {
              const existsDaily = candidateDailyMap[currentUserEmail].sessions.some((s) => s.date === us.date);
              if (!existsDaily) {
                candidateDailyMap[currentUserEmail].sessions.push(us);
              }
            }
          });
        }

        // Helper to build ranked array by test marks
        const createRankedList = (map: Record<string, { name: string; sessions: any[] }>, sortByMarks = false) => {
          const list: RankingItem[] = [];
          Object.entries(map).forEach(([email, data]) => {
            const count = data.sessions.length;
            if (count > 0) {
              let totalScoreSum = 0;
              data.sessions.forEach((s) => {
                if (s.results && s.results.length > 0) {
                  const sessionAvg = s.results.reduce((sum: number, r: any) => sum + (r.finalScore || 0), 0) / s.results.length;
                  totalScoreSum += sessionAvg;
                } else if (s.mcqScore !== undefined) {
                  totalScoreSum += s.mcqScore;
                }
              });
              const avg = Math.round(totalScoreSum / count);
              const pts = (count * 100) + (avg * 10);

              list.push({
                email,
                name: data.name || email.split("@")[0],
                testsAttended: count,
                avgScore: avg,
                totalPoints: pts,
                rank: 0,
                isCurrentUser: email === currentUserEmail,
              });
            }
          });

          // Sort daily strictly by Test Marks (avgScore)
          if (sortByMarks) {
            list.sort((a, b) => b.avgScore - a.avgScore || b.testsAttended - a.testsAttended);
          } else {
            list.sort((a, b) => b.totalPoints - a.totalPoints || b.avgScore - a.avgScore);
          }

          return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
        };

        const overall = createRankedList(candidateOverallMap, false);
        const daily = createRankedList(candidateDailyMap, true); // Sorted by marks!

        setOverallRankings(overall);
        setDailyRankings(daily);

        setUserOverallRank(overall.find((item) => item.isCurrentUser) || null);
        setUserDailyRank(daily.find((item) => item.isCurrentUser) || null);
      } catch (err) {
        console.error("Failed to build rankings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    buildOriginalLeaderboard();
  }, [userSessions]);

  const activeRankings = viewMode === "daily" ? dailyRankings : overallRankings;
  const activeUserRank = viewMode === "daily" ? userDailyRank : userOverallRank;
  const topThree = activeRankings.slice(0, 3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 flex items-center gap-1 text-xs font-extrabold px-2 py-0.5">
            <Trophy className="w-3.5 h-3.5 fill-amber-500" /> 1st Place
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-slate-400/20 text-slate-300 border-slate-400/30 flex items-center gap-1 text-xs font-extrabold px-2 py-0.5">
            <Medal className="w-3.5 h-3.5 fill-slate-300" /> 2nd Place
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-amber-700/20 text-amber-600 border-amber-700/30 flex items-center gap-1 text-xs font-extrabold px-2 py-0.5">
            <Award className="w-3.5 h-3.5 fill-amber-600" /> 3rd Place
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs font-mono font-bold px-2 py-0.5">
            {getOrdinalRank(rank)}
          </Badge>
        );
    }
  };

  const filteredRankings = activeRankings.filter((item) => {
    if (filterType === "high_score") return item.avgScore >= 80;
    if (filterType === "most_tests") return item.testsAttended >= (viewMode === "daily" ? 1 : 3);
    return true;
  });

  return (
    <div className="glass-card p-5 h-full flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Toggle Mode Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "daily"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Daily Test Board
            </button>
            <button
              onClick={() => setViewMode("overall")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "overall"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Overall Board
            </button>
          </div>

          {activeUserRank ? (
            <Badge variant="secondary" className="font-bold text-xs bg-amber-500/15 text-amber-500 border-amber-500/30">
              {getOrdinalRank(activeUserRank.rank)}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {viewMode === "daily" ? "Daily Test" : "Overall"}
            </Badge>
          )}
        </div>

        {/* Compact List: Strictly Top 3 Members Only */}
        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading test performance rankings...</div>
        ) : topThree.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center space-y-1 mb-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              {viewMode === "daily" ? "No Tests Attended Today" : "No Overall Test Rankings Yet"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {viewMode === "daily"
                ? "Be the first candidate to complete a test today to claim 1st Place!"
                : "Complete a test to get on the overall leaderboard!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1">
              {viewMode === "daily" ? "Top 3 Test Marks Today" : "Top 3 Overall Candidates"}
            </div>
            {topThree.map((item) => (
              <div
                key={item.email}
                className={`p-2.5 rounded-lg border transition-all duration-200 flex items-center justify-between text-xs ${
                  item.isCurrentUser
                    ? "bg-primary/10 border-primary/30 font-bold"
                    : "bg-background/50 border-border/50 hover:border-primary/20"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-5 shrink-0 font-extrabold text-muted-foreground text-center text-sm">
                    {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}
                  </div>
                  <div className="truncate">
                    <p className={`font-semibold text-xs truncate ${item.isCurrentUser ? "text-primary font-bold" : "text-foreground"}`}>
                      {item.name} {item.isCurrentUser && "(You)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.testsAttended} test{item.testsAttended > 1 ? "s" : ""} {viewMode === "daily" ? "today" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-xs text-emerald-500 block">{item.avgScore}% Marks</span>
                  <span className="text-[9px] font-bold text-amber-500 uppercase">
                    {getOrdinalRank(item.rank)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Button to View Full Leaderboard Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-lg h-9 flex items-center justify-center gap-1">
            View Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {viewMode === "daily" ? "Daily Test Marks & Place Board" : "Overall Candidate Leaderboard"}
            </DialogTitle>
          </DialogHeader>

          {/* Mode Switch inside Modal */}
          <div className="flex items-center justify-between gap-2 my-2 bg-muted/40 p-1.5 rounded-xl border border-border/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("daily")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today's Daily Test Board ({dailyRankings.length})
              </button>
              <button
                onClick={() => setViewMode("overall")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "overall" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Overall Board ({overallRankings.length})
              </button>
            </div>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className="text-xs h-7 rounded-full px-3"
            >
              All
            </Button>
            <Button
              variant={filterType === "high_score" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("high_score")}
              className="text-xs h-7 rounded-full px-3"
            >
              High Performers (&gt;80%)
            </Button>
            <Button
              variant={filterType === "most_tests" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("most_tests")}
              className="text-xs h-7 rounded-full px-3"
            >
              Active ({viewMode === "daily" ? "≥1 test today" : "≥3 tests"})
            </Button>
          </div>

          {/* Full Leaderboard Table */}
          {filteredRankings.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {viewMode === "daily"
                ? "No candidates have completed tests today matching this filter."
                : "No overall candidates found matching the selected filter."}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRankings.map((item) => (
                <div
                  key={item.email}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    item.isCurrentUser
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                      : "bg-card border-border/60 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">{getRankBadge(item.rank)}</div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                        {item.name}
                        {item.isCurrentUser && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0">
                            YOU
                          </Badge>
                        )}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">{item.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <span className="block text-[9px] text-muted-foreground uppercase font-bold">
                        {viewMode === "daily" ? "Today's Tests" : "Total Tests"}
                      </span>
                      <span className="font-extrabold text-foreground">{item.testsAttended}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-muted-foreground uppercase font-bold">Test Marks</span>
                      <span className="font-extrabold text-emerald-500 text-xs">{item.avgScore}% Marks</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-muted-foreground uppercase font-bold">Rank Place</span>
                      <span className="font-extrabold text-amber-500 text-xs">{getOrdinalRank(item.rank)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderboardRankings;
