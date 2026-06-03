import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Settings2,
  CornerDownRight,
  HelpCircle,
  Check,
  Languages,
  Maximize2,
  MessageSquarePlus,
  Sliders,
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type VoiceInterviewAssistantProps = {
  questionText: string;
  answer: string;
  onAnswerChange: (value: string) => void;
  enabled: boolean;
  autoSpeak: boolean;
  setAutoSpeak: (val: boolean) => void;
  autoListen: boolean;
  setAutoListen: (val: boolean) => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
};

const VoiceInterviewAssistant = ({
  questionText,
  answer,
  onAnswerChange,
  enabled,
  autoSpeak,
  setAutoSpeak,
  autoListen,
  setAutoListen,
  isMuted,
  setIsMuted,
}: VoiceInterviewAssistantProps) => {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Voice configurations
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [speechPitch, setSpeechPitch] = useState<number>(1);

  // Speech Recognition ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);

  // Initialize Speech Synthesis Voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Filter for english voices mainly, but keep all
      const englishOrSupported = allVoices.filter(v => v.lang.startsWith("en-"));
      setVoices(englishOrSupported.length > 0 ? englishOrSupported : allVoices);
      
      // Select default natural voice if possible
      const defaultVoice =
        allVoices.find(v => v.lang.startsWith("en-US") && v.name.includes("Natural")) ||
        allVoices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) ||
        allVoices.find(v => v.lang.startsWith("en-US")) ||
        allVoices[0];
      
      if (defaultVoice && !selectedVoiceName) {
        setSelectedVoiceName(defaultVoice.name);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [selectedVoiceName]);

  // Load configuration from local storage
  useEffect(() => {
    const savedVoice = localStorage.getItem("onee_voice_name");
    const savedRate = localStorage.getItem("onee_voice_rate");
    const savedPitch = localStorage.getItem("onee_voice_pitch");

    if (savedVoice) setSelectedVoiceName(savedVoice);
    if (savedRate) setSpeechRate(parseFloat(savedRate));
    if (savedPitch) setSpeechPitch(parseFloat(savedPitch));
  }, []);

  // Save configurations on change
  const handleVoiceChange = (name: string) => {
    setSelectedVoiceName(name);
    localStorage.setItem("onee_voice_name", name);
    // Restart speak if currently speaking
    if (speaking) {
      speak(questionText);
    }
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem("onee_voice_rate", rate.toString());
  };

  const handlePitchChange = (pitch: number) => {
    setSpeechPitch(pitch);
    localStorage.setItem("onee_voice_pitch", pitch.toString());
  };

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
        setTranscript("");
        // Append spoken text to the answer
        onAnswerChange((prev: string) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${final.trim()}` : final.trim();
        });
      }
    };

    rec.onend = () => {
      setListening(false);
      stopAudioAnalysis();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        setError(`Microphone error: ${event.error}`);
        setListening(false);
        stopAudioAnalysis();
      }
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      stopAudioAnalysis();
    };
  }, [onAnswerChange]);

  // Audio analyzer to get microphone volume for waveform animation
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      microphoneRef.current = source;
      audioContextRef.current = audioContext;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize volume to a 0-1 scale
        setMicVolume(Math.min(1, average / 80));
        
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
    } catch (e) {
      console.warn("Could not start audio volume analysis for visualizer", e);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (microphoneRef.current) {
      try {
        microphoneRef.current.disconnect();
      } catch {}
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicVolume(0);
  };

  // Speak function
  const speak = (text: string) => {
    if (!window.speechSynthesis || isMuted) return;
    try {
      window.speechSynthesis.cancel();
      setListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {}

      const cleanText = text.replace(/[*_#`[\]()]/g, ""); // Clean markdown characters
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;

      // Apply configuration
      const allVoices = window.speechSynthesis.getVoices();
      const voice = allVoices.find(v => v.name === selectedVoiceName) || allVoices[0];
      if (voice) utterance.voice = voice;
      
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;

      utterance.onstart = () => {
        setSpeaking(true);
        setSpeechPaused(false);
      };

      utterance.onend = () => {
        setSpeaking(false);
        setSpeechPaused(false);
        // Auto-listen logic
        if (autoListen && recognitionRef.current) {
          startListening();
        }
      };

      utterance.onerror = (e) => {
        // Only trigger error if not cancelled
        if (e.error !== "interrupted") {
          console.error("Speech synthesis error", e);
          setSpeaking(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed", e);
      setSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpeechPaused(false);
  };

  const pauseSpeaking = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setSpeechPaused(true);
  };

  const resumeSpeaking = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.resume();
    setSpeechPaused(false);
  };

  // Automatically speak when questionText changes
  useEffect(() => {
    if (enabled && autoSpeak && questionText && !isMuted) {
      const timer = setTimeout(() => {
        speak(questionText);
      }, 600); // Short delay to await page transitions
      return () => {
        clearTimeout(timer);
        stopSpeaking();
      };
    }
    return () => stopSpeaking();
  }, [questionText, enabled, autoSpeak, isMuted]);

  // Speech Recognition Start/Stop
  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      stopSpeaking();
      setError(null);
      recognitionRef.current.start();
      setListening(true);
      startAudioAnalysis();
    } catch (e) {
      setError("Microphone permission denied or in use.");
      setListening(false);
      stopAudioAnalysis();
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
    stopAudioAnalysis();
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!enabled) return null;

  return (
    <div className="glass-card overflow-hidden p-6 border-primary/20 backdrop-blur-xl relative">
      {/* Dynamic Background Aura */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-500 pointer-events-none ${
          speaking
            ? "bg-emerald-500/15"
            : listening
            ? "bg-purple-500/20"
            : "bg-primary/5"
        }`}
      />

      <div className="flex flex-col md:flex-row items-center gap-6 justify-between relative z-10">
        
        {/* Visualizer & Pulse Orb Left Column */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
          <div className="relative flex items-center justify-center w-36 h-36">
            
            {/* Speaking concentric rings (Green Theme) */}
            <AnimatePresence>
              {speaking && (
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-emerald-500/10"
                  />
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.3 }}
                    animate={{ scale: [1, 2.1, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: 0.6, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-emerald-400/5"
                  />
                </>
              )}
            </AnimatePresence>

            {/* Listening concentric rings (Purple/Pink Theme based on micro volume) */}
            <AnimatePresence>
              {listening && (
                <>
                  <motion.div
                    animate={{
                      scale: [1, 1.4 + micVolume * 0.8, 1],
                      opacity: [0.6, 0.1, 0.6],
                    }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-purple-500/20"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.8 + micVolume * 1.2, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-pink-500/15"
                  />
                </>
              )}
            </AnimatePresence>

            {/* The Main Interactive Morphing Orb */}
            <motion.button
              onClick={toggleListening}
              animate={
                speaking
                  ? {
                      scale: [1, 1.06, 1],
                      borderRadius: [
                        "42% 58% 70% 30% / 45% 45% 55% 55%",
                        "70% 30% 52% 48% / 60% 40% 60% 40%",
                        "42% 58% 70% 30% / 45% 45% 55% 55%"
                      ]
                    }
                  : listening
                  ? {
                      scale: [1, 1.05 + micVolume * 0.15, 1],
                      borderRadius: [
                        "50% 50% 50% 50%",
                        "45% 55% 45% 55%",
                        "50% 50% 50% 50%"
                      ]
                    }
                  : {
                      scale: [1, 1.02, 1],
                      borderRadius: [
                        "50% 50% 50% 50%",
                        "52% 48% 50% 50%",
                        "50% 50% 50% 50%"
                      ]
                    }
              }
              transition={{
                repeat: Infinity,
                duration: speaking ? 3.5 : listening ? 1.5 : 5,
                ease: "easeInOut",
              }}
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl border transition-all duration-300 transform active:scale-95 z-20 ${
                speaking
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400/40 text-white shadow-emerald-500/20"
                  : listening
                  ? "bg-gradient-to-tr from-purple-600 to-pink-500 border-purple-400/40 text-white shadow-purple-500/30"
                  : "bg-gradient-to-tr from-slate-800 to-slate-700 border-slate-650 text-slate-300 hover:text-white"
              }`}
              title={listening ? "Microphone active. Click to mute." : "Click to speak your answer."}
            >
              {speaking ? (
                <Volume2 className="w-8 h-8 animate-pulse" />
              ) : listening ? (
                <Mic className="w-8 h-8 animate-bounce" />
              ) : (
                <MicOff className="w-8 h-8 text-muted-foreground" />
              )}
            </motion.button>
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-3">
            {speaking ? "Onee Speaking..." : listening ? "Listening Answer..." : "Onee Idle"}
          </span>
        </div>

        {/* Text Details & Controls Column */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Onee Omni Voice Assistant</h3>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Play / Replay Question Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border/60 hover:bg-accent"
                onClick={() => {
                  if (speaking) {
                    stopSpeaking();
                  } else {
                    speak(questionText);
                  }
                }}
                title={speaking ? "Pause Speaking" : "Play/Replay Question"}
              >
                {speaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>

              {/* Reset / Stop speech button */}
              {speaking && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border/60 hover:bg-accent text-destructive"
                  onClick={stopSpeaking}
                  title="Stop AI voice"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* Mute/Unmute AI voice */}
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 rounded-full border-border/60 ${isMuted ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" : "hover:bg-accent"}`}
                onClick={() => {
                  const newVal = !isMuted;
                  setIsMuted(newVal);
                  if (newVal) {
                    stopSpeaking();
                  } else {
                    // Small delay, read current question
                    setTimeout(() => speak(questionText), 200);
                  }
                }}
                title={isMuted ? "Unmute AI voice" : "Mute AI voice"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </Button>

              {/* Toggle configuration panel */}
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 rounded-full border-border/60 ${showConfig ? "bg-primary/10 text-primary border-primary/20" : "hover:bg-accent"}`}
                onClick={() => setShowConfig(!showConfig)}
                title="Voice settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Voice configuration panel (Collapsible) */}
          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-background/40 border border-border/30 rounded-xl p-4 space-y-4 overflow-hidden text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Select Voice */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                      <Languages className="w-3 h-3" /> Assistant Voice
                    </Label>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      className="w-full bg-card border border-border/65 rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                      {voices.length === 0 && <option>Default Browser Voice</option>}
                    </select>
                  </div>

                  {/* Auto mic/speak configuration toggles */}
                  <div className="flex flex-col justify-center gap-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-read-toggle" className="text-[11px] font-bold text-muted-foreground">Auto-read questions</Label>
                      <Switch
                        id="auto-read-toggle"
                        checked={autoSpeak}
                        onCheckedChange={setAutoSpeak}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-mic-toggle" className="text-[11px] font-bold text-muted-foreground">Auto-mic (Listen when AI finishes)</Label>
                      <Switch
                        id="auto-mic-toggle"
                        checked={autoListen}
                        onCheckedChange={setAutoListen}
                      />
                    </div>
                  </div>

                </div>

                {/* Sliders for Pitch and Speed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/20">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                      <span>Speech Speed: {speechRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                      <span>Speech Pitch: {speechPitch}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={speechPitch}
                      onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real-time speech transcript feedback */}
          <div className="bg-background/20 rounded-xl p-3 min-h-[64px] border border-border/30 flex flex-col justify-center">
            {transcript ? (
              <div>
                <p className="text-[9px] uppercase font-bold text-purple-400 tracking-wider mb-1 flex items-center gap-1">
                  <CornerDownRight className="w-2.5 h-2.5" /> Speaking transcript:
                </p>
                <p className="text-xs font-medium text-foreground italic">"{transcript}"</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center text-muted-foreground">
                <Type className="w-3.5 h-3.5 shrink-0" />
                <p className="text-xs italic text-center">
                  {listening
                    ? "Start speaking your answer... It will be added automatically"
                    : "Speak your answer (Click orb), or Type below..."}
                </p>
              </div>
            )}
          </div>

          {/* Error notice */}
          {error && (
            <div className="text-[10px] text-destructive bg-destructive/5 border border-destructive/10 rounded-lg p-2 font-medium">
              {error}
            </div>
          )}

          {!supported && (
            <div className="text-[10px] text-warning bg-warning/5 border border-warning/10 rounded-lg p-2 font-medium">
              Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceInterviewAssistant;
