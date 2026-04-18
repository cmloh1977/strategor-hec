// Use dynamic imports to prevent Turbopack from mangling firebase-admin package names
let _adminAuth: any = null;
let _adminDb: any = null;
let _initialized = false;

async function initAdmin() {
  if (_initialized) return;
  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore } = await import("firebase-admin/firestore");

  let app;
  if (getApps().length === 0) {
    app = initializeApp({ projectId: "ttc-dna" });
  } else {
    app = getApps()[0];
  }

  _adminAuth = getAuth(app);
  _adminDb = getFirestore(app, "strategor-galp");
  _initialized = true;
}

export async function getAdminAuth() {
  await initAdmin();
  return _adminAuth;
}

export async function getAdminDb() {
  await initAdmin();
  return _adminDb;
}
