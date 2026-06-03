import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Choose Category", description: "Select HR, Technical, or Behavioral interview type" },
  { step: "02", title: "Answer Questions", description: "Respond via text or voice with a timed session" },
  { step: "03", title: "AI Analysis", description: "NLP evaluates content quality and voice confidence" },
  { step: "04", title: "Get Feedback", description: "Receive detailed scores and improvement suggestions" },
];

const HowItWorks = () => {
  return (
    <section className="py-24 sm:py-32 relative bg-background">
      <div className="container px-4 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 sm:mb-24"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">Four simple steps to interview mastery</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15, duration: 0.5, ease: "easeOut" }}
              className="relative text-center sm:text-left flex flex-col items-center sm:items-start group"
            >
              <div className="text-5xl sm:text-6xl font-extrabold text-primary/10 dark:text-primary/20 mb-4 sm:mb-6 group-hover:text-primary/20 dark:group-hover:text-primary/30 transition-colors tracking-tighter">
                {s.step}
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">{s.title}</h3>
              <p className="text-muted-foreground font-medium">{s.description}</p>
              
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-2/3 w-full h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
