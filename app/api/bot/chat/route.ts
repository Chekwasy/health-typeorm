export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { processMessage } from "@/lib/bot/process-message";

/**
 * =========================================
 * BOT CHAT API
 * =========================================
 */

export async function POST(req: Request) {
  try {
    /**
     * =====================================
     * AUTH
     * =====================================
     */

    let decoded;

    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,

          message: err.message || "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const user_id = decoded.userId;

    /**
     * =====================================
     * BODY
     * =====================================
     */

    const body = await req.json();

    const message = body.message?.trim();

    /**
     * VALIDATION
     */

    if (!message) {
      return NextResponse.json(
        {
          success: false,

          message: "Message is required",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * PROCESS BOT MESSAGE
     * =====================================
     */

    const result = await processMessage({
      user_id,

      message,

      channel: "WEB",
    });

    /**
     * =====================================
     * SUCCESS
     * =====================================
     */

    return NextResponse.json(
      {
        success: result.success,

        reply: result.reply,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("BOT CHAT ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: err.message || "Failed to process bot message",
      },
      {
        status: 500,
      },
    );
  }
}
