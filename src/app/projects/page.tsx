"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectRow {
  id: string;
  clientName: string;
  objectName: string;
  status: string;
  updatedAt: string;
  marginPercent: number;
  user?: { name: string; email: string };
  _count: { cartItems: number; lines: number };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clientName, setClientName] = useState("");
  const [objectName, setObjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject() {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: clientName || "Клиент",
        objectName: objectName || "Новый объект",
      }),
    });
    const data = await res.json();
    if (data.project?.id) {
      router.push(`/projects/${data.project.id}`);
    } else {
      setMessage(data.error || "Не удалось создать");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Проекты
        </h1>
        <p className="text-sm text-stone-600">
          У каждого объекта своя смета-корзина предметов.
        </p>
      </div>

      <section className="rounded-xl border border-stone-300 bg-white/80 p-4">
        <h2 className="mb-3 font-medium">Новый проект</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            placeholder="Клиент"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            placeholder="Объект"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void createProject()}
            className="rounded-md bg-teal-800 px-4 py-2 text-white"
          >
            Создать
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-red-700">{message}</p>}
      </section>

      {loading ? (
        <p className="text-stone-600">Загрузка…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="px-4 py-3">Объект</th>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Предметы</th>
                <th className="px-4 py-3">Обновлён</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium">{p.objectName}</td>
                  <td className="px-4 py-3">{p.clientName}</td>
                  <td className="px-4 py-3">{p._count.cartItems}</td>
                  <td className="px-4 py-3">
                    {new Date(p.updatedAt).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-teal-800 underline"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
              {!projects.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                    Пока нет проектов — создайте первый.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
