"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { firebaseConfig } from "./config";

let firebaseAuth: Auth | null = null;

export function getFirebaseClientApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;

  firebaseAuth = initializeAuth(getFirebaseClientApp(), {
    // Safari can close an IndexedDB connection while the Google login page is
    // displayed. Avoid Firebase Auth's default IndexedDB persistence so the
    // returning page can always restore the signed-in user.
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  return firebaseAuth;
}
