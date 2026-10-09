"use client";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-zinc-600">
        {error.message || "This section hit an unexpected error."} Try again — no data
        was changed by this error.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-black px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </main>
  );
}
