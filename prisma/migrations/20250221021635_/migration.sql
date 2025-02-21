-- CreateTable
CREATE TABLE "ImmutablePosts" (
    "id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,
    "is_analyzed" BOOLEAN NOT NULL,

    CONSTRAINT "ImmutablePosts_pkey" PRIMARY KEY ("id")
);
