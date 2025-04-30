// utils/updateTimelinePosts.ts
// import { getAccessToken } from "./getAccessToken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["query", "info", "warn", "error"] }); // Enable Prisma logs

export async function updateRobbieTimelinePosts(userId: string): Promise<void> {
  const access_token = process.env.R_BEARER_TOKEN;

  // Set the start time as 14 days ago
  const startTime = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  ).toISOString();

  let allTweets: any[] = [];
  let nextToken: string | undefined = undefined;

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
  };

  try {
    do {
      const baseUrl = `https://api.x.com/2/users/${userId}/tweets`;
      const queryParams = new URLSearchParams({
        exclude: "retweets,replies",
        "tweet.fields": "created_at,text,public_metrics",
        max_results: "50",
        start_time: startTime,
      });

      if (nextToken) {
        queryParams.set("pagination_token", nextToken);
      }

      const url = `${baseUrl}?${queryParams.toString()}`;
      console.log("Fetching tweets from:", url);

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Twitter API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Raw API response:", data);

      if (!data || typeof data !== "object") {
        throw new Error(
          "Invalid response: Expected an object, received null or non-object"
        );
      }

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error(
          "Invalid response: Expected 'data' to be an array, received: " +
            JSON.stringify(data)
        );
      }

      allTweets = allTweets.concat(data.data);
      nextToken = data.meta?.next_token;

      console.log(
        `Retrieved ${data.data.length} tweets. Total so far: ${allTweets.length}`
      );
    } while (nextToken);

    // Process all collected tweets
    for (const tweet of allTweets) {
      console.log("Tweet Data:", tweet);
      console.log("Tweet ID:", tweet.id);

      const tweetId = tweet.id;
      const tweetLink = `https://x.com/0xferg/status/${tweetId}`;
      const likes = tweet.public_metrics.like_count;
      const text = tweet.text;

      const existingTweet = await prisma.robbiePosts.findUnique({
        where: { post_id: tweetId },
      });

      // Update the likes of existing tweets
      if (existingTweet) {
        await prisma.robbiePosts.update({
          where: { post_id: tweetId },
          data: { likes: likes, text: text, link: tweetLink },
        });
        console.log("Tweet updated successfully:", tweetId);
      }

      if (!existingTweet) {
        console.log("Creating new tweet with data:", {
          post_id: tweetId,
          createdAt: new Date(tweet.created_at),
          is_analyzed: false,
        });
        await prisma.robbiePosts.create({
          data: {
            post_id: tweetId,
            createdAt: new Date(tweet.created_at),
            is_analyzed: false,
            link: tweetLink,
            likes: likes,
            text: text,
            is_added_to_spreadsheet: false,
          },
        });
        console.log("Tweet created successfully:", tweetId);
      } else {
        console.log("Tweet already exists:", tweetId);
      }
    }

    console.log(
      `Successfully updated user timeline database with ${allTweets.length} new posts`
    );
  } catch (error) {
    console.error("Error fetching user timeline:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
