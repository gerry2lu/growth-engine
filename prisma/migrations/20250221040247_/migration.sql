/*
  Warnings:

  - The primary key for the `ImmutablePosts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ImmutablePosts` table. All the data in the column will be lost.
  - Added the required column `post_id` to the `ImmutablePosts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImmutablePosts" DROP CONSTRAINT "ImmutablePosts_pkey",
DROP COLUMN "id",
ADD COLUMN     "post_id" TEXT NOT NULL,
ADD CONSTRAINT "ImmutablePosts_pkey" PRIMARY KEY ("post_id");
