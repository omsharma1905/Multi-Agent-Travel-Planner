"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { PageHeader, DeleteAccountModal } from "@/components/product";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, updateProfile, signOut, deleteAccount } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Sync initial name when user loads
  const [prevUser, setPrevUser] = useState(user);
  if (user && user !== prevUser) {
    setPrevUser(user);
    setName(user.name);
  }

  // Route security: redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(ROUTES.signIn);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <AppShell>
        <div className="w-full bg-[#F8F5EE] text-[#111111] min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="h-6 w-6 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin" />
            <p className="font-mono text-xs uppercase tracking-widest text-[#111111]/40">
              Loading account profile...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SX";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrorMessage("Full name must be at least 2 characters long.");
      return;
    }
    if (trimmed.length > 100) {
      setErrorMessage("Full name cannot exceed 100 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({ name: trimmed });
      if (res.success) {
        setSuccessMessage("Profile updated successfully.");
        toast.success("Profile updated successfully.");
      } else {
        const msg = res.error || "We couldn't save your profile changes. Please try again.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "We couldn't save your profile changes. Please check your connection and try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace(ROUTES.signIn);
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async (confirmation: string, password?: string) => {
    setIsDeletingAccount(true);
    setDeleteErrorMessage(null);
    try {
      const res = await deleteAccount(confirmation, password);
      if (res.success) {
        setIsDeleteModalOpen(false);
        toast.success("Your account and associated data have been permanently deleted.");
      } else {
        setDeleteErrorMessage(res.error || "Failed to delete account. Please try again.");
      }
    } catch {
      setDeleteErrorMessage("Network error during account deletion. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <AppShell>
      <div className="w-full bg-[#F8F5EE] text-[#111111] min-h-[calc(100vh-5rem)] pb-24 sm:pb-36">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8 sm:py-12 space-y-12">
          {/* Header */}
          <PageHeader
            category="ACCOUNT"
            title="PROFILE"
            subtitle="Manage your personal travel identity and account preferences across SafariX."
            backHref={ROUTES.dashboard}
            backLabel="RETURN TO MY JOURNEYS"
          />

          {/* Account Card / Personal Identity */}
          <section className="bg-white/60 border border-[#111111]/10 rounded-2xl p-6 sm:p-10 space-y-8 backdrop-blur-sm shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#111111]/10 pb-8">
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl bg-[#1F3D2B] text-white flex items-center justify-center font-display text-xl sm:text-3xl font-bold shadow-md overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#1F3D2B] font-semibold">
                    YOUR ACCOUNT
                  </span>
                  <h2 className="font-display text-xl sm:text-3xl font-bold uppercase tracking-tight text-[#111111] truncate">
                    {user.name}
                  </h2>
                  <p className="font-mono text-xs text-[#111111]/60 truncate">{user.email}</p>
                </div>
              </div>

              <div className="sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-mono text-[11px] uppercase tracking-wider font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTHENTICATED
                </span>
              </div>
            </div>

            {/* Edit Personal Information Form */}
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#111111]">
                  PERSONAL INFORMATION
                </span>
                <p className="text-xs text-[#111111]/60">
                  Update the name displayed across your generated itineraries, commissions, and workspace navigation.
                </p>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] font-mono text-xs">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-mono text-xs">
                  {successMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="profile-name"
                    className="block font-mono text-[11px] uppercase tracking-wider text-[#111111]/80 font-semibold"
                  >
                    FULL NAME
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSaving}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF7F0] border border-[#111111]/15 text-[#111111] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3D2B] transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="profile-email"
                    className="block font-mono text-[11px] uppercase tracking-wider text-[#111111]/80 font-semibold"
                  >
                    ACCOUNT EMAIL
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email}
                    disabled
                    readOnly
                    className="w-full px-4 py-3 rounded-xl bg-black/[0.03] border border-[#111111]/10 text-[#111111]/60 font-mono text-xs cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[#111111]/40 font-mono">
                    Email address is tied to your primary authentication credential.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving || name.trim() === user.name}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1F3D2B] hover:bg-[#14281C] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>SAVING CHANGES...</span>
                    </>
                  ) : (
                    <span>SAVE CHANGES</span>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Account & Security Section */}
          <section className="bg-white/60 border border-[#111111]/10 rounded-2xl p-6 sm:p-10 space-y-6 backdrop-blur-sm shadow-sm">
            <div className="space-y-2 border-b border-[#111111]/10 pb-4">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#111111]">
                SESSION & SECURITY
              </span>
              <p className="text-xs text-[#111111]/60">
                Manage your active device session and sign out of your SafariX workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#111111]">Active Session</p>
                <p className="font-mono text-xs text-[#111111]/50">
                  Signed in on this device. Sign out will terminate your local session cookie.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 hover:bg-[#DC2626] text-[#DC2626] hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>SIGNING OUT...</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    <span>SIGN OUT</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Danger Zone Section */}
          <section className="bg-red-500/[0.03] border border-red-500/20 rounded-2xl p-6 sm:p-10 space-y-6 backdrop-blur-sm shadow-sm">
            <div className="space-y-2 border-b border-red-500/15 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#DC2626]">
                  DANGER ZONE
                </h3>
              </div>
              <p className="text-xs text-[#111111]/60">
                Irreversible actions regarding your SafariX identity and stored travel records.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
              <div className="space-y-1 max-w-xl">
                <p className="text-sm font-semibold text-[#111111]">Delete Account</p>
                <p className="font-mono text-xs text-[#111111]/70 leading-relaxed">
                  Permanently delete your account and associated data. This action cannot be undone.
                </p>
              </div>

              <button
                id="open-delete-account-modal-btn"
                type="button"
                onClick={() => {
                  setDeleteErrorMessage(null);
                  setIsDeleteModalOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#DC2626] bg-[#DC2626] hover:bg-[#b91c1c] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 inline-flex items-center justify-center gap-2 shrink-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                <span>DELETE ACCOUNT</span>
              </button>
            </div>
          </section>

          {/* Safe Confirmation Modal */}
          <DeleteAccountModal
            isOpen={isDeleteModalOpen}
            userEmail={user.email}
            userName={user.name}
            isDeleting={isDeletingAccount}
            errorMessage={deleteErrorMessage}
            onConfirm={handleDeleteAccount}
            onCancel={() => {
              if (!isDeletingAccount) {
                setIsDeleteModalOpen(false);
                setDeleteErrorMessage(null);
              }
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
