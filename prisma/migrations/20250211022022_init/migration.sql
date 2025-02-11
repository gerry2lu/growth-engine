-- CreateTable
CREATE TABLE "Trends" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trend_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "post_count" TEXT NOT NULL,
    "trending_since" TEXT NOT NULL,

    CONSTRAINT "Trends_pkey" PRIMARY KEY ("id")
);
