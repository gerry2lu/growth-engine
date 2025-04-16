// app/components/TweetGenerator.tsx
"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import LoadingSpinner from "./LoadingSpinner";
import { RiAiGenerate } from "react-icons/ri";
import { PiTrendUpLight } from "react-icons/pi";
import { FaArrowRight } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoCloudUploadOutline } from "react-icons/io5";
import { BsGlobe } from "react-icons/bs";
import { HiOutlineDatabase } from "react-icons/hi";
// import PromptEditorDialog from "./PromptEditorDialog";
import { Trend } from "@/app/api/get-trends/route";
import { GenerateTweetsRequest } from "@/utils/generateFromOpenAI";

type TweetGeneratorProps = {
  tweets: string[];
  setTweets: (tweets: string[]) => void;
  isImmutable?: boolean;
};

// Define the flow steps
type FlowStep =
  | "dataSourceSelection" // New initial step for selecting data source
  | "initial"
  | "trendSelection"
  | "customTopic"
  | "userInput" // New step for user input with context and file upload
  | "metricsSelection"
  | "tweetStyleSelection"
  | "results";

// Define the metrics type
export type Metric = {
  id: string;
  name: string;
  selected: boolean;
};

const TweetGenerator = (props: TweetGeneratorProps) => {
  const { tweets, setTweets, isImmutable } = props;
  const [topics, setTopics] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [trends, setTrends] = useState<Trend[]>([]);

  // New state variables for the flow
  const [currentStep, setCurrentStep] = useState<FlowStep>(
    "dataSourceSelection"
  );
  const [userInputText, setUserInputText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    undefined
  );

  // Define tweet style types
  type TweetStyle = {
    id: string;
    name: string;
    example: string;
    description: string;
    selected: boolean;
  };

  // Tweet style options
  const [tweetStyles, setTweetStyles] = useState<TweetStyle[]>([
    {
      id: "catchphrase",
      name: "Catch Phrase Tweet",
      example: "2025 is for immutable",
      description: "Short, memorable phrase that captures attention",
      selected: true,
    },
    {
      id: "oneliner",
      name: "One Liner Statement Tweet",
      example:
        "incredible how many of these predictions cobie absolutely nailed",
      description: "Single impactful statement that stands alone",
      selected: false,
    },
    {
      id: "causeeffect",
      name: "Cause and Effect 2 Liner Tweet",
      example:
        "The next 100 million users will come from gaming. One breakout web3 game will triple the global crypto DAU overnight.",
      description: "Shows relationship between two connected ideas",
      selected: false,
    },
    {
      id: "comparison",
      name: "Comparison Tweet",
      example:
        "the chatgpt launch 26 months ago was one of the craziest viral moments i'd ever seen, and we added one million users in five days.",
      description: "Contrasts two different ideas or timeframes",
      selected: false,
    },
    {
      id: "parallelism",
      name: "Parallelism Tweet",
      example:
        "It took us 6 years to partner with our first multi-billion dollar company. Another year to land our second. 8 months to get our third.",
      description: "Uses similar structure to emphasize a pattern",
      selected: false,
    },
    {
      id: "hookbullets",
      name: "Hook and Bullet Points Tweet",
      example: `2021 was the craziest year of our lives.\n\n- Axie holders grew by %10,363\n- AXS staking launch\n- Ronin mainnet launch\n- Katana launch (1.2 B liquidity & 20,000+ Daily traders)\n- Axie community treasury: 2 B + in value (52,000 ETH + 21 M AXS)\n\n2022 we'll shock the world (again).`,
      description: "Opening hook followed by concise bullet points",
      selected: false,
    },
    {
      id: "multiparagraph",
      name: "Multiparagraph Tweet",
      example:
        'Gaming is bigger than music, movies, and TV combined.\n\nIt\'s compounding 10% year on year.\n\nThe $100bn a year spent "renting" items is going to turn into a trillion dollar ownable economy.\n\nAll of it will be built on web3.',
      description: "Multiple short paragraphs building a narrative",
      selected: false,
    },
  ]);

  const resetStates = () => {
    setTweetStyles((prevStyles) =>
      prevStyles.map((style) => ({
        ...style,
        selected: false,
      }))
    );
    setTopics("");
    setOverarchingNarrative("");
    setMetrics([]);
    setTweets([]);
    setSelectedTrend("");
    setSelectedModel(undefined);
    setUserInputText("");
    setSelectedFile(null);
    setCustomMetric("");
  };

  // Toggle tweet style selection
  const toggleTweetStyleSelection = (id: string) => {
    setTweetStyles((prevStyles) =>
      prevStyles.map((style) => ({
        ...style,
        selected: style.id === id,
      }))
    );
  };

  // Add a custom metric
  const addCustomMetric = () => {
    if (customMetric.trim() === "") return;

    // Create a unique ID for the custom metric
    const newId = `custom-${Date.now()}`;

    // Add the new metric to the list
    setMetrics([
      ...metrics,
      {
        id: newId,
        name: customMetric.trim(),
        selected: true,
      },
    ]);

    // Clear the input field
    setCustomMetric("");
  };

  // Proceed from metrics selection to tweet style selection
  const handleProceedToStyleSelection = () => {
    setCurrentStep("tweetStyleSelection");
  };
  const [selectedTrend, setSelectedTrend] = useState<string>("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [overarchingNarrative, setOverarchingNarrative] = useState<string>("");
  const [customMetric, setCustomMetric] = useState<string>("");

  // Function to generate tweets with support for different models
  const generateTweets = async (params: GenerateTweetsRequest) => {
    try {
      const response = await fetch("/api/generate-tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      // Remove the first line from the first tweet
      if (data.tweets && data.tweets.length > 0) {
        data.tweets[0] = removeTweetHeader(data.tweets[0]);
      }

      // Set the tweets
      setTweets(data.tweets);

      setCurrentStep("results");
      setLoading(false);
    } catch (error) {
      console.error("Error generating tweets:", error);
      setLoading(false);
      return [];
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const selectedStyle = tweetStyles.find((style) => style.selected);

      // Use the generateTweets function instead of making a direct API call
      await generateTweets({
        topic: topics || "Web3 gaming",
        overarchingNarrative: overarchingNarrative || "",
        selectedMetrics: metrics.filter((m) => m.selected).map((m) => m.id),
        tweetStyle: selectedStyle?.id || "catchphrase",
        model: selectedModel, // Pass the selected model if available
      });

      // Note: We don't need to set currentStep or loading state here
      // as the generateTweets function already handles that
    } catch (error) {
      console.error("Error generating tweets:", error);
      setLoading(false);
    }
  };

  const removeTweetHeader = (tweet: string) => {
    if (!tweet.startsWith("Here are")) {
      return tweet;
    }

    const lines = tweet.split("\n");
    return lines.slice(1).join("\n");
  };

  const getTrends = async () => {
    try {
      setLoading(true);
      setCurrentStep("trendSelection");

      const response = await fetch("/api/get-trends", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTrends(data);
      console.log(data);
    } catch (error) {
      console.error("Error getting trends:", error);
      // If error, go back to initial step
      setCurrentStep("initial");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isImmutable) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      fetchMetrics(topics);
    }
  };

  const handleAddAsTopic = (trend_name: string) => {
    // Take either the first four words unless there is a ":" character, then take all the words before it
    const words = trend_name.split(" ");
    // Check if there is a ":" character at the end of each word
    let topic;

    for (let i = 0; i < words.length; i++) {
      if (words[i].endsWith(":")) {
        // Remove the colon from the last word
        words[i] = words[i].slice(0, -1);
        topic = words.slice(0, i + 1).join(" ");
        break;
      } else if (i === 3) {
        topic = words.slice(0, 4).join(" ");
      }
    }

    if (topic === undefined) {
      topic = words[0];
    }

    // Update state
    setTopics(topic);
    setSelectedTrend(trend_name);

    // Pass the topic directly to fetchMetrics instead of relying on state update
    fetchMetrics(topic);
  };

  const handleCopyTweet = (tweet: string) => {
    navigator.clipboard.writeText(tweet);
    alert("Tweet copied to clipboard!");
  };

  const handleCustomTopic = () => {
    setCurrentStep("customTopic");
  };

  const fetchMetrics = async (directTopic?: string) => {
    try {
      setLoading(true);

      // Use the direct topic if provided, otherwise use the topics state (with fallback)
      const topicToUse = directTopic || topics || "Web3 gaming";
      console.log("Fetching metrics for topic:", topicToUse);

      const response = await fetch("/api/fetchMetrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicToUse }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Store the overarching narrative if it exists
      if (data.overarchingNarrative) {
        setOverarchingNarrative(data.overarchingNarrative);
      } else {
        setOverarchingNarrative(""); // Clear any previous narrative
      }

      // Convert metrics to our format with selected state - all pre-selected by default
      const formattedMetrics = data.metrics.map((metric: Metric) => ({
        id: metric.id,
        name: metric.name,
        selected: true, // Pre-select all metrics by default
      }));

      // Preserve custom metrics when setting new metrics
      setMetrics((currentMetrics) => {
        // Filter out custom metrics from the current metrics
        const customMetrics = currentMetrics.filter((metric) =>
          metric.id.startsWith("custom-")
        );

        // Combine the API metrics with the preserved custom metrics
        return [...formattedMetrics, ...customMetrics];
      });

      setCurrentStep("metricsSelection");
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMetricSelection = (id: string) => {
    setMetrics(
      metrics.map((metric) =>
        metric.id === id ? { ...metric, selected: !metric.selected } : metric
      )
    );
  };

  const submitCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMetrics(topics);
  };

  const renderInitialButtons = () => (
    <div className="flex flex-col space-y-4 items-center w-full">
      <h2 className="text-xl text-white mb-4">
        Choose a tweet generation method
      </h2>
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl">
        <button
          onClick={getTrends}
          disabled={loading}
          className="bg-gray-100 text-black px-5 py-8 rounded-xl disabled:opacity-50 flex flex-col items-center justify-center space-y-3 border-2 border-gray-100 hover:border-purple-600 hover:bg-gray-200 flex-1 min-h-[150px]"
        >
          <PiTrendUpLight className="h-10 w-10" />
          <span className="text-lg font-medium">
            Generate from Recent Trends
          </span>
        </button>
        <button
          onClick={handleCustomTopic}
          disabled={loading}
          className="bg-black text-white px-5 py-8 rounded-xl disabled:opacity-50 flex flex-col items-center justify-center space-y-3 hover:bg-gray-900 flex-1 min-h-[150px]"
        >
          <RiAiGenerate className="h-10 w-10" />
          <span className="text-lg font-medium">
            Generate from Custom Topic
          </span>
        </button>
      </div>
    </div>
  );

  const renderTrendSelection = () => (
    <div className="w-full">
      <h2 className="text-md text-gray-100 mb-4">
        We&apos;ve found some trending topics on Twitter, select one to search
        for key metrics.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trends.map((trend, index) => (
          <div
            key={index}
            className="px-4 py-3 border-[1px] rounded-xl text-white bg-black bg-opacity-50 backdrop-blue-sm cursor-pointer hover:bg-opacity-70"
            onClick={() => handleAddAsTopic(trend.trend_name)}
          >
            <div className="flex justify-between flex-col h-full">
              <div>
                <p className="my-1">{trend.trend_name}</p>
                <p className="text-xs text-fuchsia-300">{trend.post_count}</p>
                <p className="text-xs">{trend.trending_since}</p>
              </div>
              <div>
                <div className="flex mt-3 items-center">
                  <p className="py-1 px-2 bg-teal-300 text-black rounded-full text-xs w-fit">
                    {trend.category}
                  </p>
                </div>
                <button className="w-full mt-3 py-1 bg-white text-center px-2 rounded-xl text-black text-xs font-bold hover:bg-slate-200 text-nowrap">
                  Select
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex mt-8">
        <button
          onClick={() => setCurrentStep("initial")}
          className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20 "
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderCustomTopic = () => (
    <div className="w-full">
      <h2 className="text-xl text-white mb-4">Enter your custom topic</h2>
      <form onSubmit={submitCustomTopic} className="space-y-4">
        <textarea
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter topic (e.g., AI, Memecoins, Web3)... Default is Web3 Gaming"
          className="w-full p-4 border rounded-lg outline-none text-black min-h-[120px]"
          autoFocus
        />
        <div className="flex justify-between items-center">
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-5 py-3 rounded-3xl disabled:opacity-50 flex items-center space-x-2 hover:bg-gray-900"
          >
            <RiAiGenerate className="mr-2 h-5 w-5" /> Continue
          </button>
          <button
            onClick={() => setCurrentStep("initial")}
            className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20 "
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );

  const renderMetricsSelection = () => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl text-white mb-2">Unselect irrelevant metrics</h2>
        {/* <PromptEditorDialog
          promptName="metrics"
          buttonLabel="Edit Metrics Prompt"
          buttonClassName="text-xs"
          onPromptUpdated={() => fetchMetrics(topics)}
        /> */}
      </div>
      <p className="text-gray-300 mb-2">Topic: {topics || "Web3 gaming"}</p>

      {overarchingNarrative && (
        <div className="bg-gray-800 p-3 rounded-lg mb-4 border border-gray-700">
          <p className="text-gray-200 text-sm font-medium mb-1">
            Overarching Narrative:
          </p>
          <p className="text-white">{overarchingNarrative}</p>
        </div>
      )}

      {/* Add custom metric input */}
      <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
        <h3 className="text-white mb-3">Add your own metrics</h3>
        <div className="flex mb-4">
          <input
            type="text"
            value={customMetric}
            onChange={(e) => setCustomMetric(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomMetric()}
            placeholder="Enter a custom metric..."
            className="flex-grow p-3 border rounded-l-lg outline-none text-black"
          />
          <button
            onClick={addCustomMetric}
            className="bg-purple-600 text-white px-4 rounded-r-lg hover:bg-purple-700"
            disabled={customMetric.trim() === ""}
          >
            Add
          </button>
        </div>

        {/* Existing metrics list */}
        <h3 className="text-white mb-3">Available metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              onClick={() => toggleMetricSelection(metric.id)}
              className={`p-3 rounded-lg cursor-pointer flex items-center ${
                metric.selected
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={metric.selected}
                onChange={() => toggleMetricSelection(metric.id)}
                className="mr-3 h-5 w-5"
              />
              <span>{metric.name}</span>
              {metric.id.startsWith("custom-") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMetrics(metrics.filter((m) => m.id !== metric.id));
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                  title="Remove custom metric"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() =>
            setCurrentStep(selectedTrend ? "trendSelection" : "customTopic")
          }
          className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20 "
        >
          Back
        </button>
        <button
          onClick={() => handleProceedToStyleSelection()}
          disabled={loading || metrics.filter((m) => m.selected).length === 0}
          className="bg-black text-white px-5 py-3 rounded-3xl disabled:opacity-50 flex items-center space-x-2 hover:bg-gray-900"
        >
          <FaArrowRight className="mr-2 h-5 w-5" /> Continue
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    // Function to format tweet text with line breaks
    const formatTweetText = (text: string) => {
      return text.split("\n").map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < text.split("\n").length - 1 && <br />}
        </React.Fragment>
      ));
    };

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl text-white pt-3 font-bold mt-2">
            Tweet Recommendations
          </h1>
          {/* <PromptEditorDialog
            promptName="tweet"
            buttonLabel="Edit Tweet Prompt"
            buttonClassName="text-xs"
            onPromptUpdated={() => handleSubmit()}
          /> */}
        </div>
        <p className="inline-block text-gray-300 text-sm pb-3 italic">
          Based on {metrics.length} metrics selected
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tweets.map((tweet, index) => (
            <div
              key={index}
              className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200"
            >
              {/* Tweet header with profile info */}
              <div className="p-4 flex items-start">
                {/* Profile avatar */}
                <div className="h-12 w-12 rounded-full bg-gray-300 overflow-hidden mr-3 flex-shrink-0">
                  <Image
                    src="/avatar.jpg"
                    alt="Profile"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* User info and tweet content */}
                <div className="flex-1">
                  {/* Username and verification */}
                  <div className="flex items-center">
                    <span className="font-bold text-gray-900">
                      Robbie Ferguson
                    </span>
                    <svg
                      className="h-5 w-5 ml-1 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path>
                    </svg>
                    <span className="text-gray-500 ml-1">@0xFerg</span>
                  </div>

                  {/* Tweet text */}
                  <div className="mt-1 text-gray-800 whitespace-pre-line">
                    {formatTweetText(tweet)}
                  </div>

                  {/* Tweet date */}
                  <div className="mt-2 text-gray-500 text-sm">
                    {new Date().toLocaleTimeString()} ·{" "}
                    {new Date().toLocaleDateString()}
                  </div>

                  {/* Tweet actions */}
                  <div className="mt-3 flex justify-between max-w-md">
                    {/* Comment */}
                    <button className="flex items-center text-gray-500 hover:text-blue-500">
                      <svg
                        className="h-5 w-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        ></path>
                      </svg>
                      <span>24</span>
                    </button>

                    {/* Retweet */}
                    <button className="flex items-center text-gray-500 hover:text-green-500">
                      <svg
                        className="h-5 w-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        ></path>
                      </svg>
                      <span>78</span>
                    </button>

                    {/* Like */}
                    <button className="flex items-center text-gray-500 hover:text-red-500">
                      <svg
                        className="h-5 w-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        ></path>
                      </svg>
                      <span>412</span>
                    </button>

                    {/* Share */}
                    <button className="flex items-center text-gray-500 hover:text-blue-500">
                      <svg
                        className="h-5 w-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Copy button */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <button
                  onClick={() => handleCopyTweet(tweet)}
                  className="w-full text-sm bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    ></path>
                  </svg>
                  Copy Tweet
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 pt-6 mt-4">
          <button
            onClick={() => {
              setCurrentStep("dataSourceSelection");
              resetStates();
            }}
            className="text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Start Over
          </button>
          <button
            onClick={() => setCurrentStep("tweetStyleSelection")}
            className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  };

  // Render tweet style selection step
  const renderTweetStyleSelection = () => {
    // Determine the back button destination based on the previous step
    const handleBackClick = () => {
      if (userInputText) {
        // If coming from user input, go back to user input
        setCurrentStep("userInput");
      } else {
        // Otherwise go back to metrics selection
        setCurrentStep("metricsSelection");
      }
    };

    // Handle the generate tweets button click
    const handleGenerateClick = () => {
      setLoading(true);

      // If we have user input text, use OpenAI model
      if (userInputText) {
        const selectedStyle = tweetStyles.find((style) => style.selected);
        generateTweets({
          topic: userInputText,
          overarchingNarrative: "Generated from user input",
          selectedMetrics: ["Refer to user metrics"],
          tweetStyle: selectedStyle?.id || "multiparagraph",
          model: "OpenAI",
          customPrompt: `Generate 6 distinct tweets about the following topic: ${userInputText}\n\nUse the "${selectedStyle?.name}" style: ${selectedStyle?.description}\n\nFormat with each tweet separated by '||'`,
        });
      } else {
        // Otherwise use the standard flow
        handleSubmit();
      }
    };

    return (
      <div className="w-full">
        <h2 className="text-xl text-white mb-4">Select a Tweet Style</h2>
        <p className="text-gray-300 mb-6">
          Choose the style that best fits your message for{" "}
          {userInputText ? "your input" : topics || "Web3 gaming"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {tweetStyles.map((style) => (
            <div
              key={style.id}
              onClick={() => toggleTweetStyleSelection(style.id)}
              className={`p-4 rounded-lg cursor-pointer border transition-all duration-200 ${
                style.selected
                  ? "border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-500/20"
                  : "border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={style.selected}
                  onChange={() => toggleTweetStyleSelection(style.id)}
                  className="mr-3 h-4 w-4 accent-purple-500"
                />
                <h3 className="text-white font-medium">{style.name}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-3">{style.description}</p>
              <div className="bg-black/30 p-3 rounded border border-gray-700 text-gray-300 text-sm font-mono">
                {style.example}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleBackClick}
            className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20"
          >
            Back
          </button>
          <button
            onClick={handleGenerateClick}
            disabled={loading}
            className="bg-black text-white px-5 py-3 rounded-3xl disabled:opacity-50 flex items-center space-x-2 hover:bg-gray-900"
          >
            <RiAiGenerate className="mr-2 h-5 w-5" /> Generate Tweets
          </button>
        </div>
      </div>
    );
  };

  // Render the data source selection step
  const renderDataSourceSelection = () => (
    <div className="flex flex-col space-y-4 items-center w-full">
      <h2 className="text-xl text-white mb-4">
        Select a data source for tweet generation
      </h2>
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl">
        <button
          onClick={() => {
            setSelectedModel(undefined);
            setCurrentStep("initial");
          }}
          disabled={loading}
          className="bg-gray-100 text-black px-5 py-8 rounded-xl disabled:opacity-50 flex flex-col items-center justify-center space-y-3 border-2 border-gray-100 hover:border-purple-600 hover:bg-gray-200 flex-1 min-h-[150px]"
        >
          <FaXTwitter className="h-10 w-10" />
          <span className="text-lg font-medium">Generate from X Data</span>
        </button>
        <button
          onClick={() => {
            setSelectedModel("OpenAI");
            setCurrentStep("userInput");
          }}
          disabled={loading}
          className="bg-gray-100 text-black px-5 py-8 rounded-xl disabled:opacity-50 flex flex-col items-center justify-center space-y-3 border-2 border-gray-100 hover:border-purple-600 hover:bg-gray-200 flex-1 min-h-[150px]"
        >
          <BsGlobe className="h-10 w-10" />
          <span className="text-lg font-medium">
            Generate from Internet Data
          </span>
        </button>
        <button
          onClick={() => {
            setSelectedModel("OpenAI");
            setCurrentStep("userInput");
          }}
          disabled={loading}
          className="bg-gray-100 text-black px-5 py-8 rounded-xl disabled:opacity-50 flex flex-col items-center justify-center space-y-3 border-2 border-gray-100 hover:border-purple-600 hover:bg-gray-200 flex-1 min-h-[150px]"
        >
          <HiOutlineDatabase className="h-10 w-10" />
          <span className="text-lg font-medium">
            Generate from Internal Data
          </span>
        </button>
      </div>
    </div>
  );

  // Render the user input step with file upload
  const renderUserInput = () => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
      }
    };

    // The generateTweets function is now defined at the component level

    const handleInternalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Process the user input and file upload
      setLoading(true);

      // Instead of generating tweets directly, go to tweet style selection
      setTimeout(() => {
        setLoading(false);
        setCurrentStep("tweetStyleSelection");
      }, 500); // Small delay for better UX
    };

    const triggerFileInput = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    return (
      <div className="w-full">
        <h2 className="text-xl text-white mb-4">
          Enter your context and upload relevant files
        </h2>
        <form onSubmit={handleInternalSubmit} className="space-y-4">
          <textarea
            value={userInputText}
            onChange={(e) => setUserInputText(e.target.value)}
            placeholder="Describe what you want to generate tweets about..."
            className="w-full p-4 border rounded-lg outline-none text-black min-h-[120px]"
            autoFocus
          />

          <div className="flex flex-col space-y-2">
            <div
              onClick={triggerFileInput}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
            >
              <IoCloudUploadOutline className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-300 text-center">
                {selectedFile
                  ? selectedFile.name
                  : "Click to upload a PDF or document"}
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-gray-300">
                File selected: {selectedFile.name} (
                {Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              type="submit"
              disabled={loading || (!userInputText && !selectedFile)}
              className="bg-black text-white px-5 py-3 rounded-3xl disabled:opacity-50 flex items-center space-x-2 hover:bg-gray-900"
            >
              <RiAiGenerate className="mr-2 h-5 w-5" /> Continue
            </button>
            <button
              onClick={() => setCurrentStep("dataSourceSelection")}
              className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (loading) return <LoadingSpinner />;

    switch (currentStep) {
      case "dataSourceSelection":
        return renderDataSourceSelection();
      case "initial":
        return renderInitialButtons();
      case "trendSelection":
        return renderTrendSelection();
      case "customTopic":
        return renderCustomTopic();
      case "userInput":
        return renderUserInput();
      case "metricsSelection":
        return renderMetricsSelection();
      case "tweetStyleSelection":
        return renderTweetStyleSelection();
      case "results":
        return tweets.length > 0 ? renderResults() : renderInitialButtons();
      default:
        return renderDataSourceSelection();
    }
  };

  return (
    <div className="mx-auto p-4 w-full" suppressHydrationWarning>
      {renderCurrentStep()}
    </div>
  );
};

export default TweetGenerator;
