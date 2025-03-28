/* eslint-disable  @typescript-eslint/no-explicit-any */

// app/api/send-slack-message/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Trends } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { trendsWhiteList } from "@/utils/getTrendsWhiteList";
import { getAccessToken } from "@/utils/getAccessToken";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const result = await sendSlackMessage();
    return NextResponse.json({
      success: true,
      message: "Slack message sent successfully",
      result,
    });
  } catch (error) {
    console.error("Error sending Slack message:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send Slack message" },
      { status: 500 }
    );
  }
}

async function getRecentTrends() {
  // Get trends from the past 2 hours
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

  const trends = await prisma.trends.findMany({
    where: {
      createdAt: {
        gte: twoHoursAgo,
      },
      isSlackNotified: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const filteredTrends = trends.filter((trend) =>
    trendsWhiteList.includes(trend.category)
  );

  return filteredTrends;
}

async function analyzeTrends(trends: Trends[]): Promise<string[]> {
  const trendAnalyses: string[] = [];

  for (const trend of trends) {
    try {
      // Clean and prepare the search query
      const searchQuery = prepareSearchQuery(trend.trend_name);
      console.log("Search query:", searchQuery);
      const tweets = await fetchTrendTweets(searchQuery);
      if (tweets) {
        const summary = await generateTweetSummary(tweets, trend.trend_name);
        trendAnalyses.push(summary);
      } else {
        console.warn(`No tweets found for trend: ${trend.trend_name}`);
        trendAnalyses.push("");
      }
    } catch (error) {
      console.error(`Error analyzing trend ${trend.trend_name}:`, error);
      trendAnalyses.push("");
    }
  }

  return trendAnalyses;
}

function prepareSearchQuery(trendName: string): string {
  // Remove special characters and get first four words
  const cleanText = trendName.replace(/[^\w\s]/g, "").trim();

  const words = cleanText.split(/\s+/);
  const firstThreeWords = words.slice(0, 3).join(" ");

  return firstThreeWords;
}

async function fetchTrendTweets(searchQuery: string): Promise<string | null> {
  const access_token = await getAccessToken();

  const fetchTweets = async () => {
    const twitterUrl = new URL("https://api.x.com/2/tweets/search/recent");
    twitterUrl.searchParams.append("query", searchQuery);
    twitterUrl.searchParams.append("tweet.fields", "public_metrics");
    twitterUrl.searchParams.append("max_results", "100");

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

  try {
    const firstBatch = await fetchTweets();
    const tweetsData = firstBatch.data;

    if (!tweetsData) {
      console.warn("No tweet data returned from Twitter API");
      return null;
    }

    const filteredTweets = tweetsData.filter((t: any) => {
      const metrics = t.public_metrics;
      return metrics.impression_count >= 5 && metrics.like_count > 0;
    });

    if (filteredTweets.length === 0) {
      console.warn("No tweets met the filtering criteria");
      return null;
    }

    const tweetTexts = filteredTweets
      .map((t: any) => {
        const metrics = t.public_metrics;
        return `${t.text}\nRetweets: ${metrics.retweet_count}, Replies: ${metrics.reply_count}, Likes: ${metrics.like_count}, Impressions: ${metrics.impression_count}`;
      })
      .join("\n---\n");

    return tweetTexts;
  } catch (error) {
    console.error("Error fetching tweets:", error);
    return null;
  }
}

async function generateTweetSummary(
  tweetTexts: string,
  trendName: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  if (!tweetTexts) {
    return "No tweets found for this trend.";
  }

  const prompt = `Below are tweets related to the trend "${trendName}". Provide a short and concise 2 sentence summary of the main insights. Use supporting real metrics. Do not reference engagement metrics such as likes. \n\n ${tweetTexts}`;

  const completions = await Promise.all([
    anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  ]);

  const summary = completions.flatMap((completion) => {
    let text = "";
    if (Array.isArray(completion.content)) {
      text = completion.content.map((segment: any) => segment.text).join("");
    } else {
      text = completion.content;
    }

    return text;
  });

  return summary.join("\n\n");
}

async function sendSlackMessage() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error("Missing Slack configuration");
  }

  const trends = await getRecentTrends();
  const trendAnalysis = await analyzeTrends(trends);

  if (trends.length === 0 || trendAnalysis.length === 0) {
    console.warn("No new trends found in the last 2 hours");
    return;
  }

  // Current date and time
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = {
    channel: channelId,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔔 New Trends Detected - ${currentDate}`,
          emoji: true,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "_New trending topics from the last 2 hours_",
        },
      },
      {
        type: "divider",
      },
      // Add individual trend blocks
      ...trends.flatMap((trend, index) => {
        const analysis = trendAnalysis[index];
        if (!analysis) return [];
        return [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                `*🔥 Trend: ${trend.trend_name}*\n` +
                `Category: ${trend.category}\n` +
                `Trending since: ${trend.trending_since}\n` +
                `Post count: ${trend.post_count}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔷 Insight:\n${analysis}`,
            },
          },
          {
            type: "divider",
          },
        ];
      }),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🤖 Generated by Growth AI | ${new Date().toLocaleTimeString()}`,
          },
        ],
      },
    ],
  };

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(message),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  // Update all trends that were sent to have isSlackNotified = true
  for (const trend of trends) {
    await prisma.trends.update({
      where: { id: trend.id },
      data: { isSlackNotified: true },
    });
  }

  return data;
}
