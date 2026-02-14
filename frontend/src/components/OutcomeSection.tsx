import { motion } from "framer-motion";
import { TrendingUp, GitBranch, FlaskConical, DollarSign } from "lucide-react";

const outcomes = [
  {
    icon: TrendingUp,
    title: "Increasing conversion rates",
    description: "The agent gets measurably better at closing deals over time.",
  },
  {
    icon: GitBranch,
    title: "Strategy evolution",
    description: "Data-driven mutations to phrasing, structure, and persuasion.",
  },
  {
    icon: FlaskConical,
    title: "Built-in A/B testing",
    description: "Every version is tested against previous ones automatically.",
  },
  {
    icon: DollarSign,
    title: "Measurable ROI",
    description: "Even a small conversion lift translates into significant revenue.",
  },
];

const OutcomeSection = () => {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-1/3 right-[-8%] w-[400px] h-[400px] rounded-full opacity-[0.12] pointer-events-none blur-[120px]" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/3 left-[-10%] w-[350px] h-[350px] rounded-full opacity-[0.1] pointer-events-none blur-[120px]" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 70%)" }} />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">
            The Outcome
          </p>
          <h2 className="text-3xl sm:text-5xl font-sans font-bold mb-4">
            <span className="font-sans font-bold">It doesn't just sound better.</span>
          </h2>
          <p className="text-3xl sm:text-5xl font-bold text-gradient-primary">
            <span className="font-display">It sells better.</span>
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {outcomes.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors duration-300"
            >
              <item.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OutcomeSection;
