import Image from "next/image";
import { googleSignIn, loginAction } from "@/lib/actions/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl ?? "/dashboard";
  const googleEnabled = Boolean(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
      (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-0 overflow-hidden bg-white px-4 py-10">
      {/* Banner artwork as the page background */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/banner.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          loading="eager"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>
      <form
        action={loginAction}
        className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white/95 p-8 shadow-xl"
      >
        <Image
          src="/logo.jpg"
          alt="Brightpath Kenya"
          width={80}
          height={80}
          preload
          loading="eager"
          className="mx-auto h-20 w-20 rounded-full object-cover"
        />
        <h1 className="text-center text-xl font-semibold">Brightpath — Sign In</h1>
        <p className="text-sm text-zinc-600">
          Sign in to your Brightpath account.
        </p>
        {params?.error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error === "AccessDenied"
              ? "This Google account is not registered. Contact your administrator."
              : "Invalid email or password."}
          </p>
        )}
        <input
          type="hidden"
          name="callbackUrl"
          value={callbackUrl}
        />
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-black px-5 py-2.5 text-white"
        >
          Sign in
        </button>
      </form>
      {googleEnabled && (
        <form
          action={googleSignIn}
          className="relative mt-3 w-full max-w-sm rounded-2xl bg-white/95 p-4 shadow-xl"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            For accounts created by your administrator.
          </p>
        </form>
      )}
    </main>
  );
}
