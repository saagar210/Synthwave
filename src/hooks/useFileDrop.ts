import { useEffect } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import type { AudioConfig, AudioFrame } from "../types/audio";

const SUPPORTED_EXTENSIONS = ["mp3", "wav", "flac", "ogg", "aac", "m4a"];

export function useFileDrop(): void {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      const win = getCurrentWindow();
      unlisten = await win.onDragDropEvent(async (event) => {
        if (event.payload.type !== "drop") return;

        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        const path = paths[0];
        const ext = path.split(".").pop()?.toLowerCase() ?? "";

        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          useToastStore.getState().addToast("warning", `Unsupported format: .${ext}`);
          return;
        }

        try {
          // Stop current capture
          await invoke("stop_audio").catch(() => {});

          const channel = new Channel<AudioFrame>();

          channel.onmessage = (frame: AudioFrame) => {
            // Sentinel detection: RMS < 0 means device disconnected / playback finished
            if (frame.rms < 0) {
              useAudioStore.getState().setCapturing(false);
              useAudioStore.getState().setPaused(false);
              useAudioStore.getState().setSource(null);
              useToastStore.getState().addToast("info", "Playback finished");
              return;
            }
            useAudioStore.getState().setFrame(frame);
          };

          const settings = useSettingsStore.getState();
          const config: AudioConfig = {
            deviceName: null,
            fftSize: settings.fftSize,
            targetFps: settings.targetFps,
            sensitivity: settings.sensitivity,
          };

          const duration = await invoke<number>("start_file_audio", { path, config, channel });
          useAudioStore.getState().setCapturing(true);
          useAudioStore.getState().setPaused(false);
          useAudioStore.getState().setSource("file");

          const durationStr = duration > 0 ? ` (${Math.round(duration)}s)` : "";
          const filename = path.split("/").pop() ?? path;
          useToastStore.getState().addToast("success", `Playing ${filename}${durationStr}`);
        } catch (err) {
          useToastStore.getState().addToast("error", `Failed to play file: ${err}`);
        }
      });
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, []);
}
