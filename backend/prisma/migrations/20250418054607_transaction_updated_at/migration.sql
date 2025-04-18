/*
  Warnings:

  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "invoice" TEXT NOT NULL,
    "payment_hash" TEXT NOT NULL,
    "preimage" TEXT,
    "amount_msat" BIGINT NOT NULL,
    "fees_paid_msat" INTEGER,
    "description" TEXT,
    "settled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "spark_request_id" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount_msat", "appId", "created_at", "description", "expires_at", "fees_paid_msat", "id", "invoice", "payment_hash", "preimage", "settled_at", "spark_request_id", "state", "type", "updatedAt", "userId") SELECT "amount_msat", "appId", "created_at", "description", "expires_at", "fees_paid_msat", "id", "invoice", "payment_hash", "preimage", "settled_at", "spark_request_id", "state", "type", COALESCE("settled_at", "created_at"), "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_invoice_key" ON "Transaction"("invoice");
CREATE UNIQUE INDEX "Transaction_payment_hash_key" ON "Transaction"("payment_hash");
CREATE UNIQUE INDEX "Transaction_preimage_key" ON "Transaction"("preimage");
CREATE UNIQUE INDEX "Transaction_spark_request_id_key" ON "Transaction"("spark_request_id");
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Transaction_appId_idx" ON "Transaction"("appId");
CREATE INDEX "Transaction_payment_hash_idx" ON "Transaction"("payment_hash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
