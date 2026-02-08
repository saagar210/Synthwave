import { create } from "zustand";
import type { VisualizationMode } from "./visualStore";

interface Settings {
  lastMode: VisualizationMode;
  lastThemeIndex: number;
  lastDeviceName: string | null;
  sensitivity: number;
  fftSize: number;
  targetFps: number;
  setLastMode: (mode: VisualizationMode) => void;
  setLastThemeIndex: (index: number) => void;
  setLastDeviceName: (name: string | null) => void;
  setSensitivity: (sensitivity: number) => void;
  setFftSize: (fftSize: number) => void;
  setTargetFps: (fps: number) => void;
}

export const useSettingsStore = create<Settings>((set) => ({
  lastMode: "waveform",
  lastThemeIndex: 0,
  lastDeviceName: null,
  sensitivity: 1.0,
  fftSize: 2048,
  targetFps: 60,

  setLastMode: (lastMode) => set({ lastMode }),
  setLastThemeIndex: (lastThemeIndex) => set({ lastThemeIndex }),
  setLastDeviceName: (lastDeviceName) => set({ lastDeviceName }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setFftSize: (fftSize) => set({ fftSize }),
  setTargetFps: (targetFps) => set({ targetFps }),
}));
