"use client";

import { useEffect, useState } from "react";

export function notifyToast(message: string) {
  window.dispatchEvent(new CustomEvent("brightpath-toast", { detail: message }));
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let nextId = 1;
    const handler = (e: Event) => {
      const id = nextId++;
      const message = (e as CustomEvent<string>).detail;
      setToasts((t) => [...t, { id, message }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    };
    window.addEventListener("brightpath-toast", handler);
    return () => window.removeEventListener("brightpath-toast", handler);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <p
          key={t.id}
          className="pointer-events-auto rounded-lg bg-green-950 px-4 py-2 text-sm text-white shadow-lg"
        >
          {t.message}
        </p>
      ))}
    </div>
  );
}
