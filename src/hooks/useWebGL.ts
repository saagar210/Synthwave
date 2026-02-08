import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useToastStore } from "../stores/toastStore";

export interface WebGLState {
  gl: WebGL2RenderingContext | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function useWebGL(): WebGLState {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gl, setGl] = useState<WebGL2RenderingContext | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });

    if (!context) {
      useToastStore.getState().addToast("error", "WebGL 2 not supported", 0);
      return;
    }

    setGl(context);

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.floor(canvas.clientWidth * dpr);
      const displayHeight = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        context.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    // WebGL context loss handling
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      useToastStore.getState().addToast("error", "Graphics context lost — refresh to recover", 0);
    };
    const handleContextRestored = () => {
      useToastStore.getState().addToast("success", "Graphics context restored");
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, []);

  return { gl, canvasRef };
}
