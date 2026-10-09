"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { UpdateOwnProfileSchema } from "@/lib/validations";
import { updateOwnProfile } from "@/lib/actions/students";
import { Card, inputCls } from "@/components/ui";
import { notifyToast } from "@/app/admin/users/_components/Toast";

type ProfileInput = z.infer<typeof UpdateOwnProfileSchema>;

type ActionResult = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export default function ProfileForm({
  defaults,
}: {
  defaults: {
    phone: string;
    bankName: string;
    bankAccountNumber: string;
    mobileMoneyProvider: string;
    mobileMoneyNumber: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(UpdateOwnProfileSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: ProfileInput) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (v) fd.set(k, v);
    }
    const result = (await updateOwnProfile(fd)) as ActionResult;
    if (!result.ok) {
      if (result.errors) {
        for (const [field, msgs] of Object.entries(result.errors)) {
          setError(field as keyof ProfileInput, { message: msgs.join(", ") });
        }
      } else {
        setError("root", { message: result.message ?? "Could not save profile." });
      }
      return;
    }
    notifyToast("Profile saved.");
    router.refresh();
  }

  return (
    <Card title="Contact & payout details">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 text-sm" noValidate>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-2">
          <legend className="px-1 font-medium">Contact</legend>
          <label className="block">
            <span className="font-medium">Phone</span>
            <input {...register("phone")} className={`${inputCls} mt-1`} autoComplete="tel" />
            {errors.phone && <p className="mt-1 text-xs text-red-700">{errors.phone.message}</p>}
          </label>
          <label className="block">
            <span className="font-medium">M-PESA number (e.g. 0712345678)</span>
            <input {...register("mobileMoneyNumber")} className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.mobileMoneyNumber && (
              <p className="mt-1 text-xs text-red-700">{errors.mobileMoneyNumber.message}</p>
            )}
          </label>
          <label className="block">
            <span className="font-medium">Mobile money provider</span>
            <input {...register("mobileMoneyProvider")} placeholder="e.g. M-PESA" className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.mobileMoneyProvider && (
              <p className="mt-1 text-xs text-red-700">{errors.mobileMoneyProvider.message}</p>
            )}
          </label>
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-2">
          <legend className="px-1 font-medium">Bank (optional)</legend>
          <label className="block">
            <span className="font-medium">Bank name</span>
            <input {...register("bankName")} placeholder="e.g. KCB, Equity" className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.bankName && <p className="mt-1 text-xs text-red-700">{errors.bankName.message}</p>}
          </label>
          <label className="block">
            <span className="font-medium">Account number</span>
            <input {...register("bankAccountNumber")} className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.bankAccountNumber && (
              <p className="mt-1 text-xs text-red-700">{errors.bankAccountNumber.message}</p>
            )}
          </label>
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-2">
          <legend className="px-1 font-medium">Emergency contact</legend>
          <label className="block">
            <span className="font-medium">Contact name</span>
            <input {...register("emergencyContactName")} className={`${inputCls} mt-1`} autoComplete="off" />
            {errors.emergencyContactName && (
              <p className="mt-1 text-xs text-red-700">{errors.emergencyContactName.message}</p>
            )}
          </label>
          <label className="block">
            <span className="font-medium">Contact phone</span>
            <input {...register("emergencyContactPhone")} className={`${inputCls} mt-1`} autoComplete="tel" />
            {errors.emergencyContactPhone && (
              <p className="mt-1 text-xs text-red-700">{errors.emergencyContactPhone.message}</p>
            )}
          </label>
        </fieldset>
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </Card>
  );
}
