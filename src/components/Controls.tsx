import { useEffect, useRef, useState } from "react";
import { useAudioStream } from "../hooks/useAudioStream";
import { useAudioStore } from "../stores/audioStore";
import { useVisualStore, MODES } from "../stores/visualStore";
import { THEMES } from "../themes";

export function Controls() {
  const { startCapture, stopCapture, isCapturing } = useAudioStream();
  const devices = useAudioStore((s) => s.devices);
  const mode = useVisualStore((s) => s.mode);
  const themeIndex = useVisualStore((s) => s.themeIndex);
  const showControls = useVisualStore((s) => s.showControls);
  const setMode = useVisualStore((s) => s.setMode);
  const setThemeIndex = useVisualStore((s) => s.setThemeIndex);

  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide after 3s of no mouse movement
  useEffect(() => {
    const handleMove = () => {
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener("mousemove", handleMove);
    hideTimer.current = setTimeout(() => setVisible(false), 3000);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!showControls) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-4xl bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Audio Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isCapturing ? stopCapture() : startCapture(selectedDevice || undefined))}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isCapturing
                  ? "bg-red-500/80 hover:bg-red-500 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isCapturing ? "Stop" : "Start"}
            </button>

            {devices.length > 0 && (
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none"
              >
                <option value="">Default Device</option>
                {devices.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                    {d.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mode Selector */}
          <div className="flex gap-1">
            {MODES.map((m, i) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                title={`${i + 1}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Theme Selector */}
          <div className="flex gap-1.5">
            {THEMES.map((theme, i) => {
              const [r, g, b] = theme.colors.primary;
              return (
                <button
                  key={theme.name}
                  onClick={() => setThemeIndex(i)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    themeIndex === i
                      ? "border-white scale-125"
                      : "border-white/20 hover:border-white/50"
                  }`}
                  style={{ backgroundColor: `rgb(${r * 255},${g * 255},${b * 255})` }}
                  title={theme.name}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
