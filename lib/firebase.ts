import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import type { User } from "firebase/auth";

export const isDemoMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

if (!isDemoMode) {
  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
  _auth = getAuth(app);
  _db = getFirestore(app);
  _storage = getStorage(app);
}

export const auth: Auth | null = _auth;
export const db: Firestore | null = _db;
export const storage: FirebaseStorage | null = _storage;

export async function createUserProfile(user: User): Promise<void> {
  if (!_db) return;
  const today = new Date().toISOString().split("T")[0];
  await setDoc(
    doc(_db, "users", user.uid),
    {
      email: user.email ?? "",
      plan: "free",
      credits: 0,
      freeExportsToday: 0,
      lastExportDate: today,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
