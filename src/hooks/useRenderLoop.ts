import { useEffect, useRef } from "react";

export type RenderCallback = (time: number, deltaTime: number) => void;

export function useRenderLoop(callback: RenderCallback, active: boolean = true): void {
  const callbackRef = useRef<RenderCallback>(callback);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Always keep callback ref current without triggering effect
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      callbackRef.current(now / 1000, dt);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [active]);
}
