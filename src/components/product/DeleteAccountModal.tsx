"use client";

import { useState, useEffect, useRef } from "react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  userEmail: string;
  userName: string;
  isDeleting: boolean;
  errorMessage: string | null;
  onConfirm: (confirmation: string, password?: string) => void;
  onCancel: () => void;
}

export function DeleteAccountModal({
  isOpen,
  userEmail,
  userName,
  isDeleting,
  errorMessage,
  onConfirm,
  onCancel,
}: DeleteAccountModalProps) {
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleClose = () => {
    setConfirmKeyword("");
    setPassword("");
    onCancel();
  };

  // Handle Escape key to safely close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        setConfirmKeyword("");
        setPassword("");
        onCancel();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  const isConfirmed = confirmKeyword.trim() === "DELETE";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    onConfirm(confirmKeyword.trim(), password || undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-modal-title"
      aria-describedby="delete-account-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-[#FAF7F0] border border-[#111111]/15 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#DC2626] animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#DC2626] font-semibold">
              IRREVERSIBLE ACTION
            </span>
          </div>
          <h3
            id="delete-account-modal-title"
            className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#111111]"
          >
            DELETE ACCOUNT
          </h3>
          <p id="delete-account-modal-description" className="text-xs text-[#111111]/70 leading-relaxed">
            You are about to permanently delete your account (<strong className="text-[#111111]">{userEmail}</strong>)
            and all associated SafariX data.
          </p>
        </div>

        {/* Breakdown of Deleted Assets */}
        <div className="p-4 rounded-xl bg-red-500/[0.04] border border-red-500/15 space-y-2.5 text-xs text-[#111111]/80">
          <p className="font-semibold text-[#111111] font-mono uppercase tracking-wider text-[11px]">
            The following data will be permanently purged:
          </p>
          <ul className="space-y-1.5 list-disc list-inside font-sans text-xs text-[#111111]/70">
            <li>Your traveler profile and identity (<span className="font-mono text-[11px]">{userName}</span>)</li>
            <li>All upcoming, completed, and draft journey itineraries</li>
            <li>Travel preferences, custom activity selections, and lodging records</li>
            <li>All version history, revision snapshots, and cost estimates</li>
            <li>Active device sessions and authentication credentials</li>
          </ul>
        </div>

        {/* Error notification if server returned an error */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] font-mono text-xs flex items-start gap-2"
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Confirmation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-delete-input"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#111111]/80 font-semibold"
            >
              TYPE <span className="text-[#DC2626] font-bold">DELETE</span> TO CONFIRM
            </label>
            <input
              id="confirm-delete-input"
              ref={inputRef}
              type="text"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              disabled={isDeleting}
              placeholder="DELETE"
              autoComplete="off"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#111111]/20 text-[#111111] font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-[#DC2626] disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password-input"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#111111]/80 font-semibold"
            >
              ACCOUNT PASSWORD <span className="font-normal text-[#111111]/40">(OPTIONAL RE-AUTH)</span>
            </label>
            <input
              id="confirm-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDeleting}
              placeholder="Enter password if required"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#111111]/20 text-[#111111] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626] disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#111111]/10">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#111111]/15 font-mono text-xs uppercase tracking-wider text-[#111111]/70 hover:text-[#111111] hover:bg-black/5 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#111111]/20"
            >
              CANCEL
            </button>
            <button
              id="permanently-delete-btn"
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#b91c1c] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2"
            >
              {isDeleting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>DELETING ACCOUNT...</span>
                </>
              ) : (
                <span>PERMANENTLY DELETE ACCOUNT</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
