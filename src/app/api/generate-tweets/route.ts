/* eslint-disable  @typescript-eslint/no-explicit-any */

// app/api/generate-tweets/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Define the expected request body type
interface GenerateTweetsRequest {
  topics?: string;
}

// Define the response type
interface GenerateTweetsResponse {
  tweets: string[];
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { topics } = (await request.json()) as GenerateTweetsRequest;

    const searchQuery = topics || "Web3 Gaming"; // Default query

    // Build the Twitter API URL
    const twitterUrl = new URL(
      "https://api.twitter.com/2/tweets/search/recent"
    );
    twitterUrl.searchParams.append("query", searchQuery);
    twitterUrl.searchParams.append("tweet.fields", "public_metrics");
    twitterUrl.searchParams.append("max_results", "25"); // TODO pull more tweets but filter poor quality ones

    // Make a direct HTTP request to Twitter API
    const twitterResponse = await fetch(twitterUrl.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
    });

    if (!twitterResponse.ok) {
      throw new Error(
        `Twitter API error: ${twitterResponse.status} ${twitterResponse.statusText}`
      );
    }

    const tweetsData = await twitterResponse.json();

    // Ensure that tweet data exists
    if (!tweetsData.data) {
      throw new Error("No tweet data returned from Twitter API");
    }

    // Extract tweet texts and join them with a separator
    const tweetTexts = tweetsData.data
      .map((t: any) => {
        const metrics = t.public_metrics;
        return `${t.text}\nRetweets: ${metrics.retweet_count}, Replies: ${metrics.reply_count}, Likes: ${metrics.like_count}, Impressions: ${metrics.impression_count}`;
      })
      .join("\n---\n");

    console.log(tweetTexts);

    // Initialize Anthropic API client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Create the prompt for the LLM using the fetched tweet texts
    const prompt = `Given these recent tweets:\n${tweetTexts}\n\nGenerate 3 distinct tweets on ${searchQuery} which can result in high engagement. Convey a point/narrative with each tweet. Do not use hashtags. Reference real metrics from the given recent tweets such as player count, investments, percentage growth, or time frames. Do not reference the engagement metrics. Be short and punctual with each sentence. End each sentence with two new line characters. Format with each tweet separated by '||'`;

    // Generate completions using Anthropic's Messages API
    // Note: Adjust the model name if needed according to Anthropic's documentation.
    const completions = await Promise.all([
      anthropic.messages.create({
        model: "claude-3-5-haiku-20241022", // Use a supported model name
        max_tokens: 250,
        messages: [{ role: "user", content: prompt }],
      }),
    ]);

    console.log("Anthropic completions:", completions);

    completions.forEach((completion, index) => {
      console.log(`Completion ${index} content:`, completion.content);
    });

    // Process the responses.
    const allTweets = completions.flatMap((c: any) => {
      let generatedText = "";
      if (Array.isArray(c.content)) {
        // Use the 'text' property from each segment and join them together.
        generatedText = c.content.map((segment: any) => segment.text).join("");
      } else {
        generatedText = c.content;
      }

      // Split the generated text on the '||' separator and trim each tweet.
      return generatedText.split("||").map((t: string) => t.trim());
    });

    // Return the first 3 tweets
    const response: GenerateTweetsResponse = {
      tweets: allTweets.slice(0, 3),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating tweets:", error);

    // Return an error response
    return NextResponse.json(
      { error: "Failed to generate tweets" },
      { status: 500 }
    );
  }
}
