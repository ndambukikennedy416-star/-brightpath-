"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

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
