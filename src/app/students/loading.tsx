export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
      <div className="h-10 animate-pulse rounded-lg bg-stone-100" />
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-xl border bg-white px-4 py-3">
            <div className="h-5 w-2/3 animate-pulse rounded bg-stone-200" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-stone-100" />
          </li>
        ))}
      </ul>
    </main>
  );
}
