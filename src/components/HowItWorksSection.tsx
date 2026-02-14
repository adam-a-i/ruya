import { motion } from "framer-motion";
import { Phone, Brain, Zap, BarChart3, ArrowDown } from "lucide-react";

const steps = [
  {
    icon: Phone,
    title: "Call Execution",
    description:
      "The voice agent handles inbound or outbound leads — qualifying prospects, addressing objections, pushing toward booking.",
  },
  {
    icon: Brain,
    title: "Post-Call Intelligence",
    description:
      "Every transcript is analyzed: objections, emotional shifts, engagement peaks, speaking ratio, and conversion outcome.",
  },
  {
    icon: Zap,
    title: "Strategy Mutation",
    description:
      "Structured improvements are generated — adjusting openings, objection handling, persuasion tactics, and social proof timing.",
  },
  {
    icon: BarChart3,
    title: "Continuous Optimization",
    description:
      "Only strategies that correlate with higher conversion persist. Underperforming versions are automatically rolled back.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold">
            A closed feedback loop.
          </h2>
        </motion.div>

        <div className="relative">
          {steps.map((step, i) => (
            <div key={step.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="pb-2">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="flex items-center ml-6 py-3">
                  <div className="w-[1px] h-8 bg-border ml-[22px]" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loop visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-20 rounded-2xl border border-border bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-6">
            The Loop
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
            {["Call", "Analyze", "Extract Insights", "Update Strategy", "Deploy", "Measure", "Repeat"].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowDown className="w-4 h-4 text-primary rotate-[-90deg]" />
                  )}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
