import { useCallback, useRef, useState } from "react";

interface RecorderState {
  isRecording: boolean;
  duration: number;
  startRecording: (canvas: HTMLCanvasElement) => void;
  stopRecording: () => Promise<Blob | null>;
}

const MAX_DURATION = 60; // seconds

export function useRecorder(): RecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const startRecording = useCallback((canvas: HTMLCanvasElement) => {
    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.start(100);
    recorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(Math.floor(elapsed));

      if (elapsed >= MAX_DURATION) {
        recorder.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 200);
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current) return null;

    return new Promise((resolve) => {
      const recorder = recorderRef.current!;

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        resolve(blob);
      };

      recorder.stop();
      setIsRecording(false);
      setDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    });
  }, []);

  return { isRecording, duration, startRecording, stopRecording };
}
