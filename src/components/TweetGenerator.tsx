// app/components/TweetGenerator.tsx
"use client";

import { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

type TweetGeneratorProps = {
  tweets: string[];
  setTweets: (tweets: string[]) => void;
};

const TweetGenerator = (props: TweetGeneratorProps) => {
  const { tweets, setTweets } = props;
  const [topics, setTopics] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
              placeholder="Enter topics (e.g., AI, Memecoins, Web3)..."
              className="w-full p-2 border rounded-lg outline-none text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-500 text-black px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Generate Tweets
            </button>
          </form>

          {tweets.length > 0 && (
            <div className="mt-8 flex space-x-6 overflow-x-auto">
              {tweets.map((tweet, index) => (
                <div
                  key={index}
                  className="p-4 border rounded bg-gray-50 min-w-[200px]"
                >
                  <p className="whitespace-pre-wrap">{tweet}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(tweet)}
                    className="mt-2 text-sm text-blue-500"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TweetGenerator;
