import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}. Ustaw ją przed uruchomieniem skryptu.`);
  }
  return value;
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("Konto admina już istnieje:", adminEmail);
    return;
  }

  const password = crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "x");
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { email: adminEmail, passwordHash, name: "Piotr Laskowski", role: "ADMIN" },
  });

  console.log("UTWORZONO KONTO ADMINA:");
  console.log("  email:", adminEmail);
  console.log("  hasło:", password);
  console.log("  (zmień to hasło po pierwszym zalogowaniu)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
