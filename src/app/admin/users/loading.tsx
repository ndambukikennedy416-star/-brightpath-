export default function UsersLoading() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse space-y-4 p-4 md:p-6" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-zinc-200" />
      <div className="h-4 w-80 rounded bg-zinc-200" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-72 rounded-xl bg-zinc-200" />
        <div className="h-72 rounded-xl bg-zinc-200" />
      </div>
      <div className="h-64 rounded-xl bg-zinc-200" />
    </main>
  );
}
