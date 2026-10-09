"use client";

import { useMemo, useState } from "react";
import ActionForm from "@/components/ActionForm";
import { Badge, Card, inputCls, statusTone } from "@/components/ui";
import { resetUserPassword, setUserActive, updateUser } from "@/lib/actions/admin";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  type: string;
  status: string;
  self: boolean;
};

// ActionForm expects (state, formData); adapt plain FormData actions.
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

export default function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "ALL" && u.role !== role) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q)
      );
    });
  }, [users, query, role]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function onFilter(q: string, r: string) {
    setQuery(q);
    setRole(r);
    setPage(0);
  }

  return (
    <Card title={`All accounts (${filtered.length})`}>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <input
          value={query}
          onChange={(e) => onFilter(e.target.value, role)}
          placeholder="Search name, email, organization…"
          className={`${inputCls} max-w-xs`}
          aria-label="Search accounts"
        />
        <select
          value={role}
          onChange={(e) => onFilter(query, e.target.value)}
          className={inputCls}
          aria-label="Filter by role"
        >
          <option value="ALL">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="FINANCE_OFFICER">FINANCE_OFFICER</option>
          <option value="FIELD_AGENT">FIELD_AGENT</option>
          <option value="STUDENT">STUDENT</option>
          <option value="EXTERNAL_PARTNER">EXTERNAL_PARTNER</option>
          <option value="DONOR">DONOR</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-zinc-500">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-2 py-2 font-medium">{u.name}</td>
                <td className="px-2 py-2 text-zinc-600">{u.email}</td>
                <td className="px-2 py-2">
                  <Badge>{u.role}</Badge>
                </td>
                <td className="px-2 py-2 text-zinc-600">{u.type}</td>
                <td className="px-2 py-2">
                  <Badge tone={statusTone(u.isActive ? "ACTIVE" : "SUSPENDED")}>
                    {u.status}
                  </Badge>
                </td>
                <td className="px-2 py-2">
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">Manage</summary>
                    <div className="mt-2 space-y-3 rounded-lg border bg-zinc-50 p-3">
                      <ActionForm
                        action={adapt(updateUser)}
                        submitLabel="Save changes"
                        onSuccess="Account updated."
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        {/* Disabled selects are not submitted: mirror the value for self-edits. */}
                        {u.self && <input type="hidden" name="role" value={u.role} />}
                        <div className="grid gap-2">
                          <input
                            name="name"
                            defaultValue={u.name}
                            required
                            minLength={2}
                            aria-label="Name"
                            className={inputCls}
                          />
                          <select
                            name="role"
                            defaultValue={u.role}
                            disabled={u.self}
                            aria-label="Role"
                            className={inputCls}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="FINANCE_OFFICER">FINANCE_OFFICER</option>
                            <option value="FIELD_AGENT">FIELD_AGENT</option>
                            <option value="DONOR">DONOR</option>
                          </select>
                        </div>
                      </ActionForm>
                      <ActionForm
                        action={adapt(resetUserPassword)}
                        submitLabel="Reset password"
                        onSuccess="Password reset."
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          name="newPassword"
                          type="password"
                          required
                          minLength={8}
                          placeholder="New temporary password (min 8)"
                          aria-label="New temporary password"
                          className={inputCls}
                        />
                      </ActionForm>
                      <ActionForm
                        action={adapt(setUserActive)}
                        submitLabel={u.isActive ? "Deactivate" : "Reactivate"}
                        onSuccess={u.isActive ? "Account deactivated." : "Account reactivated."}
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={u.isActive ? "false" : "true"}
                        />
                      </ActionForm>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-zinc-500">
                  No accounts match.
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
