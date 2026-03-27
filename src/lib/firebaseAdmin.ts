import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

if (getApps().length === 0) {
  // On Firebase Cloud Functions, ADC is automatic — no credentials needed.
  // Just pass the project ID.
  adminApp = initializeApp({
    projectId: "ttc-dna",
  });
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
