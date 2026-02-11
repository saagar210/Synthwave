import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAudioStore } from "../stores/audioStore";

interface FeatureAccumulator {
  rms: number;
  centroid: number;
  flux: number;
  zcr: number;
  count: number;
}

function computeBeatRegularity(beatTimes: number[]): number {
  if (beatTimes.length < 3) return 0.5;

  const intervals: number[] = [];
  for (let i = 1; i < beatTimes.length; i++) {
    intervals.push(beatTimes[i] - beatTimes[i - 1]);
  }

  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  if (mean <= 0) return 0.5;

  const variance =
    intervals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / intervals.length;
  const stddev = Math.sqrt(variance);

  // Coefficient of variation -> normalized regularity score [0, 1]
  const cv = stddev / mean;
  const regularity = 1 - Math.min(1, cv);
  return Number.isFinite(regularity) ? regularity : 0.5;
}

export function useClassification(): void {
  const accRef = useRef<FeatureAccumulator>({ rms: 0, centroid: 0, flux: 0, zcr: 0, count: 0 });
  const beatTimesRef = useRef<number[]>([]);

  useEffect(() => {
    // Check Ollama availability on mount
    invoke<boolean>("check_ollama")
      .then((available) => useAudioStore.getState().setOllamaAvailable(available))
      .catch(() => useAudioStore.getState().setOllamaAvailable(false));

    // Subscribe to audio frames for feature accumulation
    const unsub = useAudioStore.subscribe((state) => {
      const frame = state.frame;
      if (!frame) return;
      const acc = accRef.current;
      acc.rms += frame.rms;
      acc.centroid += frame.centroid;
      acc.flux += frame.flux;
      acc.zcr += frame.zcr;
      acc.count += 1;

      if (frame.beat) {
        const beats = beatTimesRef.current;
        beats.push(frame.timestamp);
        if (beats.length > 64) {
          beats.shift();
        }
      }
    });

    // Periodic classification every 15s
    const interval = setInterval(async () => {
      const store = useAudioStore.getState();
      const acc = accRef.current;

      if (!store.ollamaAvailable || !store.isCapturing || store.isClassifying || acc.count < 300) {
        return;
      }

      const avgRms = acc.rms / acc.count;
      const avgCentroid = acc.centroid / acc.count;
      const avgFlux = acc.flux / acc.count;
      const avgZcr = acc.zcr / acc.count;
      const bpm = store.frame?.bpm ?? 0;
      const beatRegularity = computeBeatRegularity(beatTimesRef.current);

      // Reset accumulator
      acc.rms = 0;
      acc.centroid = 0;
      acc.flux = 0;
      acc.zcr = 0;
      acc.count = 0;

      store.setIsClassifying(true);

      try {
        const result = await invoke<{ genre: string; mood: string; energy: string }>(
          "classify_audio",
          { avgRms, avgCentroid, avgFlux, avgZcr, bpm, beatRegularity },
        );
        useAudioStore.getState().setClassification(result);
      } catch {
        // Don't toast every 15s — just warn
        console.warn("Classification failed");
      } finally {
        useAudioStore.getState().setIsClassifying(false);
      }
    }, 15000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);
}
