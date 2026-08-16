"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("demo@korpus.local");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Неверный email или пароль");
      return;
    }
    router.push(params.get("callbackUrl") || "/projects");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-stone-300 bg-white/90 p-8 shadow-sm">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">
          КорпусСмета
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Войдите, чтобы работать с проектами и сметами.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-stone-600">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Пароль</span>
            <input
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-white disabled:opacity-60"
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-xs text-stone-500">
          Демо: demo@korpus.local / demo123 · Админ: admin@korpus.local /
          admin123
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
