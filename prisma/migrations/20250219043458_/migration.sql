/*
  Warnings:

  - You are about to drop the column `security_token` on the `Xauth` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Xauth" DROP COLUMN "security_token";
