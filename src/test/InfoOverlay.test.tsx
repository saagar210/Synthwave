import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { InfoOverlay } from "../components/InfoOverlay";
import { useAudioStore } from "../stores/audioStore";
import { useVisualStore } from "../stores/visualStore";
import { resetAppStores } from "./storeReset";

describe("InfoOverlay", () => {
  beforeEach(() => {
    resetAppStores();
  });

  it("renders BPM, mode, classification, and fps when enabled", () => {
    useVisualStore.setState({
      mode: "terrain",
      fps: 58,
      showOverlay: true,
    });

    useAudioStore.setState({
      frame: {
        spectrum: [0.1, 0.2, 0.3],
        waveform: [0, 0.1, -0.1],
        rms: 0.4,
        centroid: 0.6,
        flux: 0.2,
        zcr: 0.1,
        beat: true,
        bpm: 127.8,
        timestamp: 1234,
      },
      classification: {
        genre: "Ambient",
        mood: "Calm",
        energy: "low",
      },
    });

    render(<InfoOverlay />);

    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("terrain")).toBeInTheDocument();
    expect(screen.getByText("Ambient / Calm / low")).toBeInTheDocument();
    expect(screen.getByText("58 fps")).toBeInTheDocument();
  });

  it("shows AI availability states before a classification arrives", () => {
    useVisualStore.setState({ showOverlay: true });
    useAudioStore.setState({ ollamaChecked: true, ollamaAvailable: false });

    const { rerender } = render(<InfoOverlay />);
    expect(screen.getByText("AI offline")).toBeInTheDocument();

    useAudioStore.setState({ ollamaAvailable: true, isClassifying: true });
    rerender(<InfoOverlay />);
    expect(screen.getByText("AI analyzing")).toBeInTheDocument();

    useAudioStore.setState({ isClassifying: false });
    rerender(<InfoOverlay />);
    expect(screen.getByText("AI ready")).toBeInTheDocument();
  });

  it("renders nothing when the overlay is disabled", () => {
    useVisualStore.setState({ showOverlay: false });

    const { container } = render(<InfoOverlay />);
    expect(container).toBeEmptyDOMElement();
  });
});
