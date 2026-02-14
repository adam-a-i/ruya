import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import OutcomeSection from "@/components/OutcomeSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center">
          <a href="/" className="flex items-center">
            <img src="/natiq.svg" alt="Natiq" className="h-8 w-auto" />
          </a>
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
