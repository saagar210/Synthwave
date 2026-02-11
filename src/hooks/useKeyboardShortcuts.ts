import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useVisualStore, MODES } from "../stores/visualStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAudioStore } from "../stores/audioStore";
import { useToastStore } from "../stores/toastStore";
import { takeScreenshot } from "../utils/screenshot";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const state = useVisualStore.getState();
      const metaKey = e.metaKey || e.ctrlKey;

      // Cmd+Shift+S: Screenshot
      if (metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        takeScreenshot();
        return;
      }

      // Cmd+R: Toggle recording
      if (metaKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("synthwave:toggle-record"));
        return;
      }

      // 1-7: Mode selection
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 7) {
        state.setMode(MODES[num - 1]);
        useSettingsStore.getState().setLastMode(MODES[num - 1]);
        return;
      }

      switch (e.key.toLowerCase()) {
        case "t":
          state.cycleTheme();
          useSettingsStore.getState().setLastThemeIndex(
            (state.themeIndex + 1) % 9,
          );
          break;
        case "f":
          try {
            const win = getCurrentWindow();
            const isFullscreen = await win.isFullscreen();
            await win.setFullscreen(!isFullscreen);
          } catch {
            // ignore if Tauri API unavailable
          }
          break;
        case "i":
          state.toggleOverlay();
          break;
        case "h":
          state.toggleControls();
          break;
        case "s":
          if (!metaKey && !e.shiftKey) {
            state.toggleSettings();
          }
          break;
        case " ": {
          e.preventDefault();
          const audio = useAudioStore.getState();
          if (audio.isCapturing) {
            if (audio.source === "file") {
              try {
                const paused = await invoke<boolean>("toggle_pause");
                useAudioStore.getState().setPaused(paused);
                useToastStore
                  .getState()
                  .addToast("info", paused ? "Playback paused" : "Playback resumed");
              } catch {
                if (audio.stopCaptureFn) {
                  audio.stopCaptureFn();
                }
              }
            } else if (audio.stopCaptureFn) {
              audio.stopCaptureFn();
            }
          } else if (!audio.isCapturing && audio.startCaptureFn) {
            audio.startCaptureFn();
          }
          break;
        }
        case "=":
        case "+": {
          const settings = useSettingsStore.getState();
          const newVal = Math.min(2.0, settings.sensitivity + 0.1);
          settings.setSensitivity(newVal);
          useToastStore.getState().addToast("info", `Sensitivity: ${newVal.toFixed(1)}`);
          break;
        }
        case "-": {
          const settings = useSettingsStore.getState();
          const newVal = Math.max(0.5, settings.sensitivity - 0.1);
          settings.setSensitivity(newVal);
          useToastStore.getState().addToast("info", `Sensitivity: ${newVal.toFixed(1)}`);
          break;
        }
        case "escape": {
          try {
            const win = getCurrentWindow();
            await win.setFullscreen(false);
          } catch {
            // ignore
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
