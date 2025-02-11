// app/components/TweetGenerator.tsx
"use client";

import { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { RiAiGenerate } from "react-icons/ri";
import { PiTrendUpLight } from "react-icons/pi";
import { Trend } from "@/app/api/get-trends/route";

type TweetGeneratorProps = {
  tweets: string[];
  setTweets: (tweets: string[]) => void;
};

const TweetGenerator = (props: TweetGeneratorProps) => {
  const { tweets, setTweets } = props;
  const [topics, setTopics] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [trends, setTrends] = useState<Trend[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/generate-tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: topics || null }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Remove the first line from the first tweet
      data.tweets[0] = removeTweetHeader(data.tweets[0]);

      setTweets(data.tweets);
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

      const response = await fetch("/api/get-trends", {
        method: "POST",
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
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleAddAsTopic = (trend_name: string) => {
    if (!topics) {
      setTopics(trend_name);
      return;
    } else {
      setTopics((prev) => prev + ", " + trend_name);
    }
  };

  const handleCopyTweet = (tweet: string) => {
    navigator.clipboard.writeText(tweet);
    alert("Tweet copied to clipboard!");
  };

  return (
    <div className="mx-auto p-4">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter topic (e.g., AI, Memecoins, Web3)... Default is Web3 Gaming"
              className="w-full p-2 border rounded-lg outline-none text-black"
            />
            <div className="flex gap-4 flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="bg-black text-white px-5 py-3 rounded-3xl disabled:opacity-50 flex items-center space-x-2 hover:bg-gray-900"
              >
                <RiAiGenerate className="mr-2 h-5 w-5" /> Generate Tweets
              </button>
              <button
                onClick={getTrends}
                disabled={loading}
                className="bg-gray-100 text-black px-5 py-2 rounded-3xl disabled:opacity-50 flex items-center space-x-2 border-2 border-black hover:bg-gray-200"
              >
                <PiTrendUpLight className="mr-2 h-5 w-5" /> Get Trend
                Suggestions
              </button>
            </div>
          </form>
          {trends.length > 0 && (
            <>
              <h1 className="text-lg text-white py-3 font-bold mt-2">
                Recent Trend Suggestions
              </h1>
              <div className="flex space-x-6 overflow-x-auto ">
                {trends.map((trend, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 border-[1px] rounded-xl text-white bg-black bg-opacity-50 backdrop-blue-sm min-w-[200px]"
                  >
                    <div className="flex justify-between flex-col h-full">
                      <div>
                        <p className="my-1">{trend.trend_name}</p>
                        <p className="text-xs text-fuchsia-300">
                          {trend.post_count}
                        </p>
                        <p className="text-xs">{trend.trending_since}</p>
                      </div>
                      <div className="flex mt-3  justify-between items-center">
                        <p className="py-1 px-2 bg-teal-300 text-black rounded-full text-xs w-fit">
                          {trend.category}
                        </p>
                        <button
                          className="py-1 bg-white text-center px-2 rounded-xl text-black text-xs font-bold hover:bg-slate-200 text-nowrap"
                          onClick={() => handleAddAsTopic(trend.trend_name)}
                        >
                          + Add as topic
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tweets.length > 0 && (
            <>
              <h1 className="text-2xl text-white py-3 font-bold mt-2">
                Tweet Recommendations
              </h1>
              <div className="flex space-x-6 overflow-x-auto">
                {tweets.map((tweet, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-xl bg-gray-50 min-w-[200px]"
                  >
                    <p className="whitespace-pre-wrap">{tweet}</p>
                    <button
                      onClick={() => handleCopyTweet(tweet)}
                      className="mt-2 text-sm bg-black text-white px-2 py-1 rounded-lg hover:bg-gray-700"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TweetGenerator;
