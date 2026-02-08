import { create } from "zustand";
import { THEMES } from "../themes";

export type VisualizationMode =
  | "waveform"
  | "bars"
  | "circular"
  | "particles"
  | "terrain"
  | "nebula"
  | "starfield";

export const MODES: VisualizationMode[] = [
  "waveform",
  "bars",
  "circular",
  "particles",
  "terrain",
  "nebula",
  "starfield",
];

export interface ThemeColors {
  background: [number, number, number];
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

interface VisualState {
  mode: VisualizationMode;
  themeIndex: number;
  showControls: boolean;
  showOverlay: boolean;
  showSettings: boolean;
  fps: number;
  setMode: (mode: VisualizationMode) => void;
  setThemeIndex: (index: number) => void;
  cycleTheme: () => void;
  toggleControls: () => void;
  toggleOverlay: () => void;
  toggleSettings: () => void;
  setFps: (fps: number) => void;
}

export const useVisualStore = create<VisualState>((set) => ({
  mode: "waveform",
  themeIndex: 0,
  showControls: true,
  showOverlay: true,
  showSettings: false,
  fps: 0,

  setMode: (mode) => set({ mode }),
  setThemeIndex: (themeIndex) => set({ themeIndex }),
  cycleTheme: () =>
    set((state) => ({ themeIndex: (state.themeIndex + 1) % THEMES.length })),
  toggleControls: () =>
    set((state) => ({ showControls: !state.showControls })),
  toggleOverlay: () =>
    set((state) => ({ showOverlay: !state.showOverlay })),
  toggleSettings: () =>
    set((state) => ({ showSettings: !state.showSettings })),
  setFps: (fps) => set({ fps }),
}));
