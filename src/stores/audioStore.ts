import { create } from "zustand";
import type { AudioDevice, AudioFrame } from "../types/audio";

interface Classification {
  genre: string;
  mood: string;
  energy: string;
}

interface AudioState {
  frame: AudioFrame | null;
  spectrumData: Float32Array | null;
  waveformData: Float32Array | null;
  smoothedSpectrum: Float32Array | null;
  devices: AudioDevice[];
  isCapturing: boolean;
  beatIntensity: number;
  classification: Classification | null;
  ollamaAvailable: boolean;
  isClassifying: boolean;
  startCaptureFn: (() => void) | null;
  stopCaptureFn: (() => void) | null;
  setFrame: (frame: AudioFrame) => void;
  setDevices: (devices: AudioDevice[]) => void;
  setCapturing: (capturing: boolean) => void;
  decayBeat: () => void;
  setClassification: (c: Classification | null) => void;
  setOllamaAvailable: (available: boolean) => void;
  setIsClassifying: (classifying: boolean) => void;
  setCaptureFns: (start: (() => void) | null, stop: (() => void) | null) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  frame: null,
  spectrumData: null,
  waveformData: null,
  smoothedSpectrum: null,
  devices: [],
  isCapturing: false,
  beatIntensity: 0,
  classification: null,
  ollamaAvailable: false,
  isClassifying: false,
  startCaptureFn: null,
  stopCaptureFn: null,

  setFrame: (frame: AudioFrame) => {
    set((state) => {
      const spectrum = new Float32Array(frame.spectrum);

      // Temporal smoothing (alpha=0.3: 30% new, 70% old)
      let smoothed: Float32Array;
      if (state.smoothedSpectrum && state.smoothedSpectrum.length === spectrum.length) {
        smoothed = state.smoothedSpectrum;
        for (let i = 0; i < spectrum.length; i++) {
          smoothed[i] = smoothed[i] * 0.7 + spectrum[i] * 0.3;
        }
      } else {
        smoothed = new Float32Array(spectrum);
      }

      return {
        frame,
        spectrumData: smoothed,
        waveformData: new Float32Array(frame.waveform),
        smoothedSpectrum: smoothed,
        beatIntensity: frame.beat ? 1.0 : state.beatIntensity,
      };
    });
  },

  setDevices: (devices: AudioDevice[]) => set({ devices }),
  setCapturing: (isCapturing: boolean) => set({ isCapturing }),

  decayBeat: () =>
    set((state) => ({
      beatIntensity: state.beatIntensity * 0.92,
    })),

  setClassification: (classification) => set({ classification }),
  setOllamaAvailable: (ollamaAvailable) => set({ ollamaAvailable }),
  setIsClassifying: (isClassifying) => set({ isClassifying }),
  setCaptureFns: (startCaptureFn, stopCaptureFn) =>
    set({ startCaptureFn, stopCaptureFn }),
}));
