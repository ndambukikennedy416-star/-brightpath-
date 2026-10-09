import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Entry point: signed-in users go to their dashboard, everyone else lands
// on the sign-in page first — there is no public dashboard option.
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
