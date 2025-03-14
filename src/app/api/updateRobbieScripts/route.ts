import { NextResponse } from "next/server";
import updateRobbieRatings from "@/utils/updateRobbieRatings";
import { updateRobbieTimelinePosts } from "@/utils/updateRobbieTimelinePosts";

export async function GET() {
  try {
    await updateRobbieTimelinePosts(process.env.ROBBIE_X_ID!);
    await updateRobbieRatings();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating Robbie ratings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update Robbie ratings" },
      { status: 500 }
    );
  }
}
