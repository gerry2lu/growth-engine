-- CreateTable
CREATE TABLE "SystemPrompts" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,

    CONSTRAINT "SystemPrompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemPrompts_name_key" ON "SystemPrompts"("name");
