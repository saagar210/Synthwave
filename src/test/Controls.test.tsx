import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Controls } from "../components/Controls";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import { resetAppStores } from "./storeReset";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../hooks/useAudioStream", () => ({
  useAudioStream: () => ({
    startCapture: vi.fn(),
    stopCapture: vi.fn(),
    isCapturing: false,
  }),
}));

vi.mock("../hooks/useRecorder", () => ({
  useRecorder: () => ({
    isRecording: false,
    duration: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));

const mockedInvoke = vi.mocked(invoke);

describe("Controls", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    resetAppStores();
  });

  it("refreshes the device list from the controls bar", async () => {
    mockedInvoke.mockImplementation(async (command) => {
      if (command !== "list_audio_devices") return undefined;

      const calls = mockedInvoke.mock.calls.filter(
        ([name]) => name === "list_audio_devices",
      ).length;
      return calls <= 1
        ? [{ name: "Built-in Mic", isDefault: true, isInput: true }]
        : [{ name: "USB Interface", isDefault: false, isInput: true }];
    });

    const user = userEvent.setup();
    render(<Controls />);

    expect(
      await screen.findByRole("option", { name: /Built-in Mic/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(
      await screen.findByRole("option", { name: /USB Interface/i }),
    ).toBeInTheDocument();
  });

  it("clears a stale saved device when a refresh event shows it is gone", async () => {
    useSettingsStore.setState({ lastDeviceName: "Studio Mic" });

    mockedInvoke.mockImplementation(async (command) => {
      if (command !== "list_audio_devices") return undefined;

      const calls = mockedInvoke.mock.calls.filter(
        ([name]) => name === "list_audio_devices",
      ).length;
      return calls <= 1
        ? [{ name: "Studio Mic", isDefault: false, isInput: true }]
        : [{ name: "Built-in Mic", isDefault: true, isInput: true }];
    });

    render(<Controls />);

    await screen.findByRole("option", { name: /Studio Mic/i });

    fireEvent(
      window,
      new CustomEvent("synthwave:refresh-audio-devices", {
        detail: { silent: false },
      }),
    );

    await waitFor(() => {
      expect(useSettingsStore.getState().lastDeviceName).toBeNull();
    });

    expect(screen.getByLabelText("Audio input device")).toHaveValue("");
    expect(
      await screen.findByRole("option", { name: /Built-in Mic/i }),
    ).toBeInTheDocument();
    expect(useToastStore.getState().lastToast?.message).toBe(
      "Saved audio device is unavailable. Using the default input.",
    );
  });
});
