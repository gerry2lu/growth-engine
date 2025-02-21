/* eslint-disable  @typescript-eslint/no-explicit-any */

import { getAccessToken } from "./getAccessToken";

export async function getUsersWhoLikedPost(postId: string): Promise<string[]> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    console.error("Error: Bearer token is missing.");
    return [];
  }

  try {
    let allUsers: string[] = [];
    let paginationToken: string | null = null;
    let pageCount = 0;

    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const url = "https://api.x.com/2/tweets/{id}/liking_users".replace(
      "{id}",
      postId
    );

    const params = new URLSearchParams({
      max_results: "100",
      "user.fields": "username",
    });

    while (true) {
      if (paginationToken) {
        params.set("pagination_token", paginationToken);
      }

      const response = await fetch(`${url}?${params.toString()}`, options);

      if (!response.ok) {
        throw new Error(
          `Twitter API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.data) {
        break;
      }

      const users = data.data.map((user: any) => user.username);
      console.log("Users:", users);
      allUsers = [...allUsers, ...users];

      pageCount += 1;
      console.log(
        `Fetched page ${pageCount}, total users so far: ${allUsers.length}`
      );

      if (pageCount >= 5) {
        // Max 5 pages
        break;
      }

      // Check if there are more pages
      if (!data.meta || !data.meta.next_token) {
        break;
      }

      paginationToken = data.meta.next_token;

      // Add a small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return allUsers;
  } catch (error) {
    console.error("Error fetching likes:", error);
    return [];
  }
}
