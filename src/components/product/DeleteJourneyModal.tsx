"use client";

import { useEffect, useRef } from "react";

interface DeleteJourneyModalProps {
  isOpen: boolean;
  destination: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteJourneyModal({
  isOpen,
  destination,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteJourneyModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onCancel();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[#FAF7F0] border border-[#111111]/15 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150"
      >
        <div className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#DC2626] font-semibold">
            PERMANENT ACTION
          </span>
          <h3
            id="delete-modal-title"
            className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]"
          >
            DELETE JOURNEY?
          </h3>
          <p className="text-sm text-[#111111]/70 leading-relaxed">
            This will permanently remove your journey to{" "}
            <span className="font-semibold text-[#111111]">{destination}</span> and its
            generated itinerary. This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#111111]/15 font-mono text-xs uppercase tracking-wider text-[#111111]/70 hover:text-[#111111] hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#b91c1c] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>DELETING...</span>
              </>
            ) : (
              <span>DELETE JOURNEY</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
