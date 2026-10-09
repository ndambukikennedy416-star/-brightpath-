export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded bg-stone-200" />
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-stone-300" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="h-8 w-16 animate-pulse rounded bg-stone-200" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </main>
  );
}
