'use client';

import * as React from 'react';
import { authClient } from '@/lib/auth-client';
import { Loader2, Mail, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [isPending, setIsPending] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);
  const [useOtp, setUseOtp] = React.useState(false);

  React.useEffect(() => {
    // Clear any lingering impersonation cookies when accessing the login page
    document.cookie = 'impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'dev_impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
  }, []);

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsPending(true);
    try {
      const { error } = await authClient.signIn.magicLink({
        email: email.trim().toLowerCase(),
        callbackURL: '/dashboard',
      });

      if (error) {
        toast.error(error.message || 'Failed to send magic link. Please check your email.');
      } else {
        setIsSent(true);
        toast.success('Magic link sent successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !otpCode) return;

    setIsPending(true);
    try {
      // Prepared for V1.5 OTP verification
      toast.info('OTP verification is being enabled. Please use the Magic Link sent to your email.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1d] bg-[url('/images/admin-login-bg.png')] bg-cover bg-center bg-no-repeat bg-fixed px-4 py-12 font-sans text-foreground">
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/60 mix-blend-multiply pointer-events-none" />
      
      {/* Glow Effects */}
      <div className="absolute -left-1/4 -top-1/4 h-[80vh] w-[80vh] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute -right-1/4 -bottom-1/4 h-[80vh] w-[80vh] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Brand / Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="size-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">PMG Control Center</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Internal management platform for billing, finance, and project tracking.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl">
          {isSent ? (
            <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-300">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
                <Mail className="size-6 animate-pulse" />
              </div>
              <h2 className="text-lg font-semibold text-white">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We've sent a secure, passwordless login link to <span className="font-medium text-blue-400">{email}</span>.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The link is valid for 24 hours.
              </p>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="mt-6 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={useOtp ? handleVerifyOtp : handleSendMagicLink} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {useOtp ? 'Sign in with a code' : 'Welcome back'}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {useOtp
                    ? 'Enter the 6-digit code sent to your email.'
                    : 'Enter your registered email address to receive a secure login link.'}
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                    <Mail className="size-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    required
                    disabled={isPending}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
                  />
                </div>

                {/* OTP Code Input (Conditional) */}
                {useOtp && (
                  <div className="relative animate-in slide-in-from-top-2 duration-200">
                    <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                      <KeyRound className="size-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="6-digit code"
                      maxLength={6}
                      required
                      disabled={isPending}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-white placeholder-muted-foreground/50 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 tracking-widest font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending || !email}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span>{useOtp ? 'Verify & Sign In' : 'Send Login Link'}</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              {/* Toggle Login Method */}
              <div className="text-center pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setUseOtp(!useOtp)}
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  {useOtp ? 'Use magic link instead' : 'Use a 6-digit code instead'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          Security provided by Better Auth. Unauthorized access is strictly prohibited.
        </p>
      </div>
    </div>
  );
}
