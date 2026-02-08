import { useCallback, useEffect, useRef } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { useAudioStore } from "../stores/audioStore";
import type { AudioConfig, AudioDevice, AudioFrame } from "../types/audio";

export function useAudioStream() {
  const { setFrame, setDevices, setCapturing, isCapturing } = useAudioStore();
  const channelRef = useRef<Channel<AudioFrame> | null>(null);

  useEffect(() => {
    invoke<AudioDevice[]>("list_audio_devices")
      .then(setDevices)
      .catch(console.error);
  }, [setDevices]);

  const startCapture = useCallback(
    async (deviceName?: string) => {
      if (isCapturing) {
        await invoke("stop_audio");
      }

      const channel = new Channel<AudioFrame>();
      channelRef.current = channel;

      channel.onmessage = (frame: AudioFrame) => {
        setFrame(frame);
      };

      const config: AudioConfig = {
        deviceName: deviceName ?? null,
        fftSize: 2048,
        targetFps: 60,
      };

      await invoke("start_audio", { config, channel });
      setCapturing(true);
    },
    [isCapturing, setFrame, setCapturing],
  );

  const stopCapture = useCallback(async () => {
    await invoke("stop_audio");
    setCapturing(false);
    channelRef.current = null;
  }, [setCapturing]);

  return { startCapture, stopCapture, isCapturing };
}
