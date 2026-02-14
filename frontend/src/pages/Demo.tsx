import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Database,
  Sparkles,
  ArrowDown,
  Check,
  Loader2,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PIPELINE_STEPS = [
  { id: "call", label: "Call +971 UAE", icon: Phone, description: "Outbound call initiated" },
  { id: "pitch", label: "Baseline script", icon: MessageSquare, description: "Real estate pitch to client" },
  { id: "client", label: "Client response", icon: MessageSquare, description: "Client talks back via VAPI (can reject)" },
  { id: "transcript", label: "Transcription → DB", icon: Database, description: "Transcript processed & saved" },
  { id: "openai", label: "OpenAI learns", icon: Sparkles, description: "Prompt updated for better pitch" },
  { id: "next", label: "Improved pitch", icon: MessageSquare, description: "Next call uses learned script" },
];

const BASELINE_SCRIPT =
  "Hi, this is Natiq. I'm calling about exclusive off-plan properties in Dubai. Would you be interested in a quick overview?";
const CLIENT_RESPONSE =
  "Not right now — I'm not looking to invest in real estate. Maybe next year.";

const FALLBACK_IMPROVED = "Acknowledge timing; offer one short market insight with no commitment. Ask for email or WhatsApp.";
const FALLBACK_FEEDBACK = "You led with product instead of need. Next time acknowledge their timeline first and offer one lightweight follow-up option.";
const FALLBACK_NEXT_PITCH = "Open with: 'I totally get that — timing is everything.' Then offer to send one short market snapshot with zero commitment, and ask whether they prefer email or WhatsApp. End with: 'Either way, no follow-up unless you want it.'";

async function saveTranscript(lines: { role: string; text: string }[]) {
  const res = await fetch("/api/demo/save-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, saved: data.saved, error: data.error };
}

async function improvePrompt(agentScript: string, clientResponse: string) {
  const res = await fetch("/api/demo/improve-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentScript, clientResponse }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    improvedPrompt: data.improvedPrompt || FALLBACK_IMPROVED,
    agentFeedback: data.agentFeedback || FALLBACK_FEEDBACK,
    nextPitchSummary: data.nextPitchSummary || FALLBACK_NEXT_PITCH,
    error: data.error,
  };
}

async function startCall(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/demo/start-call", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok, error: data.error };
}

// Slower pacing so the demo is easy to follow (ms)
const DELAY = {
  call: 8000,
  pitch: 5500,
  client: 5000,
  transcript: 4500,
  openai: 5500,
  next: 5000,
  default: 3000,
};

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [dbRows, setDbRows] = useState<{ id: number; text: string; role: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showImprovedPrompt, setShowImprovedPrompt] = useState(false);
  const [transcriptSaved, setTranscriptSaved] = useState<boolean | null>(null);
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [agentFeedback, setAgentFeedback] = useState("");
  const [nextPitchSummary, setNextPitchSummary] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [callStatus, setCallStatus] = useState<"dialing" | "ringing" | "connected" | "error">("dialing");
  const [callError, setCallError] = useState<string | null>(null);
  const [realCall, setRealCall] = useState(false);
  const advanceRef = useRef<() => void>(() => {});

  const advance = () => {
    setCurrentStep((s) => {
      const next = s + 1;
      if (next >= PIPELINE_STEPS.length) {
        setIsRunning(false);
        return s;
      }
      return next;
    });
  };
  advanceRef.current = advance;

  const startDemo = () => {
    setCurrentStep(-1);
    setTranscriptLines([]);
    setDbRows([]);
    setShowImprovedPrompt(false);
    setTranscriptSaved(null);
    setImprovedPrompt("");
    setAgentFeedback("");
    setNextPitchSummary("");
    setCallStatus("dialing");
    setCallError(null);
    setRealCall(false);
    setIsRunning(true);
  };

  useEffect(() => {
    if (!isRunning) return;

    if (currentStep === -1) {
      advance();
      return;
    }

    const step = PIPELINE_STEPS[currentStep];
    if (!step) return;

    if (step.id === "call") {
      setCallStatus("dialing");
      setCallError(null);
      setRealCall(false);
      startCall()
        .then(({ ok, error }) => {
          if (ok) {
            setRealCall(true);
            setCallStatus("connected");
          } else {
            setCallStatus("error");
            setCallError(error || "Call failed");
          }
          setTimeout(() => advanceRef.current(), DELAY.call);
        })
        .catch(() => {
          setCallStatus("error");
          setCallError("Could not start call");
          setTimeout(() => advanceRef.current(), DELAY.call);
        });
      return () => {};
    }

    if (step.id === "transcript") {
      setTranscriptLines(["[Agent] " + BASELINE_SCRIPT, "[Client] " + CLIENT_RESPONSE]);
      setTranscriptSaved(null);
      setApiLoading(true);
      saveTranscript([
        { role: "agent", text: BASELINE_SCRIPT },
        { role: "client", text: CLIENT_RESPONSE },
      ]).then(({ saved }) => {
        setTranscriptSaved(saved);
        setApiLoading(false);
        setTimeout(() => advanceRef.current(), DELAY.transcript);
      }).catch(() => {
        setTranscriptSaved(false);
        setApiLoading(false);
        setTimeout(() => advanceRef.current(), DELAY.transcript);
      });
      return;
    }

    if (step.id === "openai") {
      setDbRows([
        { id: 1, text: BASELINE_SCRIPT, role: "agent" },
        { id: 2, text: CLIENT_RESPONSE, role: "client" },
      ]);
      setShowImprovedPrompt(false);
      setApiLoading(true);
      improvePrompt(BASELINE_SCRIPT, CLIENT_RESPONSE).then((data) => {
        setImprovedPrompt(data.improvedPrompt);
        setAgentFeedback(data.agentFeedback);
        setNextPitchSummary(data.nextPitchSummary);
        setApiLoading(false);
        setShowImprovedPrompt(true);
        setTimeout(() => advanceRef.current(), DELAY.openai);
      }).catch(() => {
        setImprovedPrompt(FALLBACK_IMPROVED);
        setAgentFeedback(FALLBACK_FEEDBACK);
        setNextPitchSummary(FALLBACK_NEXT_PITCH);
        setApiLoading(false);
        setShowImprovedPrompt(true);
        setTimeout(() => advanceRef.current(), DELAY.openai);
      });
      return;
    }

    const delay = step.id === "pitch" ? DELAY.pitch : step.id === "client" ? DELAY.client : step.id === "next" ? DELAY.next : DELAY.default;
    const t = setTimeout(advance, delay);
    return () => clearTimeout(t);
  }, [isRunning, currentStep]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/natiq.svg" alt="Natiq" className="h-8 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Back to home
            </Button>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Pipeline in action</h1>
          <p className="text-muted-foreground">
            Call → baseline pitch → client response → transcript to DB → OpenAI learns → improved pitch
          </p>
        </motion.div>

        <div className="space-y-2 mb-12">
          {PIPELINE_STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isDone = currentStep > index;
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                  isActive ? "border-primary/50 bg-primary/5" : isDone ? "border-primary/20 bg-card" : "border-border bg-card/50"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "bg-primary/20 text-primary" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : isActive && isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{step.label}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden sm:block text-muted-foreground/50">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="call"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-card p-6 mb-8"
            >
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {callStatus === "dialing" && "Starting call…"}
                {callStatus === "connected" && (realCall ? "Call connected — your phone is ringing" : "Call connected")}
                {callStatus === "error" && "Call could not be started"}
              </p>
              <p className="text-foreground mt-2">
                {realCall ? (
                  <>Outbound call to <strong>+971 56 661 6884</strong> (UAE) via Twilio Studio. Baseline pitch script is running on the flow.</>
                ) : (
                  <>Calling <strong>+971 56 661 6884</strong> (UAE) from <strong>+1 845 253 5921</strong>. Baseline real estate pitch script loaded.</>
                )}
              </p>
              {callError && (
                <p className="text-sm text-muted-foreground mt-2">({callError}. Demo continues with simulated conversation.)</p>
              )}
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="pitch"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-card p-6 mb-8"
            >
              <p className="text-sm font-medium text-muted-foreground mb-2">Baseline script (real estate pitch)</p>
              <p className="text-foreground">&ldquo;{BASELINE_SCRIPT}&rdquo;</p>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="client"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-card p-6 mb-8"
            >
              <p className="text-sm font-medium text-muted-foreground mb-2">Baseline script (agent)</p>
              <p className="text-foreground mb-4">{BASELINE_SCRIPT}</p>
              <p className="text-sm font-medium text-muted-foreground mb-2">Client response (via VAPI)</p>
              <p className="text-foreground italic">&ldquo;{CLIENT_RESPONSE}&rdquo;</p>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-card p-6 mb-8"
            >
              <p className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Transcription {apiLoading ? "saving to database…" : transcriptSaved === true ? "saved to database" : transcriptSaved === false ? "save failed (demo continues)" : "saved to database"}
              </p>
              <div className="space-y-2 font-mono text-sm">
                {transcriptLines.map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.3 }}
                    className={line.startsWith("[Client]") ? "text-muted-foreground" : ""}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="openai"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border bg-card p-6 mb-8"
            >
              <p className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {apiLoading ? "OpenAI analyzing conversation…" : "Prompt updated from conversation"}
              </p>
              {dbRows.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4 font-mono text-xs overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1">id</th>
                        <th className="text-left py-1">role</th>
                        <th className="text-left py-1">text</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbRows.map((row) => (
                        <tr key={row.id} className="border-t border-border">
                          <td className="py-1.5">{row.id}</td>
                          <td className="py-1.5">{row.role}</td>
                          <td className="py-1.5 max-w-[200px] truncate">{row.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {showImprovedPrompt && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4"
                  >
                    <p className="text-sm font-medium text-primary mb-2">Updated prompt (next pitch)</p>
                    <p className="text-sm text-foreground">{improvedPrompt}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Agent feedback
                    </p>
                    <p className="text-sm text-foreground">{agentFeedback}</p>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="next"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 mb-8"
            >
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <p className="text-sm font-medium text-primary mb-3">Improved pitch (next call)</p>
                <p className="text-foreground leading-relaxed whitespace-pre-line">
                  {nextPitchSummary || "The agent will acknowledge the client's timing, offer one short market insight with no commitment, and ask for preferred channel (email or WhatsApp)."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Agent feedback (what the system learned)
                </p>
                <p className="text-foreground text-sm leading-relaxed">
                  {agentFeedback}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-2">Prompt change applied for next call</p>
                <p className="text-sm text-foreground">{improvedPrompt}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center">
          {currentStep >= 0 && currentStep < PIPELINE_STEPS.length && isRunning ? null : currentStep === PIPELINE_STEPS.length - 1 && !isRunning ? (
            <Button variant="hero" size="lg" onClick={startDemo} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Replay demo
            </Button>
          ) : (
            <Button variant="hero" size="lg" onClick={startDemo} className="gap-2">
              Start pipeline demo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
