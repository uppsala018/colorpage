import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

function normalizePrivateKey(privateKey: string | undefined): string | undefined {
  if (!privateKey) return undefined;
  return privateKey
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");
}

let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_adminAuth) _adminAuth = getAuth(getAdminApp());
    return (_adminAuth as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_adminDb) _adminDb = getFirestore(getAdminApp());
    return (_adminDb as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_adminStorage) _adminStorage = getStorage(getAdminApp());
    return (_adminStorage as unknown as Record<string | symbol, unknown>)[prop];
  },
});
