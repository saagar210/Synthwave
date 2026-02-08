import { useSettingsStore } from "../stores/settingsStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: Props) {
  const sensitivity = useSettingsStore((s) => s.sensitivity);
  const fftSize = useSettingsStore((s) => s.fftSize);
  const setSensitivity = useSettingsStore((s) => s.setSensitivity);
  const setFftSize = useSettingsStore((s) => s.setFftSize);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
        <h2 className="text-white text-lg font-semibold mb-6">Settings</h2>

        <div className="space-y-6">
          <div>
            <label className="text-white/60 text-sm block mb-2">
              Beat Sensitivity: {sensitivity.toFixed(1)}
            </label>
            <input
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
            <label className="text-white/60 text-sm block mb-2">FFT Size</label>
            <select
              value={fftSize}
              onChange={(e) => setFftSize(parseInt(e.target.value))}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 w-full border border-white/10 outline-none"
            >
              <option value="1024">1024</option>
              <option value="2048">2048</option>
              <option value="4096">4096</option>
              <option value="8192">8192</option>
            </select>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
          <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3">Keyboard Shortcuts</h3>
          <div className="space-y-1.5 text-xs text-white/40">
            <div className="flex justify-between"><span>1-7</span><span>Switch mode</span></div>
            <div className="flex justify-between"><span>T</span><span>Cycle theme</span></div>
            <div className="flex justify-between"><span>F</span><span>Fullscreen</span></div>
            <div className="flex justify-between"><span>I</span><span>Toggle overlay</span></div>
            <div className="flex justify-between"><span>H</span><span>Toggle controls</span></div>
            <div className="flex justify-between"><span>Esc</span><span>Exit fullscreen</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
