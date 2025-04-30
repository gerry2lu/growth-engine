import { NextRequest, NextResponse } from 'next/server';

interface LinkRenderResponse {
  id: string;
  link: string;
  media_job: string | null;
  status: string;
  failed_reason: string | null;
  is_hidden: boolean;
  video_output: string;
  video_thumbnail: string;
  credits_used: number;
  progress: string;
  preview: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get API credentials from environment variables
    const apiId = process.env.CREATIFY_API_ID;
    const apiKey = process.env.CREATIFY_API_KEY;

    if (!apiId || !apiKey) {
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Parse request body to get the ID
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Make request to Creatify API to render the video
    const response = await fetch(`https://api.creatify.ai/api/link_to_videos/${id}/render/`, {
      method: 'POST',
      headers: {
        'X-API-ID': apiId,
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to render link to video', details: errorData },
        { status: response.status }
      );
    }

    const data: LinkRenderResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error rendering link to video:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
