-- CreateTable
CREATE TABLE "CashClosing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCents" INTEGER NOT NULL,
    "ordersCount" INTEGER NOT NULL,
    "cashCents" INTEGER NOT NULL,
    "pixCents" INTEGER NOT NULL,
    "cardCents" INTEGER NOT NULL,
    "note" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "userId" TEXT,
    "customerName" TEXT,
    "phone" TEXT,
    "neighborhood" TEXT,
    "street" TEXT,
    "addressLine" TEXT,
    "reference" TEXT,
    "payment" TEXT,
    "needChange" BOOLEAN NOT NULL DEFAULT false,
    "changeFor" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "deliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "usedPoints" INTEGER NOT NULL DEFAULT 0,
    "earnedPoints" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressLine", "createdAt", "customerName", "deliveryFeeCents", "earnedPoints", "id", "neighborhood", "notes", "payment", "phone", "reference", "street", "subtotalCents", "totalCents", "usedPoints", "userId") SELECT "addressLine", "createdAt", "customerName", "deliveryFeeCents", "earnedPoints", "id", "neighborhood", "notes", "payment", "phone", "reference", "street", "subtotalCents", "totalCents", "usedPoints", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
