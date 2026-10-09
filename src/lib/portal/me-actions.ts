"use server";

import { revalidatePath } from "next/cache";
import { requirePortalRole } from "@/lib/portal/server";

export async function saveResource(formData: FormData) {
  const ctx = await requirePortalRole("monitor_evaluator", "admin");
  if (!ctx) return { ok: false, message: "M&E only" };
  if (ctx.profile.role !== "monitor_evaluator") {
    return { ok: false, message: "M&E only" };
  }
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 3 || body.length < 10) {
    return { ok: false, message: "Title (min 3) and content (min 10) are required." };
  }
  const { error } = await ctx.supabase.from("financial_literacy_resources").insert({
    title,
    body,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/portal/me");
  return { ok: true };
}

export async function deleteResource(formData: FormData) {
  const ctx = await requirePortalRole("monitor_evaluator");
  if (!ctx) return { ok: false, message: "M&E only" };
  const id = String(formData.get("resourceId") ?? "");
  if (!id) return { ok: false, message: "Missing resource." };
  const { error } = await ctx.supabase.from("financial_literacy_resources").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/portal/me");
  return { ok: true };
}
