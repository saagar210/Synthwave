import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioStore } from "../stores/audioStore";
import { useToastStore } from "../stores/toastStore";
import { resetAppStores } from "./storeReset";

describe("store logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAppStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("smooths subsequent audio frames and tracks beat intensity", () => {
    useAudioStore.getState().setFrame({
      spectrum: [1, 0.5],
      waveform: [0.1, -0.1],
      rms: 0.3,
      centroid: 0.4,
      flux: 0.2,
      zcr: 0.1,
      beat: true,
      bpm: 120,
      timestamp: 1,
    });

    useAudioStore.getState().setFrame({
      spectrum: [0, 1],
      waveform: [0.2, -0.2],
      rms: 0.4,
      centroid: 0.5,
      flux: 0.3,
      zcr: 0.2,
      beat: false,
      bpm: 120,
      timestamp: 2,
    });

    const state = useAudioStore.getState();
    expect(state.spectrumData?.[0]).toBeCloseTo(0.7, 5);
    expect(state.spectrumData?.[1]).toBeCloseTo(0.65, 5);
    expect(state.waveformData?.[0]).toBeCloseTo(0.2, 5);
    expect(state.waveformData?.[1]).toBeCloseTo(-0.2, 5);
    expect(state.beatIntensity).toBe(1);

    state.decayBeat();
    expect(useAudioStore.getState().beatIntensity).toBeCloseTo(0.92, 5);

    state.setOllamaAvailable(true);
    state.setIsClassifying(true);
    state.setCaptureFns(
      () => {},
      () => {},
    );

    expect(useAudioStore.getState().ollamaChecked).toBe(true);
    expect(useAudioStore.getState().startCaptureFn).toBeTypeOf("function");
    expect(useAudioStore.getState().stopCaptureFn).toBeTypeOf("function");
  });

  it("caps toast history and auto-removes timed toasts", () => {
    for (let index = 0; index < 6; index += 1) {
      useToastStore.getState().addToast("info", `Toast ${index}`, 0);
    }

    expect(useToastStore.getState().toasts).toHaveLength(5);
    expect(useToastStore.getState().toasts[0]?.message).toBe("Toast 1");
    expect(useToastStore.getState().lastToast?.message).toBe("Toast 5");

    const timedToastId = useToastStore
      .getState()
      .addToast("warning", "Remove me", 50);
    expect(
      useToastStore
        .getState()
        .toasts.some((toast) => toast.id === timedToastId),
    ).toBe(true);

    vi.advanceTimersByTime(50);

    expect(
      useToastStore
        .getState()
        .toasts.some((toast) => toast.id === timedToastId),
    ).toBe(false);
  });
});
