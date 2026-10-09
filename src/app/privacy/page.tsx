import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6 text-sm leading-6 text-zinc-800">
      <h1 className="text-2xl font-semibold text-zinc-900">Privacy policy</h1>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">What we collect</h2>
        <p>
          Brightpath Kenya collects only what it needs to run the scholarship
          programme: beneficiary contact and school details entered by staff,
          academic records, payment records, and — if you use the signup form on
          our home page — your email address.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Access</h2>
        <p>
          Beneficiary records are visible only to signed-in staff with the
          appropriate role. Donor impact pages show aggregate numbers only and
          never personal information.
        </p>
      </section>

      <p>
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
