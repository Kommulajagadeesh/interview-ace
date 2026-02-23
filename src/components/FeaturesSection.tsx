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
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powered by <span className="text-gradient">Advanced AI</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Multi-modal analysis combining NLP and voice processing for the most comprehensive interview feedback.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-6 rounded-xl glass hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
