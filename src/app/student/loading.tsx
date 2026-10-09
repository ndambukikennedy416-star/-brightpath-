export default function StudentLoading() {
  return (
    <main className="mx-auto max-w-3xl animate-pulse space-y-4 p-4 md:p-6" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-zinc-200" />
      <div className="h-4 w-80 rounded bg-zinc-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl bg-zinc-200" />
        <div className="h-24 rounded-xl bg-zinc-200" />
      </div>
      <div className="h-48 rounded-xl bg-zinc-200" />
    </main>
  );
}
