import { useEffect } from "react";
import { useVisualStore, MODES } from "../stores/visualStore";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const state = useVisualStore.getState();

      // 1-7: Mode selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 7) {
        state.setMode(MODES[num - 1]);
        return;
      }

      switch (e.key.toLowerCase()) {
        case "t":
          state.cycleTheme();
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
