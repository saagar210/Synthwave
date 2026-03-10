import { fireEvent, render, screen } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDrawer } from "../components/SettingsDrawer";
import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import { resetAppStores } from "./storeReset";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe("SettingsDrawer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
    resetAppStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates settings state and persists sensitivity, fft size, and target FPS changes", () => {
    render(<SettingsDrawer open={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Beat Sensitivity/i), {
      target: { value: "1.7" },
    });
    fireEvent.change(screen.getByLabelText(/FFT Size/i), {
      target: { value: "4096" },
    });
    fireEvent.change(screen.getByLabelText(/Target FPS/i), {
      target: { value: "90" },
    });

    expect(useSettingsStore.getState().sensitivity).toBe(1.7);
    expect(useSettingsStore.getState().fftSize).toBe(4096);
    expect(useSettingsStore.getState().targetFps).toBe(90);

    vi.advanceTimersByTime(500);

    expect(mockedInvoke).toHaveBeenLastCalledWith("save_settings", {
      config: expect.objectContaining({
        sensitivity: 1.7,
        fftSize: 4096,
        targetFps: 90,
      }),
    });
  });

  it("shows the private beta guidance inside settings", () => {
    render(<SettingsDrawer open={true} onClose={() => {}} />);

    expect(screen.getByText("Private Beta Notes")).toBeInTheDocument();
    expect(
      screen.getByText("AI labels require Ollama to be running locally."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "System audio capture on macOS works best with BlackHole.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Recordings stop automatically after 60 seconds."),
    ).toBeInTheDocument();
  });

  it("shows runtime diagnostics for capture, device, AI, and the last issue", () => {
    useSettingsStore.setState({ lastDeviceName: "Studio Mic" });
    useAudioStore.setState({
      isCapturing: true,
      source: "live",
      ollamaChecked: true,
      ollamaAvailable: false,
      isClassifying: false,
    });
    useToastStore.setState({
      toasts: [],
      lastToast: {
        id: "toast-1",
        type: "error",
        message: "Audio device disconnected. Device list refreshed.",
        duration: 0,
      },
    });

    render(<SettingsDrawer open={true} onClose={() => {}} />);

    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Live capture")).toBeInTheDocument();
    expect(screen.getByText("Studio Mic")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(
      screen.getByText("Audio device disconnected. Device list refreshed."),
    ).toBeInTheDocument();
  });

  it("shows file playback and analyzing status before an issue is present", () => {
    useAudioStore.setState({
      isCapturing: true,
      source: "file",
      ollamaChecked: true,
      ollamaAvailable: true,
      isClassifying: true,
    });

    render(<SettingsDrawer open={true} onClose={() => {}} />);

    expect(screen.getByText("File playback")).toBeInTheDocument();
    expect(screen.getByText("Analyzing")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
  });
});
