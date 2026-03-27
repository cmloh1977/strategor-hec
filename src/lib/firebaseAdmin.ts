import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // When deployed to Firebase Cloud Functions, ADC works automatically
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var to a service account JSON
  try {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ttc-dna",
    });
  } catch (e) {
    console.error("Firebase Admin init error:", e);
    throw e;
  }
}

const adminApp = initAdmin();
export const adminAuth = getAuth(adminApp);
