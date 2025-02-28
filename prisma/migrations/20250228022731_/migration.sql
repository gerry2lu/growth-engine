-- CreateTable
CREATE TABLE "RobbiePosts" (
    "post_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_analyzed" BOOLEAN NOT NULL,

    CONSTRAINT "RobbiePosts_pkey" PRIMARY KEY ("post_id")
);
