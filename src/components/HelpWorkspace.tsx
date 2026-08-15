import { GLOSSARY } from "@/lib/glossary";

export function HelpWorkspace() {
  const entries = Object.values(GLOSSARY);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
          Справочник терминов
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Короткие карточки: что это, где в изделии, почему важно и как помочь
          клиенту сэкономить, если проект нравится, но дорогой.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((e) => (
          <article
            key={e.key}
            className="rounded-xl border border-stone-300 bg-white p-4 shadow-sm"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg text-stone-900">
              {e.title}
            </h2>
            <dl className="mt-3 space-y-2 text-sm text-stone-700">
              <div>
                <dt className="font-medium text-stone-900">Что это</dt>
                <dd>{e.what}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-900">Где</dt>
                <dd>{e.where}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-900">Почему важно</dt>
                <dd>{e.why}</dd>
              </div>
              <div>
                <dt className="font-medium text-teal-900">Как сэкономить</dt>
                <dd className="text-teal-950">{e.save}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
