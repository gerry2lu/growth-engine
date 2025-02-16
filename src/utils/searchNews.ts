// utils/searchNews.ts
import Parser from "rss-parser";
import axios from "axios";

interface NewsArticle {
  title: string;
  link: string;
  contentSnippet?: string;
  pubDate?: string;
}

export async function searchNews(query: string): Promise<string> {
  try {
    // Get news articles from Google News RSS
    const articles = await fetchGoogleNews(query);

    // Generate summary from the top 5 articles
    return generateSummary(articles.slice(0, 5), query);
  } catch (error) {
    console.error("Error searching news:", error);
    throw new Error("Failed to fetch news articles");
  }
}

async function fetchGoogleNews(query: string): Promise<NewsArticle[]> {
  const rssParser = new Parser();
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

  // Fetch RSS feed with user agent to avoid blocking
  const response = await axios.get(rssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
    },
  });

  const feed = await rssParser.parseString(response.data);
  return (
    feed.items?.map((item) => ({
      title: item.title || "",
      link: item.link || "",
      contentSnippet: item.contentSnippet,
      pubDate: item.pubDate,
    })) || []
  );
}

function generateSummary(articles: NewsArticle[], query: string): string {
  if (articles.length === 0)
    return "No recent news articles found on this topic.";

  const summaryPoints = articles.map(
    (article, index) =>
      `${index + 1}. "${article.title}" - ${truncate(
        article.contentSnippet || "",
        150
      )}`
  );

  return `Recent news summary for "${query}":\n\n${summaryPoints.join(
    "\n"
  )}\n\n`;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
