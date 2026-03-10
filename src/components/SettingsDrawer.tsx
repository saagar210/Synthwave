import { useAudioStore } from "../stores/audioStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: Props) {
  const sensitivity = useSettingsStore((s) => s.sensitivity);
  const fftSize = useSettingsStore((s) => s.fftSize);
  const targetFps = useSettingsStore((s) => s.targetFps);
  const lastDeviceName = useSettingsStore((s) => s.lastDeviceName);
  const setSensitivity = useSettingsStore((s) => s.setSensitivity);
  const setFftSize = useSettingsStore((s) => s.setFftSize);
  const setTargetFps = useSettingsStore((s) => s.setTargetFps);
  const source = useAudioStore((s) => s.source);
  const isCapturing = useAudioStore((s) => s.isCapturing);
  const ollamaAvailable = useAudioStore((s) => s.ollamaAvailable);
  const ollamaChecked = useAudioStore((s) => s.ollamaChecked);
  const isClassifying = useAudioStore((s) => s.isClassifying);
  const lastToast = useToastStore((s) => s.lastToast);

  const aiStatus = !ollamaChecked
    ? "Checking"
    : isClassifying
      ? "Analyzing"
      : ollamaAvailable
        ? "Ready"
        : "Offline";
  const sourceLabel = !isCapturing
    ? "Idle"
    : source === "file"
      ? "File playback"
      : "Live capture";
  const lastIssue =
    lastToast && (lastToast.type === "warning" || lastToast.type === "error")
      ? lastToast.message
      : "None";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
        <h2 className="text-white text-lg font-semibold mb-6">Settings</h2>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="beat-sensitivity"
              className="text-white/60 text-sm block mb-2"
            >
              Beat Sensitivity: {sensitivity.toFixed(1)}
            </label>
            <input
              id="beat-sensitivity"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full accent-pink-500"
            />
          </div>

          <div>
            <label
              htmlFor="fft-size"
              className="text-white/60 text-sm block mb-2"
            >
              FFT Size
            </label>
            <select
              id="fft-size"
              value={fftSize}
              onChange={(e) => setFftSize(parseInt(e.target.value, 10))}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 w-full border border-white/10 outline-none"
            >
              <option value="1024">1024</option>
              <option value="2048">2048</option>
              <option value="4096">4096</option>
              <option value="8192">8192</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="target-fps"
              className="text-white/60 text-sm block mb-2"
            >
              Target FPS
            </label>
            <select
              id="target-fps"
              value={targetFps}
              onChange={(e) => setTargetFps(parseInt(e.target.value, 10))}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 w-full border border-white/10 outline-none"
            >
              <option value="30">30 FPS</option>
              <option value="45">45 FPS</option>
              <option value="60">60 FPS</option>
              <option value="90">90 FPS</option>
              <option value="120">120 FPS</option>
            </select>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
          <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3">
            Diagnostics
          </h3>
          <div className="space-y-2 text-xs text-white/50 mb-6">
            <div className="flex justify-between gap-4">
              <span>Capture</span>
              <span className="text-white/70 text-right">{sourceLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Device</span>
              <span className="text-white/70 text-right">
                {lastDeviceName ?? "Default"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>AI</span>
              <span className="text-white/70 text-right">{aiStatus}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Last issue</span>
              <span className="text-white/70 text-right max-w-40">
                {lastIssue}
              </span>
            </div>
          </div>

          <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3">
            Private Beta Notes
          </h3>
          <div className="space-y-1.5 text-xs text-white/40 mb-6">
            <div>AI labels require Ollama to be running locally.</div>
            <div>System audio capture on macOS works best with BlackHole.</div>
            <div>Recordings stop automatically after 60 seconds.</div>
          </div>

          <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3">
            Keyboard Shortcuts
          </h3>
          <div className="space-y-1.5 text-xs text-white/40">
            <div className="flex justify-between">
              <span>1-7</span>
              <span>Switch mode</span>
            </div>
            <div className="flex justify-between">
              <span>T</span>
              <span>Cycle theme</span>
            </div>
            <div className="flex justify-between">
              <span>F</span>
              <span>Fullscreen</span>
            </div>
            <div className="flex justify-between">
              <span>I</span>
              <span>Toggle overlay</span>
            </div>
            <div className="flex justify-between">
              <span>H</span>
              <span>Toggle controls</span>
            </div>
            <div className="flex justify-between">
              <span>S</span>
              <span>Settings</span>
            </div>
            <div className="flex justify-between">
              <span>Space</span>
              <span>Start / pause</span>
            </div>
            <div className="flex justify-between">
              <span>Cmd+R</span>
              <span>Record</span>
            </div>
            <div className="flex justify-between">
              <span>Cmd+Shift+S</span>
              <span>Screenshot</span>
            </div>
            <div className="flex justify-between">
              <span>Esc</span>
              <span>Exit fullscreen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
