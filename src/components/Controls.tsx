import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAudioStream } from "../hooks/useAudioStream";
import { useRecorder } from "../hooks/useRecorder";
import { useAudioStore } from "../stores/audioStore";
import { useVisualStore, MODES } from "../stores/visualStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import { getCanvasRef } from "../stores/canvasRefStore";
import { THEMES } from "../themes";

export function Controls() {
  const { startCapture, stopCapture, isCapturing } = useAudioStream();
  const { isRecording, duration, startRecording, stopRecording } =
    useRecorder();
  const devices = useAudioStore((s) => s.devices);
  const source = useAudioStore((s) => s.source);
  const isPaused = useAudioStore((s) => s.isPaused);
  const lastDeviceName = useSettingsStore((s) => s.lastDeviceName);
  const mode = useVisualStore((s) => s.mode);
  const themeIndex = useVisualStore((s) => s.themeIndex);
  const showControls = useVisualStore((s) => s.showControls);
  const setMode = useVisualStore((s) => s.setMode);
  const setThemeIndex = useVisualStore((s) => s.setThemeIndex);
  const toggleSettings = useVisualStore((s) => s.toggleSettings);

  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const saveRecording = (blob: Blob, fromAutoStop: boolean = false) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `synthwave-${Date.now()}.webm`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    useToastStore
      .getState()
      .addToast(
        "success",
        fromAutoStop
          ? "Recording saved (60s limit reached)"
          : "Recording saved",
      );
  };

  const loadDevices = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (mountedRef.current) {
        setIsRefreshingDevices(true);
      }

      try {
        const loadedDevices =
          await invoke<
            { name: string; isDefault: boolean; isInput: boolean }[]
          >("list_audio_devices");
        if (!mountedRef.current) return;

        useAudioStore.getState().setDevices(loadedDevices);

        const storedDevice = useSettingsStore.getState().lastDeviceName;
        let removedStoredDevice = false;

        if (storedDevice) {
          const stillAvailable = loadedDevices.some(
            (d) => d.name === storedDevice,
          );
          if (!stillAvailable) {
            useSettingsStore.getState().setLastDeviceName(null);
            removedStoredDevice = true;
          }
        }

        if (!silent) {
          if (removedStoredDevice) {
            useToastStore
              .getState()
              .addToast(
                "warning",
                "Saved audio device is unavailable. Using the default input.",
              );
          } else {
            useToastStore
              .getState()
              .addToast(
                loadedDevices.length > 0 ? "success" : "warning",
                loadedDevices.length > 0
                  ? "Audio devices refreshed"
                  : "No audio input devices found",
              );
          }
        }
      } catch (err) {
        if (!silent) {
          useToastStore
            .getState()
            .addToast(
              "warning",
              `Unable to load audio devices: ${String(err)}`,
            );
        }
      } finally {
        if (mountedRef.current) {
          setIsRefreshingDevices(false);
        }
      }
    },
    [],
  );

  // Load audio devices for selector
  useEffect(() => {
    mountedRef.current = true;

    const handleFocus = () => {
      if (document.hidden) return;
      void loadDevices({ silent: true });
    };
    const handleRefresh = (event: Event) => {
      const { detail } = event as CustomEvent<{ silent?: boolean }>;
      void loadDevices({ silent: detail?.silent ?? false });
    };

    void loadDevices({ silent: true });
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener(
      "synthwave:refresh-audio-devices",
      handleRefresh as EventListener,
    );

    return () => {
      mountedRef.current = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener(
        "synthwave:refresh-audio-devices",
        handleRefresh as EventListener,
      );
    };
  }, [loadDevices]);

  // Register capture functions for keyboard shortcuts
  useEffect(() => {
    useAudioStore.getState().setCaptureFns(
      () => startCapture(lastDeviceName || undefined),
      () => stopCapture(),
    );
  }, [startCapture, stopCapture, lastDeviceName]);

  // Listen for recording toggle from keyboard shortcut
  useEffect(() => {
    const handleToggleRecord = async () => {
      const canvas = getCanvasRef();
      if (isRecording) {
        const blob = await stopRecording();
        if (blob) {
          saveRecording(blob);
        }
      } else if (canvas) {
        startRecording(canvas, (blob) => saveRecording(blob, true));
        useToastStore.getState().addToast("info", "Recording started");
      }
    };

    window.addEventListener("synthwave:toggle-record", handleToggleRecord);
    return () =>
      window.removeEventListener("synthwave:toggle-record", handleToggleRecord);
  }, [isRecording, startRecording, stopRecording]);

  // Auto-hide after 3s of no mouse movement
  useEffect(() => {
    const handleMove = () => {
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener("mousemove", handleMove);
    hideTimer.current = setTimeout(() => setVisible(false), 3000);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const handleAudioAction = async () => {
    if (isCapturing) {
      if (source === "file") {
        try {
          const paused = await invoke<boolean>("toggle_pause");
          useAudioStore.getState().setPaused(paused);
          useToastStore
            .getState()
            .addToast("info", paused ? "Playback paused" : "Playback resumed");
          return;
        } catch (err) {
          useToastStore
            .getState()
            .addToast("warning", `Pause failed: ${String(err)}`);
        }
      }
      await stopCapture();
      return;
    }

    await startCapture(lastDeviceName || undefined);
  };

  const handleRecord = async () => {
    const canvas = getCanvasRef();
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        saveRecording(blob);
      }
    } else if (canvas) {
      startRecording(canvas, (blob) => saveRecording(blob, true));
      useToastStore.getState().addToast("info", "Recording started");
    }
  };

  const handleModeChange = (m: typeof mode) => {
    setMode(m);
    useSettingsStore.getState().setLastMode(m);
  };

  const handleThemeChange = (i: number) => {
    setThemeIndex(i);
    useSettingsStore.getState().setLastThemeIndex(i);
  };

  if (!showControls) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-4xl bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Audio Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAudioAction}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isCapturing
                  ? "bg-red-500/80 hover:bg-red-500 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isCapturing
                ? source === "file"
                  ? isPaused
                    ? "Resume"
                    : "Pause"
                  : "Stop"
                : "Start"}
            </button>

            {/* Record button */}
            <button
              onClick={handleRecord}
              className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                isRecording
                  ? "bg-red-600/80 hover:bg-red-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title="Record (Cmd+R)"
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  isRecording ? "bg-red-400 animate-pulse" : "bg-red-400/60"
                }`}
              />
              {isRecording ? `${duration}s` : "Rec"}
            </button>

            <select
              value={lastDeviceName ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                useSettingsStore.getState().setLastDeviceName(value || null);
              }}
              disabled={devices.length === 0}
              aria-label="Audio input device"
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none disabled:text-white/30 disabled:cursor-not-allowed"
            >
              <option value="">
                {devices.length > 0 ? "Default Device" : "No input devices"}
              </option>
              {devices.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                  {d.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>

            <button
              onClick={() => void loadDevices()}
              className="px-3 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh audio devices"
              disabled={isRefreshingDevices}
            >
              {isRefreshingDevices ? "Refreshing" : "Refresh"}
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-1">
            {MODES.map((m, i) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                title={`${i + 1}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Theme Selector */}
          <div className="flex gap-1.5">
            {THEMES.map((theme, i) => {
              const [r, g, b] = theme.colors.primary;
              return (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(i)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    themeIndex === i
                      ? "border-white scale-125"
                      : "border-white/20 hover:border-white/50"
                  }`}
                  style={{
                    backgroundColor: `rgb(${Math.round(Math.min(255, r * 255))},${Math.round(Math.min(255, g * 255))},${Math.round(Math.min(255, b * 255))})`,
                  }}
                  title={theme.name}
                />
              );
            })}
          </div>

          {/* Settings gear */}
          <button
            onClick={toggleSettings}
            className="ml-auto bg-white/10 hover:bg-white/20 text-white/60 hover:text-white p-2 rounded-lg transition-colors"
            title="Settings (S)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
