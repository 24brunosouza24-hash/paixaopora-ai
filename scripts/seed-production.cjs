const { PrismaClient } = require("@prisma/client");
const seed = require("../prisma/seed-data.json");

const prisma = new PrismaClient();

function cleanProduct(product) {
  return {
    id: product.id,
    category: product.category,
    categoryTitle: product.categoryTitle,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    kind: product.kind,
    basePriceCents: product.basePriceCents,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function main() {
  const productCount = await prisma.product.count();

  if (productCount === 0) {
    for (const product of seed.products || []) {
      await prisma.product.create({
        data: {
          ...cleanProduct(product),
          variants: {
            create: (product.variants || []).map((variant) => ({
              id: variant.id,
              label: variant.label,
              priceCents: variant.priceCents,
              sortOrder: variant.sortOrder,
            })),
          },
          choices: {
            create: (product.choices || []).map((choice) => ({
              id: choice.id,
              name: choice.name,
              isActive: choice.isActive,
              sortOrder: choice.sortOrder,
            })),
          },
        },
      });
    }
  }

  const optionCount = await prisma.optionItem.count();

  if (optionCount === 0) {
    for (const option of seed.options || []) {
      await prisma.optionItem.create({
        data: {
          id: option.id,
          type: option.type,
          name: option.name,
          priceCents: option.priceCents,
          isActive: option.isActive,
          sortOrder: option.sortOrder,
        },
      });
    }
  }

  for (const settings of seed.storeSettings || []) {
    await prisma.storeSettings.upsert({
      where: { id: settings.id },
      update: { isOpen: settings.isOpen },
      create: { id: settings.id, isOpen: settings.isOpen },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
