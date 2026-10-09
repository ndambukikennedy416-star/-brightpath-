"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { RecipientSchema } from "@/lib/validations";
import { createRecipient } from "@/lib/actions/recipients";
import { Card, inputCls } from "@/components/ui";
import { notifyToast } from "@/app/admin/users/_components/Toast";

type RecipientInput = z.infer<typeof RecipientSchema>;

type ActionResult = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const TYPES = [
  "PRIMARY_SCHOOL",
  "SECONDARY_SCHOOL",
  "UNIVERSITY",
  "PRIVATE_LANDLORD",
  "HOSTEL",
] as const;

export default function RecipientForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecipientInput>({
    resolver: zodResolver(RecipientSchema),
    defaultValues: {
      displayName: "",
      institutionType: "SECONDARY_SCHOOL",
      contactPersonName: "",
      contactPhone: "",
      accountName: "",
      accountNumber: "",
      bankName: "",
      paybillNumber: "",
      mobileMoneyRef: "",
      notes: "",
    },
  });

  async function onSubmit(values: RecipientInput) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (v) fd.set(k, v);
    }
    const result = (await createRecipient(fd)) as ActionResult;
    if (!result.ok) {
      if (result.errors) {
        for (const [field, msgs] of Object.entries(result.errors)) {
          setError(field as keyof RecipientInput, { message: msgs.join(", ") });
        }
      } else {
        setError("root", { message: result.message ?? "Could not save recipient." });
      }
      return;
    }
    reset();
    notifyToast("Payment recipient saved.");
    router.refresh();
  }

  const field = (
    name: keyof RecipientInput,
    label: string,
    opts?: { type?: string; placeholder?: string; required?: boolean }
  ) => (
    <label className="block">
      <span className="font-medium">{label}</span>
      <input
        {...register(name)}
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder}
        required={opts?.required}
        className={`${inputCls} mt-1`}
        autoComplete="off"
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-red-700">{errors[name]?.message}</p>
      )}
    </label>
  );

  return (
    <Card title="Add payment recipient (no login created)">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 text-sm" noValidate>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-2">
          <legend className="px-1 font-medium">Institution</legend>
          {field("displayName", "Institution name", { required: true })}
          <label className="block">
            <span className="font-medium">Institution type</span>
            <select {...register("institutionType")} className={`${inputCls} mt-1`}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          {field("contactPersonName", "Contact person", { required: true })}
          {field("contactPhone", "Contact phone", { required: true, type: "tel" })}
        </fieldset>
        <fieldset className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-2">
          <legend className="px-1 font-medium">Payout details (encrypted at rest)</legend>
          {field("accountName", "Account name (as on bank statement)", { required: true })}
          {field("bankName", "Bank", { placeholder: "e.g. KCB, Equity" })}
          {field("accountNumber", "Account number")}
          {field("paybillNumber", "M-PESA PayBill / Till")}
          {field("mobileMoneyRef", "M-PESA reference", { placeholder: "e.g. student admission no." })}
        </fieldset>
        <label className="block">
          <span className="font-medium">Notes</span>
          <textarea {...register("notes")} rows={2} className={`${inputCls} mt-1`} />
        </label>
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save recipient"}
          </button>
        </div>
      </form>
    </Card>
  );
}
