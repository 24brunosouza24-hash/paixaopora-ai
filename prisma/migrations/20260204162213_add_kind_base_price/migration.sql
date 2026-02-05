/*
  Warnings:

  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `createdAt` on the `OptionItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OptionItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Order_createdAt_idx";

-- DropIndex
DROP INDEX "Order_userId_idx";

-- DropIndex
DROP INDEX "Variant_productId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Order";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OptionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_OptionItem" ("id", "isActive", "name", "priceCents", "sortOrder", "type") SELECT "id", "isActive", "name", "priceCents", "sortOrder", "type" FROM "OptionItem";
DROP TABLE "OptionItem";
ALTER TABLE "new_OptionItem" RENAME TO "OptionItem";
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kind" TEXT NOT NULL DEFAULT 'ACAI',
    "basePriceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "id", "imageUrl", "isActive", "title", "updatedAt") SELECT "category", "createdAt", "description", "id", "imageUrl", "isActive", "title", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL DEFAULT '',
    "street" TEXT NOT NULL DEFAULT '',
    "addressLine" TEXT NOT NULL DEFAULT '',
    "reference" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("addressLine", "id", "name", "phone", "points", "reference") SELECT "addressLine", "id", "name", "phone", "points", "reference" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
