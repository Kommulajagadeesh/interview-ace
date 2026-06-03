import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, X, Sparkles, HelpCircle, ArrowRight, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type VoiceAssistantProps = {
  onRemoveSettings: () => void;
  onAddSettings: () => void;
  onStartInterview: () => void;
  onNavigate: (path: string) => void;
  showSettings: boolean;
};

const VoiceAssistant = ({
  onRemoveSettings,
  onAddSettings,
  onStartInterview,
  onNavigate,
  showSettings,
}: VoiceAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setTranscript(interim);
      }

      if (final) {
        setTranscript(final);
        processCommand(final);
      }
    };

    rec.onend = () => {
      setListening(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        setError(`Speech error: ${event.error}`);
        setListening(false);
      }
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  // Text-To-Speech function
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find a pleasant English voice
      const preferredVoice = 
        voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) ||
        voices.find(v => v.lang.startsWith("en-US") && v.name.includes("Natural")) ||
        voices.find(v => v.lang.startsWith("en-")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed", e);
    }
  };

  // Process the transcript for commands
  const processCommand = (cmdText: string) => {
    const cleanCmd = cmdText.toLowerCase().trim();
    
    // Commands to remove settings
    if (
      cleanCmd.includes("remove settings") ||
      cleanCmd.includes("hide settings") ||
      cleanCmd.includes("delete settings") ||
      cleanCmd.includes("off settings")
    ) {
      if (showSettings) {
        onRemoveSettings();
        setLastAction("Removed settings button/card");
        speak("I have removed the settings button from the page.");
      } else {
        speak("The settings button is already removed.");
      }
      return;
    }

    // Commands to add settings
    if (
      cleanCmd.includes("add settings") ||
      cleanCmd.includes("show settings") ||
      cleanCmd.includes("restore settings") ||
      cleanCmd.includes("on settings")
    ) {
      if (!showSettings) {
        onAddSettings();
        setLastAction("Added settings button/card");
        speak("I have added the settings button back to the page.");
      } else {
        speak("The settings button is already visible.");
      }
      return;
    }

    // Command to start interview
    if (
      cleanCmd.includes("start interview") ||
      cleanCmd.includes("begin interview") ||
      cleanCmd.includes("start mock interview")
    ) {
      setLastAction("Triggered starting mock interview");
      speak("Starting your mock interview now. Best of luck!");
      setTimeout(() => {
        onStartInterview();
      }, 1000);
      return;
    }

    // Commands to navigate to dashboard
    if (
      cleanCmd.includes("go to dashboard") ||
      cleanCmd.includes("show dashboard") ||
      cleanCmd.includes("go dashboard") ||
      cleanCmd.includes("view dashboard")
    ) {
      setLastAction("Navigating to dashboard");
      speak("Navigating to your dashboard.");
      setTimeout(() => {
        onNavigate("/dashboard");
      }, 1000);
      return;
    }

    // Commands to navigate home
    if (
      cleanCmd.includes("go home") ||
      cleanCmd.includes("go to home") ||
      cleanCmd.includes("view home") ||
      cleanCmd.includes("show home")
    ) {
      setLastAction("Navigating home");
      speak("Navigating to home page.");
      setTimeout(() => {
        onNavigate("/home");
      }, 1000);
      return;
    }

    // If command isn't recognized but we heard speech, give general guidance
    if (cleanCmd.length > 3) {
      speak(`I heard: ${cmdText}. Say: remove settings, or add settings.`);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      setError(null);
      recognitionRef.current.start();
      setListening(true);
      speak("Voice assistant activated. How can I help you?");
    } catch (e) {
      setError("Microphone permission denied or busy.");
      setListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setListening(false);
      speak("Voice assistant deactivated.");
    } catch {
      // ignore
    }
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const executeManualCommand = (type: "add" | "remove") => {
    if (type === "add") {
      onAddSettings();
      setLastAction("Added settings button/card (manual)");
      speak("Added settings button.");
    } else {
      onRemoveSettings();
      setLastAction("Removed settings button/card (manual)");
      speak("Removed settings button.");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="glass w-80 md:w-96 rounded-2xl p-5 mb-4 shadow-xl border border-primary/20 backdrop-blur-xl relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-12 -mt-12 transition-colors duration-500 pointer-events-none ${listening ? 'bg-primary/20' : speaking ? 'bg-success/20' : 'bg-primary/5'}`} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <span className="font-bold text-sm tracking-tight">Mock Interview Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Visualizer */}
            <div className="flex flex-col items-center justify-center py-6 bg-secondary/10 rounded-xl mb-4 border border-border/30 relative">
              
              {/* Soundwaves / Pulse Ring */}
              <div className="relative flex items-center justify-center w-20 h-20 mb-3">
                <AnimatePresence>
                  {(listening || speaking) && (
                    <>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full ${speaking ? 'bg-success/20' : 'bg-primary/20'}`}
                      />
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.3 }}
                        animate={{ scale: [1, 2.3, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2, delay: 0.6, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full ${speaking ? 'bg-success/15' : 'bg-primary/15'}`}
                      />
                    </>
                  )}
                </AnimatePresence>

                <button
                  onClick={toggleListening}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-95 ${
                    listening
                      ? "bg-primary text-primary-foreground hover:bg-primary/95 ring-4 ring-primary/20"
                      : speaking
                      ? "bg-success text-success-foreground hover:bg-success/95 ring-4 ring-success/20 animate-pulse"
                      : "bg-secondary text-foreground hover:bg-accent border border-border/60"
                  }`}
                  title={listening ? "Click to stop listening" : "Click to start listening"}
                >
                  {listening ? (
                    <Mic className="w-6 h-6 animate-bounce" />
                  ) : speaking ? (
                    <Volume2 className="w-6 h-6" />
                  ) : (
                    <MicOff className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {listening ? "Listening..." : speaking ? "Speaking..." : "Voice Control Off"}
              </span>

              {/* Status and Error */}
              {error && (
                <span className="text-[10px] text-destructive text-center px-4 mt-2 font-medium">
                  {error}
                </span>
              )}
            </div>

            {/* Transcript Area */}
            <div className="bg-background/40 rounded-xl p-3 min-h-[64px] mb-4 border border-border/30 flex flex-col justify-center">
              {transcript ? (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                    <CornerDownRight className="w-3 h-3" /> User Spoke:
                  </p>
                  <p className="text-sm font-medium text-foreground italic">"{transcript}"</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center italic">
                  "Click the mic to speak, or try commands like 'remove settings'..."
                </p>
              )}
            </div>

            {/* Action Feedback Area */}
            {lastAction && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-2.5 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-ping shrink-0" />
                <p className="text-xs font-semibold text-success-foreground">
                  Action: <span className="font-bold">{lastAction}</span>
                </p>
              </div>
            )}

            {/* Manual controls fallback */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={showSettings ? "destructive" : "default"}
                size="sm"
                onClick={() => executeManualCommand(showSettings ? "remove" : "add")}
                className="flex-1 text-xs h-8 font-semibold"
              >
                {showSettings ? "Hide Settings Button" : "Show Settings Button"}
              </Button>
            </div>

            {/* Commands list */}
            <div>
              <button
                onClick={() => setShowCommands(!showCommands)}
                className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground/80 hover:text-foreground tracking-wider uppercase mb-2 select-none"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Supported Voice Commands
                </span>
                <span className="text-[10px]">{showCommands ? "Hide" : "Show"}</span>
              </button>

              <AnimatePresence>
                {showCommands && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden text-xs"
                  >
                    <div className="flex items-start gap-1 p-1 bg-secondary/5 border border-border/20 rounded">
                      <code className="text-primary font-mono text-[10px] shrink-0 font-bold bg-secondary px-1 py-0.5 rounded">"remove settings"</code>
                      <span className="text-muted-foreground">— Hides settings panel</span>
                    </div>
                    <div className="flex items-start gap-1 p-1 bg-secondary/5 border border-border/20 rounded">
                      <code className="text-primary font-mono text-[10px] shrink-0 font-bold bg-secondary px-1 py-0.5 rounded">"add settings"</code>
                      <span className="text-muted-foreground">— Shows settings panel</span>
                    </div>
                    <div className="flex items-start gap-1 p-1 bg-secondary/5 border border-border/20 rounded">
                      <code className="text-primary font-mono text-[10px] shrink-0 font-bold bg-secondary px-1 py-0.5 rounded">"start interview"</code>
                      <span className="text-muted-foreground">— Starts the mock session</span>
                    </div>
                    <div className="flex items-start gap-1 p-1 bg-secondary/5 border border-border/20 rounded">
                      <code className="text-primary font-mono text-[10px] shrink-0 font-bold bg-secondary px-1 py-0.5 rounded">"go to dashboard"</code>
                      <span className="text-muted-foreground">— Opens dashboard page</span>
                    </div>
                    <div className="flex items-start gap-1 p-1 bg-secondary/5 border border-border/20 rounded">
                      <code className="text-primary font-mono text-[10px] shrink-0 font-bold bg-secondary px-1 py-0.5 rounded">"go home"</code>
                      <span className="text-muted-foreground">— Navigates back home</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Mic Button (Pulsing when voice is heard or speaking) */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 transition-all duration-300 ${
          isOpen
            ? "bg-card border-primary/40 text-primary"
            : listening
            ? "bg-primary border-primary text-primary-foreground shadow-primary/30 animate-pulse ring-4 ring-primary/10"
            : speaking
            ? "bg-success border-success text-success-foreground shadow-success/30 animate-pulse ring-4 ring-success/10"
            : "bg-primary border-primary text-primary-foreground shadow-primary/20"
        }`}
        title="Open AI Voice Assistant"
      >
        <div className="relative">
          {listening ? (
            <Mic className="w-6 h-6 animate-bounce" />
          ) : speaking ? (
            <Volume2 className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
          
          {/* Notification Dot */}
          {!isOpen && !listening && !speaking && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-foreground border border-primary rounded-full animate-ping" />
          )}
        </div>
      </motion.button>
    </div>
  );
};

export default VoiceAssistant;
