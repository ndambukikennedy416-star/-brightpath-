"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { OAUTH_ROLE_COOKIE, signIn } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=InvalidCredentials");
    }
    throw error;
  }
}

// Google OAuth: sign-in only for admin-provisioned accounts.
// Unknown, deactivated, or unapproved Google emails are rejected (no self-registration).
export async function googleSignIn(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";
  try {
    await signIn("google", { redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=AccessDenied");
    }
    throw error;
  }
}

// Google self-signup for students and financial officers only. The chosen
// role is parked in a short-lived cookie that the sign-in callback consumes.
// Students are approved immediately; financial officers need admin approval.
export async function googleSignUp(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  if (role !== "student" && role !== "financial_officer") {
    redirect("/signup?error=role");
  }
  const store = await cookies();
  store.set(OAUTH_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  try {
    await signIn("google", { redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=AccessDenied");
    }
    throw error;
  }
}
