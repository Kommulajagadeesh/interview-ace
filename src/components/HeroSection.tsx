import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Brain, BarChart3, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-hero-gradient pt-24 pb-16">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px] mix-blend-multiply opacity-50 dark:opacity-20" />
        <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px] mix-blend-multiply opacity-50 dark:opacity-20" />
        <div className="absolute -bottom-1/4 left-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-[120px] mix-blend-multiply opacity-50 dark:opacity-20" />
      </div>

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-black/20 border border-border/50 backdrop-blur-md shadow-sm text-primary text-sm font-semibold mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Introducing Smart Interview Preparation</span>
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Master your next
            <br />
            <span className="text-gradient">tech interview</span> with AI
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Practice with intelligent mock interviews, receive instant NLP-powered feedback, and boost your confidence in a pressure-free environment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/interview" className="w-full sm:w-auto">
              <Button variant="hero" size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-xl">
                Start Mock Interview
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-xl bg-background/50 backdrop-blur-sm border-border hover:bg-background/80 transition-all">
                View Dashboard
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-8 max-w-2xl mx-auto mt-20 p-6 rounded-2xl glass-card"
          >
            {[
              { value: "500+", label: "Practice Questions" },
              { value: "Instant", label: "NLP Analysis" },
              { value: "100%", label: "Real-time Feedback" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Floating Abstract Icons */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-10"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-glass flex items-center justify-center border border-white/20 dark:border-white/10 rotate-12">
              <Mic className="w-8 h-8 text-primary" />
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/3 right-10"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-glass flex items-center justify-center border border-white/20 dark:border-white/10 -rotate-12">
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 right-32"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-glass flex items-center justify-center border border-white/20 dark:border-white/10 rotate-6">
              <BarChart3 className="w-6 h-6 text-violet-500" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
