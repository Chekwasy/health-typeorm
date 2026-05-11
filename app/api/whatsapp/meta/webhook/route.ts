export const runtime = "nodejs";

import { NextResponse } from "next/server";

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

    const mode =
      searchParams.get("hub.mode");

    const token =
      searchParams.get(
        "hub.verify_token"
      );

    const challenge =
      searchParams.get(
        "hub.challenge"
      );

    const verifyToken =
      process.env
        .META_VERIFY_TOKEN;

    /**
     * VERIFY TOKEN
     */

    if (
      mode === "subscribe" &&
      token === verifyToken
    ) {
      console.log(
        "META WEBHOOK VERIFIED"
      );

      return new Response(
        challenge,
        {
          status: 200,
        }
      );
    }

    console.error(
      "META WEBHOOK VERIFICATION FAILED"
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook verification failed",
      },
      { status: 403 }
    );
  } catch (err) {
    console.error(
      "META WEBHOOK GET ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook verification error",
      },
      { status: 500 }
    );
  }
}

/**
 * =========================================
 * META WEBHOOK EVENTS
 * =========================================
 *
 * Meta sends:
 * - incoming messages
 * - delivery status
 * - read receipts
 * - failures
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /**
     * LOG RAW PAYLOAD
     */

    console.log(
      "META WEBHOOK EVENT:",
      JSON.stringify(body, null, 2)
    );

    /**
     * SAFELY EXTRACT DATA
     */

    const entry =
      body?.entry?.[0];

    const change =
      entry?.changes?.[0];

    const value =
      change?.value;

    /**
     * =====================================
     * INCOMING MESSAGE
     * =====================================
     */

    const incomingMessage =
      value?.messages?.[0];

    if (incomingMessage) {
      const from =
        incomingMessage.from;

      const type =
        incomingMessage.type;

      const text =
        incomingMessage?.text
          ?.body;

      console.log(
        "NEW WHATSAPP MESSAGE:"
      );

      console.log({
        from,
        type,
        text,
      });

      /**
       * FUTURE:
       * - save to DB
       * - notify doctor
       * - chatbot
       * - AI processing
       */
    }

    /**
     * =====================================
     * MESSAGE STATUS
     * =====================================
     */

    const status =
      value?.statuses?.[0];

    if (status) {
      console.log(
        "WHATSAPP MESSAGE STATUS:"
      );

      console.log({
        id: status.id,

        status:
          status.status,

        recipient:
          status.recipient_id,

        timestamp:
          status.timestamp,
      });

      /**
       * FUTURE:
       * - save delivery state
       * - analytics
       * - failed retry
       */
    }

    /**
     * IMPORTANT:
     * Always acknowledge webhook
     */

    return NextResponse.json(
      {
        success: true,
        message:
          "Webhook received",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "META WEBHOOK POST ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}