import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { VisualizationMode } from "./visualStore";
import type { AppSettings } from "../types/settings";

interface Settings {
  loaded: boolean;
  lastMode: VisualizationMode;
  lastThemeIndex: number;
  lastDeviceName: string | null;
  sensitivity: number;
  fftSize: number;
  targetFps: number;
  hasSeenWelcome: boolean;
  setLoaded: (loaded: boolean) => void;
  setLastMode: (mode: VisualizationMode) => void;
  setLastThemeIndex: (index: number) => void;
  setLastDeviceName: (name: string | null) => void;
  setSensitivity: (sensitivity: number) => void;
  setFftSize: (fftSize: number) => void;
  setTargetFps: (fps: number) => void;
  setHasSeenWelcome: (seen: boolean) => void;
  applyFromBackend: (settings: AppSettings) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = useSettingsStore.getState();
    const config: AppSettings = {
      lastMode: s.lastMode,
      lastThemeIndex: s.lastThemeIndex,
      lastDeviceName: s.lastDeviceName,
      sensitivity: s.sensitivity,
      fftSize: s.fftSize,
      targetFps: s.targetFps,
      hasSeenWelcome: s.hasSeenWelcome,
    };
    invoke("save_settings", { config }).catch(console.error);
  }, 500);
}

export const useSettingsStore = create<Settings>((set) => ({
  loaded: false,
  lastMode: "waveform",
  lastThemeIndex: 0,
  lastDeviceName: null,
  sensitivity: 1.0,
  fftSize: 2048,
  targetFps: 60,
  hasSeenWelcome: false,

  setLoaded: (loaded) => set({ loaded }),

  setLastMode: (lastMode) => {
    set({ lastMode });
    debouncedSave();
  },
  setLastThemeIndex: (lastThemeIndex) => {
    set({ lastThemeIndex });
    debouncedSave();
  },
  setLastDeviceName: (lastDeviceName) => {
    set({ lastDeviceName });
    debouncedSave();
  },
  setSensitivity: (sensitivity) => {
    set({ sensitivity: Math.round(sensitivity * 10) / 10 });
    debouncedSave();
  },
  setFftSize: (fftSize) => {
    set({ fftSize });
    debouncedSave();
  },
  setTargetFps: (targetFps) => {
    set({ targetFps });
    debouncedSave();
  },
  setHasSeenWelcome: (hasSeenWelcome) => {
    set({ hasSeenWelcome });
    debouncedSave();
  },

  applyFromBackend: (settings) => {
    set({
      lastMode: (settings.lastMode as VisualizationMode) || "waveform",
      lastThemeIndex: settings.lastThemeIndex ?? 0,
      lastDeviceName: settings.lastDeviceName ?? null,
      sensitivity: settings.sensitivity ?? 1.0,
      fftSize: settings.fftSize ?? 2048,
      targetFps: settings.targetFps ?? 60,
      hasSeenWelcome: settings.hasSeenWelcome ?? false,
    });
  },
}));
