import { create } from "zustand";
import type { AudioDevice, AudioFrame } from "../types/audio";

interface AudioState {
  frame: AudioFrame | null;
  spectrumData: Float32Array | null;
  waveformData: Float32Array | null;
  devices: AudioDevice[];
  isCapturing: boolean;
  beatIntensity: number;
  setFrame: (frame: AudioFrame) => void;
  setDevices: (devices: AudioDevice[]) => void;
  setCapturing: (capturing: boolean) => void;
  decayBeat: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  frame: null,
  spectrumData: null,
  waveformData: null,
  devices: [],
  isCapturing: false,
  beatIntensity: 0,

  setFrame: (frame: AudioFrame) => {
    set({
      frame,
      spectrumData: new Float32Array(frame.spectrum),
      waveformData: new Float32Array(frame.waveform),
      beatIntensity: frame.beat ? 1.0 : undefined,
    });
  },

  setDevices: (devices: AudioDevice[]) => set({ devices }),
  setCapturing: (isCapturing: boolean) => set({ isCapturing }),

  decayBeat: () =>
    set((state) => ({
      beatIntensity: state.beatIntensity * 0.92,
    })),
}));
