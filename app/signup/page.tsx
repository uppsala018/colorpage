"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth, isDemoMode, createUserProfile } from "@/lib/firebase";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useRouter, useSearchParams } from "next/navigation";

function authErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/unauthorized-domain": "This domain is not authorized for Google sign-in.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email. Log in with email and password first.",
    "auth/credential-already-in-use": "This Google account is already linked to another user.",
    "auth/operation-not-allowed": "Google sign-in is not enabled for this Firebase project.",
  };
  return map[code] ?? `Something went wrong. ${code ? `(${code})` : "Please try again."}`;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  async function finishSignedIn(user: User) {
    await createUserProfile(user).catch(() => {});
    router.replace(returnTo);
  }

  useEffect(() => {
    if (!auth) { setAuthChecking(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) await finishSignedIn(u);
      setAuthChecking(false);
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnTo, router]);

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!auth) {
      setError("Firebase is not configured. Add your API keys to .env.local to enable sign-up.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(user);
      router.push(returnTo);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg = authErrorMessage(code);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(result: UserCredential) {
    await finishSignedIn(result.user);
  }

  function handleGoogleStart() {
    setError("");
    setGoogleLoading(true);
  }

  function handleGoogleError(err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    const msg = authErrorMessage(code);
    if (msg) setError(msg);
    setGoogleLoading(false);
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-ink-100 px-8 py-10">
        <p className="font-display text-2xl font-semibold text-coral-500 mb-6 text-center">
          ColoringAI
        </p>

        {isDemoMode && (
          <div className="bg-ink-100 border border-ink-200 rounded-xl px-4 py-3 mb-6">
            <p className="font-body text-sm text-ink-600 font-medium">Demo mode</p>
            <p className="font-body text-xs text-ink-400 mt-0.5">
              Add Firebase keys to <code className="font-mono">.env.local</code> to enable sign-up.
            </p>
          </div>
        )}

        <h1 className="font-display text-3xl font-semibold text-foreground mb-1">
          Create your account
        </h1>
        <p className="font-body text-ink-400 text-sm mb-7">
          Free to start. No credit card required.
        </p>

        <form onSubmit={handleEmailSignup} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-ink-200 rounded-xl px-4 py-3 font-body text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-coral-500"
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-ink-200 rounded-xl px-4 py-3 font-body text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-coral-500"
          />
          {error && (
            <p role="alert" className="text-coral-500 text-sm font-body">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white font-body font-semibold py-3 rounded-xl transition-colors mt-1"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-ink-200" />
          <span className="font-body text-ink-400 text-xs">or</span>
          <div className="flex-1 h-px bg-ink-200" />
        </div>

        <GoogleSignInButton
          auth={auth}
          disabled={googleLoading || authChecking}
          text="signup_with"
          onStart={handleGoogleStart}
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        <p className="mt-5 text-center text-ink-400 text-sm font-body">
          Already have an account?{" "}
          <Link
            href={`/login${returnTo !== "/dashboard" ? `?returnTo=${returnTo}` : ""}`}
            className="text-coral-500 hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
