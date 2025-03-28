import { NextResponse } from "next/server";
// import { updateTimelinePosts } from "@/utils/updateTimelinePosts";
import { PrismaClient } from "@prisma/client";
import { getUsersWhoLikedPost } from "@/utils/getUsersWhoLikedPost";
import { findMatchingUsers } from "@/utils/getMatchingKOLs";
import { addCheckboxColumn } from "@/utils/addCheckboxColumn";

const prisma = new PrismaClient();

export async function GET() {
  // const userId = "1233171399872638976"; // WILL CONVERT TO ENV VARIABLE

  try {
    // await updateTimelinePosts(userId);

    // Take the oldest Immutable post from the database which has not been analyzed
    const oldestUnanalyzedPost = await prisma.immutablePosts.findFirst({
      where: {
        is_analyzed: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!oldestUnanalyzedPost) {
      return NextResponse.json({
        success: true,
        message: "No unanalyzed posts found",
      });
    }

    const postId = oldestUnanalyzedPost.post_id;
    const postURL = "https://x.com/Immutable/status/" + postId;
    const postDate = oldestUnanalyzedPost.createdAt;

    // Get users who liked the post
    const usersWhoLikedPost = await getUsersWhoLikedPost(postId, false);

    if (!usersWhoLikedPost) {
      return NextResponse.json(
        { success: false, message: "No users liked the post" },
        { status: 500 }
      );
    }

    // Match users to influencers as indicies
    const matchedUserIndicies = await findMatchingUsers(usersWhoLikedPost);

    console.log("Matched users:", matchedUserIndicies);

    if (matchedUserIndicies.length === 0) {
      console.log("No matching users found");
    }

    // Add data to spreadsheet
    await addCheckboxColumn(matchedUserIndicies, postURL, false, postDate);

    // Update the post as analyzed
    await prisma.immutablePosts.update({
      where: {
        post_id: postId,
      },
      data: {
        is_analyzed: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Success",
    });
  } catch (error) {
    console.error("Error fetching user timeline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user timeline" },
      { status: 500 }
    );
  }
}
