import { useCallback, useRef } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import type { AudioConfig, AudioFrame } from "../types/audio";

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
          useToastStore.getState().addToast("error", "Audio device disconnected");
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
          useToastStore.getState().addToast("error", "Audio device not found");
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
    channelRef.current = null;
  }, []);

  return { startCapture, stopCapture, isCapturing };
}
