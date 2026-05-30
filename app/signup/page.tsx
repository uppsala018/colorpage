"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, isDemoMode, createUserProfile } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

function authErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/popup-closed-by-user": "",
    "auth/cancelled-popup-request": "",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

const googleProvider = new GoogleAuthProvider();

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function handleGoogle() {
    setError("");
    if (!auth) {
      setError("Firebase is not configured. Add your API keys to .env.local to enable sign-up.");
      return;
    }
    setGoogleLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await createUserProfile(user);
      router.push(returnTo);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg = authErrorMessage(code);
      if (msg) setError(msg);
    } finally {
      setGoogleLoading(false);
    }
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

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-ink-200 hover:border-ink-400 bg-white text-foreground font-body font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="mt-7 text-center text-ink-400 text-sm font-body">
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
