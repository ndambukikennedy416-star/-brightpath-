"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { CreateStaffSchema } from "@/lib/validations";
import { createStaff } from "@/lib/actions/admin";
import { Card, inputCls } from "@/components/ui";
import { notifyToast } from "./Toast";

type StaffInput = z.infer<typeof CreateStaffSchema>;

type ActionResult = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  userId?: string;
};

export default function StaffForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffInput>({
    resolver: zodResolver(CreateStaffSchema),
    defaultValues: { name: "", email: "", password: "", role: "FINANCE_OFFICER" },
  });

  async function onSubmit(values: StaffInput) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("email", values.email);
    fd.set("password", values.password);
    fd.set("role", values.role);
    const result = (await createStaff(fd)) as ActionResult;
    if (!result.ok) {
      if (result.errors) {
        for (const [field, msgs] of Object.entries(result.errors)) {
          setError(field as keyof StaffInput, { message: msgs.join(", ") });
        }
      } else {
        setError("root", { message: result.message ?? "Could not create account." });
      }
      return;
    }
    reset();
    notifyToast("Account created.");
    router.refresh();
  }

  return (
    <Card title="Create staff / donor">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 text-sm" noValidate>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3">
          <legend className="px-1 font-medium">Account</legend>
          <label className="block">
            <span className="font-medium">Name</span>
            <input {...register("name")} className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
          </label>
          <label className="block">
            <span className="font-medium">Email</span>
            <input {...register("email")} type="email" className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
          </label>
          <label className="block">
            <span className="font-medium">Password (min 8 characters)</span>
            <input {...register("password")} type="password" className={`${inputCls} mt-1`} autoComplete="new-password" />
            {errors.password && <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
          </label>
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3">
          <legend className="px-1 font-medium">Role</legend>
          <label className="block">
            <span className="font-medium">Role</span>
            <select {...register("role")} className={`${inputCls} mt-1`}>
              <option value="FINANCE_OFFICER">FINANCE_OFFICER</option>
              <option value="FIELD_AGENT">FIELD_AGENT</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DONOR">DONOR</option>
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-700">{errors.role.message}</p>}
          </label>
        </fieldset>
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </Card>
  );
}
