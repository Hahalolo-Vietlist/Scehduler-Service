/*
  Warnings:

  - You are about to drop the column `clientId` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_clientId_fkey";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "clientId",
ADD COLUMN     "targetServiceClientId" TEXT,
ADD COLUMN     "targetServiceSecret" TEXT;

-- DropTable
DROP TABLE "clients";
