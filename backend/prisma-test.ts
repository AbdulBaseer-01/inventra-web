import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Prisma Client initialized successfully!");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Prisma test failed:", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});