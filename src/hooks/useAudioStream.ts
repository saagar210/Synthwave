import { useCallback, useRef } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import type { AudioConfig, AudioFrame } from "../types/audio";

function requestDeviceRefresh(silent: boolean = false) {
  window.dispatchEvent(
    new CustomEvent("synthwave:refresh-audio-devices", { detail: { silent } }),
  );
}

export function useAudioStream() {
  const isCapturing = useAudioStore((s) => s.isCapturing);
  const channelRef = useRef<Channel<AudioFrame> | null>(null);

  const startCapture = useCallback(
    async (deviceName?: string) => {
      if (isCapturing) {
        await invoke("stop_audio").catch(() => {});
      }

      const channel = new Channel<AudioFrame>();
      channelRef.current = channel;

      channel.onmessage = (frame: AudioFrame) => {
        // Sentinel detection: RMS < 0 means device disconnected
        if (frame.rms < 0) {
          useAudioStore.getState().setCapturing(false);
          useAudioStore.getState().setPaused(false);
          useAudioStore.getState().setSource(null);
          if (
            deviceName &&
            useSettingsStore.getState().lastDeviceName === deviceName
          ) {
            useSettingsStore.getState().setLastDeviceName(null);
          }
          requestDeviceRefresh(true);
          useToastStore
            .getState()
            .addToast(
              "error",
              "Audio device disconnected. Device list refreshed.",
            );
          channelRef.current = null;
          return;
        }
        useAudioStore.getState().setFrame(frame);
      };

      const settings = useSettingsStore.getState();
      const config: AudioConfig = {
        deviceName: deviceName ?? null,
        fftSize: settings.fftSize,
        targetFps: settings.targetFps,
        sensitivity: settings.sensitivity,
      };

      try {
        await invoke("start_audio", { config, channel });
        useAudioStore.getState().setCapturing(true);
        useAudioStore.getState().setPaused(false);
        useAudioStore.getState().setSource("live");
      } catch (err) {
        const msg = String(err);
        if (msg.includes("permission") || msg.includes("denied")) {
          useToastStore
            .getState()
            .addToast(
              "error",
              "Microphone access denied. Check System Settings > Privacy > Microphone.",
              0,
            );
        } else if (msg.includes("not found")) {
          if (
            deviceName &&
            useSettingsStore.getState().lastDeviceName === deviceName
          ) {
            useSettingsStore.getState().setLastDeviceName(null);
          }
          requestDeviceRefresh();
          useToastStore
            .getState()
            .addToast(
              "error",
              "Audio device not found. Device list refreshed; choose another input.",
            );
        } else {
          useToastStore.getState().addToast("error", `Audio error: ${msg}`);
        }
      }
    },
    [isCapturing],
  );

  const stopCapture = useCallback(async () => {
    await invoke("stop_audio").catch(() => {});
    useAudioStore.getState().setCapturing(false);
    useAudioStore.getState().setPaused(false);
    useAudioStore.getState().setSource(null);
    channelRef.current = null;
  }, []);

  return { startCapture, stopCapture, isCapturing };
}
