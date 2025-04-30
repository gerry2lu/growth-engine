import { NextRequest, NextResponse } from 'next/server';

interface CreatifyLinkPreviewResponse {
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

interface CaptionSetting {
  style?: string;
  offset?: {
    x: number;
    y: number;
  };
  font_family?: string;
  font_size?: number;
  font_style?: string;
  background_color?: string;
  text_color?: string;
  highlight_text_color?: string;
  max_width?: number;
  line_height?: number;
  text_shadow?: string;
  hidden?: boolean;
}

interface LinkPreviewRequestBody {
  link: string;
  override_script: string;
  aspect_ratio?: '9x16' | '16x9' | '1x1';
  video_length?: number;
  language?: string;
  caption_setting?: CaptionSetting;
  background_music_url?: string;
  background_music_volume?: number;
  voiceover_volume?: number;
  webhook_url?: string;
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

    // Parse request body
    const body: LinkPreviewRequestBody = await request.json();

    // Validate required fields
    if (!body.link || !body.override_script) {
      return NextResponse.json(
        { error: 'Missing required fields: link and override_script are required' },
        { status: 400 }
      );
    }

    // Create request payload with defaults as specified
    // The API requires a valid URL with http/https protocol
    let formattedLink = body.link;
    if (formattedLink && !formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
      formattedLink = 'https://' + formattedLink;
    }
    
    // Step 1: First create a link in the Creatify system
    console.log('Step 1: Creating link in Creatify system');
    const createLinkPayload = {
      url: formattedLink,
      name: 'Generated from tweet-recommendation-engine'
    };
    
    const createLinkResponse = await fetch('https://api.creatify.ai/api/links/', {
      method: 'POST',
      headers: {
        'X-API-ID': apiId,
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createLinkPayload),
    });

    if (!createLinkResponse.ok) {
      const errorData = await createLinkResponse.json().catch(() => ({}));
      console.error('Creatify API error (create link):', {
        status: createLinkResponse.status,
        statusText: createLinkResponse.statusText,
        errorData,
        requestPayload: createLinkPayload
      });
      return NextResponse.json(
        { error: 'Failed to create link in Creatify system', details: errorData },
        { status: createLinkResponse.status }
      );
    }

    const linkData = await createLinkResponse.json();
    console.log('Link created successfully:', linkData);
    
    // Step 2: Now generate a preview using the created link's ID
    console.log('Step 2: Generating preview with link ID:', linkData.id);
    const previewPayload = {
      link: linkData.id, // Use the UUID of the created link
      override_script: body.override_script,
      aspect_ratio: body.aspect_ratio || '1x1', // Default to 1:1 as specified
      video_length: body.video_length || 30, // Default to 30 seconds max
      language: body.language || 'en', // Default to English
      target_platform: 'tiktok', // Default platform
      visual_style: 'AvatarBubbleTemplate', // Default visual style
      script_style: 'DiscoveryWriter', // Default script style
      caption_setting: body.caption_setting,
      background_music_url: body.background_music_url,
      background_music_volume: body.background_music_volume,
      voiceover_volume: body.voiceover_volume,
      webhook_url: body.webhook_url
    };
    
    const previewResponse = await fetch('https://api.creatify.ai/api/link_to_videos/preview/', {
      method: 'POST',
      headers: {
        'X-API-ID': apiId,
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(previewPayload),
    });

    if (!previewResponse.ok) {
      const errorData = await previewResponse.json().catch(() => ({}));
      console.error('Creatify API error (generate preview):', {
        status: previewResponse.status,
        statusText: previewResponse.statusText,
        errorData,
        requestPayload: previewPayload
      });
      return NextResponse.json(
        { error: 'Failed to generate link to video preview', details: errorData },
        { status: previewResponse.status }
      );
    }

    const previewData: CreatifyLinkPreviewResponse = await previewResponse.json();
    return NextResponse.json(previewData);
  } catch (error) {
    console.error('Error generating link to video preview:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
