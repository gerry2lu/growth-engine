import { NextRequest, NextResponse } from 'next/server';

interface CreatifyLinkResponse {
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
  previews: Array<{
    media_job: string;
    visual_style: string;
    url: string;
  }>;
  name: string | null;
  target_platform: string;
  target_audience: string | null;
  language: string;
  video_length: number;
  aspect_ratio: '16x9' | '1x1' | '9x16';
  script_style: string;
  visual_style: string;
  override_avatar: string | null;
  override_voice: string | null;
  override_script: string | null;
  background_music_url: string | null;
  background_music_volume: number | null;
  voiceover_volume: number | null;
  webhook_url: string | null;
  no_background_music: boolean;
  no_caption: boolean;
  no_emotion: boolean;
  no_cta: boolean;
  no_stock_broll: boolean;
  caption_style: string | null;
  caption_offset_x: string | null;
  caption_offset_y: string | null;
  caption_setting: any | null;
}

export async function GET(request: NextRequest) {
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

    // Get the ID from the URL or query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Make request to Creatify API to check status
    const response = await fetch(`https://api.creatify.ai/api/link_to_videos/${id}/`, {
      method: 'GET',
      headers: {
        'X-API-ID': apiId,
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to get link to video status', details: errorData },
        { status: response.status }
      );
    }

    const data: CreatifyLinkResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking link to video status:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
