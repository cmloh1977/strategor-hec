import { NextRequest, NextResponse } from "next/server";

// Use the Firebase REST API to update the admin record
// This works in both dev (no service account) and production
const FIREBASE_PROJECT_ID = "ttc-dna";
const FIRESTORE_DB = "strategor-galp";

export async function POST(req: NextRequest) {
  try {
    const { uid, newPassword } = await req.json();

    if (!uid || !newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "Missing uid or newPassword" }, { status: 400 });
    }

    // Use admin SDK for Firestore update
    // Import dynamically to avoid initialization errors
    const { adminDb } = await import("@/lib/firebaseAdmin");
    
    const docRef = adminDb.collection("_admin_users").doc(uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      await docRef.update({ password: newPassword });
      console.log(`✅ Admin record password synced for uid=${uid}`);
      return NextResponse.json({ success: true });
    } else {
      console.warn(`⚠️ No _admin_users record found for uid=${uid}`);
      return NextResponse.json({ success: false, error: "No admin record found" }, { status: 404 });
    }
  } catch (err: any) {
    console.error("❌ sync-password error:", err.code, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
