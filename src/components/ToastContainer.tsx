import { useToastStore, type ToastType } from "../stores/toastStore";

const borderColors: Record<ToastType, string> = {
  info: "border-blue-400/50",
  success: "border-green-400/50",
  warning: "border-yellow-400/50",
  error: "border-red-400/50",
};

const iconColors: Record<ToastType, string> = {
  info: "text-blue-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  error: "text-red-400",
};

const icons: Record<ToastType, string> = {
  info: "\u2139",
  success: "\u2713",
  warning: "\u26A0",
  error: "\u2717",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`pointer-events-auto cursor-pointer animate-slide-in
            bg-black/70 backdrop-blur-md rounded-lg px-4 py-3 border
            ${borderColors[toast.type]}
            text-white text-sm font-medium select-none
            hover:bg-black/80 transition-colors max-w-sm`}
        >
          <span className={`${iconColors[toast.type]} mr-2`}>
            {icons[toast.type]}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
