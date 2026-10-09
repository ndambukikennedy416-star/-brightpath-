"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ChangeOwnPasswordSchema } from "@/lib/validations";
import { changeOwnPassword } from "@/lib/actions/students";
import { Card, inputCls } from "@/components/ui";
import { notifyToast } from "@/app/admin/users/_components/Toast";

type PasswordInput = z.infer<typeof ChangeOwnPasswordSchema>;

type ActionResult = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export default function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({
    resolver: zodResolver(ChangeOwnPasswordSchema),
  });

  async function onSubmit(values: PasswordInput) {
    const fd = new FormData();
    fd.set("currentPassword", values.currentPassword);
    fd.set("newPassword", values.newPassword);
    const result = (await changeOwnPassword(fd)) as ActionResult;
    if (!result.ok) {
      if (result.errors) {
        for (const [field, msgs] of Object.entries(result.errors)) {
          setError(field as keyof PasswordInput, { message: msgs.join(", ") });
        }
      } else {
        setError("root", { message: result.message ?? "Could not change password." });
      }
      return;
    }
    reset();
    notifyToast("Password changed.");
  }

  return (
    <Card title="Change password">
      <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-md gap-3 text-sm" noValidate>
        <label className="block">
          <span className="font-medium">Current password (the one Admin gave you)</span>
          <input
            {...register("currentPassword")}
            type="password"
            autoComplete="current-password"
            className={`${inputCls} mt-1`}
          />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-700">{errors.currentPassword.message}</p>
          )}
        </label>
        <label className="block">
          <span className="font-medium">New password (min 8 characters)</span>
          <input
            {...register("newPassword")}
            type="password"
            autoComplete="new-password"
            className={`${inputCls} mt-1`}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-700">{errors.newPassword.message}</p>
          )}
        </label>
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </Card>
  );
}
