export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

/**
 * =========================================
 * META WEBHOOK VERIFICATION
 * =========================================
 *
 * Meta calls this endpoint to verify:
 * - callback URL
 * - verify token
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get("hub.mode");

    const token = searchParams.get("hub.verify_token");

    const challenge = searchParams.get("hub.challenge");

    const verifyToken = process.env.META_VERIFY_TOKEN;

    /**
     * VERIFY TOKEN
     */

    if (mode === "subscribe" && token === verifyToken) {
      console.log("META WEBHOOK VERIFIED");

      return new Response(challenge, {
        status: 200,
      });
    }

    console.error("META WEBHOOK VERIFICATION FAILED");

    return NextResponse.json(
      {
        success: false,

        message: "Webhook verification failed",
      },
      { status: 403 },
    );
  } catch (err) {
    console.error("META WEBHOOK GET ERROR:", err);

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
 * META WEBHOOK EVENTS
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

    console.log("META WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    /**
     * =====================================
     * VERIFY OBJECT TYPE
     * =====================================
     */

    if (body?.object !== "whatsapp_business_account") {
      return NextResponse.json(
        {
          success: false,

          message: "Invalid webhook object",
        },
        { status: 400 },
      );
    }

    /**
     * =====================================
     * SAFELY EXTRACT DATA
     * =====================================
     */

    const entry = body?.entry?.[0];

    const change = entry?.changes?.[0];

    const value = change?.value;

    /**
     * IMPORTANT:
     * Identify WHICH doctor
     * owns this event.
     */

    const phone_number_id = value?.metadata?.phone_number_id;

    /**
     * =====================================
     * FIND DOCTOR INTEGRATION
     * =====================================
     */

    let integration = null;

    if (phone_number_id) {
      const integrationRepo =
        dbClient.client.getRepository(WhatsAppIntegration);

      integration = await integrationRepo.findOne({
        where: {
          provider: "META_WHATSAPP",

          phone_number_id,
        },
      });

      if (integration) {
        console.log("WEBHOOK OWNER FOUND:", {
          doctor_id: integration.doctor_id,

          provider: integration.provider,
        });
      } else {
        console.warn(
          "NO META INTEGRATION FOUND FOR PHONE NUMBER ID:",
          phone_number_id,
        );
      }
    }

    /**
     * =====================================
     * INCOMING MESSAGE
     * =====================================
     */

    const incomingMessage = value?.messages?.[0];

    if (incomingMessage) {
      const from = incomingMessage.from;

      const type = incomingMessage.type;

      /**
       * TEXT MESSAGE
       */

      const text = incomingMessage?.text?.body || null;

      /**
       * MEDIA
       */

      const image = incomingMessage?.image || null;

      const audio = incomingMessage?.audio || null;

      const video = incomingMessage?.video || null;

      const document = incomingMessage?.document || null;

      console.log("NEW WHATSAPP MESSAGE:");

      console.log({
        doctor_id: integration?.doctor_id || null,

        from,

        type,

        text,

        image,

        audio,

        video,

        document,
      });

      /**
       * FUTURE:
       * - save message to DB
       * - doctor notifications
       * - AI chatbot
       * - analytics
       * - live dashboard
       */
    }

    /**
     * =====================================
     * MESSAGE STATUS
     * =====================================
     */

    const status = value?.statuses?.[0];

    if (status) {
      console.log("WHATSAPP MESSAGE STATUS:");

      console.log({
        doctor_id: integration?.doctor_id || null,

        id: status.id,

        status: status.status,

        recipient: status.recipient_id,

        timestamp: status.timestamp,
      });

      /**
       * FUTURE:
       * - save delivery state
       * - retries
       * - analytics
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
    console.error("META WEBHOOK POST ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}
