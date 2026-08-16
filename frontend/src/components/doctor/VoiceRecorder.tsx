"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Square, Play, Loader2, CheckCircle2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";

export type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

interface VoiceRecorderProps {
  onTranscript: (transcript: string, language: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
  disabled?: boolean;
}

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "te", label: "Telugu (తెలుగు)" },
  { value: "ta", label: "Tamil (தமிழ்)" },
  { value: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { value: "mr", label: "Marathi (मराठी)" },
];

const EXAMPLE_PROMPTS = [
  "Patient Rahul Kumar. Prescribe Paracetamol 500mg, 10 tablets, one tablet twice daily for 5 days.",
  "Diagnosis fever and cold. Give Azithromycin 250mg, 6 tablets, one tablet after food for 3 days.",
  "Patient has hypertension. Amlodipine 5mg, 30 tablets, one tablet once daily for 30 days.",
];

export function VoiceRecorder({ onTranscript, onProcessing, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [language, setLanguage] = useState("en");
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(40).fill(4));
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setWaveformData(Array(40).fill(4));
  }, []);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const bars = Array.from({ length: 40 }, (_, i) => {
      const index = Math.floor((i / 40) * dataArray.length);
      return Math.max(4, (dataArray[index] / 255) * 48);
    });
    setWaveformData(bars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for waveform
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      setState("recording");
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      animateWaveform();
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone permissions.");
      setState("error");
    }
  };

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    stopAnimation();
    if (timerRef.current) clearInterval(timerRef.current);

    setState("processing");
    onProcessing?.(true);

    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // Wait for final chunks
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => resolve();
      } else {
        resolve();
      }
    });

    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

    try {
      // Send to backend for transcription
      const { prescriptionApi } = await import("@/lib/api");
      const res = await prescriptionApi.transcribeAudio(audioBlob, language);
      const text: string = res.data.text;

      setTranscript(text);
      setState("done");
      onTranscript(text, language);
      toast.success("Voice recorded and transcribed!");
    } catch (err) {
      setState("error");
      toast.error("Transcription failed. Please check your API key or try again.");
    } finally {
      onProcessing?.(false);
    }
  }, [language, onTranscript, onProcessing, stopAnimation]);

  const reset = () => {
    setState("idle");
    setDuration(0);
    setTranscript("");
    setWaveformData(Array(40).fill(4));
  };

  // Auto-stop at 5 minutes
  useEffect(() => {
    if (duration >= 300 && state === "recording") stopRecording();
  }, [duration, state, stopRecording]);

  useEffect(() => () => {
    stopAnimation();
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [stopAnimation]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="flex items-center gap-3">
        <Volume2 className="h-4 w-4 text-gray-400 shrink-0" />
        <Select
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={state === "recording" || state === "processing"}
          className="max-w-[200px]"
        />
        {state === "recording" && (
          <span className="text-sm font-mono text-red-500 font-medium">
            ● {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Main recorder */}
      <div className="flex flex-col items-center gap-4 py-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
        {/* Waveform */}
        <div className="flex items-end justify-center gap-0.5 h-14 px-4">
          {waveformData.map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-all duration-75",
                state === "recording"
                  ? "bg-red-500"
                  : state === "done"
                  ? "bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
              )}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Record button */}
        {state === "idle" || state === "error" ? (
          <button
            onClick={startRecording}
            disabled={disabled}
            className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center",
              "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30",
              "transition-all hover:scale-105 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-4 focus:ring-red-300"
            )}
            aria-label="Start recording"
          >
            <Mic className="h-8 w-8" />
          </button>
        ) : state === "recording" ? (
          <button
            onClick={stopRecording}
            className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center",
              "bg-red-600 text-white shadow-lg shadow-red-600/40",
              "animate-pulse-ring transition-all hover:scale-105",
              "focus:outline-none focus:ring-4 focus:ring-red-300"
            )}
            aria-label="Stop recording"
          >
            <Square className="h-7 w-7 fill-white" />
          </button>
        ) : state === "processing" ? (
          <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
          </div>
        ) : (
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        )}

        {/* Status label */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {state === "idle" && "Click the microphone to start recording"}
          {state === "recording" && "Recording... Click to stop"}
          {state === "processing" && "Transcribing audio with AI Whisper..."}
          {state === "done" && "Transcription complete!"}
          {state === "error" && "Recording failed. Try again."}
        </p>

        {state === "done" && (
          <Button variant="ghost" size="sm" onClick={reset} icon={<Mic className="h-4 w-4" />}>
            Record again
          </Button>
        )}
      </div>

      {/* Transcript display */}
      {transcript && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">
            📝 Transcript
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{transcript}</p>
        </div>
      )}

      {/* Example prompts */}
      {state === "idle" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Example phrases:</p>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <p key={i} className="text-xs text-gray-500 dark:text-gray-400 italic pl-3 border-l-2 border-gray-200 dark:border-gray-700">
              "{p}"
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
