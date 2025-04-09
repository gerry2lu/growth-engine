// app/components/TweetGenerator.tsx
"use client";

import { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { RiAiGenerate } from "react-icons/ri";
import { PiTrendUpLight } from "react-icons/pi";
import { FaArrowRight } from "react-icons/fa";
import PromptEditorDialog from "./PromptEditorDialog";
import { Trend } from "@/app/api/get-trends/route";

type TweetGeneratorProps = {
  tweets: string[];
  setTweets: (tweets: string[]) => void;
  isImmutable?: boolean;
};

// Define the flow steps
type FlowStep =
  | "initial"
  | "trendSelection"
  | "customTopic"
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
  const [currentStep, setCurrentStep] = useState<FlowStep>("initial");

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
      example:
        "2021 was the craziest year of our lives.\n\n- Axie holders grew by %10,363\n- AXS staking launch\n- Ronin mainnet launch\n- Katana launch (1.2 B liquidity & 20,000+ Daily traders)\n- Axie community treasury: 2 B + in value (52,000 ETH + 21 M AXS)\n\n2022 we'll shock the world (again).",
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

  // Toggle tweet style selection
  const toggleTweetStyleSelection = (id: string) => {
    setTweetStyles((prevStyles) =>
      prevStyles.map((style) => ({
        ...style,
        selected: style.id === id,
      }))
    );
  };

  // Proceed from metrics selection to tweet style selection
  const handleProceedToStyleSelection = () => {
    setCurrentStep("tweetStyleSelection");
  };
  const [selectedTrend, setSelectedTrend] = useState<string>("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [overarchingNarrative, setOverarchingNarrative] = useState<string>("");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const selectedStyle = tweetStyles.find((style) => style.selected);

      const response = await fetch("/api/generate-tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topics || "Web3 gaming",
          overarchingNarrative: overarchingNarrative || "",
          selectedMetrics: metrics.filter((m) => m.selected).map((m) => m.id),
          tweetStyle: selectedStyle?.id || "catchphrase",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Remove the first line from the first tweet
      data.tweets[0] = removeTweetHeader(data.tweets[0]);

      setTweets(data.tweets);
      setCurrentStep("results");
    } catch (error) {
      console.error("Error generating tweets:", error);
    } finally {
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

      setMetrics(formattedMetrics);
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
        <PromptEditorDialog
          promptName="metrics"
          buttonLabel="Edit Metrics Prompt"
          buttonClassName="text-xs"
          onPromptUpdated={() => fetchMetrics(topics)}
        />
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

      <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
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

  const renderResults = () => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl text-white pt-3 font-bold mt-2">
          Tweet Recommendations
        </h1>
        <PromptEditorDialog
          promptName="tweet"
          buttonLabel="Edit Tweet Prompt"
          buttonClassName="text-xs"
          onPromptUpdated={() => handleSubmit()}
        />
      </div>
      <p className="inline-block text-gray-300 text-sm pb-3 italic">
        Based on {metrics.length} metrics selected
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tweets.map((tweet, index) => (
          <div
            key={index}
            className="p-4 border rounded-xl bg-gray-50 flex flex-col justify-between"
          >
            <p className="whitespace-pre-wrap">{tweet}</p>
            <button
              onClick={() => handleCopyTweet(tweet)}
              className="mt-4 text-sm bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-700 self-end"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6">
        <button
          onClick={() => setCurrentStep("initial")}
          className="text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Start Over
        </button>
        <button
          onClick={() => setCurrentStep("tweetStyleSelection")}
          className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20 "
        >
          Back to Forms
        </button>
      </div>
    </div>
  );

  // Render tweet style selection step
  const renderTweetStyleSelection = () => (
    <div className="w-full">
      <h2 className="text-xl text-white mb-4">Select a Tweet Style</h2>
      <p className="text-gray-300 mb-6">
        Choose the style that best fits your message for{" "}
        {topics || "Web3 gaming"}
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
          onClick={() => setCurrentStep("metricsSelection")}
          className="text-gray-300 px-3 py-1 rounded-lg hover:bg-white/20"
        >
          Back
        </button>
        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          className="bg-black text-white px-5 py-3 rounded-3xl disabled:opacity-50 flex items-center space-x-2 hover:bg-gray-900"
        >
          <RiAiGenerate className="mr-2 h-5 w-5" /> Generate Tweets
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (loading) return <LoadingSpinner />;

    switch (currentStep) {
      case "initial":
        return renderInitialButtons();
      case "trendSelection":
        return renderTrendSelection();
      case "customTopic":
        return renderCustomTopic();
      case "metricsSelection":
        return renderMetricsSelection();
      case "tweetStyleSelection":
        return renderTweetStyleSelection();
      case "results":
        return tweets.length > 0 ? renderResults() : renderInitialButtons();
      default:
        return renderInitialButtons();
    }
  };

  return (
    <div className="mx-auto p-4 w-full" suppressHydrationWarning>
      {renderCurrentStep()}
    </div>
  );
};

export default TweetGenerator;
