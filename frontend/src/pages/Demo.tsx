import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Database,
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  RotateCcw,
  MessageCircle,
  Volume2,
  Mic2,
  Grid3X3,
  Volume1,
  PhoneOff,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type CallPhase = "idle" | "in-call" | "refine" | "call-again";
type FlowStep = "call" | "saving" | "saved" | "refining" | "refined";

async function getPrompt(version: 1 | 2) {
  const res = await fetch(`/api/demo/prompt?version=${version}`);
  const data = await res.json().catch(() => ({}));
  return { body: data.body || "", fromDb: data.fromDb };
}

// Demo: pharmacy calling a patient (contact from CRM / number lookup)
const DEMO_CONTACT = {
  name: "Saif Alblooshi",
  phone: "+971 56 661 6884",
  age: 34,
  region: "UAE / GCC",
  city: "Abu Dhabi",
  street: "Al Markaziyah, Electra Street",
  country: "United Arab Emirates",
};


async function startSession(promptVersion: 1 | 2, ring: boolean, contact?: typeof DEMO_CONTACT) {
  const res = await fetch("/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptVersion, ring, contact: contact ?? DEMO_CONTACT }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to start session");
  return data.sessionId as string;
}

async function endSession(sessionId: string) {
  const res = await fetch(`/api/demo/session/${sessionId}/end`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to end session");
}

async function saveTranscript(sessionId: string, lines: { role: string; text: string }[]) {
  const res = await fetch("/api/demo/save-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, lines }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save transcript");
  return data.saved;
}

async function refineAndSave(sessionId: string) {
  const res = await fetch("/api/demo/refine-and-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to refine prompt");
  return data.improvedPrompt as string;
}

async function getAgentReply(
  message: string,
  history: { role: string; content: string }[],
  promptVersion: 1 | 2,
  sessionId: string | null
): Promise<{ text: string; endCall?: boolean }> {
  const res = await fetch("/api/demo/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, promptVersion, sessionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Agent failed");
  return { text: data.text ?? "", endCall: data.endCall };
}

async function getTtsAudio(text: string): Promise<ArrayBuffer> {
  const res = await fetch("/api/demo/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "TTS failed");
  }
  return res.arrayBuffer();
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { length: number; [j: number]: { transcript: string }; isFinal: boolean };
  };
}
interface SpeechRecognitionInstance extends EventTarget {
  start(): void;
  stop(): void;
  abort(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}
function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    setSupported(!!SpeechRecognitionAPI);
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i] as unknown as { isFinal: boolean; 0?: { transcript: string } };
        const t = (r[0]?.transcript ?? "") as string;
        if (r.isFinal) final += t;
        else interimText += t;
      }
      if (final) {
        setInterim("");
        (window as unknown as { __onSpeechFinal?: (t: string) => void }).__onSpeechFinal?.(final);
      } else {
        setInterim(interimText);
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch (_) {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setInterim("");
    recognitionRef.current.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_) {}
    setListening(false);
    setInterim("");
  }, []);

  const setOnFinal = useCallback((cb: ((t: string) => void) | null) => {
    (window as unknown as { __onSpeechFinal?: (t: string) => void }).__onSpeechFinal = cb ?? undefined;
  }, []);

  return { listening, supported, interim, start, stop, setOnFinal };
}

export default function Demo() {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [promptV1, setPromptV1] = useState("");
  const [promptV2, setPromptV2] = useState("");
  const [promptFromDb, setPromptFromDb] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [promptVersion, setPromptVersion] = useState<1 | 2>(1);
  const [transcript, setTranscript] = useState<{ role: "agent" | "user"; text: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [ringPhone, setRingPhone] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [flowStep, setFlowStep] = useState<FlowStep>("call");
  const openingPlayedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { listening, supported, interim, start, stop, setOnFinal } = useSpeechRecognition();

  // Load prompts on mount
  useEffect(() => {
    getPrompt(1).then(({ body, fromDb }) => {
      setPromptV1(body);
      setPromptFromDb(fromDb);
    });
    getPrompt(2).then(({ body }) => setPromptV2(body));
  }, []);

  const playTts = useCallback(async (text: string) => {
    try {
      setTtsPlaying(true);
      const buf = await getTtsAudio(text);
      const blob = new Blob([buf], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => reject(new Error("Playback failed"));
        audio.play().catch(reject);
      });
    } finally {
      setTtsPlaying(false);
      audioRef.current = null;
    }
  }, []);

  const endCallAndSave = useCallback(async () => {
    if (!sessionId) return;
    setFlowStep("saving");
    setLoading(true);
    setError(null);
    try {
      await endSession(sessionId);
      await saveTranscript(sessionId, transcript);
      setFlowStep("saved");
      setPhase("refine");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end call");
      setFlowStep("call");
    } finally {
      setLoading(false);
    }
  }, [sessionId, transcript]);

  const sendUserMessage = useCallback(
    async (message: string) => {
      const msg = message.trim();
      if (!msg || !sessionId) return;
      setError(null);
      setLoading(true);
      const history = transcript.map((t) => ({ role: t.role, content: t.text }));
      try {
        setTranscript((prev) => [...prev, { role: "user" as const, text: msg }]);
        setUserInput("");
        const { text: reply, endCall: shouldEnd } = await getAgentReply(msg, history, promptVersion, sessionId);
        const newLines = [
          ...transcript,
          { role: "user" as const, text: msg },
          { role: "agent" as const, text: reply },
        ];
        setTranscript(newLines);
        await playTts(reply);
        if (shouldEnd) {
          setFlowStep("saving");
          await endSession(sessionId);
          await saveTranscript(sessionId, newLines.map((l) => ({ role: l.role, text: l.text })));
          setFlowStep("saved");
          setPhase("refine");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, transcript, promptVersion, playTts]
  );

  useEffect(() => {
    if (phase !== "in-call" && phase !== "call-again") return;
    setOnFinal((text) => {
      if (text.trim()) sendUserMessage(text.trim());
    });
    return () => setOnFinal(null);
  }, [phase, setOnFinal, sendUserMessage]);

  // Call duration timer (display only; call ends when agent sends [END_CALL] or user taps End)
  useEffect(() => {
    if (callStartTime == null || (phase !== "in-call" && phase !== "call-again")) return;
    const t = setInterval(() => {
      setCallDurationSec(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [callStartTime, phase]);

  // Agent speaks first: play opening with ElevenLabs as soon as call starts
  useEffect(() => {
    if ((phase !== "in-call" && phase !== "call-again") || !sessionId || openingPlayedRef.current) return;
    openingPlayedRef.current = true;
    setCallStartTime(Date.now());
    setLoading(true);
    setError(null);
    getAgentReply("__OPENING__", [], promptVersion, sessionId)
      .then(({ text }) => {
        setTranscript([{ role: "agent" as const, text }]);
        return playTts(text);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Opening failed"))
      .finally(() => setLoading(false));
  }, [phase, sessionId, promptVersion, playTts]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startFirstCall = async () => {
    setError(null);
    setLoading(true);
    setFlowStep("call");
    openingPlayedRef.current = false;
    try {
      const id = await startSession(1, ringPhone);
      setSessionId(id);
      setPromptVersion(1);
      setTranscript([]);
      setCallStartTime(Date.now());
      setCallDurationSec(0);
      setPhase("in-call");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start call");
    } finally {
      setLoading(false);
    }
  };

  const endCall = async () => {
    await endCallAndSave();
  };

  const doRefine = async () => {
    if (!sessionId) return;
    setFlowStep("refining");
    setLoading(true);
    setError(null);
    try {
      const improved = await refineAndSave(sessionId);
      setRefinedPrompt(improved);
      const { body } = await getPrompt(2);
      setPromptV2(body);
      setFlowStep("refined");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refine");
      setFlowStep("saved");
    } finally {
      setLoading(false);
    }
  };

  const startSecondCall = async () => {
    setError(null);
    setLoading(true);
    setFlowStep("call");
    openingPlayedRef.current = false;
    try {
      const id = await startSession(2, ringPhone);
      setSessionId(id);
      setPromptVersion(2);
      setTranscript([]);
      setRefinedPrompt("");
      setCallStartTime(Date.now());
      setCallDurationSec(0);
      setPhase("call-again");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start call");
    } finally {
      setLoading(false);
    }
  };

  const currentPrompt = promptVersion === 1 ? promptV1 : promptV2;
  const isInCall = phase === "in-call" || phase === "call-again";

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
          className="text-center mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Pharmacy demo</h1>
          <p className="text-muted-foreground">
            First call: pharmacy says your paracetamol is ready. Agent is rude and may hang up while you talk. Then we save to Supabase, refine the prompt, and you call again with a gentle, adaptive script.
          </p>
        </motion.div>

        {/* Flow: what is being done (saving in Supabase, refining, etc.) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 py-3 px-4 rounded-xl bg-muted/40 border border-border">
          <span className={`flex items-center gap-1.5 text-sm font-medium ${flowStep === "call" && isInCall ? "text-primary" : ["saving", "saved", "refining", "refined"].includes(flowStep) || phase === "refine" ? "text-muted-foreground" : "text-muted-foreground"}`}>
            {(["saved", "refining", "refined"].includes(flowStep) || phase === "refine") ? <Check className="h-4 w-4 text-primary" /> : isInCall ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isInCall ? "Call" : phase === "refine" || ["saving", "saved", "refining", "refined"].includes(flowStep) ? "Call ✓" : "1. Call"}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
          <span className={`flex items-center gap-1.5 text-sm ${flowStep === "saving" ? "text-primary font-medium" : flowStep === "saved" || flowStep === "refining" || flowStep === "refined" ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
            {flowStep === "saved" || flowStep === "refining" || flowStep === "refined" ? <Check className="h-4 w-4 text-primary" /> : flowStep === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {flowStep === "saving" ? "Saving to Supabase…" : flowStep === "saved" || flowStep === "refining" || flowStep === "refined" ? "Saved ✓" : "2. Save transcript"}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
          <span className={`flex items-center gap-1.5 text-sm ${flowStep === "refining" ? "text-primary font-medium" : flowStep === "refined" ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
            {flowStep === "refined" ? <Check className="h-4 w-4 text-primary" /> : flowStep === "refining" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {flowStep === "refining" ? "Refining prompt…" : flowStep === "refined" ? "Refined ✓" : "3. Refine prompt"}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground/70">4. Call again</span>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 mb-6"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 mb-8"
            >
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  First call — pharmacy (rude, may hang up while you talk)
                </p>
                <p className="text-foreground text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg">
                  {promptV1 || "Loading…"}
                </p>
                {promptFromDb && (
                  <p className="text-xs text-muted-foreground mt-2">Loaded from Supabase</p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Patient (demo) — agent sees this</p>
                <p className="text-sm text-foreground">
                  {DEMO_CONTACT.name} · {DEMO_CONTACT.age} · {DEMO_CONTACT.region} · {DEMO_CONTACT.city} · {DEMO_CONTACT.street} · {DEMO_CONTACT.phone}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ringPhone}
                    onChange={(e) => setRingPhone(e.target.checked)}
                    className="rounded"
                  />
                  Ring my phone via VAPI (optional)
                </label>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={startFirstCall}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  Start first call
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Agent speaks first (paracetamol ready). You play the patient—reply with mic or type. Call ends when the agent says goodbye or you tap End. Rude agent may hang up mid-sentence.
              </p>
            </motion.div>
          )}

          {isInCall && (
            <motion.div
              key="in-call"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8 max-w-sm mx-auto"
            >
              {/* iOS-style call screen */}
              <div className="rounded-[2.5rem] overflow-hidden border border-border/80 bg-gradient-to-b from-neutral-900 to-black shadow-2xl">
                {/* Status bar strip (iOS notch area) */}
                <div className="h-10 flex items-center justify-center gap-2 pt-2">
                  <span className="text-white/80 text-xs font-medium">{formatDuration(callDurationSec)}</span>
                </div>
                {/* Contact + number */}
                <div className="px-6 pt-8 pb-4 text-center">
                  <h2 className="text-2xl font-semibold text-white tracking-tight">{DEMO_CONTACT.name}</h2>
                  <p className="text-white/70 text-sm mt-1">{DEMO_CONTACT.phone}</p>
                  <p className="text-white/50 text-xs mt-0.5">Patient · {DEMO_CONTACT.city}, {DEMO_CONTACT.region}</p>
                </div>
                {/* Live label when agent is speaking */}
                {(loading || ttsPlaying) && (
                  <div className="flex justify-center pb-2">
                    <span className="text-emerald-400/90 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Agent speaking…
                    </span>
                  </div>
                )}
                {/* Transcript (scrollable) */}
                <div className="px-4 pb-4 max-h-32 overflow-y-auto">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                    {transcript.map((line, i) => (
                      <p
                        key={i}
                        className={`text-xs ${line.role === "user" ? "text-white/70 pl-2 border-l-2 border-white/30" : "text-white/90"}`}
                      >
                        <span className="text-white/50 font-medium uppercase">{line.role}: </span>
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>
                {/* Your reply: mic or type */}
                <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
                  {supported && (
                    <button
                      type="button"
                      onClick={listening ? stop : start}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                    >
                      {listening ? <MicOff className="h-5 w-5" /> : <Mic2 className="h-5 w-5" />}
                    </button>
                  )}
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendUserMessage(userInput)}
                    placeholder="Type your reply…"
                    className="flex-1 min-w-[140px] rounded-full bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => sendUserMessage(userInput)}
                    disabled={loading || !userInput.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/90 text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {loading || ttsPlaying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
                {interim && <p className="text-center text-white/50 text-xs pb-1 italic">{interim}</p>}
                {/* iOS-style action row: Mute, Keypad, Speaker */}
                <div className="flex justify-center gap-12 px-6 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20">
                      <Mic2 className="h-6 w-6" />
                    </button>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Mute</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20">
                      <Grid3X3 className="h-6 w-6" />
                    </button>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Keypad</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20">
                      <Volume1 className="h-6 w-6" />
                    </button>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Speaker</span>
                  </div>
                </div>
                {/* Red end call button */}
                <div className="flex justify-center pb-10 pt-2">
                  <button
                    type="button"
                    onClick={endCall}
                    disabled={loading}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 shadow-lg shadow-red-900/30"
                  >
                    <PhoneOff className="h-8 w-8" />
                  </button>
                </div>
              </div>
              <p className="text-center text-muted-foreground text-xs mt-3">Tap End to save transcript to Supabase.</p>
            </motion.div>
          )}

          {phase === "refine" && (
            <motion.div
              key="refine"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 mb-8"
            >
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {flowStep === "saved" || flowStep === "refining" || flowStep === "refined"
                    ? "Transcript saved to Supabase. Refine the prompt to get a gentle, adaptive pharmacy script."
                    : "Saving transcript to Supabase…"}
                </p>
              </div>
              <Button
                variant="hero"
                size="lg"
                onClick={doRefine}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {flowStep === "refining" ? "Refining prompt…" : "Refine prompt"}
              </Button>
              {refinedPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-6"
                >
                  <p className="text-sm font-medium text-primary mb-2">Improved prompt (saved as version 2 in Supabase)</p>
                  <p className="text-foreground text-sm whitespace-pre-wrap">{refinedPrompt}</p>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={startSecondCall}
                    disabled={loading}
                    className="gap-2 mt-4"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                    Call again (gentle, adaptive pharmacy)
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === "call-again" && (
            // Rendered as isInCall above
            null
          )}
        </AnimatePresence>

        {phase === "refine" && !refinedPrompt && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setPhase("idle")} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Start over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
