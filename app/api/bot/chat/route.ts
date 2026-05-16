export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import dbClient from "@/lib/db";

import { BotMessage } from "@/entities/BotMessage";

import { processMessage } from "@/lib/bot/process-message/process-message";

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
     * SAVE USER MESSAGE
     * =====================================
     */

    await dbClient.init();

    const botMessageRepo = dbClient.client.getRepository(BotMessage);

    /**
     * USER MESSAGE
     */

    await botMessageRepo.save(
      botMessageRepo.create({
        user_id,

        sender: "USER",

        channel: "WEB",

        message,

        success: true,
      }),
    );

    /**
     * BOT RESPONSE
     */

    await botMessageRepo.save(
      botMessageRepo.create({
        user_id,

        sender: "BOT",

        channel: "WEB",

        message: result.reply,

        success: result.success,
      }),
    );

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
