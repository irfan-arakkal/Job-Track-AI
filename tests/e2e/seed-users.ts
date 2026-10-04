/**
 * Wipes the e2e database and creates the test users. Run by global-setup through `tsx`
 * (Playwright's own TypeScript loader can't load Prisma's generated ESM client).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../../src/generated/prisma/client";

import { USERS } from "./fixtures";

const url = process.env.DATABASE_URL!;
if (!url.includes("e2e"))
  throw new Error("Refusing to reset a database whose URL doesn't contain 'e2e'.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  await db.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  for (const user of Object.values(USERS)) {
    await db.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: true,
        accounts: {
          create: {
            id: `${user.id}-account`,
            accountId: user.id,
            providerId: "credential",
            password: await hashPassword(user.password),
          },
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
