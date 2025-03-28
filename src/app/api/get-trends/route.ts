import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAccessToken } from "@/utils/getAccessToken";
import { trendsWhiteList } from "@/utils/getTrendsWhiteList";

const prisma = new PrismaClient();

// Example data returned from Twitter API
// {
//   "data": [
//     {
//       "category": "Gaming",
//       "post_count": "992 posts",
//       "trend_name": "Goblintown Game Announcement",
//       "trending_since": "6 hours ago"
//     },
//     {
//       "category": "Theatre",
//       "post_count": "78 posts",
//       "trend_name": "Tom Hiddleston and Hayley Atwell in 'Much Ado About Nothing': A West End Sensation",
//       "trending_since": "Trending now"
//     },
//     {
//       "category": "NFTs",
//       "post_count": "1.5K posts",
//       "trend_name": "Kaito Genesis NFTs Gain Voting Power on Yapper Launchpad",
//       "trending_since": "9 hours ago"
//     },
//     {
//       "category": "Finance",
//       "post_count": "811 posts",
//       "trend_name": "Tesla's Bitcoin Holdings: Steady at 11,509, Gain $600M",
//       "trending_since": "2 hours ago"
//     },
//     {
//       "category": "Gaming",
//       "post_count": "1.3K posts",
//       "trend_name": "Roblox Outage Sparks Community Frenzy",
//       "trending_since": "2 hours ago"
//     }
//   ]
// }
export type Trend = {
  category: string;
  post_count: string;
  trend_name: string;
  trending_since: string;
};

type TwitterResponse = {
  data: Array<Trend>;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns Distance value (lower means more similar)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate word overlap similarity between two strings
 * @param a First string
 * @param b Second string
 * @returns Similarity score (higher means more similar)
 */
function wordOverlapSimilarity(a: string, b: string): number {
  // Normalize strings: lowercase and remove special characters
  const normalizeStr = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();

  const wordsA = normalizeStr(a).split(/\s+/);
  const wordsB = normalizeStr(b).split(/\s+/);

  // Count matching words
  const wordSetB = new Set(wordsB);
  let matchCount = 0;

  for (const word of wordsA) {
    if (wordSetB.has(word)) {
      matchCount++;
    }
  }

  // Calculate Jaccard similarity: intersection / union
  const unionSize = new Set([...wordsA, ...wordsB]).size;
  return unionSize > 0 ? matchCount / unionSize : 0;
}

/**
 * Check if a trend is similar to any existing trend in the database
 * @param newTrend New trend to check
 * @param existingTrends Array of existing trends
 * @returns The matching trend if found, otherwise null
 */
async function isTrendSimilar(
  newTrendName: string
): Promise<{ id: number; trend_name: string } | null> {
  // Get all trends from the last 7 days to compare against
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const existingTrends = await prisma.trends.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      id: true,
      trend_name: true,
    },
  });

  // Normalize the new trend name
  const normalizedNewTrend = newTrendName.toLowerCase().trim();

  // Thresholds for similarity
  // const LEVENSHTEIN_THRESHOLD = 0.7; // Higher threshold means more strict matching
  // const WORD_OVERLAP_THRESHOLD = 0.5; // Higher threshold means more strict matching

  let bestMatch: { id: number; trend_name: string } | null = null;
  let highestSimilarity = 0;

  for (const existingTrend of existingTrends) {
    const normalizedExistingTrend = existingTrend.trend_name
      .toLowerCase()
      .trim();

    // Skip exact matches (already handled by the database query)
    if (normalizedNewTrend === normalizedExistingTrend) {
      return existingTrend;
    }

    // Calculate Levenshtein similarity (normalized by the length of the longer string)
    const maxLength = Math.max(
      normalizedNewTrend.length,
      normalizedExistingTrend.length
    );
    const levenshteinSimilarity =
      maxLength > 0
        ? 1 -
          levenshteinDistance(normalizedNewTrend, normalizedExistingTrend) /
            maxLength
        : 0;

    // Calculate word overlap similarity
    const wordSimilarity = wordOverlapSimilarity(
      normalizedNewTrend,
      normalizedExistingTrend
    );

    // Combine both similarity measures (weighted average)
    const combinedSimilarity =
      levenshteinSimilarity * 0.4 + wordSimilarity * 0.6;

    // Check if this is the best match so far
    if (combinedSimilarity > highestSimilarity) {
      highestSimilarity = combinedSimilarity;
      bestMatch = existingTrend;
    }
  }

  // Determine if the best match is similar enough
  const similarityThreshold = 0.6; // Adjust as needed
  return highestSimilarity >= similarityThreshold ? bestMatch : null;
}

export async function GET() {
  try {
    const twitterUrl = new URL("https://api.x.com/2/users/personalized_trends");

    const access_token = await getAccessToken();

    const twitterResponse = await fetch(twitterUrl.toString(), {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!twitterResponse.ok) {
      if (twitterResponse.status === 429) {
        // Query the database for trends created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const trendsData = await prisma.trends.findMany({
          where: {
            createdAt: {
              gte: today,
            },
          },
        });

        const filteredTrends = trendsData.filter((trend) =>
          trendsWhiteList.includes(trend.category)
        );

        return NextResponse.json(filteredTrends);
      } else {
        throw new Error(
          `Twitter API error: ${twitterResponse.status} ${twitterResponse.statusText}`
        );
      }
    }

    const response = (await twitterResponse.json()) as TwitterResponse;
    const trendsData = response.data;

    // Filter out trends that already exist in the database
    const newTrends = [];

    for (const trend of trendsData) {
      // First check for exact matches (case insensitive)
      const exactMatch = await prisma.trends.findFirst({
        where: {
          trend_name: {
            equals: trend.trend_name,
            mode: "insensitive", // Case insensitive comparison
          },
        },
      });

      if (exactMatch) {
        // Update existing trend
        await prisma.trends.update({
          where: {
            id: exactMatch.id,
          },
          data: {
            post_count: trend.post_count,
            trending_since: trend.trending_since,
          },
        });
        continue; // Skip to next trend
      }

      // If no exact match, check for similar trends using fuzzy matching
      const similarTrend = await isTrendSimilar(trend.trend_name);

      if (similarTrend) {
        // Update the similar trend
        await prisma.trends.update({
          where: {
            id: similarTrend.id,
          },
          data: {
            post_count: trend.post_count,
            trending_since: trend.trending_since,
          },
        });
        console.log(
          `Fuzzy match found: "${trend.trend_name}" matches "${similarTrend.trend_name}"`
        );
      } else {
        // No similar trend found, add as new
        newTrends.push({
          trend_name: trend.trend_name,
          category: trend.category,
          post_count: trend.post_count,
          trending_since: trend.trending_since,
          isSlackNotified: false,
        });
      }
    }

    if (newTrends.length > 0) {
      // Save only the new trends to the database
      await prisma.trends.createMany({
        data: newTrends,
      });
    }

    console.log("\n New Trends Added:", newTrends.length);

    // Return all trends for today, including both new and existing ones
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allTrendsToday = await prisma.trends.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter the trends
    const filteredTrends = allTrendsToday.filter((trend) =>
      trendsWhiteList.includes(trend.category)
    );

    return NextResponse.json(filteredTrends);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
