-- CreateTable
CREATE TABLE "ExemplarTweets" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tweet_text" TEXT NOT NULL,
    "content_topic" TEXT NOT NULL,
    "subtopic" TEXT NOT NULL,
    "tweet_style" TEXT NOT NULL,
    "hook_value" TEXT NOT NULL,
    "isThread" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExemplarTweets_pkey" PRIMARY KEY ("id")
);
