// Microphone recording: asks for permission, records, counts the time and stops at a maximum.
// It also measures the sound level live, so the screen can show a level bar and warn when the
// microphone barely hears the physio (a quiet phone, or held too far away).
// Components just call start() / stop() and get the audio in onRecorded.
import { useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording";

export const MAX_RECORDING_SECONDS = 180;

// Ask the browser to clean up the sound before we get it. Every Chrome on Android has these; a phone
// that doesn't simply ignores them.
const AUDIO_CONSTRAINTS: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };

// Opus at 64 kbps keeps speech clear; browsers often default to lower. Falls back to the browser's choice.
function recorderOptions(): MediaRecorderOptions {
  const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported?.(type));
  return { audioBitsPerSecond: 64_000, ...(mimeType && { mimeType }) };
}

// Loudness in decibels mapped to 0–1: -60 dB (a silent room) → 0, -10 dB (shouting close up) → 1.
// A decibel scale follows how loud things sound, so normal speech into a weak phone or laptop mic
// still moves the bar clearly (a plain linear scale left it at a few percent).
const toLevel = (rms: number) => Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-9) + 60) / 50));
const SPEECH_LEVEL = 0.3; // ≈ -45 dB; below this for a while = "I can't hear you"
const QUIET_SECONDS = 3;

// Created at the moment of the click: browsers (Safari especially) keep audio paused unless it
// starts directly from a tap, and the microphone permission step in between can be too late.
function createAudioContext(): AudioContext | null {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null; // very old browser: no level bar, recording still works
  const context = new AudioCtx();
  void context.resume();
  return context;
}

export function useRecorder(onRecorded: (audio: Blob, seconds: number) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0); // 0–1, for the level bar
  const [tooQuiet, setTooQuiet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopMeterRef = useRef<() => void>(() => {});

  // Always call the latest callback, without restarting anything when it changes.
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });

  // Live level from the microphone stream. Returns a function that stops it.
  function startMeter(context: AudioContext | null, stream: MediaStream, started: number): () => void {
    if (!context) return () => {};
    void context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let lastHeard = started;
    let frame = 0;
    let shown = 0;

    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
      const value = toLevel(rms);
      const now = Date.now();
      // Only judge "too quiet" while the audio is really being measured: a paused meter reads
      // silence, and must never tell someone who is talking that we can't hear them.
      const measuring = context.state === "running";
      if (value >= SPEECH_LEVEL || !measuring) lastHeard = now;
      if (Math.abs(value - shown) > 0.02) {
        shown = value;
        setLevel(value);
      }
      setTooQuiet(measuring && now - lastHeard > QUIET_SECONDS * 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      void context.close();
      setLevel(0);
      setTooQuiet(false);
    };
  }

  async function start() {
    setError(null);
    const context = createAudioContext(); // now, still inside the click (see createAudioContext)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
    } catch {
      void context?.close();
      setError("Δεν δόθηκε πρόσβαση στο μικρόφωνο. Επιτρέψτε την από τη γραμμή διευθύνσεων του browser και δοκιμάστε ξανά.");
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, recorderOptions());
    } catch {
      recorder = new MediaRecorder(stream); // the browser refused our settings: use its defaults
    }
    const chunks: Blob[] = [];
    const started = Date.now();
    stopMeterRef.current = startMeter(context, stream, started);
    const timer = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) recorder.stop();
    }, 250);

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      clearInterval(timer);
      stopMeterRef.current();
      stream.getTracks().forEach((track) => track.stop()); // turns off the browser's mic indicator
      recorderRef.current = null;
      setState("idle");
      setElapsed(0);
      onRecordedRef.current(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }), (Date.now() - started) / 1000);
    };

    recorder.start();
    recorderRef.current = recorder;
    setState("recording");
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  // Leaving the page mid-recording releases the microphone.
  useEffect(
    () => () => {
      stopMeterRef.current();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return { state, elapsed, level, tooQuiet, error, start, stop };
}
