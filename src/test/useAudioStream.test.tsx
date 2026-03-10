import { act, renderHook } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioStream } from "../hooks/useAudioStream";
import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import { resetAppStores } from "./storeReset";

const { channels, MockChannel } = vi.hoisted(() => {
  const hoistedChannels: Array<{
    onmessage: ((message: unknown) => void) | null;
  }> = [];

  class HoistedMockChannel<T> {
    onmessage: ((message: T) => void) | null = null;

    constructor() {
      hoistedChannels.push(
        this as unknown as { onmessage: ((message: unknown) => void) | null },
      );
    }
  }

  return {
    channels: hoistedChannels,
    MockChannel: HoistedMockChannel,
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  Channel: MockChannel,
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe("useAudioStream", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    channels.length = 0;
    resetAppStores();
  });

  it("starts and stops live capture successfully", async () => {
    mockedInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAudioStream());

    await act(async () => {
      await result.current.startCapture("Studio Mic");
    });

    expect(mockedInvoke).toHaveBeenCalledWith("start_audio", {
      config: expect.objectContaining({
        deviceName: "Studio Mic",
        fftSize: 2048,
        targetFps: 60,
        sensitivity: 1,
      }),
      channel: expect.any(MockChannel),
    });
    expect(useAudioStore.getState().isCapturing).toBe(true);
    expect(useAudioStore.getState().source).toBe("live");

    await act(async () => {
      await result.current.stopCapture();
    });

    expect(mockedInvoke).toHaveBeenCalledWith("stop_audio");
    expect(useAudioStore.getState().isCapturing).toBe(false);
    expect(useAudioStore.getState().source).toBeNull();
  });

  it("refreshes devices and reports a missing saved device", async () => {
    useSettingsStore.getState().setLastDeviceName("Studio Mic");
    mockedInvoke.mockRejectedValueOnce(new Error("device not found"));

    let refreshDetail: { silent?: boolean } | null = null;
    const handleRefresh = (event: Event) => {
      refreshDetail = (event as CustomEvent<{ silent?: boolean }>).detail;
    };
    window.addEventListener("synthwave:refresh-audio-devices", handleRefresh);

    const { result } = renderHook(() => useAudioStream());

    await act(async () => {
      await result.current.startCapture("Studio Mic");
    });

    window.removeEventListener(
      "synthwave:refresh-audio-devices",
      handleRefresh,
    );

    expect(useSettingsStore.getState().lastDeviceName).toBeNull();
    expect(refreshDetail).toEqual({ silent: false });
    expect(useToastStore.getState().lastToast?.message).toBe(
      "Audio device not found. Device list refreshed; choose another input.",
    );
  });

  it("shows the permission guidance when capture is denied", async () => {
    mockedInvoke.mockRejectedValueOnce(new Error("permission denied"));

    const { result } = renderHook(() => useAudioStream());

    await act(async () => {
      await result.current.startCapture();
    });

    expect(useToastStore.getState().lastToast).toEqual(
      expect.objectContaining({
        type: "error",
        duration: 0,
        message:
          "Microphone access denied. Check System Settings > Privacy > Microphone.",
      }),
    );
  });

  it("clears state and requests a silent refresh when the device disconnects mid-stream", async () => {
    useSettingsStore.getState().setLastDeviceName("Studio Mic");
    mockedInvoke.mockResolvedValue(undefined);

    let refreshDetail: { silent?: boolean } | null = null;
    const handleRefresh = (event: Event) => {
      refreshDetail = (event as CustomEvent<{ silent?: boolean }>).detail;
    };
    window.addEventListener("synthwave:refresh-audio-devices", handleRefresh);

    const { result } = renderHook(() => useAudioStream());

    await act(async () => {
      await result.current.startCapture("Studio Mic");
    });

    await act(async () => {
      channels[channels.length - 1]?.onmessage?.({
        spectrum: [],
        waveform: [],
        rms: -1,
        centroid: 0,
        flux: 0,
        zcr: 0,
        beat: false,
        bpm: 0,
        timestamp: 0,
      });
    });

    window.removeEventListener(
      "synthwave:refresh-audio-devices",
      handleRefresh,
    );

    expect(useAudioStore.getState().isCapturing).toBe(false);
    expect(useAudioStore.getState().source).toBeNull();
    expect(useSettingsStore.getState().lastDeviceName).toBeNull();
    expect(refreshDetail).toEqual({ silent: true });
    expect(useToastStore.getState().lastToast?.message).toBe(
      "Audio device disconnected. Device list refreshed.",
    );
  });
});
