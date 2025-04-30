# Creatify AI API Integration

This directory contains API routes for integrating with the Creatify.ai API to generate AI shorts videos.

## API Routes

### 1. Generate Preview (`/api/generate-preview`)

Creates a preview of an AI Shorts video using the Creatify API.

**Method:** POST

**Request Body:**
```json
{
  "script": "Your video script text",
  "aspect_ratio": "9x16", // Options: "9x16", "16x9", "1x1"
  "style": "4K realistic", // See available styles below
  "accent": "optional-accent-id",
  "caption_setting": {
    // Optional caption settings
  },
  "background_music_url": "optional-music-url",
  "background_music_volume": 0.5, // 0.0 to 1.0
  "voiceover_volume": 0.5, // 0.0 to 1.0
  "webhook_url": "optional-webhook-url"
}
```

**Available Styles:**
- 4K realistic
- 3D
- Cinematic
- Cartoonish
- Line art
- Pixel art
- Mysterious
- Steam punk
- Collage
- Kawaii

### 2. Check Status (`/api/check-status`)

Checks the status of a previously created AI Shorts preview or video.

**Method:** GET

**Query Parameters:**
- `id`: The ID of the AI Shorts task to check

### 3. Render Video (`/api/render-video`)

Renders the final AI Shorts video after a preview has been generated.

**Method:** POST

**Request Body:**
```json
{
  "id": "preview-id-to-render"
}
```

## Environment Variables

The following environment variables need to be set in your `.env.local` file:

```
CREATIFY_API_ID=your_api_id
CREATIFY_API_KEY=your_api_key
```

## Usage Example

A demo page is available at `/creatify-demo` that demonstrates how to use these API routes to:
1. Generate an AI Shorts preview
2. Check the status of the preview generation
3. Render the final video once the preview is ready

## API Flow

1. Generate a preview using the `/api/generate-preview` endpoint
2. Poll the `/api/check-status` endpoint to check when the preview is ready
3. Once the preview is ready (status is "done"), render the final video using the `/api/render-video` endpoint
4. Poll the `/api/check-status` endpoint again to check when the final video is ready

## Credits

Each preview generation costs 1 credit for every 30 seconds of video. The final rendering will cost additional credits.
