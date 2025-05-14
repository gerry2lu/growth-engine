// app/page.tsx
"use client";
import TweetGenerator from "@/components/TweetGenerator";
import { useState, useEffect } from "react";
import { passportInstance } from "@/utils/setupDefault";

export default function Home() {
  const [tweets, setTweets] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isImmutable, setIsImmutable] = useState(true);

  useEffect(() => {
    const fetchUserProfileData = async () => {
      const userProfileData = await passportInstance.getUserInfo();
      if (!userProfileData) return;
      setEmail(userProfileData.email || null);
    };
    fetchUserProfileData();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  function getEmailDomain(email: string) {
    return email.split("@")[1];
  }

  useEffect(() => {
    if (!email) return;
    const domain = getEmailDomain(email as string);
    if (domain === "immutable.com") {
      setIsImmutable(true);
    } else {
      setIsImmutable(false);
    }
  }, [email]);

  // const testDailySlackUpdate = async () => {
  //   const response = await fetch("/api/send-slack-update");
  //   const data = await response.json();
  //   console.log(data);
  // };

  // const testRefreshTokens = async () => {
  //   const response = await fetch("/api/refresh-tokens");
  //   const data = await response.json();
  //   console.log(data);
  // };

  // const testGetEngagement = async () => {
  //   const response = await fetch("/api/updateImmutablePosts");
  //   const data = await response.json();
  //   console.log(data);
  // };

  // const updateRobbieScripts = async () => {
  //   const response = await fetch("/api/get-trends");
  //   const data = await response.json();
  //   console.log(data);
  // };

  return (
    <div
      className="relative h-screen flex justify-center items-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <div className="absolute inset-0 bg-black opacity-60"></div>
      <div
        className={`relative bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-10 shadow-lg overflow-y-scroll max-h-full ${
          isClient && tweets.length > 0 ? "w-[80%]" : "w-[60%]"
        }`}
      >
        <h1 className="text-4xl font-bold text-center mt-2 mb-6 text-white w-full">
          Tweet Automation Engine
        </h1>
        {isImmutable ? (
          <TweetGenerator
            tweets={tweets}
            setTweets={setTweets}
            isImmutable={isImmutable}
          />
        ) : (
          <div className="text-white w-full text-center">
            Please sign in with Immutable
          </div>
        )}
      </div>
    </div>
  );
}
