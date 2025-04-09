/* eslint-disable  @typescript-eslint/no-explicit-any */

// app/api/generate-tweets/route.ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// Define the expected request body type
interface GenerateTweetsRequest {
  topic: string;
  overarchingNarrative: string;
  selectedMetrics: string[];
  tweetStyle: string;
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { topic, overarchingNarrative, selectedMetrics, tweetStyle } =
      (await request.json()) as GenerateTweetsRequest;

    // Validate request parameters
    if (!topic || !selectedMetrics || selectedMetrics.length === 0) {
      return NextResponse.json(
        { error: "Topic and at least one metric are required" },
        { status: 400 }
      );
    }

    console.log("Generating tweets for topic:", topic);
    console.log("Using metrics:", selectedMetrics);
    console.log("Using overarching narrative:", overarchingNarrative);
    console.log("Using tweet style:", tweetStyle);

    // Format the metrics as a string for the prompt
    const metricsText = selectedMetrics.join("\n- ");

    // Define tweet style templates
    const tweetStyles = {
      catchphrase: {
        name: "Catch Phrase Tweet",
        example: "2025 is for immutable",
        description: "Short, memorable phrase that captures attention",
      },
      oneliner: {
        name: "One Liner Statement Tweet",
        example:
          "incredible how many of these predictions cobie absolutely nailed",
        description: "Single impactful statement that stands alone",
      },
      causeeffect: {
        name: "Cause and Effect 2 Liner Tweet",
        example:
          "The next 100 million users will come from gaming. One breakout web3 game will triple the global crypto DAU overnight.",
        description: "Shows relationship between two connected ideas",
      },
      comparison: {
        name: "Comparison Tweet",
        example:
          "the chatgpt launch 26 months ago was one of the craziest viral moments i'd ever seen, and we added one million users in five days.",
        description: "Contrasts two different ideas or timeframes",
      },
      parallelism: {
        name: "Parallelism Tweet",
        example:
          "It took us 6 years to partner with our first multi-billion dollar company. Another year to land our second. 8 months to get our third.",
        description: "Uses similar structure to emphasize a pattern",
      },
      hookbullets: {
        name: "Hook and Bullet Points Tweet",
        example:
          "2021 was the craziest year of our lives.\n\n- Axie holders grew by %10,363\n- AXS staking launch\n- Ronin mainnet launch\n- Katana launch (1.2 B liquidity & 20,000+ Daily traders)\n- Axie community treasury: 2 B + in value (52,000 ETH + 21 M AXS)\n\n2022 we'll shock the world (again).",
        description: "Opening hook followed by concise bullet points",
      },
      multiparagraph: {
        name: "Multiparagraph Tweet",
        example:
          'Gaming is bigger than music, movies, and TV combined.\n\nIt\'s compounding 10% year on year.\n\nThe $100bn a year spent "renting" items is going to turn into a trillion dollar ownable economy.\n\nAll of it will be built on web3.',
        description: "Multiple short paragraphs building a narrative",
      },
    };

    // Get the selected style or default to catchphrase
    const selectedStyle =
      tweetStyles[tweetStyle as keyof typeof tweetStyles] ||
      tweetStyles.catchphrase;

    // Initialize Anthropic API client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const tweetPrompt = await prisma.systemPrompts.findFirst({
      where: {
        name: "tweet",
      },
    });

    // Create the prompt for the LLM using the provided metrics and selected style
    const prompt = `Given these metrics:\n${metricsText}\n\nAnd this overarching narrative: ${overarchingNarrative}\n\nGenerate 6 distinct tweets about ${topic} in the "${selectedStyle.name}" style.\n\nDescription of this style: ${selectedStyle.description}\n\nExample of this style: "${selectedStyle.example}"\n\n${tweetPrompt?.prompt || 'For all tweets, follow these rules:\n- Ensure each tweet has high coherence with the topic\n- Do not use hashtags or emojis\n- Reference real metrics from the given data\n- Prioritize brevity and clarity'}\n\nFormat with each tweet separated by '||'`;

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
    const response = {
      tweets: allTweets.slice(0, 6),
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

// STABLE WORKING PROMPT
// const prompt = `Given these recent tweets:\n${tweetTexts}\n\n Generate 4 distinct tweets on the topic of ${searchQuery} with each tweet corresponding in order to one of following 4 archetypes: 1. Concise Declarative statement Examples: Immutable is the home of gaming on Ethereum 2. Cause and effect two liner, example: The next 100 million users will come from gaming. \n One breakout web3 game will triple the global crypto DAU overnight. 3. Hook + short and concise bullet points + one liner conclusion. Example: Web3 is <2 years away from mainstream. \n 1. $10BN invested in Web3 games in under 2 years. \n 2. Games take roughly 2 - 3 years to build to production. \n 3. Over the next year, we will see a huge influx of high-budget Web3 games, 10Xing crypto's active userbase. 4. Multiple sentence paragraphs. Each sentence should be a new line. Each progressive line should have the following content: a) Hook, b) Evidence supported by metrics, c) Analysis, d) Conclusion. For all four archetypes, follow the following rules and style guide: Be cohesive with each tweet. Do not use hashtags. Do not use emojis. Reference real metrics from the given recent tweets such as player count, investments, percentage growth, or time frames. Do not reference the engagement metrics. Use finite verbs. Avoid using the -s form of the verb phrase (third person singular). Use present tense for the first sentences, then use future tense for the remaining sentences. Be short and punctual with each sentence. Do not use words in a complicated, technical register. Avoid long french latinate words, as these tend to be more abstract. Use short germanic words, as these tend to be more specific and concrete. Limit the use of premodifiers. Allowed to use crypto twitter native lingo. Allowed to use acronyms. End each sentence with two new line characters. Format with each tweet separated by '||'`;
