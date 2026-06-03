import { useEffect, useRef, useState } from "react";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs-backend-webgl";

type FaceCapture = {
  imageUrl: string;
  hash: string;
};

type Props = {
  enabled?: boolean;
  mode?: "enroll" | "monitor";
  selfieHash?: string | null;
  selfieImageUrl?: string | null;
  onSelfieCaptured?: (capture: FaceCapture) => void;
  onFaceDetected?: (present: boolean) => void;
  onIdentityMatchChange?: (matched: boolean) => void;
  onMismatch?: () => void;
  onEyeContactChange?: (hasEyeContact: boolean) => void;
  onVerificationCapture?: (imageUrl: string) => void;
};

type FaceBox = { x: number; y: number; width: number; height: number };

const HASH_SIZE = 8;
const MATCH_THRESHOLD = 12;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hammingDistance = (left: string, right: string) => {
  let distance = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance + Math.abs(left.length - right.length);
};

const requestCameraStream = async () => {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  }

  const legacyNavigator = navigator as Navigator & {
    getUserMedia?: typeof navigator.mediaDevices.getUserMedia;
    webkitGetUserMedia?: typeof navigator.mediaDevices.getUserMedia;
    mozGetUserMedia?: typeof navigator.mediaDevices.getUserMedia;
    msGetUserMedia?: typeof navigator.mediaDevices.getUserMedia;
  };

  const legacyGetUserMedia =
    legacyNavigator.getUserMedia ||
    legacyNavigator.webkitGetUserMedia ||
    legacyNavigator.mozGetUserMedia ||
    legacyNavigator.msGetUserMedia;

  if (!legacyGetUserMedia) {
    throw new Error("Camera is not supported in this browser.");
  }

  return new Promise<MediaStream>((resolve, reject) => {
    legacyGetUserMedia.call(navigator, { video: { facingMode: "user" }, audio: false }, resolve, reject);
  });
};

const FaceRecognition = ({
  enabled = true,
  mode = "enroll",
  selfieHash,
  selfieImageUrl,
  onSelfieCaptured,
  onFaceDetected,
  onIdentityMatchChange,
  onMismatch,
  onEyeContactChange,
  onVerificationCapture,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const detectorModeRef = useRef<"native" | "blaze" | null>(null);
  const mismatchStreakRef = useRef(0);

  const [streamActive, setStreamActive] = useState(false);
  const [facePresent, setFacePresent] = useState<boolean | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(selfieImageUrl ?? null);
  const [selfieReady, setSelfieReady] = useState(Boolean(selfieHash));
  const [identityMatched, setIdentityMatched] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasCapturedVerification, setHasCapturedVerification] = useState(false);

  useEffect(() => {
    setSelfiePreview(selfieImageUrl ?? null);
    setSelfieReady(Boolean(selfieHash));
  }, [selfieHash, selfieImageUrl]);

  useEffect(() => {
    if (enabled && mode === "monitor" && !streamActive && !starting) {
      void startCamera();
    }
  }, [enabled, mode, streamActive, starting]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      try {
        detectorRef.current?.dispose?.();
      } catch {
        // ignore
      }
      detectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode === "enroll" && streamActive && facePresent && !selfieReady && countdown === null) {
      setCountdown(3);
    } else if ((!facePresent || !streamActive || selfieReady) && countdown !== null) {
      setCountdown(null);
    }
  }, [mode, streamActive, facePresent, selfieReady]);

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleCaptureSelfie();
      setCountdown(null);
    }
  }, [countdown]);

  const stopCamera = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    try {
      detectorRef.current?.dispose?.();
    } catch {
      // ignore
    }
    detectorRef.current = null;
    detectorModeRef.current = null;
    mismatchStreakRef.current = 0;
    setStreamActive(false);
    setFacePresent(null);
    setIdentityMatched(false);
  };

  const getFaceBox = async (): Promise<FaceBox | null> => {
    const video = videoRef.current;
    if (!video || !detectorRef.current) return null;

    if (detectorModeRef.current === "native") {
      const faces = await detectorRef.current.detect(video);
      const face = faces?.[0];
      const box = face?.boundingBox;
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
    }

    const predictions = await detectorRef.current.estimateFaces(video, false);
    const prediction = predictions?.[0];
    if (!prediction) return null;

    const topLeft = prediction.topLeft as [number, number];
    const bottomRight = prediction.bottomRight as [number, number];
    return {
      x: topLeft[0],
      y: topLeft[1],
      width: bottomRight[0] - topLeft[0],
      height: bottomRight[1] - topLeft[1],
    };
  };

  const makeFaceHash = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const tiny = document.createElement("canvas");
    tiny.width = HASH_SIZE;
    tiny.height = HASH_SIZE;
    const tinyCtx = tiny.getContext("2d");
    if (!tinyCtx) return null;

    tinyCtx.drawImage(canvas, 0, 0, HASH_SIZE, HASH_SIZE);
    const pixels = tinyCtx.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data;
    const grayscale: number[] = [];
    let total = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const value = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      grayscale.push(value);
      total += value;
    }

    const average = total / grayscale.length;
    return grayscale.map((value) => (value >= average ? "1" : "0")).join("");
  };

  const captureFaceSnapshot = async (): Promise<FaceCapture | null> => {
    const video = videoRef.current;
    if (!video) return null;
    const box = await getFaceBox();
    if (!box) return null;

    const safeWidth = video.videoWidth || video.clientWidth;
    const safeHeight = video.videoHeight || video.clientHeight;
    const padding = Math.min(box.width, box.height) * 0.18;

    const x = clamp(box.x - padding, 0, safeWidth);
    const y = clamp(box.y - padding, 0, safeHeight);
    const width = clamp(box.width + padding * 2, 1, safeWidth - x);
    const height = clamp(box.height + padding * 2, 1, safeHeight - y);

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, x, y, width, height, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL("image/jpeg", 0.92);
    const hash = makeFaceHash(canvas);
    if (!hash) return null;

    return { imageUrl, hash };
  };

  const compareFace = async () => {
    const video = videoRef.current;
    if (!video || !detectorRef.current) return;

    try {
      // 1. Get predictions (estimate faces) using the loaded detector
      let prediction: any = null;
      let present = false;

      if (detectorModeRef.current === "blaze") {
        const predictions = await detectorRef.current.estimateFaces(video, false);
        prediction = predictions?.[0];
        present = Boolean(prediction);
      } else {
        // Fallback or native FaceDetector (not using landmarks, but let's check bounds)
        const faces = await detectorRef.current.detect(video);
        const face = faces?.[0];
        present = Boolean(face);
      }

      setFacePresent(present);
      onFaceDetected?.(present);

      if (present && mode === "monitor" && !hasCapturedVerification && onVerificationCapture) {
        setHasCapturedVerification(true);
        captureFaceSnapshot().then((snapshot) => {
          if (snapshot?.imageUrl) {
            onVerificationCapture(snapshot.imageUrl);
          } else {
            setHasCapturedVerification(false);
          }
        }).catch((err) => {
          console.error("Failed to capture verification snapshot:", err);
          setHasCapturedVerification(false);
        });
      }

      // 2. Eye contact & head turn checking
      let eyeContactOk = false;
      if (present && prediction && detectorModeRef.current === "blaze") {
        const landmarks = prediction.landmarks;
        if (landmarks && landmarks.length >= 3) {
          const rightEyeX = landmarks[0][0];
          const leftEyeX = landmarks[1][0];
          const noseX = landmarks[2][0];
          const eyeDist = Math.abs(leftEyeX - rightEyeX);
          if (eyeDist > 0) {
            const ratio = Math.abs(noseX - rightEyeX) / eyeDist;
            // Eye contact is ok if head is facing forward (ratio is in [0.32, 0.68])
            if (ratio >= 0.32 && ratio <= 0.68) {
              eyeContactOk = true;
            }
          }
        }
      } else if (present && detectorModeRef.current !== "blaze") {
        // Native fallback (cannot determine ratio, assume ok if present)
        eyeContactOk = true;
      }

      // Check for consecutive violations
      if (mode === "monitor" && onEyeContactChange) {
        if (!eyeContactOk) {
          mismatchStreakRef.current += 1;
          if (mismatchStreakRef.current >= 2) {
            // trigger violation callback
            onEyeContactChange(false);
            mismatchStreakRef.current = 0; // reset counter so it triggers again if they keep violating
          }
        } else {
          mismatchStreakRef.current = 0;
        }
      }

      // 3. Identity match logic (if selfieHash is provided, do the facial recognition too)
      if (selfieHash) {
        if (!present) {
          setIdentityMatched(false);
          onIdentityMatchChange?.(false);
          return;
        }

        const snapshot = await captureFaceSnapshot();
        if (!snapshot) {
          setIdentityMatched(false);
          onIdentityMatchChange?.(false);
          return;
        }

        const distance = hammingDistance(selfieHash, snapshot.hash);
        const matched = distance <= MATCH_THRESHOLD;
        setIdentityMatched(matched);
        onIdentityMatchChange?.(matched);
      }
    } catch (error) {
      console.error("Face comparison error:", error);
      setModelError("Face comparison failed during runtime.");
    }
  };

  const startCamera = async () => {
    if (!enabled || starting || streamActive) return;
    setStarting(true);
    setPermissionError(null);
    setModelError(null);

    try {
      const stream = await requestCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // ignore
        }
      }

      setStreamActive(true);

      // Force BlazeFace to guarantee landmark coordinates are available
      detectorModeRef.current = "blaze";
      detectorRef.current = await blazeface.load();

      intervalRef.current = window.setInterval(compareFace, 1000);
      await compareFace();
    } catch (error) {
      console.error("Camera permission/start error:", error);
      const err = error as Error;
      setPermissionError(
        err?.name === "NotAllowedError"
          ? "Camera permission was denied."
          : err?.message || "Could not start camera."
      );
      stopCamera();
    } finally {
      setStarting(false);
    }
  };

  const handleCaptureSelfie = async () => {
    const snapshot = await captureFaceSnapshot();
    if (!snapshot) {
      setModelError("No face detected. Put your face inside the camera before taking the selfie.");
      return;
    }

    setSelfiePreview(snapshot.imageUrl);
    setSelfieReady(true);
    onSelfieCaptured?.(snapshot);
  };

  if (!enabled) return null;

  const title = mode === "monitor" ? "Camera check" : "Selfie verification";

  return (
    <div className="mb-4 rounded-lg border border-border/60 bg-card/40 p-4">
      {mode === "monitor" && (
        <>
          <div className="mb-2 text-sm font-medium text-foreground">{title}</div>
          <div className="mb-3 text-sm text-muted-foreground">
            The interview will only continue if the same face matches your selfie.
          </div>
        </>
      )}
      <div className="flex flex-col gap-4 items-center">
        <video ref={videoRef} autoPlay muted playsInline className="h-64 w-full max-w-sm rounded-md bg-black object-cover shadow-sm border border-border/50" />
        <div className="flex-1 w-full space-y-4 text-sm text-muted-foreground flex flex-col items-center text-center">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={startCamera}
              disabled={starting || streamActive}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? "Starting camera..." : streamActive ? "Camera started" : "Start camera"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={!streamActive}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop
            </button>
            {mode === "enroll" && !selfieReady ? (
              <button
                type="button"
                onClick={handleCaptureSelfie}
                disabled={!streamActive || !facePresent || countdown !== null}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm min-w-[120px]"
              >
                {countdown !== null ? `Capturing in ${countdown}...` : "Take selfie"}
              </button>
            ) : null}
          </div>

          {countdown !== null && countdown > 0 && (
            <div className="text-lg font-bold text-primary animate-pulse">
              Look at the camera! Auto-capturing in {countdown}...
            </div>
          )}

          {streamActive ? (
            facePresent === null ? (
              <div>{modelError ? modelError : "Camera active. Waiting for face detection..."}</div>
            ) : facePresent ? (
              <div className="text-success">Face detected</div>
            ) : (
              <div className="text-destructive">No face detected</div>
            )
          ) : (
            <div className="text-xs text-muted-foreground">Camera is off until you click Start.</div>
          )}

          {mode === "monitor" && selfieHash ? (
            <div className={identityMatched ? "text-success" : "text-warning"}>
              {identityMatched ? "Identity matches your selfie" : "Checking identity against your selfie..."}
            </div>
          ) : null}

          {selfieReady && selfiePreview ? (
            <div className="space-y-2 mt-2 flex flex-col items-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Selfie captured</div>
              <img src={selfiePreview} alt="Captured selfie" className="h-32 w-32 rounded-md border-2 border-primary/20 object-cover shadow-sm" />
            </div>
          ) : null}

          {permissionError ? <div className="text-xs text-destructive">{permissionError}</div> : null}
          {modelError ? <div className="text-xs text-destructive">{modelError}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
