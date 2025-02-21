export async function findMatchingUsers(
  likedUsers: string[]
): Promise<number[]> {
  const twitterHandlesStr = process.env.IC_TWITTER_HANDLES;

  if (!twitterHandlesStr) {
    console.error("No Twitter handles found in the environment.");
    return [];
  }

  const twitterHandles = twitterHandlesStr.split(",");

  const matchedIndices: number[] = [];

  // Check for matches
  for (const user of likedUsers) {
    if (twitterHandles.includes(user)) {
      const index = twitterHandles.indexOf(user) + 4; // Add 1 to start indexing from 1, then add 3 for spreadsheet index
      matchedIndices.push(index);
    }
  }

  return matchedIndices;
}
