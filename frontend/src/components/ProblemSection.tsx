import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const wrongMetrics = [
  "Lower latency",
  "More realistic voices",
  "Multilingual support",
  "Infrastructure performance",
];

const ProblemSection = () => {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-1/4 left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.1] pointer-events-none blur-[120px]" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.5) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-[-5%] w-[350px] h-[350px] rounded-full opacity-[0.12] pointer-events-none blur-[120px]" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)" }} />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-medium text-sm uppercase tracking-widest mb-4">
            The Problem
          </p>
          <h2 className="text-3xl sm:text-5xl font-sans font-bold leading-tight mb-6">
            <span className="font-sans font-bold">Voice AI startups optimize for</span>
            <br />
            <span className="font-display text-muted-foreground">the wrong metrics.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-8"
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
              What they measure
            </p>
            <div className="space-y-4">
              {wrongMetrics.map((metric) => (
                <div key={metric} className="flex items-center gap-3 text-muted-foreground">
                  <X className="w-4 h-4 text-destructive shrink-0" />
                  <span>{metric}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-8 glow-border"
          >
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-6">
              What actually matters
            </p>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-primary shrink-0" />
              <span className="text-xl font-semibold">Conversion.</span>
            </div>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Most voice agents operate on static prompts. The script doesn't evolve. 
              The agent doesn't learn from missed deals. It just repeats.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
