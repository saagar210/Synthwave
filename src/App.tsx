import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Visualizer } from "./components/Visualizer";
import { Controls } from "./components/Controls";
import { InfoOverlay } from "./components/InfoOverlay";
import { ToastContainer } from "./components/ToastContainer";
import { WelcomeModal } from "./components/WelcomeModal";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useClassification } from "./hooks/useClassification";
import { useFileDrop } from "./hooks/useFileDrop";
import { useSettingsStore } from "./stores/settingsStore";
import { useVisualStore } from "./stores/visualStore";
import type { AppSettings } from "./types/settings";

function App() {
  useKeyboardShortcuts();
  useClassification();
  useFileDrop();
  const showSettings = useVisualStore((s) => s.showSettings);
  const toggleSettings = useVisualStore((s) => s.toggleSettings);

  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const settings = await invoke<AppSettings>("load_settings");
        const store = useSettingsStore.getState();
        store.applyFromBackend(settings);

        const visualState = useVisualStore.getState();
        if (settings.lastMode) {
          visualState.setMode(settings.lastMode as ReturnType<typeof useVisualStore.getState>["mode"]);
        }
        if (typeof settings.lastThemeIndex === "number") {
          visualState.setThemeIndex(settings.lastThemeIndex);
        }

        if (!settings.hasSeenWelcome) {
          setShowWelcome(true);
        }
      } catch {
        // Use defaults on load failure
      }
      useSettingsStore.getState().setLoaded(true);
    };
    init();
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    useSettingsStore.getState().setHasSeenWelcome(true);
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <Visualizer />
      <InfoOverlay />
      <Controls />
      <ToastContainer />
      <SettingsDrawer open={showSettings} onClose={toggleSettings} />
      {showWelcome && <WelcomeModal onDismiss={dismissWelcome} />}
    </div>
  );
}

export default App;
