const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/features/auth/components/AuthCard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ensure import of StitchIcon exists
if (!content.includes('import { StitchIcon }')) {
  content = content.replace(
    'import { useToast } from "@/components/ui/Toast";',
    'import { useToast } from "@/components/ui/Toast";\r\nimport { StitchIcon } from "@/components/landing/stitch/StitchIcon";'
  );
}

// 2. Adjust card container class on mobile to allow natural height and deep obsidian background
content = content.replace(
  'className="relative w-full rounded-2xl bg-[#F4F1E5] border border-white/15 shadow-[0_35px_90px_-20px_rgba(0,0,0,0.95)] overflow-hidden min-h-[540px] md:h-[530px] lg:h-[540px]"',
  'className="relative w-full rounded-2xl md:bg-[#F4F1E5] bg-[#0c1311] border border-white/10 md:border-white/15 shadow-[0_35px_90px_-20px_rgba(0,0,0,0.95)] overflow-hidden md:h-[530px] lg:h-[540px]"'
);

// 3. Replace mobile view from start marker to end of mobile view
const startMarker = '{/* ========================================================================= */}\r\n        {/* MOBILE VIEW: Compact Responsive Stack with Segment Switcher               */}\r\n        {/* ========================================================================= */}';

const mobileCode = `{/* ========================================================================= */}
        {/* MOBILE VIEW: Premium Immersive Experience with Segment Switcher           */}
        {/* ========================================================================= */}
        <div className="flex md:hidden flex-col w-full text-[#FBFBFA]">
          {/* Top Decorative Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0E2A24]/60 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D4AF37]/10 blur-2xl rounded-full pointer-events-none" />

          {/* Branded Mobile Header */}
          <div className="p-5 sm:p-6 pb-4 relative z-10 border-b border-white/10 bg-[#081C1B]/80 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#0E2A24] border border-[#E9C349]/40 flex items-center justify-center text-[#E9C349]">
                  <StitchIcon name="explore" className="w-3.5 h-3.5" />
                </span>
                <span className="font-headline-md text-lg tracking-tight text-[#FBFBFA]">
                  SAFARI<span className="text-[#E9C349]">X</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#E9C349]/80 bg-[#0E2A24] px-2 py-0.5 rounded-full border border-[#E9C349]/20 ml-1">
                  PORTAL
                </span>
              </div>
              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="font-mono text-[10px] uppercase tracking-wider text-[#E9C349] hover:underline px-2 py-1 rounded bg-white/5 border border-white/10"
                >
                  Demo Fill
                </button>
              )}
            </div>

            {/* Travel Coordinates Watermark */}
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-[#FBFBFA]/40 mb-3">
              <span>EXPEDITION ARCHIVE</span>
              <span>20.84° N · 107.04° E</span>
            </div>

            {/* Welcome Heading & Message */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-1"
            >
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#FBFBFA] leading-tight">
                {isSignUp ? (
                  <>
                    Start your{" "}
                    <span className="font-serif italic font-normal text-[#E9C349]">
                      next journey.
                    </span>
                  </>
                ) : (
                  <>
                    Welcome{" "}
                    <span className="font-serif italic font-normal text-[#E9C349]">
                      back.
                    </span>
                  </>
                )}
              </h3>
              <p className="text-xs text-[#FBFBFA]/70 leading-relaxed font-light">
                {isSignUp
                  ? "Create your account for personalized sanctuaries, itineraries & agent orchestration."
                  : "Access your saved expeditions and synchronized agent travel dossiers."}
              </p>
            </motion.div>

            {/* Segment Toggle */}
            <div className="mt-4 grid grid-cols-2 rounded-full bg-black/40 p-1 border border-white/10 text-center font-mono text-xs uppercase tracking-wider relative shadow-inner">
              <button
                type="button"
                data-testid="mobile-tab-signin"
                onClick={handleSwitchToSignIn}
                className={\`py-2 rounded-full transition-all font-semibold flex items-center justify-center gap-1.5 \${
                  !isSignUp
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#E9C349] text-[#081C1B] shadow-md"
                    : "text-[#FBFBFA]/70 hover:text-white"
                }\`}
              >
                <span>Sign in</span>
              </button>
              <button
                type="button"
                data-testid="mobile-tab-signup"
                onClick={handleSwitchToSignUp}
                className={\`py-2 rounded-full transition-all font-semibold flex items-center justify-center gap-1.5 \${
                  isSignUp
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#E9C349] text-[#081C1B] shadow-md"
                    : "text-[#FBFBFA]/70 hover:text-white"
                }\`}
              >
                <span>Sign up</span>
              </button>
            </div>
          </div>

          {/* Form Content in Deep Teal Glass */}
          <div className="p-5 sm:p-6 relative z-10 flex-1">
            {!isSignUp ? (
              /* Mobile Sign In Form */
              <motion.form
                key="mobile-signin"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignInSubmit}
                noValidate
                className="space-y-4"
              >
                {signInError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-200 flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-red-500/30 flex items-center justify-center text-[10px] font-bold">!</span>
                    <span>{signInError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="mobile-signin-email"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3.5 min-h-[46px]">
                    <StitchIcon name="mail" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signin-email"
                      type="email"
                      autoComplete="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={isSubmittingSignIn}
                      placeholder="traveler@safarix.com"
                      className="w-full bg-transparent text-sm text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2.5"
                    />
                  </div>
                  {signInErrors.email && (
                    <p className="mt-1 font-mono text-[11px] text-red-400 pl-1">{signInErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="mobile-signin-password"
                      className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Password Recovery", "Instructions sent to registered email.")
                      }
                      className="font-mono text-[10px] text-[#E9C349] hover:underline tracking-wider"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3.5 min-h-[46px]">
                    <StitchIcon name="lock" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      disabled={isSubmittingSignIn}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2.5 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FBFBFA]/60 hover:text-[#FBFBFA] p-1 text-xs"
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      <StitchIcon name={showSignInPassword ? "visibility_off" : "visibility"} className="w-4 h-4" />
                    </button>
                  </div>
                  {signInErrors.password && (
                    <p className="mt-1 font-mono text-[11px] text-red-400 pl-1">
                      {signInErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSignIn}
                  className="w-full mt-3 min-h-[48px] rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E9C349] to-[#D4AF37] text-[#081C1B] font-title-md text-sm font-bold shadow-[0_12px_24px_-6px_rgba(233,195,73,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingSignIn ? (
                    <>
                      <StitchIcon name="refresh" className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to SafariX</span>
                      <StitchIcon name="arrow_forward" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              /* Mobile Sign Up Form */
              <motion.form
                key="mobile-signup"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignUpSubmit}
                noValidate
                className="space-y-3"
              >
                {signUpError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-200 flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-red-500/30 flex items-center justify-center text-[10px] font-bold">!</span>
                    <span>{signUpError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="mobile-signup-name"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Full name
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="person" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-name"
                      type="text"
                      autoComplete="name"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={isSubmittingSignUp}
                      placeholder="Elena Rostova"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2"
                    />
                  </div>
                  {signUpErrors.name && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">{signUpErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-email"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="mail" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-email"
                      type="email"
                      autoComplete="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={isSubmittingSignUp}
                      placeholder="traveler@safarix.com"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2"
                    />
                  </div>
                  {signUpErrors.email && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">{signUpErrors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-password"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Password (min 8 chars)
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="lock" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      disabled={isSubmittingSignUp}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#FBFBFA]/60 hover:text-[#FBFBFA] p-1 text-xs"
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      <StitchIcon name={showSignUpPassword ? "visibility_off" : "visibility"} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {signUpErrors.password && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">
                      {signUpErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile-signup-confirm"
                    className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FBFBFA]/75 mb-1"
                  >
                    Confirm password
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:bg-white/10 focus-within:border-[#E9C349] focus-within:ring-2 focus-within:ring-[#E9C349]/20 transition-all px-3 min-h-[44px]">
                    <StitchIcon name="verified" className="w-4 h-4 text-[#E9C349]/70 flex-shrink-0" />
                    <input
                      id="mobile-signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={signUpData.confirmPassword}
                      onChange={(e) =>
                        setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      disabled={isSubmittingSignUp}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-xs text-[#FBFBFA] placeholder:text-[#FBFBFA]/30 outline-none pl-2 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#FBFBFA]/60 hover:text-[#FBFBFA] p-1 text-xs"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <StitchIcon name={showConfirmPassword ? "visibility_off" : "visibility"} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {signUpErrors.confirmPassword && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-400 pl-1">
                      {signUpErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSignUp}
                  className="w-full mt-3 min-h-[48px] rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E9C349] to-[#D4AF37] text-[#081C1B] font-title-md text-sm font-bold shadow-[0_12px_24px_-6px_rgba(233,195,73,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingSignUp ? (
                    <>
                      <StitchIcon name="refresh" className="w-4 h-4 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create SafariX Account</span>
                      <StitchIcon name="arrow_forward" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </div>
        </div>`;

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error("Start marker not found!");
  process.exit(1);
}

// Find closing tag of mobile div before line 954
const endMarker = '</div>\r\n      </div>\r\n\r\n      {/* Bottom privacy and terms footer */}';
const endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error("End marker not found!");
  process.exit(1);
}

const newContent = content.substring(0, startIndex) + mobileCode.replace(/\n/g, '\r\n') + '\r\n      ' + content.substring(endIndex + 7);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully updated AuthCard.tsx mobile layout!");
