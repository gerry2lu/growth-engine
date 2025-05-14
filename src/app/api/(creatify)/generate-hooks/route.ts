// app/api/(creatify)/generate-hooks/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { gameContext, instructions } = await request.json();

    if (!gameContext) {
      return NextResponse.json(
        { error: "Game context is required" },
        { status: 400 }
      );
    }

    // Generate hooks based on the provided game context

    // Hardcode forms to always do reward based hooks

    const hooksResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert direct-response copywriter and performance marketer. Your task is to generate high-converting hook options for a Meta (Facebook/Instagram) paid ad, designed to stop the scroll within the first 4 seconds and emotionally resonate with the target audience. Your hooks should be attention-grabbing, concise, and highlight rewards as the key value proposition for playing the game.",
        },
        {
          role: "user",
          content: `Create 5 different hooks for a video ad for the following game:
          
          Game details: ${JSON.stringify(gameContext)}
          
          Additional instructions/details: ${
            instructions ||
            "Make the hooks engaging and appealing to the target audience"
          }
            - Emphasize earning rewards while having fun.
            - Where useful, hint at scarcity, exclusivity, or social proof.
            - Focus especially on the dream outcomes (fun gameplay + tangible rewards) and overcoming adoption friction (e.g. easy signup, real rewards).
            - Do not use emojis or special characters.
          
          Each hook should be 1-2 sentences (maximum 15 words) that would grab attention in the first 4 seconds of a video ad.
          Format your response as a JSON array of strings, with each string being a hook.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseData = JSON.parse(
      hooksResponse.choices[0].message.content || "{}"
    );

    console.log("hooks response", responseData);

    // Extract hooks from the response, handling different possible formats
    let extractedHooks: string[] = [];

    // Check for hooks in various possible formats
    if (responseData.hooks && Array.isArray(responseData.hooks)) {
      extractedHooks = responseData.hooks;
    } else if (
      responseData["Game Hooks"] &&
      Array.isArray(responseData["Game Hooks"])
    ) {
      extractedHooks = responseData["Game Hooks"];
    } else {
      // Try to find any array in the response
      for (const key in responseData) {
        if (Array.isArray(responseData[key]) && responseData[key].length > 0) {
          extractedHooks = responseData[key];
          break;
        }
      }
    }

    if (extractedHooks.length === 0) {
      return NextResponse.json(
        {
          error:
            "Failed to extract hooks from response: " +
            JSON.stringify(responseData),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hooks: extractedHooks,
      success: true,
    });
  } catch (error) {
    console.error("Error generating hooks:", error);
    return NextResponse.json(
      { error: "Failed to generate hooks" },
      { status: 500 }
    );
  }
}
