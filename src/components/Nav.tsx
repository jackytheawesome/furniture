"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Смета" },
  { href: "/prices", label: "Прайсы" },
  { href: "/help", label: "Справочник" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-stone-300 bg-[#f3efe6]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-stone-900">
            КорпусСмета
          </p>
          <p className="text-sm text-stone-600">
            Быстрый расчёт встраиваемой корпусной мебели
          </p>
        </div>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-stone-900 text-stone-50"
                    : "text-stone-700 hover:bg-stone-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
