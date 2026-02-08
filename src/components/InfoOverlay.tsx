import { useAudioStore } from "../stores/audioStore";
import { useVisualStore } from "../stores/visualStore";

export function InfoOverlay() {
  const frame = useAudioStore((s) => s.frame);
  const mode = useVisualStore((s) => s.mode);
  const fps = useVisualStore((s) => s.fps);
  const showOverlay = useVisualStore((s) => s.showOverlay);

  if (!showOverlay) return null;

  const bpm = frame?.bpm ?? 0;
  const bpmDisplay = bpm > 0 ? Math.round(bpm).toString() : "---";

  return (
    <div className="fixed top-4 left-4 text-white/80 font-mono text-sm select-none pointer-events-none">
      <div className="text-3xl font-bold text-white/90 tabular-nums">
        {bpmDisplay} <span className="text-sm font-normal text-white/50">BPM</span>
      </div>
      <div className="mt-1 text-white/40 text-xs uppercase tracking-wider">
        {mode}
      </div>
      <div className="text-white/30 text-xs tabular-nums">{fps} fps</div>
    </div>
  );
}
