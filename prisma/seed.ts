import bcrypt from "bcryptjs";
import { PrismaClient, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@meavo.app").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin",
      passwordHash,
      systemRole: SystemRole.ADMIN,
    },
    update: {
      passwordHash,
      systemRole: SystemRole.ADMIN,
    },
  });

  await prisma.zeronSheetState.upsert({
    where: { id: "default" },
    create: {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
    },
    update: {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
