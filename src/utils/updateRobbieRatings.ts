import { addRobbieTweetRow } from "./addRobbieTweetRow";
import { prisma } from "@/lib/prisma";

async function updateRobbieRatings() {
  // Get posts from RobbiePosts table which is_added_to_spreadsheet = false and createdAt > 14 days ago and likes >= 20
  const newPosts = await prisma.robbiePosts.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      is_added_to_spreadsheet: false,
      likes: {
        gte: 20,
      },
    },
  });

  console.log("Found " + newPosts.length + " new posts to add to spreadsheet");

  // For each post get addRobbieTweetRow and update is_added_to_spreadsheet to true
  for (const post of newPosts) {
    await addRobbieTweetRow(post.link, post.likes, post.createdAt);
    await prisma.robbiePosts.update({
      where: { post_id: post.post_id },
      data: { is_added_to_spreadsheet: true },
    });
  }

  return { success: true };
}

export default updateRobbieRatings;
