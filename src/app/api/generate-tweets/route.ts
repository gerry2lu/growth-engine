/* eslint-disable  @typescript-eslint/no-explicit-any */

// app/api/generate-tweets/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateTweetsFromOpenAI,
  GenerateTweetsRequest,
  tweetStyles,
} from "@/utils/generateFromOpenAI";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const requestData = (await request.json()) as GenerateTweetsRequest;

    // Validate request parameters
    if (
      !requestData.topic ||
      !requestData.selectedMetrics ||
      requestData.selectedMetrics.length === 0
    ) {
      return NextResponse.json(
        { error: "Topic and at least one metric are required" },
        { status: 400 }
      );
    }

    console.log("Generating tweets for topic:", requestData.topic);
    console.log("Using metrics:", requestData.selectedMetrics);
    console.log(
      "Using overarching narrative:",
      requestData.overarchingNarrative
    );
    console.log("Using tweet style:", requestData.tweetStyle);

    // Format the metrics as a string for the prompt
    const metricsText = requestData.selectedMetrics.join("\n- ");

    // Use OpenAI if specified, otherwise use Anthropic
    if (requestData.model === "OpenAI") {
      try {
        // Generate tweets using OpenAI
        const result = await generateTweetsFromOpenAI(requestData);
        return NextResponse.json(result);
      } catch (error) {
        console.error("OpenAI API error:", error);
        return NextResponse.json(
          { error: "Error generating tweets with OpenAI" },
          { status: 500 }
        );
      }
    } else {
      console.log("Using Anthropic Claude model");

      // Initialize Anthropic API client
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });

      const selectedStyle =
        tweetStyles[requestData.tweetStyle as keyof typeof tweetStyles] ||
        tweetStyles.catchphrase;

      // Create the standard prompt for the Anthropic LLM
      const standardPrompt = `Given these metrics:\n${metricsText}\n\nAnd this overarching narrative: ${requestData.overarchingNarrative}\n\nGenerate 6 distinct tweets about ${requestData.topic} in the ${selectedStyle.name} style. Description of this style: ${selectedStyle.description}
      Example of this style: "${selectedStyle.example}"

      For all tweets, follow these rules:
      - Ensure each tweet has high coherence with the topic
      - Do not use hashtags or emojis
      - Reference real metrics from the research information such as player count, investments, percentage growth, or time frames
      - Do not reference engagement metrics like likes or retweets
      - You may use crypto Twitter native lingo and acronyms
      - Prioritize brevity by making each sentence short and efficient
      - Limit each tweet to 280 characters
      - Separate each tweet with a "||"`;

      // Generate completions using Anthropic's Messages API
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: standardPrompt }],
      });

      console.log("Anthropic completion:", completion);

      // Extract the generated text
      let generatedText = "";
      if (Array.isArray(completion.content)) {
        // Use the 'text' property from each segment and join them together
        generatedText = completion.content
          .map((segment: any) => segment.text)
          .join("");
      } else {
        generatedText = completion.content;
      }

      // Split the text by the separator and filter out any empty strings
      const allTweets = generatedText
        .split("||") // Split by the separator
        .map((tweet) => tweet.trim()) // Trim whitespace
        .filter((tweet) => tweet.length > 0); // Filter out empty strings

      // Get the first 6 tweets
      const tweets = allTweets.slice(0, 6);

      // Return the tweets (no images for Anthropic)
      return NextResponse.json({ tweets });
    }
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

// STABLE WORKING PROMPT
// const prompt = `Given these recent tweets:\n${tweetTexts}\n\n Generate 4 distinct tweets on the topic of ${searchQuery} with each tweet corresponding in order to one of following 4 archetypes: 1. Concise Declarative statement Examples: Immutable is the home of gaming on Ethereum 2. Cause and effect two liner, example: The next 100 million users will come from gaming. \n One breakout web3 game will triple the global crypto DAU overnight. 3. Hook + short and concise bullet points + one liner conclusion. Example: Web3 is <2 years away from mainstream. \n 1. $10BN invested in Web3 games in under 2 years. \n 2. Games take roughly 2 - 3 years to build to production. \n 3. Over the next year, we will see a huge influx of high-budget Web3 games, 10Xing crypto's active userbase. 4. Multiple sentence paragraphs. Each sentence should be a new line. Each progressive line should have the following content: a) Hook, b) Evidence supported by metrics, c) Analysis, d) Conclusion. For all four archetypes, follow the following rules and style guide: Be cohesive with each tweet. Do not use hashtags. Do not use emojis. Reference real metrics from the given recent tweets such as player count, investments, percentage growth, or time frames. Do not reference the engagement metrics. Use finite verbs. Avoid using the -s form of the verb phrase (third person singular). Use present tense for the first sentences, then use future tense for the remaining sentences. Be short and punctual with each sentence. Do not use words in a complicated, technical register. Avoid long french latinate words, as these tend to be more abstract. Use short germanic words, as these tend to be more specific and concrete. Limit the use of premodifiers. Allowed to use crypto twitter native lingo. Allowed to use acronyms. End each sentence with two new line characters. Format with each tweet separated by '||'`;
