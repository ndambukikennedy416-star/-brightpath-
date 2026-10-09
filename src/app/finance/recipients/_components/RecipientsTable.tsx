"use client";

import { useMemo, useState } from "react";
import ActionForm from "@/components/ActionForm";
import { Badge, Card, inputCls } from "@/components/ui";
import {
  reviewRecipient,
  setRecipientActive,
  updateRecipient,
} from "@/lib/actions/recipients";

export type RecipientRow = {
  id: string;
  displayName: string;
  institutionType: string;
  contactPersonName: string;
  contactPhone: string;
  verificationStatus: string;
  accountName: string;
  accountMasked: string;
  paybillMasked: string;
  bankName: string;
  mobileMoneyRef: string;
  isActive: boolean;
  lastPaymentDate: string;
};

function adapt(fn: (fd: FormData) => Promise<unknown>) {
  return async (_s: unknown, fd: FormData) => {
    const result = (await fn(fd)) as unknown as {
      ok: boolean;
      message?: string;
      errors?: Record<string, string[]>;
    };
    return result;
  };
}

const PAGE_SIZE = 8;

function tone(status: string): "zinc" | "green" | "red" | "amber" {
  if (status === "VERIFIED") return "green";
  if (status === "REJECTED") return "red";
  return "amber";
}

export default function RecipientsTable({ rows }: { rows: RecipientRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [verification, setVerification] = useState("ALL");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== "ALL" && r.institutionType !== type) return false;
      if (verification !== "ALL" && r.verificationStatus !== verification) return false;
      if (!q) return true;
      return (
        r.displayName.toLowerCase().includes(q) ||
        r.contactPersonName.toLowerCase().includes(q) ||
        r.contactPhone.includes(q) ||
        r.accountName.toLowerCase().includes(q)
      );
    });
  }, [rows, query, type, verification]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function resetPage() {
    setPage(0);
  }

  return (
    <Card title={`Payment recipients (${filtered.length})`}>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            resetPage();
          }}
          placeholder="Search name, contact, account…"
          aria-label="Search recipients"
          className={`${inputCls} max-w-xs`}
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            resetPage();
          }}
          aria-label="Filter by institution type"
          className={inputCls}
        >
          <option value="ALL">All types</option>
          <option value="PRIMARY_SCHOOL">Primary school</option>
          <option value="SECONDARY_SCHOOL">Secondary school</option>
          <option value="UNIVERSITY">University</option>
          <option value="PRIVATE_LANDLORD">Private landlord</option>
          <option value="HOSTEL">Hostel</option>
        </select>
        <select
          value={verification}
          onChange={(e) => {
            setVerification(e.target.value);
            resetPage();
          }}
          aria-label="Filter by verification status"
          className={inputCls}
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-zinc-500">
              <th className="px-2 py-2">Institution</th>
              <th className="px-2 py-2">Contact</th>
              <th className="px-2 py-2">Payout</th>
              <th className="px-2 py-2">Verification</th>
              <th className="px-2 py-2">Last payment</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-2 py-2">
                  <span className="font-medium">{r.displayName}</span>
                  <span className="block text-xs text-zinc-500">
                    {r.institutionType.replace(/_/g, " ")} ·{" "}
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {r.contactPersonName}
                  <span className="block text-xs text-zinc-500">{r.contactPhone}</span>
                </td>
                <td className="px-2 py-2 text-xs text-zinc-600">
                  {r.accountName}
                  <span className="block">Acct {r.accountMasked}</span>
                  <span className="block">PayBill {r.paybillMasked}</span>
                </td>
                <td className="px-2 py-2">
                  <Badge tone={tone(r.verificationStatus)}>{r.verificationStatus}</Badge>
                </td>
                <td className="px-2 py-2 text-xs text-zinc-600">{r.lastPaymentDate}</td>
                <td className="px-2 py-2">
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">Manage</summary>
                    <div className="mt-2 min-w-64 space-y-3 rounded-lg border bg-zinc-50 p-3">
                      <ActionForm
                        action={adapt(updateRecipient)}
                        submitLabel="Save changes"
                        onSuccess="Recipient updated."
                      >
                        <input type="hidden" name="recipientId" value={r.id} />
                        <div className="grid gap-2">
                          <input name="displayName" defaultValue={r.displayName} required minLength={2} aria-label="Institution name" className={inputCls} />
                          <input name="contactPersonName" defaultValue={r.contactPersonName} required minLength={2} aria-label="Contact person" className={inputCls} />
                          <input name="contactPhone" defaultValue={r.contactPhone} required minLength={7} aria-label="Contact phone" className={inputCls} />
                          <input name="accountName" defaultValue={r.accountName} required minLength={2} aria-label="Account name" className={inputCls} />
                          <input name="bankName" defaultValue={r.bankName} placeholder="Bank" aria-label="Bank" className={inputCls} />
                          <input name="mobileMoneyRef" defaultValue={r.mobileMoneyRef} placeholder="M-PESA reference" aria-label="M-PESA reference" className={inputCls} />
                          <input type="hidden" name="institutionType" value={r.institutionType} />
                          <input name="accountNumber" placeholder="New account no. (blank = keep)" aria-label="New account number" className={inputCls} />
                          <input name="paybillNumber" placeholder="New PayBill (blank = keep)" aria-label="New PayBill number" className={inputCls} />
                        </div>
                      </ActionForm>
                      {r.verificationStatus === "PENDING" && (
                        <div className="flex gap-2">
                          <ActionForm
                            action={adapt(reviewRecipient)}
                            submitLabel="Verify"
                            onSuccess="Recipient verified."
                          >
                            <input type="hidden" name="recipientId" value={r.id} />
                            <input type="hidden" name="verificationStatus" value="VERIFIED" />
                          </ActionForm>
                          <ActionForm
                            action={adapt(reviewRecipient)}
                            submitLabel="Reject"
                            onSuccess="Recipient rejected."
                          >
                            <input type="hidden" name="recipientId" value={r.id} />
                            <input type="hidden" name="verificationStatus" value="REJECTED" />
                          </ActionForm>
                        </div>
                      )}
                      <ActionForm
                        action={adapt(setRecipientActive)}
                        submitLabel={r.isActive ? "Deactivate" : "Reactivate"}
                        onSuccess={r.isActive ? "Recipient deactivated." : "Recipient reactivated."}
                      >
                        <input type="hidden" name="recipientId" value={r.id} />
                        <input type="hidden" name="isActive" value={r.isActive ? "false" : "true"} />
                      </ActionForm>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-zinc-500">
                  No recipients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <button
          type="button"
          disabled={safePage === 0}
          onClick={() => setPage(safePage - 1)}
          className="rounded-lg border px-3 py-1 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-zinc-600">
          Page {safePage + 1} of {pages}
        </span>
        <button
          type="button"
          disabled={safePage >= pages - 1}
          onClick={() => setPage(safePage + 1)}
          className="rounded-lg border px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </Card>
  );
}
