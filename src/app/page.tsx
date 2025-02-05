// app/page.tsx
import TweetGenerator from "@/components/TweetGenerator";

export default function Home() {
  return (
    <div className="container mx-auto flex justify-center items-center h-screen">
      <h1 className="text-3xl font-bold text-center my-8 text-blue-500">
        Tweet Recommendation Engine
      </h1>
      <TweetGenerator />
    </div>
  );
}
