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
  referencedTweets: number;
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { topics } = (await request.json()) as GenerateTweetsRequest;

    const searchQuery = topics || "Web3 Gaming"; // Default query

    // Function to fetch tweets with pagination
    const fetchTweets = async (nextToken?: string) => {
      const twitterUrl = new URL("https://api.x.com/2/tweets/search/recent");
      twitterUrl.searchParams.append("query", searchQuery);
      twitterUrl.searchParams.append("tweet.fields", "public_metrics");
      twitterUrl.searchParams.append("max_results", "100");
      if (nextToken) {
        twitterUrl.searchParams.append("next_token", nextToken);
      }

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

      return twitterResponse.json();
    };

    const firstBatch = await fetchTweets();
    let tweetsData = firstBatch.data;

    if (firstBatch.meta.next_token) {
      // Fetch the second batch of tweets
      const secondBatch = await fetchTweets(firstBatch.meta.next_token);
      tweetsData = tweetsData.concat(secondBatch.data);
    }

    // Ensure that tweet data exists
    if (!tweetsData) {
      throw new Error("No tweet data returned from Twitter API");
    }

    // Filter out tweets with less than 5 impressions or zero likes
    const filteredTweets = tweetsData.filter((t: any) => {
      const metrics = t.public_metrics;
      return metrics.impression_count >= 5 && metrics.like_count > 0;
    });

    // Extract tweet texts with public metrics and join them with a separator
    const tweetTexts = filteredTweets
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

    if (tweetTexts.length === 0) {
      return NextResponse.json(
        { error: "No tweets engaging tweets found" },
        { status: 404 }
      );
    }

    // Create the prompt for the LLM using the fetched tweet texts
    const prompt = `Given these recent tweets:\n${tweetTexts}\n\n Generate 4 distinct tweets on the topic of ${searchQuery} with each tweet corresponding in order to one of following 4 archetypes: 1. Concise Declarative statement Examples: Immutable is the home of gaming on Ethereum 2. Cause and effect two liner, example: The next 100 million users will come from gaming. \n One breakout web3 game will triple the global crypto DAU overnight. 3. Hook + short and concise bullet points + one liner conclusion. Example: Web3 is <2 years away from mainstream. \n 1. $10BN invested in Web3 games in under 2 years. \n 2. Games take roughly 2 - 3 years to build to production. \n 3. Over the next year, we will see a huge influx of high-budget Web3 games, 10Xing crypto's active userbase. 4. Multiple sentence paragraphs. Each sentence should be a new line. Each progressive line should have the following content: a) Hook, b) Evidence supported by metrics, c) Analysis, d) Conclusion. For all four archetypes, follow the following rules and style guide: Be cohesive with each tweet. Do not use hashtags. Do not use emojis. Reference real metrics from the given recent tweets such as player count, investments, percentage growth, or time frames. Do not reference the engagement metrics. Use finite verbs. Avoid using the -s form of the verb phrase (third person singular). Use present tense for the first sentences, then use future tense for the remaining sentences. Be short and punctual with each sentence. Do not use words in a complicated, technical register. Avoid long french latinate words, as these tend to be more abstract. Use short germanic words, as these tend to be more specific and concrete. Limit the use of premodifiers. Allowed to use crypto twitter native lingo. Allowed to use acronyms. End each sentence with two new line characters. Format with each tweet separated by '||'`;

    // Generate completions using Anthropic's Messages API
    // Note: Adjust the model name if needed according to Anthropic's documentation.
    const completions = await Promise.all([
      anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022", // Use a supported model name
        max_tokens: 300,
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

    // Return the first 4 tweets
    const response: GenerateTweetsResponse = {
      tweets: allTweets.slice(0, 4),
      referencedTweets: filteredTweets.length,
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

// SIMPLE PROMPT
// const prompt = `Given these recent tweets:\n${tweetTexts}\n\n Generate 4 distinct tweets on the topic of ${searchQuery} with each tweet corresponding in order to one of following 4 archetypes: 1. Three sentence tweet which together conveys an insight / narrative, 2. A one liner declarative statement, 3. Cause + effect two sentence tweet, 4. Start with a proposition / insight sentence, then list at least 3 supporting metrics in bullet points, each metric should be as short and concise as possible, then end with a one liner conclusion. For all four archetypes make sure to follow the following rules and style guide: Do not use hashtags. Do not use emojis. Reference real metrics from the given recent tweets such as player count, investments, percentage growth, or time frames. Do not reference the engagement metrics. Use finite verbs. Avoid using the -s form of the verb phrase (third person singular). Use present tense for the first sentence, then future tense for the remaining sentences  (present tense + the auxiliary "will" or "going to"). Be short and punctual with each sentence. End each sentence with two new line characters. Format with each tweet separated by '||'`;

// const prompt = `Given these recent tweets:\n${tweetTexts}\n\n Generate 4 distinct tweets on the topic of ${searchQuery} with each tweet corresponding in order to one of following 4 archetypes:
//  1. Concise Declarative statement Examples: Immutable is the home of gaming on Ethereum
//   2. Cause and effect two liner, example: The next 100 million users will come from gaming. \n One breakout web3 game will triple the global crypto DAU overnight.
//    3. Hook + short and concise bullet points + one liner conclusion. Example: Web3 is <2 years away from mainstream. \n 1. $10BN invested in Web3 games in under 2 years. \n 2. Games take roughly 2 - 3 years to build to production. \n 3. Over the next year, we will see a huge influx of high-budget Web3 games, 10Xing crypto's active userbase.
//     4. Multiple sentence paragraphs. Each sentence should be a new line. Each progressive line should have the following content: a) Hook, b) Evidence supported by metrics, c) Analysis, d) Conclusion.
//      For all four archetypes, follow the following rules and style guide: Be cohesive with each tweet. Do not use hashtags. Do not use emojis. Reference real metrics from the given recent tweets such as player count, investments, percentage growth, or time frames. Do not reference the engagement metrics. Use finite verbs. Avoid using the -s form of the verb phrase (third person singular). Use present tense for the first sentences, then use future tense for the remaining sentences. Be short and punctual with each sentence. Do not use words in a complicated, technical register. Avoid long french latinate words, as these tend to be more abstract. Use short germanic words, as these tend to be more specific and concrete. Limit the use of premodifiers. Allowed to use crypto twitter native lingo. Allowed to use acronyms. End each sentence with two new line characters. Format with each tweet separated by '||'`;
