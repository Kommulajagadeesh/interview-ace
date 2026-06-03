import { motion } from "framer-motion";
import { Brain, Mic, FileText, BarChart3, MessageSquare, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "NLP Answer Evaluation",
    description: "BERT-based semantic analysis scores your answers for relevance, keyword coverage, and technical depth.",
  },
  {
    icon: Mic,
    title: "Voice Confidence Analysis",
    description: "Pitch, tone variation, speech rate, and pause analysis to measure your delivery confidence.",
  },
  {
    icon: FileText,
    title: "500+ Question Bank",
    description: "HR, Technical, and Behavioral questions across multiple domains with ideal answer references.",
  },
  {
    icon: BarChart3,
    title: "Detailed Scoring",
    description: "Hybrid scoring: 60% content quality + 25% confidence + 15% fluency for comprehensive evaluation.",
  },
  {
    icon: MessageSquare,
    title: "Personalized Feedback",
    description: "Actionable improvement suggestions like 'Add more real-world examples' or 'Slow down your speech.'",
  },
  {
    icon: Shield,
    title: "Performance Tracking",
    description: "Track your progress over time with detailed analytics and improvement trends.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 sm:py-32 relative bg-background/50">
      <div className="container px-4 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 sm:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Powered by <span className="text-gradient">Advanced AI</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
            Multi-modal analysis combining NLP and voice processing for the most comprehensive interview feedback.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-8 glass-card flex flex-col items-start"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-all duration-300 shadow-sm">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
