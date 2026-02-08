import { useCallback, useEffect, useRef } from "react";
import { useWebGL } from "../hooks/useWebGL";
import { useRenderLoop } from "../hooks/useRenderLoop";
import { Renderer } from "../gl/renderer";
import { useAudioStore } from "../stores/audioStore";
import { useVisualStore } from "../stores/visualStore";
import { setCanvasRef } from "../stores/canvasRefStore";

export function Visualizer() {
  const { gl, canvasRef } = useWebGL();
  const rendererRef = useRef<Renderer | null>(null);
  const lastThemeRef = useRef<number>(-1);
  const fpsFrames = useRef<number[]>([]);

  // Initialize renderer once GL is available
  if (gl && !rendererRef.current) {
    rendererRef.current = new Renderer(gl);
  }

  // Register canvas ref for screenshot/recording
  useEffect(() => {
    setCanvasRef(canvasRef.current);
    return () => setCanvasRef(null);
  }, [canvasRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  const renderFrame = useCallback(
    (time: number, deltaTime: number) => {
      if (!gl || !rendererRef.current) return;

      // Handle resize
      const canvas = gl.canvas as HTMLCanvasElement;
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.floor(canvas.clientWidth * dpr);
      const displayHeight = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }

      // Read stores outside React render cycle
      const audioState = useAudioStore.getState();
      const visualState = useVisualStore.getState();

      // Theme changes
      if (lastThemeRef.current !== visualState.themeIndex) {
        rendererRef.current.setTheme(visualState.themeIndex);
        lastThemeRef.current = visualState.themeIndex;
      }

      // Beat decay
      audioState.decayBeat();

      // Build audio data
      const audioData = audioState.spectrumData
        ? {
            spectrum: audioState.spectrumData,
            waveform: audioState.waveformData ?? new Float32Array(1024),
            rms: audioState.frame?.rms ?? 0,
            centroid: audioState.frame?.centroid ?? 0,
            flux: audioState.frame?.flux ?? 0,
            zcr: audioState.frame?.zcr ?? 0,
            beat: audioState.frame?.beat ?? false,
            bpm: audioState.frame?.bpm ?? 0,
            beatIntensity: audioState.beatIntensity,
          }
        : null;

      if (audioData) {
        rendererRef.current.updateAudioData(audioData);
      }

      rendererRef.current.render(time, deltaTime, visualState.mode, audioData);

      // FPS counter
      fpsFrames.current.push(deltaTime);
      if (fpsFrames.current.length > 60) {
        const avg =
          fpsFrames.current.reduce((a, b) => a + b, 0) / fpsFrames.current.length;
        visualState.setFps(Math.round(1 / avg));
        fpsFrames.current = [];
      }
    },
    [gl],
  );

  useRenderLoop(renderFrame, !!gl);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}
