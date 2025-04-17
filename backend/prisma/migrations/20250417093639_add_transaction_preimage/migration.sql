/*
  Warnings:

  - A unique constraint covering the columns `[preimage]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "preimage" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_preimage_key" ON "Transaction"("preimage");
