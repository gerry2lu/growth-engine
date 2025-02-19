import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getAccessToken() {
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

  return xauth.access_token;
}
