"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/projects", label: "Проекты" },
  { href: "/prices", label: "Прайсы" },
  { href: "/help", label: "Справочник" },
];

export function AppNav() {
  const pathname = usePathname();
  const { data } = useSession();
  if (pathname === "/login") return null;

  return (
    <header className="border-b border-stone-300 bg-[#f3efe6]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl text-stone-900">
            КорпусСмета
          </p>
          <p className="text-sm text-stone-600">
            {data?.user?.name
              ? `${data.user.name} · ${data.user.email}`
              : "Сметы корпусной мебели"}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-stone-900 text-white"
                    : "text-stone-700 hover:bg-stone-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {data?.user && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              Выйти
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
