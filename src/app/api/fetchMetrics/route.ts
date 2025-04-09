/* eslint-disable  @typescript-eslint/no-explicit-any */

// app/api/fetchMetrics/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Metric } from "@/components/TweetGenerator";
import { prisma } from "@/lib/prisma";

// Define the expected request body type
interface FetchMetricsRequest {
  topic: string;
}

// Define the response type
interface FetchMetricsResponse {
  metrics: Metric[];
  overarchingNarrative?: string;
}

const stripTopic = (topic: string): string => {
  // Remove special characters and dollar signs
  const cleanedTopic = topic
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Limit to four words maximum
  const words = cleanedTopic.split(" ");
  return words.slice(0, 4).join(" ");
};

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { topic } = (await request.json()) as FetchMetricsRequest;

    // Clean and limit the search query
    const searchQuery = topic ? stripTopic(topic) : "Web3 Gaming"; // Default query
    console.log("Using search query:", searchQuery);

    const access_token = process.env.R_BEARER_TOKEN;

    // Function to fetch tweets using the v2 recent search API
    const fetchTweets = async (nextToken?: string) => {
      const twitterUrl = new URL("https://api.x.com/2/tweets/search/recent");

      // Add required parameters
      twitterUrl.searchParams.append("query", searchQuery);
      twitterUrl.searchParams.append("max_results", "100"); // Max allowed per request

      // Add pagination token if provided
      if (nextToken) {
        twitterUrl.searchParams.append("next_token", nextToken);
      }

      // Add tweet fields to include public metrics
      twitterUrl.searchParams.append(
        "tweet.fields",
        "public_metrics,created_at,author_id,entities"
      );

      console.log("Fetching from URL:", twitterUrl.toString());

      const twitterResponse = await fetch(twitterUrl.toString(), {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!twitterResponse.ok) {
        throw new Error(
          `Twitter API error: ${twitterResponse.status} ${twitterResponse.statusText}`
        );
      }

      return twitterResponse.json();
    };

    // Step 1: Fetch tweets from Twitter (up to 200 results with pagination)
    const firstBatch = await fetchTweets();
    let tweetsData = firstBatch.data || [];

    // If we have a next_token and less than 200 tweets, fetch the next batch
    if (firstBatch.meta?.next_token && tweetsData.length < 200) {
      console.log("Fetching second batch of tweets...");
      const secondBatch = await fetchTweets(firstBatch.meta.next_token);
      if (secondBatch.data && secondBatch.data.length > 0) {
        tweetsData = [...tweetsData, ...secondBatch.data];
      }
    }

    console.log("Total fetched tweets count:", tweetsData.length);
    if (tweetsData.length > 0) {
      console.log(
        "Sample tweet structure:",
        JSON.stringify(tweetsData[0], null, 2).substring(0, 500) + "..."
      );
    }

    // Step 2: Filter out tweets with fewer than 5 impressions or zero likes
    const filteredTweets = tweetsData.filter((t: any) => {
      const metrics = t.public_metrics;
      return metrics && metrics.impression_count >= 5 && metrics.like_count > 0;
    });

    if (filteredTweets.length === 0) {
      return NextResponse.json(
        { error: "No engaging tweets found for this topic" },
        { status: 404 }
      );
    }

    // Extract tweet texts with metrics and join them with a separator
    const tweetTexts = filteredTweets
      .map((t: any) => {
        const metrics = t.public_metrics;
        return `${t.text}\nRetweets: ${metrics.retweet_count}, Replies: ${metrics.reply_count}, Likes: ${metrics.like_count}, Impressions: ${metrics.impression_count}, Created: ${t.created_at}`;
      })
      .join("\n---\n");

    // Step 3: Use Anthropic API to parse tweet information and extract metrics
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const metricPrompt = await prisma.systemPrompts.findFirst({
      where: {
        name: "metrics",
      },
    });

    const prompt = `Given these recent tweets about ${searchQuery}:\n${tweetTexts}\n\n

${metricPrompt?.prompt}

At the end of your response use the characters || to then add a summary of the overarching narrative which would be most relevant to a tweet about ${searchQuery}."`;

    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      temperature: 0.7,
      system:
        "You are a helpful assistant that extracts key metrics and data points from tweets for content creation.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the metrics from the completion
    let metricsText = "";
    if (Array.isArray(completion.content)) {
      metricsText = completion.content
        .map((segment: any) => segment.text)
        .join("");
    } else {
      metricsText = completion.content;
    }

    // Extract the overarching narrative if it exists (after the || delimiter)
    let overarchingNarrative = "";
    const narrativeSplit = metricsText.split("||");

    if (narrativeSplit.length > 1) {
      // Get metrics from first part and narrative from second part
      metricsText = narrativeSplit[0].trim();
      overarchingNarrative = narrativeSplit[1].trim();
    }

    // Step 4: Convert the result into an array of metrics
    const metricsArray = metricsText
      .split(",")
      .map((metric) => metric.trim())
      .filter((metric) => metric.length > 0);

    // Step 5: Return the array of metrics
    const formattedMetrics: Metric[] = metricsArray.map((metric, index) => ({
      id: index.toString(),
      name: metric,
      selected: false,
    }));

    const response: FetchMetricsResponse = {
      metrics: formattedMetrics,
      overarchingNarrative,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching metrics:", error);

    // Return an error response
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
