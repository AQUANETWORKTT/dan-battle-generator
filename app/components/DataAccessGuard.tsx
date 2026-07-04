"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export const DATA_ACCESS_PASSWORD = "D";
export const DATA_ACCESS_STORAGE_KEY = "first-class-data-access";

export default function DataAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DATA_ACCESS_STORAGE_KEY) === DATA_ACCESS_PASSWORD;
  });

  useEffect(() => {
    if (!allowed) router.replace(`/data?next=${encodeURIComponent(pathname)}`);
  }, [allowed, pathname, router]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="rounded-3xl border border-yellow-300/20 bg-black/70 p-6 text-center">
          <p className="font-black uppercase text-yellow-200">Opening Data password...</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl border border-white/15 px-5 py-3 font-black uppercase">
            Go Back
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
