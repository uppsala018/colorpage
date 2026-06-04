"use client";

import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithCredential,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
  "1054611833033-6db8luo03d1f9oe5lknavripr2qqjlpq.apps.googleusercontent.com";

type CredentialResponse = {
  credential?: string;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
          logo_alignment?: "left" | "center";
          width?: number;
        }
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let googleScriptPromise: Promise<GoogleIdentity> | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

      const finish = () => {
        if (window.google?.accounts?.id) resolve(window.google);
        else reject(new Error("Google sign-in could not be loaded."));
      };

      if (existing) {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("Google sign-in could not be loaded.")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export function GoogleSignInButton({
  auth,
  disabled,
  text = "continue_with",
  onStart,
  onSuccess,
  onError,
}: {
  auth: Auth | null;
  disabled?: boolean;
  text?: "signin_with" | "signup_with" | "continue_with";
  onStart?: () => void;
  onSuccess: (result: UserCredential) => void | Promise<void>;
  onError: (error: unknown) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onStart, onSuccess, onError });
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onStart, onSuccess, onError };
  }, [onStart, onSuccess, onError]);

  useEffect(() => {
    if (!auth || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;
    container.replaceChildren();
    setReady(false);

    loadGoogleIdentity()
      .then((google) => {
        if (cancelled) return;

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (response) => {
            if (!response.credential) {
              callbacksRef.current.onError(new Error("Google did not return an ID token."));
              return;
            }

            setLoading(true);
            callbacksRef.current.onStart?.();
            try {
              const credential = GoogleAuthProvider.credential(response.credential);
              const result = await signInWithCredential(auth, credential);
              await callbacksRef.current.onSuccess(result);
            } catch (error) {
              callbacksRef.current.onError(error);
              setLoading(false);
            }
          },
        });

        google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.max(240, Math.min(container.clientWidth || 320, 400)),
        });
        setReady(true);
      })
      .catch((error) => {
        callbacksRef.current.onError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [auth, text]);

  return (
    <div className="w-full">
      {(!ready || disabled || loading) && (
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-3 border border-ink-200 bg-white text-foreground font-body font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {!auth ? "Google unavailable" : loading ? "Signing in..." : "Loading Google..."}
        </button>
      )}
      <div
        ref={containerRef}
        className={`w-full min-h-[44px] flex justify-center ${
          !ready || disabled || loading ? "hidden" : ""
        }`}
      />
    </div>
  );
}
