import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import { useVisualStore } from "../stores/visualStore";

export function resetAppStores() {
  useSettingsStore.setState(
    {
      loaded: false,
      lastMode: "waveform",
      lastThemeIndex: 0,
      lastDeviceName: null,
      sensitivity: 1.0,
      fftSize: 2048,
      targetFps: 60,
      hasSeenWelcome: false,
    },
    false,
  );

  useVisualStore.setState(
    {
      mode: "waveform",
      themeIndex: 0,
      showControls: true,
      showOverlay: true,
      showSettings: false,
      fps: 0,
    },
    false,
  );

  useAudioStore.setState(
    {
      frame: null,
      spectrumData: null,
      waveformData: null,
      smoothedSpectrum: null,
      devices: [],
      isCapturing: false,
      isPaused: false,
      source: null,
      beatIntensity: 0,
      classification: null,
      ollamaAvailable: false,
      ollamaChecked: false,
      isClassifying: false,
      startCaptureFn: null,
      stopCaptureFn: null,
    },
    false,
  );

  useToastStore.setState(
    {
      toasts: [],
      lastToast: null,
    },
    false,
  );
}
