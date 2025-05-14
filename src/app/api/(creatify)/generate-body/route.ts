// app/api/(creatify)/generate-body/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { gameContext, selectedHook, instructions } = await request.json();

    if (!gameContext || !selectedHook) {
      return NextResponse.json(
        { error: "Game context and selected hook are required" },
        { status: 400 }
      );
    }

    // Generate ad body based on the selected hook and game context
    const bodyResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in creating compelling ad scripts for mobile and video games. Your scripts should be engaging, highlight the game's unique features, and drive user action.",
        },
        {
          role: "user",
          content: `Create a script for a 30-second video ad with the following hook: "${selectedHook}"
          
          Game details: ${JSON.stringify(gameContext)}
          
          Additional instructions: ${
            instructions ||
            "Make the script engaging and appealing to the target audience"
          }
            - The goal is to get the user on Immutable Play where the game is available. Built by Immutable, Immutable Play is a platform where users can play games and earn rewards.
          
          The script should:
          1. Start with the provided hook
          2. Have an agitation (emotionally resonate with the user)
          3. Have at least two types of trust signals (social proof, real testimonials, gurantee)
          4. Use psychological triggers (limited time offer, scarcity)
          5. Address objections (i.e takes too much time, too expensive, too much effort, low perceived value)
          6. Include a clear call to action at the end
          7. Be timed for a 30-second video (approximately 50-60 words total)
          
          Format your response as a JSON object with:
          1. "script": The full ad script
          2. "visualSuggestions": Array of suggestions for visuals to accompany each part of the script
          3. "callToAction": The specific call to action text`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const adBody = JSON.parse(bodyResponse.choices[0].message.content || "{}");

    return NextResponse.json({
      adBody,
      success: true,
    });
  } catch (error) {
    console.error("Error generating ad body:", error);
    return NextResponse.json(
      { error: "Failed to generate ad body", details: error },
      { status: 500 }
    );
  }
}
