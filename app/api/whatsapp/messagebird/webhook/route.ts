export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

/**
 * =========================================
 * MESSAGEBIRD WEBHOOK VERIFICATION
 * =========================================
 *
 * Validates:
 * - webhook secret
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const secret = searchParams.get("secret");

    const webhookSecret = process.env.MESSAGEBIRD_WEBHOOK_SECRET;

    /**
     * VERIFY SECRET
     */

    if (secret && secret === webhookSecret) {
      console.log("MESSAGEBIRD WEBHOOK VERIFIED");

      return NextResponse.json(
        {
          success: true,

          message: "Webhook verified",
        },
        { status: 200 },
      );
    }

    console.error("MESSAGEBIRD WEBHOOK VERIFICATION FAILED");

    return NextResponse.json(
      {
        success: false,

        message: "Webhook verification failed",
      },
      { status: 403 },
    );
  } catch (err) {
    console.error("MESSAGEBIRD WEBHOOK GET ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Webhook verification error",
      },
      { status: 500 },
    );
  }
}

/**
 * =========================================
 * MESSAGEBIRD WEBHOOK EVENTS
 * =========================================
 *
 * Handles:
 * - incoming messages
 * - statuses
 * - media
 * - delivery updates
 */

export async function POST(req: Request) {
  try {
    await dbClient.init();

    const body = await req.json();

    /**
     * LOG RAW PAYLOAD
     */

    console.log("MESSAGEBIRD WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    /**
     * =====================================
     * EXTRACT CHANNEL ID
     * =====================================
     *
     * Different payloads may vary.
     */

    const channel_id =
      body?.channelId ||
      body?.channel_id ||
      body?.message?.channelId ||
      body?.message?.channel_id ||
      null;

    /**
     * =====================================
     * FIND OWNER DOCTOR
     * =====================================
     */

    let integration = null;

    if (channel_id) {
      const integrationRepo =
        dbClient.client.getRepository(WhatsAppIntegration);

      /**
       * JSONB QUERY
       */

      integration = await integrationRepo
        .createQueryBuilder("integration")
        .where("integration.provider = :provider", {
          provider: "MESSAGE_BIRD",
        })
        .andWhere(`integration.metadata ->> 'channel_id' = :channel_id`, {
          channel_id,
        })
        .getOne();

      if (integration) {
        console.log("MESSAGEBIRD WEBHOOK OWNER FOUND:", {
          doctor_id: integration.doctor_id,

          provider: integration.provider,
        });
      } else {
        console.warn(
          "NO MESSAGEBIRD INTEGRATION FOUND FOR CHANNEL:",
          channel_id,
        );
      }
    }

    /**
     * =====================================
     * INCOMING MESSAGE
     * =====================================
     */

    const message = body?.message;

    if (message) {
      const type = message?.type || "text";

      /**
       * TEXT
       */

      const text = message?.content?.text || null;

      /**
       * MEDIA
       */

      const image = message?.content?.image || null;

      const audio = message?.content?.audio || null;

      const video = message?.content?.video || null;

      const document = message?.content?.document || null;

      console.log("NEW MESSAGEBIRD MESSAGE:");

      console.log({
        doctor_id: integration?.doctor_id || null,

        id: message.id,

        from: message.from,

        to: message.to,

        type,

        text,

        image,

        audio,

        video,

        document,
      });

      /**
       * FUTURE:
       * - save messages
       * - doctor notifications
       * - chatbot
       * - analytics
       * - live dashboard
       */
    }

    /**
     * =====================================
     * DELIVERY STATUS
     * =====================================
     */

    const status = body?.status;

    if (status) {
      console.log("MESSAGEBIRD DELIVERY STATUS:");

      console.log({
        doctor_id: integration?.doctor_id || null,

        id: body?.id || null,

        status,

        recipient: body?.to || null,

        timestamp: body?.createdDatetime || null,
      });

      /**
       * FUTURE:
       * - delivery analytics
       * - retries
       * - failures
       */
    }

    /**
     * =====================================
     * ACKNOWLEDGE WEBHOOK
     * =====================================
     */

    return NextResponse.json(
      {
        success: true,

        message: "Webhook received",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("MESSAGEBIRD WEBHOOK POST ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}
