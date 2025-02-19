-- CreateTable
CREATE TABLE "Xauth" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "has_expired" BOOLEAN NOT NULL,
    "security_token" TEXT NOT NULL,

    CONSTRAINT "Xauth_pkey" PRIMARY KEY ("id")
);
