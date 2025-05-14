import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export async function GET() {
  try {
    const [accessToken, refreshToken] = await refreshAccessToken();
    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    return NextResponse.json(
      { success: false, message: "Failed to refresh tokens" },
      { status: 500 }
    );
  }
}

async function refreshAccessToken(): Promise<[string, string]> {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  // Get the xauth element with the highest id in the xauth table that has_expired is false
  const xauth = await prisma.xauth.findFirst({
    where: {
      has_expired: false,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (!xauth) {
    throw new Error("No xauth records found");
  }

  const refreshToken = xauth.refresh_token;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing required environment variables");
  }

  const tokenUrl = "https://api.twitter.com/2/oauth2/token";

  // Create Basic Auth header
  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");
  const basicAuth = `Basic ${encodedCredentials}`;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Token refresh failed:", errorData);
      throw new Error(
        `Failed to refresh token: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as TokenResponse;

    // Log success
    // console.log("Token refresh successful!");
    // console.log(`Token Type: ${data.token_type}`);
    // console.log(`Expires In: ${data.expires_in} seconds`);

    // Update the previous xauth record to has_expired = true
    await prisma.xauth.update({
      where: { id: xauth.id },
      data: { has_expired: true },
    });

    // Create a new xauth record with the new tokens
    await prisma.xauth.create({
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        has_expired: false,
      },
    });

    // Return tuple of [access_token, refresh_token]
    return [data.access_token, data.refresh_token];
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}
