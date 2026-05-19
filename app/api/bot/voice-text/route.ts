export const runtime = "nodejs";

import { NextResponse } from "next/server";

import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { BotMessage } from "@/entities/BotMessage";

import { processMessage } from "@/lib/bot/process-message/process-message";

/**
 * =========================================
 * VOICE BOT API
 * =========================================
 *
 * HYBRID ARCHITECTURE:
 * - Voice provider handles:
 *   - STT
 *   - TTS
 *   - telephony
 *
 * Backend handles:
 * - conversational AI
 * - scheduling
 * - appointment workflows
 * - context memory
 * =========================================
 */

export async function POST(req: Request) {
  try {
    /**
     * =====================================
     * ENSURE DB CONNECTION
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * BODY
     * =====================================
     */

    const body = await req.json();

    /**
     * =====================================
     * EXPECTED PAYLOAD
     * =====================================
     *
     * Example:
     *
     * {
     *   phone: "+2348012345678",
     *   message: "book appointment tomorrow"
     * }
     * =====================================
     */

    const phone = body.phone?.trim();

    const message = body.message?.trim();

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!phone) {
      return NextResponse.json(
        {
          success: false,

          message: "Phone number is required",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * MESSAGE REQUIRED
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
     * PROFILE REPOSITORY
     * =====================================
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    /**
     * =====================================
     * FIND USER BY PHONE
     * =====================================
     *
     * This supports:
     * - existing patients
     * - patients added by staff/admin
     * - non-internet users
     * =====================================
     */

    let user = await profileRepo.findOne({
      where: {
        phone: phone,
      },
    });

    /**
     * =====================================
     * AUTO CREATE PATIENT
     * =====================================
     *
     * Optional behavior.
     * Can later be changed
     * to strict-only lookup.
     * =====================================
     */

    if (!user) {
      /**
       * CREATE BASIC PATIENT
       */

      user = profileRepo.create({
        role: "PATIENT",

        phone: phone,

        first_name: "Voice",

        last_name: "Patient",
      });

      /**
       * SAVE USER
       */

      await profileRepo.save(user);

      console.log("VOICE USER AUTO CREATED", {
        phone,

        user_id: user.id,
      });
    }

    /**
     * =====================================
     * USER ID
     * =====================================
     */

    const user_id = user.id;

    /**
     * =====================================
     * PROCESS MESSAGE
     * =====================================
     */

    const result = await processMessage({
      user_id,

      message,

      channel: "VOICE",
    });

    /**
     * =====================================
     * BOT MESSAGE REPOSITORY
     * =====================================
     */

    const botMessageRepo = dbClient.client.getRepository(BotMessage);

    /**
     * =====================================
     * SAVE USER MESSAGE
     * =====================================
     */

    await botMessageRepo.save(
      botMessageRepo.create({
        user_id,

        sender: "USER",

        channel: "VOICE",

        message,

        success: true,
      }),
    );

    /**
     * =====================================
     * SAVE BOT RESPONSE
     * =====================================
     */

    await botMessageRepo.save(
      botMessageRepo.create({
        user_id,

        sender: "BOT",

        channel: "VOICE",

        message: result.reply,

        success: result.success,
      }),
    );

    /**
     * =====================================
     * SUCCESS RESPONSE
     * =====================================
     *
     * Voice provider
     * converts this text
     * back to speech.
     * =====================================
     */

    return NextResponse.json(
      {
        success: result.success,

        reply: result.reply,

        user_id,

        phone,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    /**
     * =====================================
     * ERROR LOGGING
     * =====================================
     */

    console.error("VOICE BOT ERROR:", err);

    /**
     * =====================================
     * FAILURE RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        success: false,

        reply:
          "Sorry, something went wrong while processing your request, Please try again later.",
      },
      {
        status: 500,
      },
    );
  }
}
