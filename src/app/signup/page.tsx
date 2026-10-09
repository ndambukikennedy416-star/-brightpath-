import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { googleSignUp } from "@/lib/actions/auth-actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-0 overflow-hidden bg-white px-4 py-10">
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/banner.jpg"
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>
      <form
        action={googleSignUp}
        className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white/95 p-8 shadow-xl"
      >
        <Image
          src="/logo.jpg"
          alt="Brightpath Kenya"
          width={80}
          height={80}
          loading="eager"
          className="mx-auto h-20 w-20 rounded-full object-cover"
        />
        <h1 className="text-center text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-zinc-600">
          Sign up with Google. Students get immediate access; financial
          officers require administrator approval first.
        </p>
        {params?.error === "role" && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Choose an account type below.
          </p>
        )}
        <div className="space-y-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2">
            <input type="radio" name="role" value="student" defaultChecked />
            <span>
              <span className="font-medium">Student</span>
              <span className="block text-xs text-zinc-500">
                Track disbursements, documents, and literacy.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2">
            <input type="radio" name="role" value="financial_officer" />
            <span>
              <span className="font-medium">Financial Officer</span>
              <span className="block text-xs text-zinc-500">
                Process payments. Needs admin approval.
              </span>
            </span>
          </label>
        </div>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
