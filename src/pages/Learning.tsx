import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Code, Globe, Database, Cpu, Wifi, Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const learningTracks = [
  {
    title: "DSA Foundations",
    icon: Code,
    color: "text-primary",
    items: [
      "Arrays, strings, linked lists, stacks and queues",
      "Sorting, searching, recursion and backtracking",
      "Dynamic programming and graph basics",
    ],
  },
  {
    title: "Web Development",
    icon: Globe,
    color: "text-success",
    items: [
      "HTML semantics, CSS layouts and responsive design",
      "JavaScript fundamentals, closures and async flow",
      "React components, state, props and hooks",
    ],
  },
  {
    title: "Database Systems",
    icon: Database,
    color: "text-warning",
    items: [
      "SQL queries, joins and indexing",
      "Normalization, transactions and ACID",
      "Schema design and optimization basics",
    ],
  },
  {
    title: "Operating Systems",
    icon: Cpu,
    color: "text-primary",
    items: [
      "Processes, threads and scheduling",
      "Deadlocks, memory management and paging",
      "Synchronization with mutexes and semaphores",
    ],
  },
  {
    title: "Networking",
    icon: Wifi,
    color: "text-success",
    items: [
      "OSI and TCP/IP models",
      "HTTP, DNS, TLS and request lifecycle",
      "Latency, bandwidth and troubleshooting",
    ],
  },
  {
    title: "HR and Communication",
    icon: Briefcase,
    color: "text-warning",
    items: [
      "Tell me about yourself with STAR structure",
      "Strengths, weaknesses and conflict handling",
      "Behavioral stories with measurable outcomes",
    ],
  },
];

const weeklyPlan = [
  "Day 1-2: DSA problem solving and complexity analysis",
  "Day 3: Web fundamentals and JavaScript revision",
  "Day 4: DBMS and SQL query practice",
  "Day 5: OS and Networking rapid revision",
  "Day 6: HR mock answers and speaking practice",
  "Day 7: Full interview simulation in this app",
];

const Learning = () => {
  return (
    <div className="w-full">

      <main className="container px-3 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-8 sm:mb-12">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
              Learning Hub
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">
              Learn Smarter for Your
              <span className="text-gradient"> Next Interview</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 sm:mt-4 max-w-2xl mx-auto">
              Follow focused learning tracks, revise high-impact concepts, and then test yourself with mock interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mb-8 sm:mb-10">
            {learningTracks.map((track, idx) => (
              <motion.div
                key={track.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="glass rounded-xl p-5 sm:p-6 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <track.icon className={`w-5 h-5 ${track.color}`} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold">{track.title}</h2>
                </div>
                <ul className="space-y-2">
                  {track.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="glass rounded-xl p-5 sm:p-7 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">7-Day Study Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {weeklyPlan.map((step) => (
                <div key={step} className="rounded-lg border border-border/50 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/interview">
              <Button variant="hero" className="w-full sm:w-auto">
                Start Mock Interview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">
                View Progress Dashboard
              </Button>
            </Link>
          </div>
        </motion.section>
      </main>

    </div>
  );
};

export default Learning;
