import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { useSettingsStore } from "../stores/settingsStore";
import { useVisualStore } from "../stores/visualStore";
import { resetAppStores } from "./storeReset";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../components/Visualizer", () => ({
  Visualizer: () => <div data-testid="visualizer" />,
}));

vi.mock("../components/Controls", () => ({
  Controls: () => <div data-testid="controls" />,
}));

vi.mock("../components/InfoOverlay", () => ({
  InfoOverlay: () => <div data-testid="info-overlay" />,
}));

vi.mock("../components/ToastContainer", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

vi.mock("../components/SettingsDrawer", () => ({
  SettingsDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="settings-drawer" /> : null,
}));

vi.mock("../hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: () => {},
}));

vi.mock("../hooks/useClassification", () => ({
  useClassification: () => {},
}));

vi.mock("../hooks/useFileDrop", () => ({
  useFileDrop: () => {},
}));

const mockedInvoke = vi.mocked(invoke);

describe("App", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    resetAppStores();
  });

  it("loads backend settings and shows the welcome modal for first-run users", async () => {
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_settings") {
        return {
          lastMode: "nebula",
          lastThemeIndex: 4,
          lastDeviceName: "Studio Monitor",
          sensitivity: 1.4,
          fftSize: 4096,
          targetFps: 60,
          hasSeenWelcome: false,
        };
      }

      return undefined;
    });

    render(<App />);

    await screen.findByText("Welcome to SynthWave");

    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(useSettingsStore.getState().lastDeviceName).toBe("Studio Monitor");
    expect(useVisualStore.getState().mode).toBe("nebula");
    expect(useVisualStore.getState().themeIndex).toBe(4);
  });

  it("dismisses the welcome modal and persists the updated setting", async () => {
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_settings") {
        return {
          lastMode: "waveform",
          lastThemeIndex: 0,
          lastDeviceName: null,
          sensitivity: 1.0,
          fftSize: 2048,
          targetFps: 60,
          hasSeenWelcome: false,
        };
      }

      return undefined;
    });

    const user = userEvent.setup();

    render(<App />);

    const button = await screen.findByRole("button", { name: "Get Started" });
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.queryByText("Welcome to SynthWave"),
      ).not.toBeInTheDocument();
    });

    expect(useSettingsStore.getState().hasSeenWelcome).toBe(true);

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith("save_settings", {
        config: expect.objectContaining({
          hasSeenWelcome: true,
        }),
      });
    });
  });
});
