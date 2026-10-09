import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-white px-6 py-10 text-center">
      {/* Banner artwork as the page background */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/banner.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          loading="eager"
          style={{ objectFit: "contain", objectPosition: "center top" }}
        />
      </div>
      <div className="relative mt-40 flex flex-col items-center gap-6 rounded-3xl bg-white/90 p-10 shadow-xl backdrop-blur-sm">
        <Image
          src="/logo.jpg"
          alt="Brightpath Kenya logo"
          width={112}
          height={112}
          preload
          loading="eager"
          className="h-28 w-28 rounded-full object-cover shadow"
        />
        <h1 className="text-3xl font-semibold text-zinc-900">Brightpath Kenya</h1>
        <p className="max-w-md text-zinc-700">
          Supporting accepted scholarship students with school fees, upkeep, and
          academic guidance — all in one place.
        </p>
        <div className="flex gap-3">
          {session?.user ? (
            <Link href="/dashboard" className="rounded-full bg-black px-5 py-2.5 text-white">
              Open dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-black px-5 py-2.5 text-white">
              Staff sign in
            </Link>
          )}
        </div>
        <Link href="/privacy" className="text-xs text-zinc-500 underline">
          Privacy policy
        </Link>
      </div>
    </main>
  );
}
