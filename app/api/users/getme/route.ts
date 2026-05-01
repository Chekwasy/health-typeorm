export const runtime = "nodejs";

import dbClient from "../../../../lib/db";
import { NextResponse } from "next/server";
import { Profile } from "@/entities/Profile";
import { requireAuth } from "@/lib/auth"; 

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await dbClient.init();

    // AUTH
    let decoded;
    try {
      decoded = await requireAuth(request);
    } catch (err: any) {
      return NextResponse.json(
        { message: err.message },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Fetch profile
    const repo = dbClient.client.getRepository(Profile);

    const profile = await repo.findOne({
      where: { id: userId },
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        logged: true,
        message: "Success",
        profileComplete: profile.is_profile_complete,
        me: {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          title: profile.title,
          phone: profile.phone,
          role: profile.role,
          created_at: profile.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error processing request" },
      { status: 500 }
    );
  }
}