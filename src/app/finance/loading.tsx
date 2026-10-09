export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="h-6 w-20 animate-pulse rounded bg-stone-200" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-stone-100" />
          </div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-white p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-stone-200" />
        </div>
      ))}
    </main>
  );
}
