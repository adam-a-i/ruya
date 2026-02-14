const Footer = () => {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xl font-bold tracking-tight font-[Space_Grotesk]">
          ruya<span className="text-primary">.</span>
        </div>
        <p className="text-sm text-muted-foreground">
          A self-improving revenue engine.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
