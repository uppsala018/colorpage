"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  type AuthCredential,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth, isDemoMode, createUserProfile } from "@/lib/firebase";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useRouter, useSearchParams } from "next/navigation";

function authErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Wrong password. Try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-idp-response": "Google rejected this sign-in response. Try again.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/unauthorized-domain": "This domain is not authorized for Google sign-in.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email. Enter its password once to connect Google.",
    "auth/credential-already-in-use": "This Google account is already linked to another user.",
    "auth/operation-not-allowed": "Google sign-in is not enabled for this Firebase project.",
  };
  return map[code] ?? `Something went wrong. ${code ? `(${code})` : "Please try again."}`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] =
    useState<AuthCredential | null>(null);
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState("");
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

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!auth) {
      setError("Firebase is not configured. Add your API keys to .env.local to enable login.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (pendingGoogleCredential) {
        try {
          await linkWithCredential(user, pendingGoogleCredential);
          setPendingGoogleCredential(null);
          setPendingGoogleEmail("");
        } catch (linkErr: unknown) {
          const linkCode = (linkErr as { code?: string }).code ?? "";
          if (
            linkCode !== "auth/provider-already-linked" &&
            linkCode !== "auth/credential-already-in-use"
          ) {
            setError("Email login worked, but Google could not be connected. Try Google again.");
            return;
          }
        }
      }
      await createUserProfile(user).catch(() => {});
      router.replace(returnTo);
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
    setPendingGoogleCredential(null);
    setPendingGoogleEmail("");
  }

  function handleGoogleError(err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    const credential = GoogleAuthProvider.credentialFromError(
      err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
    );
    const existingEmail =
      (err as { customData?: { email?: string } }).customData?.email ?? "";
    if (code === "auth/account-exists-with-different-credential" && credential) {
      setPendingGoogleCredential(credential);
      setPendingGoogleEmail(existingEmail);
      if (existingEmail) setEmail(existingEmail);
    }
    const msg = authErrorMessage(code);
    if (msg) setError(msg);
    setGoogleLoading(false);
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-ink-100 px-8 py-10">
        <p className="font-display text-2xl font-semibold text-coral-500 mb-6 text-center">
          Color Printables
        </p>

        {isDemoMode && (
          <div className="bg-ink-100 border border-ink-200 rounded-xl px-4 py-3 mb-6">
            <p className="font-body text-sm text-ink-600 font-medium">Demo mode</p>
            <p className="font-body text-xs text-ink-400 mt-0.5">
              Add Firebase keys to <code className="font-mono">.env.local</code> to enable login.
            </p>
          </div>
        )}

        <h1 className="font-display text-3xl font-semibold text-foreground mb-1">
          Welcome back
        </h1>
        <p className="font-body text-ink-400 text-sm mb-7">
          Log in to your account.
        </p>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
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
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-ink-200 rounded-xl px-4 py-3 font-body text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-coral-500"
          />
          {error && (
            <p role="alert" className="text-coral-500 text-sm font-body">
              {error}
            </p>
          )}
          {pendingGoogleCredential && (
            <p className="text-ink-500 text-xs font-body leading-relaxed">
              Google is ready to connect
              {pendingGoogleEmail ? ` for ${pendingGoogleEmail}` : ""}. Enter
              the account password once, then future Google logins will use the
              same account.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white font-body font-semibold py-3 rounded-xl transition-colors mt-1"
          >
            {loading ? "Logging in…" : "Log in"}
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
          onStart={handleGoogleStart}
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        <p className="mt-5 text-center text-ink-400 text-sm font-body">
          No account?{" "}
          <Link
            href={`/signup${returnTo !== "/dashboard" ? `?returnTo=${returnTo}` : ""}`}
            className="text-coral-500 hover:underline font-medium"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
