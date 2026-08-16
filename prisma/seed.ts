import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { RENAISSANCE_ENGINE_DEFAULTS } from "../src/lib/renaissance-defaults";

const prisma = new PrismaClient();

async function seedUser(
  email: string,
  name: string,
  password: string,
  role: "ADMIN" | "USER",
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role },
    create: { email, name, passwordHash, role },
  });

  for (const p of RENAISSANCE_ENGINE_DEFAULTS) {
    await prisma.priceItem.upsert({
      where: { userId_key: { userId: user.id, key: p.key } },
      update: {
        name: p.name,
        category: p.category,
        unit: p.unit,
        price: p.price,
        note: p.note ?? "",
        helpKey: p.helpKey,
      },
      create: {
        userId: user.id,
        key: p.key,
        name: p.name,
        category: p.category,
        unit: p.unit,
        price: p.price,
        note: p.note ?? "",
        helpKey: p.helpKey,
      },
    });
  }
  return user;
}

async function main() {
  const admin = await seedUser(
    "admin@korpus.local",
    "Админ",
    "admin123",
    "ADMIN",
  );
  const user = await seedUser(
    "demo@korpus.local",
    "Демо",
    "demo123",
    "USER",
  );
  console.log("Seeded users:", admin.email, user.email);
  console.log(
    "Engine prices from Renaissance defaults:",
    RENAISSANCE_ENGINE_DEFAULTS.length,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
