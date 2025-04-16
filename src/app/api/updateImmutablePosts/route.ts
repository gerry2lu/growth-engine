import { updateTimelinePosts } from "@/utils/updateTimelinePosts";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = "1233171399872638976"; // IMX Social

  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const start_time = twoWeeksAgo.toISOString();

  try {
    await updateTimelinePosts(userId, start_time);
  } catch (error) {
    console.error("Error updating Immutable posts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update Immutable posts" },
      { status: 500 }
    );
  }
}
