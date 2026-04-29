import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { MASTER_EMAIL } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, adminEmail } = body;

    // Verify the request is from the admin
    if (adminEmail?.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "create") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      try {
        const userRecord = await adminAuth.createUser({
          email: email.trim(),
          password: password,
          emailVerified: true,
        });

        return NextResponse.json({
          success: true,
          uid: userRecord.uid,
          email: userRecord.email,
        });
      } catch (createError: any) {
        if (createError.code === "auth/email-already-exists") {
          return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
        }
        if (createError.code === "auth/invalid-email") {
          return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
        }
        if (createError.code === "auth/weak-password") {
          return NextResponse.json({ error: "Password is too weak. Use at least 6 characters." }, { status: 400 });
        }
        throw createError;
      }
    }

    if (action === "list") {
      const listResult = await adminAuth.listUsers(100);
      const users = listResult.users.map((u: any) => ({
        uid: u.uid,
        email: u.email || "",
        disabled: u.disabled,
        createdAt: u.metadata.creationTime || "",
        lastSignIn: u.metadata.lastSignInTime || "",
      }));
      return NextResponse.json({ users });
    }

    if (action === "delete") {
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      // Don't allow deleting the admin
      if (email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
        return NextResponse.json({ error: "Cannot delete the admin account" }, { status: 403 });
      }
      try {
        const userRecord = await adminAuth.getUserByEmail(email.trim());
        await adminAuth.deleteUser(userRecord.uid);
        return NextResponse.json({ success: true });
      } catch (delError: any) {
        if (delError.code === "auth/user-not-found") {
          return NextResponse.json({ error: "User not found." }, { status: 404 });
        }
        throw delError;
      }
    }

    if (action === "resetPassword") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
      }
      try {
        const userRecord = await adminAuth.getUserByEmail(email.trim());
        await adminAuth.updateUser(userRecord.uid, { password });
        return NextResponse.json({ success: true });
      } catch (rpError: any) {
        if (rpError.code === "auth/user-not-found") {
          return NextResponse.json({ error: "User not found." }, { status: 404 });
        }
        throw rpError;
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
