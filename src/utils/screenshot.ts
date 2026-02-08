import { getCanvasRef } from "../stores/canvasRefStore";
import { useToastStore } from "../stores/toastStore";

export function takeScreenshot(): void {
  const canvas = getCanvasRef();
  if (!canvas) {
    useToastStore.getState().addToast("error", "No canvas available for screenshot");
    return;
  }

  try {
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `synthwave-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    useToastStore.getState().addToast("success", "Screenshot saved");
  } catch {
    useToastStore.getState().addToast("error", "Failed to capture screenshot");
  }
}
