"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/materials", label: "Materials" },
  { href: "/entry-errors", label: "Entry errors" },
  { href: "/sync", label: "Sync & Import" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-meavo-bg">
      <header className="border-b border-meavo-beige-600 bg-meavo-beige">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div>
            <p className="text-lg font-semibold text-meavo-ink">Zeron Material Checker</p>
            <p className="text-sm text-meavo-grey">Delivery unit-cost outlier review</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-meavo-grey sm:inline">
              {session?.user?.email}
            </span>
            <button type="button" className="btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="lg:w-56">
          <nav className="flex gap-2 lg:flex-col">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
