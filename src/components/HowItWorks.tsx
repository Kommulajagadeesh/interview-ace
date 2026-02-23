import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Choose Category", description: "Select HR, Technical, or Behavioral interview type" },
  { step: "02", title: "Answer Questions", description: "Respond via text or voice with a timed session" },
  { step: "03", title: "AI Analysis", description: "NLP evaluates content quality and voice confidence" },
  { step: "04", title: "Get Feedback", description: "Receive detailed scores and improvement suggestions" },
];

const HowItWorks = () => {
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
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground">Four simple steps to interview mastery</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="text-5xl font-black text-primary/10 mb-3">{s.step}</div>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-3 w-6 h-px bg-primary/30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
