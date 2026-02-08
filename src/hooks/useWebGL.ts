import { useLayoutEffect, useRef, useState, type RefObject } from "react";

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
      preserveDrawingBuffer: false,
    });

    if (!context) {
      console.error("WebGL 2 not supported");
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

    return () => {
      observer.disconnect();
    };
  }, []);

  return { gl, canvasRef };
}
