# КорпусСмета — документация для доработок

Актуально на **2026-08-16** (коммит ветки `main` после board material picker).  
Назначение файла: единая точка сверки для агентов и разработчиков. Краткий README остаётся для запуска; детали продукта и архитектуры — здесь.

---

## 1. Продукт и границы

**Что это:** веб-сметчик корпусной мебели для владельца производства (относительный новичок в изготовлении). Цель — быстрая предварительная калькуляция порядка **±100 тыс. ₽**, редактируемые статьи, Excel/PDF для клиента и внутренне, подсказки новичку, несколько проектов, импорты.

**Что не делаем (сейчас):**
- полный раскрой / nesting (это у технологов);
- нативный разбор PRO100 `.sto` — только CSV/TXT «Список деталей»;
- SVG-схемы в UI (в модели есть `visualHints` под будущее);
- production Postgres / стабильный Vercel-деплой (локально SQLite; Vercel ранее упирался в auth API).

**Бренд / имя:** КорпусСмета.

---

## 2. Стек и окружение

| Слой | Выбор |
|------|--------|
| UI | Next.js **16.3** App Router, React 19, Tailwind 4 |
| Auth | Auth.js v5 (credentials), `src/lib/auth.ts`, `src/middleware.ts` |
| DB | Prisma **5** + **SQLite** (`file:./dev.db`, `DATABASE_URL` в `.env`) |
| Excel | ExcelJS |
| PDF import | `pdf-parse` v2 (`PDFParse`) |
| PDF export | `@react-pdf/renderer` |

**Важно:** это не «классический» Next по старым туториалам — смотреть docs в `node_modules/next/dist/docs/` и `AGENTS.md`.

**Демо-логины** (seed):
- `demo@korpus.local` / `demo123` (USER)
- `admin@korpus.local` / `admin123` (ADMIN)

**Скрипты:**
```bash
npm run dev          # hot reload (предпочтительно для UI)
npm run build && npm run start -- -p 3001
npx prisma migrate dev
npx prisma db seed
npm run prices:import-renaissance
```

**Грабли окружения:**
- `next start` **не** подхватывает правки исходников — после UI-изменений нужен `build` + restart.
- Старый процесс на :3001 может показывать устаревший UI.
- Локально часто крутится **:3001**, не :3000.

---

## 3. Модель данных (Prisma)

Ключевые сущности: `User` → `Project` → `CartItem` + `EstimateLine` + `EstimateVersion` + `ChecklistOverride`; у пользователя свой `PriceItem[]`.

- **CartItem.params** — JSON-строка параметров формы + опционально:
  - `boardMaterialKey` — ключ плиты корпуса из прайса (вместо `board-ldsp-18`);
  - `hdfMaterialKey` — ключ ХДФ (вместо `board-hdf`);
  - поля каталога: `widthMm`, `facadeType`, `useTipOn`, …
- **CartItem / Project.visualHints** — JSON-задел под схемы (UI нет).
- **EstimateLine.source:** `auto` | `manual` | `import`.
- **EstimateLine.unitPrice** — **снимок** цены на момент генерации/правки, не live-join к прайсу при открытии.
- SQLite: enum’ы как `String`.

Схема: `prisma/schema.prisma`.

---

## 4. Карта приложения

| Маршрут | Назначение |
|---------|------------|
| `/login` | Вход |
| `/projects` | Список проектов пользователя |
| `/projects/[id]` | Рабочая область сметы (`ProjectWorkspace.tsx`) |
| `/prices` | Редактор прайса пользователя |
| `/help` | Справочник / glossary |

**API (основные):**
- `POST/GET /api/projects`, `PATCH /api/projects/[id]`
- `POST/PATCH/DELETE …/items`, `…/items/[itemId]`
- `POST/PATCH/DELETE …/lines` — ручные статьи; PATCH авто → `source: manual`
- `POST …/checklist`, `…/versions`
- `POST …/import/csv`, `…/import/pdf`
- `POST …/export/excel`, `…/export/pdf`
- `GET/POST/PATCH/DELETE /api/prices`
- Auth: `/api/auth/[...nextauth]`

---

## 5. Поток сметы (как устроено)

```
Каталог → предмет в корзину (params)
    → regenerateAutoLines()
        → buildLinesForItem() + buildProjectCommonLines()
        → цены из PriceItem пользователя (priceMapForUser)
        → EstimateLine (source=auto), привязка cartItemId
Ручные / из прайса в UI → source=manual, cartItemId опционально
```

**Когда пересчитываются автостроки** (`src/lib/regenerate.ts`):
- add / patch / delete предмета корзины;
- apply CSV/PDF import;
- выбор плиты в смете (пишет `boardMaterialKey` / `hdfMaterialKey` → PATCH item → regenerate).

**Не пересчитываются сами по себе** при:
- смене прайса на `/prices`;
- простом открытии старого проекта.

При regenerate: удаляются `auto` + `import`; **`manual` сохраняются**.  
Осторожно: правка авто-строки через PATCH переводит её в `manual` — при следующем regenerate появится **новая** авто-строка + старая manual (риск дублей). Для плиты правильный путь — combobox → params → regenerate.

**Группировка UI сметы:** блоки по `cartItemId` + блок «Общие статьи проекта» (`cartItemId = null`). Доставка/монтаж сейчас всегда генерируются в common (hardcoded flags в regenerate).

**Наценка:** `Project.marginPercent`, считается в UI поверх суммы включённых строк (`withMargin`).

---

## 6. Движок строк и прайс

### 6.1 Каталог предметов — `src/lib/catalog.ts`

Категории: `kitchen`, `casework`, `bedroom`, `custom`.  
Типы: `kitchen_base`, `kitchen_wall`, `kitchen_tall`, `kitchen_countertop`, `kitchen_backsplash`, `cabinet`, `nightstand`, `wall_panel`, `desk`, `custom`.

### 6.2 Генерация — `src/lib/line-engine.ts`

- Ключи цен: курируемый набор (`board-ldsp-18`, `facade-film`, `edge-2`, `hinge`, `labor-*`, …).
- Плита: `resolveBoardKey(prices, params, "board"|"hdf")`.
- Имена строк плиты берутся из выбранного `PriceItem.name` (с префиксом имени предмета).
- Фасады: `facadeKey(facadeType)` → `facade-film|enamel|veneer|frame` или `board-ldsp-18` для ldsp.

### 6.3 Два слоя прайса

1. **Engine defaults** — `src/lib/renaissance-defaults.ts` (Ренессанс 03.07.2026 + трудозатраты с пометкой `requires_confirmation`). Seed кладёт их каждому пользователю.
2. **Полный каталог** — `npm run prices:import-renaissance` (`scripts/import-master-prices.ts`) из пакета в `data/pricing_package/`. Тысячи строк в `PriceItem` для поиска/ручного выбора. Автодвижок **не** подставляет произвольную строку master_price, только ключи engine (+ выбранные `*MaterialKey`).

Категории прайса: `board`, `facade`, `edge`, `hardware`, `countertop`, `labor`, `other`.

Игнор тяжёлого: `data/_mp_xlsx`, `parsed_prices.json`, `prisma/dev.db`.

---

## 7. UX рабочей области (важные решения)

Файл: `src/app/projects/[id]/ProjectWorkspace.tsx`.

- Форма «Добавить в корзину» **скрыта**; открывается кнопкой «Добавить предмет мебели».
- Смета: у каждого блока **«+ Статья»** — из прайса (поиск) или произвольно; строка с `cartItemId`.
- Строки `category === "board"`: **PriceCombobox** — поиск по плитам (`board` + `m2` / engine keys); выбор → params + regenerate + пересчёт цены.
- Числовые поля: `NumberField` — можно стереть значение без залипания ведущего `0` (`030`).
- Корзина: список предметов + импорт файлов; параметры предмета в корзине **пока не** редактируются отдельной формой (только через пересоздание / материал в смете).

Компоненты: `NumberField.tsx`, `PriceCombobox.tsx`, `HelpTip.tsx`, `AppNav.tsx`.

---

## 8. Импорт / экспорт / чеклист / версии

- **CSV/Excel/PRO100:** `src/lib/import-smart.ts` + API import/csv (профиль «список деталей», иногда прайс).
- **PDF дизайнера:** эвристики `src/lib/pdf-import.ts` → preview → apply → корзина + regenerate.
- **Excel:** внутренний/клиентский через ExcelJS.
- **PDF клиенту:** точность (confidence) + список уточнений.
- **Чеклист:** `src/lib/checklist.ts` + overrides в БД.
- **Версии:** DRAFT / CLIENT, snapshot JSON в `EstimateVersion`.

---

## 9. Auth и роли

- Credentials, bcrypt, сессия JWT (Auth.js).
- Роли: `USER` | `ADMIN` (`src/lib/roles.ts`).
- Доступ к проекту: владелец; admin — шире (`project-access.ts`).
- Прайсы **персональные** на `userId`.

---

## 10. Известные ограничения / техдолг

1. Старые проекты не подхватывают новый прайс, пока не regenerate (правка предмета / материал / импорт).
2. PATCH авто-строки → `manual` → возможны дубли после regenerate.
3. Common delivery/install всегда on в regenerate (не UI-флаги).
4. В `category=board` после импорта бывают мусорные строки (неверная эвристика `normalizeCategory`).
5. Трудозатраты в engine — ориентиры, требуют подтверждения.
6. Кромка 0.4 в прайсе отсутствует → маппинг на 0.8×19 @ 80 ₽/п.м. (`edge-04`).
7. SVG / visualHints не реализованы в UI.
8. Production: желателен Postgres; Vercel не доведён.
9. Combobox плиты есть; аналогичного для фасадов/кромки/фурнитуры пока нет.
10. Редактирование params предмета из корзины — не сделано.

---

## 11. Куда класть новые фичи (шпаргалка)

| Задача | Куда |
|--------|------|
| Новый тип мебели | `catalog.ts` + ветка в `line-engine.ts` |
| Новая ставка движка | `renaissance-defaults.ts` + seed/import upsert |
| Выбор материала как у плиты | params key + `resolve*` в engine + combobox в смете |
| Не ломать ручные правки | `source: manual` + не удалять в regenerate |
| Живая цена без снимка | сейчас нет — либо regenerate, либо явный live-join (дизайн) |
| Схемы | `visualHints` + отдельный UI |

---

## 12. Репозиторий

- GitHub: `https://github.com/jackytheawesome/furniture`
- Ветка работы: `main`
- Не коммитить: `.env`, `dev.db`, `.agents/`, `.claude/`, `.windsurf/`, распакованный xlsx XML

При крупных продуктовых решениях обновлять **этот файл** и короткий README при необходимости.
