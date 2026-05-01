// /lib/auth.ts
import jwt from "jsonwebtoken";
import redisClient from "@/lib/redis";

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }

  const token = authHeader.split(" ")[1];

  let decoded: any;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    throw new Error("Invalid token");
  }

  const session = await redisClient.get(`session:${decoded.userId}`);

  if (!session) {
    throw new Error("Session expired");
  }

  return decoded; // { userId, role }
}