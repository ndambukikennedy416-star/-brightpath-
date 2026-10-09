import { redirect } from "next/navigation";
import { createClient } from "@/lib/portal/server";
import PortalLoginForm from "./_components/PortalLoginForm";

export default async function PortalLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/portal");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <PortalLoginForm />
    </main>
  );
}
