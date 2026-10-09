"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { CreatePartnerSchema } from "@/lib/validations";
import { createPartner } from "@/lib/actions/admin";
import { Card, inputCls } from "@/components/ui";
import { notifyToast } from "./Toast";

type PartnerInput = z.infer<typeof CreatePartnerSchema>;

type ActionResult = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  userId?: string;
};

export default function PartnerForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartnerInput>({
    resolver: zodResolver(CreatePartnerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      partnerType: "SCHOOL",
      organizationName: "",
      bankDetails: "",
    },
  });

  async function onSubmit(values: PartnerInput) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("email", values.email);
    fd.set("password", values.password);
    fd.set("partnerType", values.partnerType);
    fd.set("organizationName", values.organizationName);
    if (values.bankDetails) fd.set("bankDetails", values.bankDetails);
    const result = (await createPartner(fd)) as ActionResult;
    if (!result.ok) {
      if (result.errors) {
        for (const [field, msgs] of Object.entries(result.errors)) {
          setError(field as keyof PartnerInput, { message: msgs.join(", ") });
        }
      } else {
        setError("root", { message: result.message ?? "Could not create partner." });
      }
      return;
    }
    reset();
    notifyToast("Partner account created.");
    router.refresh();
  }

  return (
    <Card title="Create partner (school / landlord)">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 text-sm" noValidate>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3">
          <legend className="px-1 font-medium">Contact</legend>
          <label className="block">
            <span className="font-medium">Contact name</span>
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
          <legend className="px-1 font-medium">Organization</legend>
          <label className="block">
            <span className="font-medium">Type</span>
            <select {...register("partnerType")} className={`${inputCls} mt-1`}>
              <option value="SCHOOL">SCHOOL</option>
              <option value="LANDLORD">LANDLORD</option>
            </select>
            {errors.partnerType && (
              <p className="mt-1 text-xs text-red-700">{errors.partnerType.message}</p>
            )}
          </label>
          <label className="block">
            <span className="font-medium">Organization</span>
            <input {...register("organizationName")} className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.organizationName && (
              <p className="mt-1 text-xs text-red-700">{errors.organizationName.message}</p>
            )}
          </label>
        </fieldset>
        <details className="rounded-lg border border-stone-200 p-3">
          <summary className="cursor-pointer font-medium">Bank details (optional)</summary>
          <label className="mt-3 block">
            <span className="font-medium">Bank details</span>
            <textarea {...register("bankDetails")} rows={3} className={`${inputCls} mt-1`} />
            {errors.bankDetails && (
              <p className="mt-1 text-xs text-red-700">{errors.bankDetails.message}</p>
            )}
          </label>
        </details>
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create partner"}
          </button>
        </div>
      </form>
    </Card>
  );
}
