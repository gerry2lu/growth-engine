import { NextResponse } from "next/server";
import OpenAI from "openai";

// Define types for the OpenAI Responses API
interface OpenAIResponsesAPIResult {
  output_text?: string;
  items?: Array<{
    type: string;
    id: string;
    status: string;
    content?: Array<{
      type: string;
      text: string;
      annotations?: Array<any>;
    }>;
    role?: string;
  }>;
  [key: string]: any; // Allow for other properties
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Use the new Responses API with web search capability
    const searchResponse = await openai.responses.create({
      model: "gpt-4.1", // Using a model that supports web search
      tools: [
        {
          type: "web_search_preview",
        },
      ],
      tool_choice: { type: "web_search_preview" }, // Force using web search
      input: `Search for detailed information about the game at this URL: ${url}. 
      Extract the following details about this game:
      1. Game title
      2. Genre
      3. Key features
      4. Target audience
      5. Unique selling points
      6. Visual style
      7. Gameplay mechanics
      8. Platform availability
      9. Release date or status
      10. Monetization model
      11. Developer/publisher
      
      Format your response as a structured JSON object with these fields.`,
    });

    // Log the response structure for debugging
    console.log(
      "Search response structure:",
      JSON.stringify(searchResponse, null, 2)
    );

    // Cast the response to our interface type
    const typedResponse = searchResponse as unknown as OpenAIResponsesAPIResult;

    // Extract the text content from the response
    // The OpenAI Responses API returns an object with output_text property
    let textContent = "";

    // Check if we have output_text directly on the response
    if (typedResponse.output_text) {
      textContent = typedResponse.output_text;
    }
    // If not, try to access the message content
    else if (typedResponse.items && Array.isArray(typedResponse.items)) {
      const messageItem = typedResponse.items.find(
        (item) => item.type === "message"
      );

      if (messageItem?.content?.[0]?.text) {
        textContent = messageItem.content[0].text;
      }
    }

    // If we still don't have text content, return an error
    if (!textContent) {
      console.error("Unable to extract text from response:", searchResponse);
      return NextResponse.json(
        { error: "Failed to extract search results from response" },
        { status: 500 }
      );
    }

    // Try to extract JSON from the text response
    try {
      // Look for JSON-like structure in the text
      const jsonMatch = textContent.match(/\{[\s\S]*\}/m);
      let gameContext;

      if (jsonMatch) {
        // Parse the JSON if found
        gameContext = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON structure found, create a simple object with the text
        gameContext = {
          searchResults: textContent,
          note: "Structured data could not be extracted",
        };
      }

      // Log the extracted context for debugging
      console.log("Extracted game context:", gameContext);

      return NextResponse.json({
        gameContext,
        success: true,
      });
    } catch (parseError) {
      console.error("Error parsing game context:", parseError);

      // Return the raw text if JSON parsing fails
      return NextResponse.json({
        gameContext: {
          searchResults: textContent,
          note: "Failed to parse structured data",
        },
        success: true,
      });
    }
  } catch (error) {
    console.error("Error searching game context:", error);
    return NextResponse.json(
      { error: "Failed to search for game context" },
      { status: 500 }
    );
  }
}
