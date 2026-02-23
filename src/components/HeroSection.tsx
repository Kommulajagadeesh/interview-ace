import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Brain, BarChart3, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      <div className="container relative z-10 px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Interview Preparation
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Ace Your Next
            <br />
            <span className="text-gradient">Interview</span> With AI
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Practice with intelligent mock interviews, get real-time NLP-powered feedback
            on your answers, and analyze your voice confidence — all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/interview">
              <Button variant="hero" size="lg" className="text-base px-8 py-6 rounded-xl">
                Start Mock Interview
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 rounded-xl">
                View Dashboard
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16"
          >
            {[
              { value: "500+", label: "Questions" },
              { value: "AI", label: "NLP Analysis" },
              { value: "Real-time", label: "Feedback" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Floating icons */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-1/3 left-10 hidden lg:block"
        >
          <div className="w-14 h-14 rounded-xl glass flex items-center justify-center glow-border">
            <Mic className="w-6 h-6 text-primary" />
          </div>
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-1/2 right-10 hidden lg:block"
        >
          <div className="w-14 h-14 rounded-xl glass flex items-center justify-center glow-border">
            <Brain className="w-6 h-6 text-primary" />
          </div>
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute bottom-1/3 right-20 hidden lg:block"
        >
          <div className="w-14 h-14 rounded-xl glass flex items-center justify-center glow-border">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
