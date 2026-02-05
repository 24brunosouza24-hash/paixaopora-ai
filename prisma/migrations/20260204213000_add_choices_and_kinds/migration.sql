/*
  Warnings:

  - You are about to drop the column `priceCents` on the `ProductChoice` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ProductChoice` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductChoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProductChoice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductChoice" ("id", "isActive", "name", "productId", "sortOrder") SELECT "id", "isActive", "name", "productId", "sortOrder" FROM "ProductChoice";
DROP TABLE "ProductChoice";
ALTER TABLE "new_ProductChoice" RENAME TO "ProductChoice";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
