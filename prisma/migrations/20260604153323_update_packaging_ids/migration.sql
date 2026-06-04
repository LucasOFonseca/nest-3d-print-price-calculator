/*
  Warnings:

  - You are about to drop the column `packagingId` on the `quotes` table. All the data in the column will be lost.
  - You are about to drop the column `packagingName` on the `quotes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "packagingId",
DROP COLUMN "packagingName",
ADD COLUMN     "packagingIds" TEXT[],
ADD COLUMN     "packagingNames" TEXT[];
