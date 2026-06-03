import { useEffect, useRef, useState } from "react";

type Props = {
  onTranscript: (text: string) => void;
  onFinal?: (text: string) => void;
  enabled?: boolean;
};

const VoiceControlInterview = ({ onTranscript, onFinal, enabled = true }: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (interim) onTranscript(interim);
      if (final) {
        onTranscript(final);
        onFinal?.(final);
      }
    };

    rec.onend = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      setListening(false);
      setError(event?.error ? `Speech recognition error: ${event.error}` : "Speech recognition error");
    };
    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, [onTranscript, onFinal]);

  const start = async () => {
    if (!recognitionRef.current) return;
    try {
      setError(null);
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      setError("Could not start microphone. Check browser permissions.");
      setListening(false);
    }
  };

  const stop = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setListening(false);
  };

  if (!enabled) return null;

  return (
    <div className="mb-4 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-3 text-sm text-muted-foreground">Voice control: click Start, allow microphone access, then speak your answer.</div>
      {!supported ? (
        <div className="text-xs text-warning">Speech recognition is not supported in this browser.</div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <button type="button" onClick={start} disabled={listening} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
              Start microphone
            </button>
            <button type="button" onClick={stop} disabled={!listening} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
              Stop
            </button>
          </div>
          <div className={`text-xs ${listening ? "text-success" : "text-muted-foreground"}`}>{listening ? "Listening…" : "Idle"}</div>
          {error ? <div className="text-xs text-destructive">{error}</div> : null}
        </div>
      )}
    </div>
  );
};

export default VoiceControlInterview;
