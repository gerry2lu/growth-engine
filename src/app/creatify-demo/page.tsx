"use client";

import { useState, useEffect } from "react";

interface CreatifyLinkResponse {
  id: string;
  link: string;
  status: string;
  video_output: string;
  video_thumbnail: string;
  preview: string;
  credits_used: number;
  progress: string;
  previews?: Array<{
    media_job: string;
    visual_style: string;
    url: string;
  }>;
}

export default function CreatifyDemo() {
  const [link, setLink] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CreatifyLinkResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Clean up interval on component unmount
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear any existing intervals
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }

      if (!link || !script) {
        throw new Error("Both URL link and script are required");
      }

      const response = await fetch("/api/generate-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link,
          override_script: script,
          // Using defaults as specified:
          // - aspect_ratio: 1:1
          // - video_length: 30 seconds
          // - language: English
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(
          errorData.error +
            (errorData.details ? ": " + JSON.stringify(errorData.details) : "")
        );
      }

      const data = await response.json();
      setPreviewId(data.id);
      setPreviewData(data);

      // Set up interval to check status
      const interval = setInterval(checkPreviewStatus, 5000);
      setStatusCheckInterval(interval);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const checkPreviewStatus = async () => {
    if (!previewId) return;

    try {
      const response = await fetch(`/api/check-status?id=${previewId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check status");
      }

      const data = await response.json();
      setPreviewData(data);

      // If preview is ready or failed, clear the interval
      if (["done", "failed", "rejected"].includes(data.status)) {
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }
    }
  };

  const handleRenderVideo = async () => {
    if (!previewId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/render-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: previewId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to render video");
      }

      const data = await response.json();
      setPreviewData(data);

      // Set up interval to check status
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      const interval = setInterval(checkPreviewStatus, 5000);
      setStatusCheckInterval(interval);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 mt-24 max-w-6xl bg-gray-950 flex flex-col items-center min-h-screen">
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 border border-gray-700">
        <h1 className="text-3xl text-white font-bold mb-8 border-b border-slate-500 pb-4">
          Creatify Generation Tool
        </h1>
        <div className="mb-6">
          <label
            className="block text-slate-300 mb-2 text-sm font-medium"
            htmlFor="link"
          >
            URL LINK
          </label>
          <input
            id="link"
            type="text"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-white placeholder-gray-400"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Enter the URL you want to create a video for..."
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label
            className="block text-slate-300 mb-2 text-sm font-medium"
            htmlFor="script"
          >
            SCRIPT OVERRIDE
          </label>
          <textarea
            id="script"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-white placeholder-gray-400"
            rows={4}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Enter your custom script for the video..."
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg border-l-4 border-slate-500">
            <span className="text-slate-300 font-semibold">Note:</span> Videos
            will be created with 1:1 aspect ratio and maximum 30 seconds length
            in English language.
          </p>
        </div>

        <button
          className="w-full bg-gradient-to-r from-slate-600 to-indigo-600 hover:from-slate-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-all duration-200 shadow-lg"
          onClick={handleGeneratePreview}
          disabled={loading || !link || !script}
        >
          {loading && !previewId ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating Preview...
            </span>
          ) : (
            "Generate Preview"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-300 px-6 py-4 rounded-lg mb-8">
          <p>{error}</p>
        </div>
      )}

      {previewData && previewData.preview && (
        <div className="bg-gray-800 shadow-xl rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h2 className="text-xl font-bold text-white">Video Preview</h2>
            <a
              href={`https://app.creatify.ai/editor/${previewData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-300 flex items-center transition-colors duration-200"
            >
              <span>Edit in Creatify</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          <div className="mb-6">
            <iframe
              src={previewData.preview}
              className="w-full h-96 border-0 rounded-lg shadow-lg"
              allowFullScreen
            ></iframe>
          </div>

          {previewData.video_output && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-white">
                Final Video
              </h3>
              <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden shadow-lg">
                <video
                  src={previewData.video_output}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {previewData.status === "done" && !previewData.video_output && (
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4 border-t border-gray-700">
              <button
                className="bg-gradient-to-r from-slate-600 to-teal-600 hover:from-slate-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-all duration-200 shadow-lg"
                onClick={handleRenderVideo}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Rendering Video...
                  </span>
                ) : (
                  "Render Final Video"
                )}
              </button>

              <p className="text-sm text-gray-400 bg-gray-700 px-4 py-2 rounded-lg">
                <span className="font-semibold text-slate-300">
                  Credits Used:
                </span>{" "}
                {previewData.credits_used}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
