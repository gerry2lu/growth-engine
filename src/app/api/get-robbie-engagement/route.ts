import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUsersWhoLikedPost } from "@/utils/getUsersWhoLikedPost";
import { findMatchingUsers } from "@/utils/getMatchingKOLs";
import { addCheckboxColumn } from "@/utils/addCheckboxColumn";
// import { updateRobbieTimelinePosts } from "@/utils/updateRobbieTimelinePosts";

const prisma = new PrismaClient();

export async function GET() {
  const userId = process.env.ROBBIE_X_ID;

  if (userId === undefined) {
    return NextResponse.json(
      { success: false, message: "ROBBIE_X_ID environment variable not set" },
      { status: 500 }
    );
  }
  try {
    // await updateRobbieTimelinePosts(userId);

    const oldestUnanalyzedPost = await prisma.robbiePosts.findFirst({
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
    const postURL = "https://x.com/0xferg/status/" + postId;
    const postDate = oldestUnanalyzedPost.createdAt;

    const usersWhoLikedPost = await getUsersWhoLikedPost(postId, true);

    if (!usersWhoLikedPost) {
      return NextResponse.json(
        { success: false, message: "No users liked the post" },
        { status: 500 }
      );
    }

    const matchedUserIndicies = await findMatchingUsers(usersWhoLikedPost);

    if (matchedUserIndicies.length === 0) {
      console.log("No matching users found");
    }

    await addCheckboxColumn(matchedUserIndicies, postURL, true, postDate);

    await prisma.robbiePosts.update({
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
    console.error("Error getting engagement:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get engagement" },
      { status: 500 }
    );
  }
}
