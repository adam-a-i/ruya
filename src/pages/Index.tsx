import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import OutcomeSection from "@/components/OutcomeSection";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight font-[Space_Grotesk]">
            ruya<span className="text-primary">.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
            <div className="text-sm text-muted-foreground">
              Ruya Hackathon 2026
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <OutcomeSection />
      <Footer />
    </div>
  );
};

export default Index;
