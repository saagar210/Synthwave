import { create } from "zustand";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => string;
  removeToast: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (type, message, duration = 3000) => {
    const id = `toast-${nextId++}`;
    const toast: Toast = { id, type, message, duration };

    set((state) => {
      const toasts = [...state.toasts, toast];
      // Cap at 5, evict oldest
      if (toasts.length > 5) {
        return { toasts: toasts.slice(toasts.length - 5) };
      }
      return { toasts };
    });

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
