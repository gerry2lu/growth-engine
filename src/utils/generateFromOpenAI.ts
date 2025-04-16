import OpenAI from "openai";

// Define the types for the tweet generation request
export type GenerateTweetsRequest = {
  topic: string;
  overarchingNarrative: string;
  selectedMetrics: string[];
  tweetStyle: string;
  model?: string;
  customPrompt?: string;
};

// Define the tweet style type
interface TweetStyle {
  name: string;
  example: string;
  description: string;
}

// Define the tweet styles object
export const tweetStyles: Record<string, TweetStyle> = {
  catchphrase: {
    name: "Catch Phrase Tweet",
    example: "2025 is for immutable",
    description: "Short, memorable phrase that captures attention",
  },
  oneliner: {
    name: "One Liner Statement Tweet",
    example: "incredible how many of these predictions cobie absolutely nailed",
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
    description: `An opening hook followed a new line and then 3-4 concise bullet points using the bullet point character '•'. No rhetorical questions. Prioritise data driven metrics. The hook should communicate value by either highlighting a key metric or invoking curiosity in the reader. Try to be attention grabbing in the hook by incoporating either a bold metric/claim, something very recent (e.g. just, now, soon, today, tomorrow, this week), and be high in modality. Try have the hook provide more value upfront by using a specific data point. Do NOT use hyphen dashes.`,
  },
  multiparagraph: {
    name: "Multiparagraph Tweet",
    example:
      'Gaming is bigger than music, movies, and TV combined.\n\nIt\'s compounding 10% year on year.\n\nThe $100bn a year spent "renting" items is going to turn into a trillion dollar ownable economy.\n\nAll of it will be built on web3.',
    description: "Multiple short paragraphs building a narrative",
  },
};

// Interface for the response from the OpenAI tweet generation
export interface GenerateTweetsResponse {
  tweets: string[];
}

/**
 * Generates tweets using OpenAI's GPT-4o model with a two-step process:
 * 1. Gather relevant information via web search
 * 2. Use that information to generate tweets
 *
 * @param params The parameters for tweet generation
 * @param dbPrompt Optional database prompt to use
 * @returns Generated tweets
 */
export async function generateTweetsFromOpenAI(
  params: GenerateTweetsRequest
): Promise<GenerateTweetsResponse> {
  const { topic, tweetStyle, customPrompt } = params;

  console.log("Using OpenAI GPT-4o model with web search");

  // Get the selected style or default to catchphrase
  const selectedStyle =
    tweetStyles[tweetStyle as keyof typeof tweetStyles] ||
    tweetStyles.catchphrase;

  // Initialize OpenAI API client
  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_SECRET!,
  });

  try {
    // STEP 1: Gather relevant information via web search
    console.log("Step 1: Gathering relevant information via web search...");

    const searchPrompt = `I need to create tweets about ${
      customPrompt || topic
    }. 
    Please search the web for the most relevant and recent information about this topic, 
    focusing specifically on:
    
    1. Key metrics and statistics (e.g., user counts, growth percentages, market size, investments)
    2. Recent developments or announcements
    3. Industry trends and projections
    4. Comparative data points
    5. Notable achievements or milestones
    
    Organize the information in a structured format with clear sections for different aspects of the topic. 
    Include specific numbers, dates, and factual information that would be useful for creating impactful tweets.`;

    const searchResponse = await openai.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview", search_context_size: "medium" }],
      input: searchPrompt,
    });

    // Extract the research information
    const researchInfo = searchResponse.output_text || "";
    console.log("Research information gathered successfully");

    // STEP 2: Generate tweets using the gathered information
    console.log("Step 2: Generating tweets using gathered information...");

    const tweetGenerationPrompt = `Based on the following research information:

${researchInfo}

Generate 6 distinct tweets about ${customPrompt || topic} in the "${
      selectedStyle.name
    }" style.

Description of this style: ${selectedStyle.description}
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

    const tweetResponse = await openai.responses.create({
      model: "gpt-4.1",
      input: tweetGenerationPrompt,
    });

    // Extract the generated tweets
    const generatedText = tweetResponse.output_text || "";

    // Process the tweets
    const tweets = generatedText
      .split("||") // Split by the separator
      .map((tweet) => tweet.trim()) // Trim whitespace
      .filter((tweet) => tweet.length > 0); // Remove empty tweets

    return {
      tweets,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Error generating tweets with OpenAI");
  }
}
