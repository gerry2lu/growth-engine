"use client";

import { useState, useEffect, useRef } from "react";
import ProgressSteps, { Step } from "@/components/ProgressSteps";
import HookSelector from "@/components/HookSelector";

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

interface GameContext {
  gameTitle: string;
  genre: string;
  keyFeatures: string[];
  targetAudience: string;
  uniqueSellingPoints: string[];
  visualStyle: string;
  gameplayMechanics: string[];
  platformAvailability: string[];
  releaseDate: string;
  developer: string;
  [key: string]: any;
}

interface VisualSuggestion {
  part?: string;
  suggestion?: string;
  [key: string]: any;
}

interface AdBody {
  script: string;
  visualSuggestions: (string | VisualSuggestion)[];
  callToAction: string;
  [key: string]: any;
}

const CreatifyDemo = () => {
  // Input state
  const [gameUrl, setGameUrl] = useState("");
  const [instructions, setInstructions] = useState("");

  // Workflow state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for scrolling
  const inputStepRef = useRef<HTMLDivElement>(null);
  const hookStepRef = useRef<HTMLDivElement>(null);
  const adBodyStepRef = useRef<HTMLDivElement>(null);
  const videoStepRef = useRef<HTMLDivElement>(null);
  const progressTrackerRef = useRef<HTMLDivElement>(null);

  // Game context and hooks state
  const [gameContext, setGameContext] = useState<GameContext | null>(null);
  const [hooks, setHooks] = useState<string[]>([]);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);

  // Ad body state
  const [adBody, setAdBody] = useState<AdBody | null>(null);

  // Creatify preview state
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CreatifyLinkResponse | null>(
    null
  );
  const [statusCheckInterval, setStatusCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Progress steps
  const [steps, setSteps] = useState<Step[]>([
    { id: "input", label: "Awaiting Input", status: "active" },
    { id: "context", label: "Searching for Context", status: "waiting" },
    { id: "hooks", label: "Generating Hooks", status: "waiting" },
    { id: "body", label: "Generating Body", status: "waiting" },
    { id: "video", label: "Generating Video Ad", status: "waiting" },
  ]);

  // Effect for cleanup of intervals
  useEffect(() => {
    return () => {
      // Clean up interval on component unmount
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Effect for automatic scrolling when currentStep changes
  useEffect(() => {
    const scrollToCurrentStep = () => {
      let targetRef = null;

      switch (currentStep) {
        case 0:
          targetRef = inputStepRef;
          break;
        case 2:
          targetRef = hookStepRef;
          break;
        case 3:
          targetRef = adBodyStepRef;
          break;
        case 4:
          targetRef = videoStepRef;
          break;
      }

      if (targetRef && targetRef.current) {
        // Scroll the step into view with smooth behavior
        targetRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    };

    // Small delay to ensure DOM is updated
    const scrollTimeout = setTimeout(scrollToCurrentStep, 100);

    return () => clearTimeout(scrollTimeout);
  }, [currentStep]);

  // Additional effect to handle scrolling when adBody or previewData becomes available
  useEffect(() => {
    // When ad body is generated, scroll to it
    if (adBody && adBodyStepRef.current && currentStep === 3) {
      setTimeout(() => {
        adBodyStepRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [adBody, currentStep]);

  // Effect to scroll to video preview when it becomes available
  useEffect(() => {
    // When video preview is ready, scroll to it
    if (previewData?.preview && videoStepRef.current && currentStep === 4) {
      setTimeout(() => {
        videoStepRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [previewData, currentStep]);

  // Step 1: Search for game context and generate hooks
  const handleSearchAndGenerateHooks = async () => {
    try {
      if (!gameUrl) {
        throw new Error("Game URL is required");
      }

      setLoading(true);
      setError(null);

      // Update steps
      const updatedSteps = [...steps];
      updatedSteps[0].status = "completed";
      updatedSteps[1].status = "active";
      setSteps(updatedSteps);
      setCurrentStep(1);

      // Step 1a: Call the API to search for game context
      const contextResponse = await fetch("/api/search-game-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: gameUrl,
        }),
      });

      if (!contextResponse.ok) {
        const errorData = await contextResponse.json();
        throw new Error(errorData.error || "Failed to search for game context");
      }

      const contextData = await contextResponse.json();
      const gameContextData = contextData.gameContext;
      setGameContext(gameContextData);

      // Update steps for hook generation
      const hookSteps = [...updatedSteps];
      hookSteps[1].status = "completed";
      hookSteps[2].status = "active";
      setSteps(hookSteps);

      // Step 1b: Call the API to generate hooks based on the context
      const hooksResponse = await fetch("/api/generate-hooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameContext: gameContextData,
          instructions,
        }),
      });

      if (!hooksResponse.ok) {
        const errorData = await hooksResponse.json();
        throw new Error(errorData.error || "Failed to generate hooks");
      }

      const hooksData = await hooksResponse.json();
      setHooks(hooksData.hooks);

      // Update steps to show hook selection is ready
      const nextSteps = [...hookSteps];
      nextSteps[2].status = "completed"; // Mark hook generation as completed
      setSteps(nextSteps);
      setCurrentStep(2);
    } catch (err) {
      setError((err as Error).message);

      // Update steps to show error
      const errorSteps = [...steps];
      errorSteps[currentStep].status = "error";
      setSteps(errorSteps);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User selects a hook (handled by UI)
  const handleHookSelect = (hook: string) => {
    setSelectedHook(hook);

    // When a hook is selected, we don't change the step yet
    // The actual step transition happens when the user clicks the "Continue" button
    // which calls handleGenerateAdBody
  };

  // Function to regenerate hooks with the existing game context
  const handleRegenerateHooks = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!gameContext) {
        throw new Error("Game context is required to regenerate hooks");
      }

      // Update steps
      const updatedSteps = [...steps];
      updatedSteps[2].status = "active";
      setSteps(updatedSteps);

      // Call the generate-hooks API with the existing game context
      const response = await fetch("/api/generate-hooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameContext,
          instructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate hooks");
      }

      const data = await response.json();

      // Update hooks with the new variants
      setHooks(data.hooks);
      setSelectedHook(null); // Clear the selected hook

      // Update steps
      const hooksSteps = [...updatedSteps];
      hooksSteps[2].status = "completed";
      setSteps(hooksSteps);
    } catch (err) {
      setError((err as Error).message);

      // Update steps to show error
      const errorSteps = [...steps];
      errorSteps[2].status = "error";
      setSteps(errorSteps);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Generate ad body based on selected hook
  const handleGenerateAdBody = async () => {
    try {
      const updatedSteps = [...steps];
      updatedSteps[3].status = "active";
      setSteps(updatedSteps);
      if (!gameContext || !selectedHook) {
        throw new Error("Game context and selected hook are required");
      }

      setLoading(true);
      setError(null);

      // Call the API to generate ad body
      const response = await fetch("/api/generate-body", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameContext,
          selectedHook,
          instructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate ad body");
      }

      const data = await response.json();
      setAdBody(data.adBody);

      // Explicitly scroll to the ad body step after a short delay
      setTimeout(() => {
        if (adBodyStepRef.current) {
          adBodyStepRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 300);

      // Update steps

      updatedSteps[3].status = "completed";
      updatedSteps[4].status = "active";
      setSteps(updatedSteps);
      setCurrentStep(3); // First set to 3 to trigger scroll to ad body

      // Add a slight delay before moving to step 4 and generating preview
      setTimeout(() => {
        setCurrentStep(4);
        // Proceed to generate video preview
        handleGeneratePreview(data.adBody.script);
      }, 500);
    } catch (err) {
      setError((err as Error).message);

      // Update steps to show error
      const errorSteps = [...steps];
      errorSteps[currentStep].status = "error";
      setSteps(errorSteps);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async (adScript: string) => {
    try {
      setLoading(true);
      setError(null);

      // Clear any existing intervals
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }

      if (!gameUrl || !adScript) {
        throw new Error("Both game URL and ad script are required");
      }

      const response = await fetch("/api/generate-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link: gameUrl,
          override_script: adScript,
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

      // Update steps to show error
      const errorSteps = [...steps];
      errorSteps[4].status = "error";
      setSteps(errorSteps);
    } finally {
      setLoading(false);
    }
  };

  const checkPreviewStatus = async () => {
    if (!previewId) return;

    try {
      const response = await fetch(`/api/check-status?id=${previewId}`);

      if (!response.ok) {
        throw new Error("Failed to check preview status");
      }

      const data = await response.json();
      setPreviewData(data);

      // If the preview is ready, update the steps
      if (data.status === "done" || data.preview) {
        // Clear the interval
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }

        // Update steps - Video generation is the final step
        const updatedSteps = [...steps];
        updatedSteps[4].status = "completed"; // Mark the final step as completed
        setSteps(updatedSteps);
        setCurrentStep(4);
      }
    } catch (err) {
      setError((err as Error).message);
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }

      // Update steps to show error
      const errorSteps = [...steps];
      errorSteps[4].status = "error";
      setSteps(errorSteps);
    }
  };

  // Helper function to render loading spinner
  const LoadingSpinner = () => (
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
  );

  // Function to render the input step (Step 1)
  const renderInputStep = () => (
    <div ref={inputStepRef} className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Game Information
      </h2>
      <div className="space-y-8">
        <div>
          <label
            htmlFor="gameUrl"
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Game URL
          </label>
          <input
            type="text"
            id="gameUrl"
            value={gameUrl}
            onChange={(e) => setGameUrl(e.target.value)}
            placeholder="Enter the URL of the game you want to create an ad for"
            className="w-full p-3 bg-white text-black border-b border-gray-400 focus:outline-none text-md"
            required
            disabled={currentStep > 0}
          />
        </div>

        <div className="relative">
          <label
            htmlFor="instructions"
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Additional Instructions (Optional)
          </label>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter any specific instructions for the ad (e.g., tone, style, hook instructions, etc)"
            rows={4}
            className="w-full p-5 pb-16 bg-white text-black rounded-2xl border-2 border-gray-200 shadow-lg focus:outline-none text-md"
            disabled={currentStep > 0}
          ></textarea>

          {currentStep === 0 && (
            <div className="absolute bottom-4 right-4">
              <button
                type="button"
                onClick={handleSearchAndGenerateHooks}
                disabled={loading || !gameUrl}
                className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-3xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-all duration-200 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner />
                    Analyzing Game...
                  </span>
                ) : (
                  "+ Create Ad"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Function to render the ad body step (Step 3)
  const renderAdBodyStep = () => {
    if (currentStep < 3 || !adBody) return null;

    return (
      <div
        ref={adBodyStepRef}
        className="bg-white rounded-lg shadow-md p-6 mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Ad Script</h2>
        <div className="space-y-6">
          <div className="bg-gray-100 p-5 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Ad Script
            </h3>
            <p className="text-gray-800 whitespace-pre-line mb-6 p-4 bg-white rounded border border-gray-300">
              {adBody.script}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[400px] overflow-y-scroll">
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-2">
                  Call to Action
                </h4>
                <p className="text-gray-700 p-3 bg-white rounded border border-gray-300">
                  {adBody.callToAction}
                </p>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-2">
                  Visual Suggestions
                </h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 p-3 bg-white rounded border border-gray-300">
                  {adBody.visualSuggestions.map((suggestion, index) => {
                    // Handle both string and object formats
                    const suggestionText =
                      typeof suggestion === "string"
                        ? suggestion
                        : suggestion.suggestion ||
                          suggestion.part ||
                          JSON.stringify(suggestion);

                    return (
                      <li key={index} className="mb-1">
                        {suggestionText}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {currentStep === 3 && (
            <div className="flex justify-center mt-4">
              <div className="animate-pulse text-gray-600 flex items-center">
                <LoadingSpinner />
                <span className="ml-2">Generating video preview...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Effect to ensure the final step is marked as completed when video preview is available
  useEffect(() => {
    if (currentStep === 4 && previewData && previewData.preview) {
      // Make sure the final step is marked as completed
      const updatedSteps = [...steps];
      if (updatedSteps[4].status !== "completed") {
        updatedSteps[4].status = "completed";
        setSteps(updatedSteps);
      }
    }
  }, [currentStep, previewData, steps]);

  // Function to render the video preview step (Step 4)
  const renderVideoPreviewStep = () => {
    if (currentStep < 4 || !previewData || !previewData.preview) return null;

    return (
      <div
        ref={videoStepRef}
        className="bg-white rounded-lg shadow-md p-6 mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Video Preview
        </h2>
        <div className="space-y-6">
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={previewData.preview}
              className="w-full h-96 border-0"
              allowFullScreen
            ></iframe>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
            <a
              href={`https://app.creatify.ai/editor/${previewData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center transition-colors duration-200"
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

          <p className="text-sm text-gray-600 text-center">
            <span className="font-semibold">Credits Used:</span>{" "}
            {previewData.credits_used}
          </p>
        </div>
      </div>
    );
  };

  // Note: Final video step has been removed as the video preview step is now the final step

  // Function to render loading state
  const renderLoadingState = () => {
    if (!loading) return null;

    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-pulse text-gray-600 flex items-center">
          <LoadingSpinner />
          <span className="ml-2">Processing...</span>
        </div>
      </div>
    );
  };

  // Function to render the hook selection step (Step 2)
  const renderHookSelectionStep = () => {
    if (currentStep < 2 || hooks.length === 0) return null;

    return (
      <div ref={hookStepRef} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Select Ad Hook
            </h2>
            <button
              className="hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200"
              onClick={handleRegenerateHooks}
              disabled={loading}
            >
              {loading && steps[2].status === "active" ? (
                <span className="flex items-center justify-center text-xs">
                  <LoadingSpinner />
                  <span className="ml-2">Regenerating...</span>
                </span>
              ) : (
                <span className="flex items-center text-xs">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Regenerate Hooks
                </span>
              )}
            </button>
          </div>

          <HookSelector
            hooks={hooks}
            selectedHook={selectedHook}
            onSelectHook={handleHookSelect}
          />

          {selectedHook && (
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleGenerateAdBody}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-3xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-all duration-200 shadow-lg"
              >
                {loading && steps[3].status === "active" ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Generating Ad...</span>
                  </span>
                ) : (
                  "Continue with Selected Hook"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-black">
          Creatify Video Ad Generator
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column - Main content */}
          <div className="w-full md:w-7/10 bg-white rounded-lg p-6">
            {/* Render all steps in sequence */}
            {renderInputStep()}
            {renderHookSelectionStep()}
            {renderAdBodyStep()}
            {renderVideoPreviewStep()}
            {renderLoadingState()}
          </div>

          {/* Right column - Progress steps with sticky positioning */}
          <div className="w-full md:w-3/10">
            <div
              ref={progressTrackerRef}
              className="sticky top-24 transition-all duration-700 ease-in-out bg-white rounded-lg p-6 shadow-md"
              style={{ maxHeight: "calc(100vh - 4rem)" }}
            >
              <ProgressSteps steps={steps} />

              {error && (
                <div className="mt-6 bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Error</h3>
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatifyDemo;
