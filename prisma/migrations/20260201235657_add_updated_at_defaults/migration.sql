/*
  Warnings:

  - You are about to drop the column `price` on the `OptionItem` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `basePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Variant` table. All the data in the column will be lost.
  - Added the required column `subtotalCents` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Variant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCents` to the `Variant` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OptionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_OptionItem" ("id", "isActive", "name", "type") SELECT "id", "isActive", "name", "type" FROM "OptionItem";
DROP TABLE "OptionItem";
ALTER TABLE "new_OptionItem" RENAME TO "OptionItem";
CREATE INDEX "OptionItem_type_idx" ON "OptionItem"("type");
CREATE INDEX "OptionItem_isActive_idx" ON "OptionItem"("isActive");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "id", "itemsJson", "pointsEarned", "userId") SELECT "createdAt", "id", "itemsJson", "pointsEarned", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "id", "imageUrl", "isActive") SELECT "category", "createdAt", "description", "id", "imageUrl", "isActive" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "passHash" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "addressLine" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("addressLine", "createdAt", "id", "name", "passHash", "phone", "points", "reference") SELECT "addressLine", "createdAt", "id", "name", "passHash", "phone", "points", "reference" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE TABLE "new_Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Variant" ("id", "productId") SELECT "id", "productId" FROM "Variant";
DROP TABLE "Variant";
ALTER TABLE "new_Variant" RENAME TO "Variant";
CREATE INDEX "Variant_productId_idx" ON "Variant"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
