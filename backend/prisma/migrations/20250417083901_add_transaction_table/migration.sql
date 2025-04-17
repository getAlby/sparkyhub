-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "appId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "invoice" TEXT NOT NULL,
    "payment_hash" TEXT NOT NULL,
    "amount_msat" BIGINT NOT NULL,
    "fees_paid_msat" INTEGER,
    "description" TEXT,
    "settled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoice_key" ON "Transaction"("invoice");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_payment_hash_key" ON "Transaction"("payment_hash");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_appId_idx" ON "Transaction"("appId");

-- CreateIndex
CREATE INDEX "Transaction_payment_hash_idx" ON "Transaction"("payment_hash");
