import type { ThemeColors } from "../stores/visualStore";

export interface Theme {
  name: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    name: "Synthwave",
    colors: {
      background: [0.05, 0.0, 0.1],
      primary: [1.0, 0.2, 0.8],
      secondary: [0.2, 0.6, 1.0],
      accent: [1.0, 0.4, 0.1],
    },
  },
  {
    name: "Monochrome",
    colors: {
      background: [0.0, 0.0, 0.0],
      primary: [1.0, 1.0, 1.0],
      secondary: [0.6, 0.6, 0.6],
      accent: [0.9, 0.9, 0.9],
    },
  },
  {
    name: "Fire",
    colors: {
      background: [0.05, 0.01, 0.0],
      primary: [1.0, 0.3, 0.0],
      secondary: [1.0, 0.8, 0.0],
      accent: [1.0, 0.1, 0.1],
    },
  },
  {
    name: "Ocean",
    colors: {
      background: [0.0, 0.02, 0.08],
      primary: [0.0, 0.6, 1.0],
      secondary: [0.0, 1.0, 0.8],
      accent: [0.2, 0.3, 1.0],
    },
  },
  {
    name: "Neon",
    colors: {
      background: [0.0, 0.0, 0.02],
      primary: [0.0, 1.0, 0.4],
      secondary: [1.0, 0.0, 1.0],
      accent: [0.0, 1.0, 1.0],
    },
  },
  {
    name: "Sunset",
    colors: {
      background: [0.08, 0.02, 0.04],
      primary: [1.0, 0.5, 0.2],
      secondary: [0.9, 0.2, 0.4],
      accent: [1.0, 0.8, 0.3],
    },
  },
  {
    name: "Matrix",
    colors: {
      background: [0.0, 0.02, 0.0],
      primary: [0.0, 1.0, 0.0],
      secondary: [0.0, 0.6, 0.0],
      accent: [0.4, 1.0, 0.4],
    },
  },
  {
    name: "Aurora",
    colors: {
      background: [0.0, 0.02, 0.05],
      primary: [0.2, 1.0, 0.6],
      secondary: [0.4, 0.2, 1.0],
      accent: [0.0, 0.8, 1.0],
    },
  },
  {
    name: "Custom",
    colors: {
      background: [0.02, 0.02, 0.02],
      primary: [0.8, 0.8, 0.8],
      secondary: [0.5, 0.5, 0.5],
      accent: [1.0, 1.0, 1.0],
    },
  },
];
