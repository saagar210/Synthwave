let canvasRef: HTMLCanvasElement | null = null;

export function setCanvasRef(canvas: HTMLCanvasElement | null): void {
  canvasRef = canvas;
}

export function getCanvasRef(): HTMLCanvasElement | null {
  return canvasRef;
}
