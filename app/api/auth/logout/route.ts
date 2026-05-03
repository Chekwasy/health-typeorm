export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import redisClient from "@/lib/redis";

export async function POST(req: Request) {
  try {
    // AUTH
    let decoded;
    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        { message: err.message },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    //  DELETE SESSION
    await redisClient.del(`session:${userId}`);

    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}