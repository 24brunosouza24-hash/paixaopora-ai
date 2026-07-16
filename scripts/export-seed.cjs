const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const [products, options, storeSettings] = await Promise.all([
    prisma.product.findMany({
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        choices: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.optionItem.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.storeSettings.findMany(),
  ]);

  const data = { exportedAt: new Date().toISOString(), products, options, storeSettings };
  fs.writeFileSync(path.join(process.cwd(), "prisma", "seed-data.json"), JSON.stringify(data, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
