const Footer = () => {
  return (
    <footer className="relative border-t border-border py-12 px-6 overflow-hidden">
      <div className="absolute bottom-0 left-1/2 w-[300px] h-[200px] rounded-full opacity-[0.08] pointer-events-none blur-[100px] -translate-x-1/2" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(168,85,247,0.3) 50%, transparent 70%)" }} />
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <a href="/" className="flex items-center">
          <img src="/natiq.svg" alt="Natiq" className="h-7 w-auto" />
        </a>
        <p className="text-sm text-muted-foreground">
          A self-improving revenue engine.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
