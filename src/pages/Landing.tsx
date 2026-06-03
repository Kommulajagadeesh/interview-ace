import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Code,
  Globe,
  Database,
  Cpu,
  Wifi,
  Briefcase,
  Shield,
  ShieldCheck,
  Camera,
  Mic,
  BarChart3,
  UserCheck,
  ArrowRight,
  Sparkles,
  Award,
  Activity,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const features = [
    {
      icon: Code,
      title: "Diagnostic MCQ Tests",
      desc: "Instantly test baseline knowledge across DSA, Web Dev, DBMS, Operating Systems, Computer Networks, and behavioral scenarios.",
      color: "from-blue-500/10 to-indigo-500/10 text-blue-400 border-blue-500/20",
    },
    {
      icon: Mic,
      title: "AI Voice Assistant",
      desc: "Simulate a live conversation. The AI evaluator benchmarks speech patterns, confidence, fluency, keywords, and semantic accuracy.",
      color: "from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/20",
    },
    {
      icon: Camera,
      title: "Identity & Integrity Check",
      desc: "Automated webcam face detection and session verification snapshots to guarantee examination integrity and secure logging.",
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      icon: BarChart3,
      title: "Admin Command Center",
      desc: "Monitor candidates, explore detailed session histories (results, feedbacks, expected responses), and check administrator verification states.",
      color: "from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  const categories = [
    { name: "DSA Foundations", icon: Code },
    { name: "Web Development", icon: Globe },
    { name: "Database Systems", icon: Database },
    { name: "Operating Systems", icon: Cpu },
    { name: "Computer Networks", icon: Wifi },
    { name: "HR & Behavioral", icon: Briefcase },
  ];

  const steps = [
    {
      step: "01",
      title: "Onboard & Personalize",
      desc: "Sign up, choose your target preparation domains, upload your resume, and capture a profile picture.",
    },
    {
      step: "02",
      title: "Answer Diagnostics",
      desc: "Complete randomized multiple-choice questionnaires designed to analyze core technical knowledge.",
    },
    {
      step: "03",
      title: "Live Mock Simulation",
      desc: "Engage in vocal Q&A with our AI. Active webcam face-tracking monitors integrity in real-time.",
    },
    {
      step: "04",
      title: "Analyze Scorecards",
      desc: "Receive immediate scores, actionable feedback lists, coverage grades, and model expected answers.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-hidden selection:bg-primary/20">
      {/* Decorative Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[140px] opacity-60 dark:opacity-20 animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] right-[-10%] w-[800px] h-[600px] bg-secondary/5 rounded-full blur-[140px] opacity-50 dark:opacity-10" />
        <div className="absolute bottom-[-10%] left-[20%] w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] opacity-40 dark:opacity-10" />
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-border/60" />
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Smart Interview AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
            <a href="#stats" className="hover:text-foreground transition-colors">Impact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9 border border-border/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="w-[18px] h-[18px] text-amber-400" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-xs sm:text-sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="font-semibold text-xs sm:text-sm rounded-full px-5 shadow-md shadow-primary/10">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-24 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 text-xs rounded-full gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Generative Mock Interviews 2.0
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-foreground"
          >
            Scale Your Preparation. <br />
            <span className="text-gradient">Ace Every Interview.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium"
          >
            Smart Interview AI connects candidate onboarding profiles, diagnostic MCQ evaluations, live conversational voice assistant mock sessions, and real-time security tracking into a single, high-fidelity prep engine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
          >
            <Link to="/signup">
              <Button size="lg" className="h-12 rounded-full px-6 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform gap-2">
                Start Preparing <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="h-12 rounded-full px-6 font-semibold text-sm hover:bg-muted/40">
                Explore Features
              </Button>
            </a>
          </motion.div>

          {/* Quick Category List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-6"
          >
            <span className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider block mb-3 text-center lg:text-left">
              Supported Mock Categories
            </span>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 max-w-xl">
              {categories.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/40 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
                >
                  <c.icon className="w-3.5 h-3.5" />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Hero Interactive Simulator Mockup Card */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="glass rounded-2xl border border-border/60 bg-card/40 p-5 shadow-2xl relative"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/60 font-mono">
                <Lock className="w-3 h-3 text-emerald-500" /> SECURE_EXAM_ENVIRONMENT
              </div>
            </div>

            {/* Simulated webcam and voice status */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="col-span-2 rounded-xl border border-border/60 bg-black/40 overflow-hidden relative h-36 flex items-center justify-center shadow-inner">
                {/* Active face tracking grid */}
                <div className="absolute inset-0 opacity-15 border border-primary/40 pointer-events-none" />
                <img src="/logo.jpg" alt="Active candidate selfie" className="w-full h-full object-cover opacity-80" />
                <div className="absolute top-2 left-2 bg-emerald-500/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> FACE VERIFIED
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                  FPS: 30
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3 flex flex-col justify-between text-xs h-36">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                    AI Evaluator
                  </span>
                  <p className="font-bold text-foreground">Assistant-01</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-primary animate-bounce" />
                    <span className="text-[10px] font-bold text-primary">MIC ACTIVE</span>
                  </div>
                  <div className="flex gap-0.5 items-end h-5">
                    {[6, 12, 18, 8, 14, 22, 10, 16, 4, 12].map((h, i) => (
                      <div
                        key={i}
                        className="bg-primary/80 w-[3px] rounded-full animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Questions progress mockup */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 text-left">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground border-b border-border/40 pb-2">
                <span>STAGE 2: VOICE RESPONSE</span>
                <span className="text-primary font-mono">QUESTION 2 OF 5</span>
              </div>
              <p className="text-xs font-semibold text-foreground leading-normal">
                "What is the difference between processes and threads in an operating system, and how do they share resources?"
              </p>
              <div className="p-2.5 rounded bg-muted/20 border border-border/60 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground font-medium">Click space to record response...</span>
                <Badge variant="outline" className="font-mono bg-background text-primary border-primary/20 text-[9px]">
                  02:15 remaining
                </Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section id="features" className="border-t border-border/40 bg-muted/5 relative z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Platform Capabilities</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Intelligent Modules for Mock Mastery
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every stage of Interview Ace is engineered to replicate real technical benchmarks and verify preparation integrity.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {features.map((feat) => (
              <motion.div
                key={feat.title}
                variants={itemVariants}
                className="glass rounded-xl border border-border/60 bg-card/45 p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${feat.color} shrink-0 group-hover:scale-110 transition-transform`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2 text-left">
                  <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stepper Workflow Section */}
      <section id="workflow" className="border-t border-border/40 relative z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Onboarding & Evaluation</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              How Smart Interview AI Works
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Go from profile onboarding to comprehensive score card reviews in four guided stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((st, i) => (
              <div key={st.step} className="flex flex-col text-left space-y-3 relative group">
                {/* Visual Step Stepper Connection */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-6 left-16 right-0 h-0.5 border-t border-dashed border-border/60 group-hover:border-primary/40 transition-colors" />
                )}
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-border/60 bg-muted/40 flex items-center justify-center font-black text-sm text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
                    {st.step}
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 text-muted-foreground/80">
                    Stage {st.step}
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {st.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benchmark Statistics Section */}
      <section id="stats" className="border-t border-border/40 bg-muted/5 relative z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass rounded-xl border border-border/60 bg-card/50 p-6 text-center space-y-2">
              <Award className="w-7 h-7 text-primary mx-auto" />
              <p className="text-3xl font-black text-foreground">10,000+</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Questions Reviewed</p>
            </div>
            <div className="glass rounded-xl border border-border/60 bg-card/50 p-6 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
              <p className="text-3xl font-black text-foreground">98%</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Evaluation Accuracy</p>
            </div>
            <div className="glass rounded-xl border border-border/60 bg-card/50 p-6 text-center space-y-2">
              <UserCheck className="w-7 h-7 text-purple-400 mx-auto" />
              <p className="text-3xl font-black text-foreground">24/7</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Availability</p>
            </div>
            <div className="glass rounded-xl border border-border/60 bg-card/50 p-6 text-center space-y-2">
              <Activity className="w-7 h-7 text-amber-400 mx-auto" />
              <p className="text-3xl font-black text-foreground">40%</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Performance Boost</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="border-t border-border/40 relative z-10">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <div className="glass rounded-2xl border border-border/60 bg-gradient-to-b from-card/85 to-card/65 p-8 sm:p-12 shadow-xl space-y-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary/5 rounded-full blur-2xl" />

            <div className="space-y-3 relative z-10">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Ready to Ace Your Next Interview?
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Join candidate prep rooms, complete technical and behavioral diagnostics, and download actionable score report cards.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
              <Link to="/signup">
                <Button size="lg" className="h-11 rounded-full px-6 font-bold text-xs sm:text-sm shadow-md shadow-primary/20">
                  Register Account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="h-11 rounded-full px-6 font-semibold text-xs sm:text-sm hover:bg-muted/40">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/20 py-8 relative z-10 text-center text-xs text-muted-foreground font-medium">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Logo" className="w-6 h-6 rounded-md object-cover opacity-80" />
            <span>&copy; {new Date().getFullYear()} Smart Interview AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Support Helpline</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
