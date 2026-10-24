"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, description?: string) => void;
    error: (message: string, description?: string) => void;
    info: (message: string, description?: string) => void;
    warning: (message: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      message,
      description,
      duration = type === "error" ? 6000 : 4000,
    }: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message, description, duration };

      setToasts((prev) => [...prev.slice(-2), newToast]); // keep max 3 visible toasts
    },
    [],
  );

  const toastHelpers = {
    success: useCallback(
      (message: string, description?: string) =>
        showToast({ type: "success", message, description }),
      [showToast],
    ),
    error: useCallback(
      (message: string, description?: string) =>
        showToast({ type: "error", message, description }),
      [showToast],
    ),
    info: useCallback(
      (message: string, description?: string) =>
        showToast({ type: "info", message, description }),
      [showToast],
    ),
    warning: useCallback(
      (message: string, description?: string) =>
        showToast({ type: "warning", message, description }),
      [showToast],
    ),
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        toast: toastHelpers,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export interface UseToastReturn extends ToastContextValue {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return {
    ...context,
    success: context.toast.success,
    error: context.toast.error,
    info: context.toast.info,
    warning: context.toast.warning,
  };
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md pointer-events-none pb-[env(safe-area-inset-bottom,0px)]"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { id, type, message, description, duration } = toast;

  useEffect(() => {
    if (!duration || duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const typeConfig = {
    success: {
      badgeColor: "bg-[#2A9D8F]/20 text-[#2A9D8F]",
      borderColor: "border-[#2A9D8F]/30",
      icon: (
        <svg
          className="h-4 w-4 shrink-0 text-[#2A9D8F]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      role: "status",
      ariaLive: "polite" as const,
    },
    error: {
      badgeColor: "bg-[#DC2626]/20 text-[#DC2626]",
      borderColor: "border-[#DC2626]/40",
      icon: (
        <svg
          className="h-4 w-4 shrink-0 text-[#DC2626]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      role: "alert",
      ariaLive: "assertive" as const,
    },
    warning: {
      badgeColor: "bg-[#E76F51]/20 text-[#E76F51]",
      borderColor: "border-[#E76F51]/30",
      icon: (
        <svg
          className="h-4 w-4 shrink-0 text-[#E76F51]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      role: "status",
      ariaLive: "polite" as const,
    },
    info: {
      badgeColor: "bg-[#1F3D2B]/20 text-[#1F3D2B]",
      borderColor: "border-[#1F3D2B]/30",
      icon: (
        <svg
          className="h-4 w-4 shrink-0 text-[#1F3D2B]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      role: "status",
      ariaLive: "polite" as const,
    },
  }[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`pointer-events-auto w-full rounded-xl bg-[#111111]/95 border ${typeConfig.borderColor} p-3.5 sm:p-4 text-white shadow-2xl backdrop-blur-md flex items-start gap-3`}
      role={typeConfig.role}
      aria-live={typeConfig.ariaLive}
    >
      <div className="mt-0.5">{typeConfig.icon}</div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-white leading-snug">
          {message}
        </p>
        {description && (
          <p className="mt-1 text-xs text-white/70 font-normal leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="text-white/40 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  );
}
