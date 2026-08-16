import { GLOSSARY } from "@/lib/glossary";

export function HelpWorkspace() {
  const entries = Object.values(GLOSSARY);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Справочник
        </h1>
        <p className="text-sm text-stone-600">
          Что это, где в изделии, почему важно и как помочь клиенту сэкономить.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((e) => (
          <article
            key={e.key}
            className="rounded-xl border border-stone-300 bg-white p-4"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              {e.title}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="font-medium">Что это</dt>
                <dd>{e.what}</dd>
              </div>
              <div>
                <dt className="font-medium">Где</dt>
                <dd>{e.where}</dd>
              </div>
              <div>
                <dt className="font-medium">Почему важно</dt>
                <dd>{e.why}</dd>
              </div>
              <div>
                <dt className="font-medium text-teal-900">Как сэкономить</dt>
                <dd>{e.save}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
