export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * =========================================
 * MESSAGEBIRD WEBHOOK VERIFICATION
 * =========================================
 *
 * We validate using:
 * - webhook secret
 *
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const secret =
      searchParams.get("secret");

    const webhookSecret =
      process.env
        .MESSAGEBIRD_WEBHOOK_SECRET;

    if (
      secret &&
      secret === webhookSecret
    ) {
      console.log(
        "MESSAGEBIRD WEBHOOK VERIFIED"
      );

      return NextResponse.json(
        {
          success: true,
          message:
            "Webhook verified",
        },
        { status: 200 }
      );
    }

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
      "MESSAGEBIRD WEBHOOK GET ERROR:",
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
 * MESSAGEBIRD WEBHOOK EVENTS
 * =========================================
 *
 * Handles:
 * - incoming messages
 * - delivery statuses
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
      "MESSAGEBIRD WEBHOOK EVENT:",
      JSON.stringify(body, null, 2)
    );

    /**
     * =====================================
     * INCOMING MESSAGE
     * =====================================
     */

    const message =
      body?.message;

    if (message) {
      console.log(
        "NEW MESSAGEBIRD MESSAGE:"
      );

      console.log({
        id: message.id,

        from:
          message.from,

        to: message.to,

        type:
          message.type,

        text:
          message.content
            ?.text,
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
     * DELIVERY STATUS
     * =====================================
     */

    const status =
      body?.status;

    if (status) {
      console.log(
        "MESSAGEBIRD DELIVERY STATUS:"
      );

      console.log({
        id: body?.id,

        status,

        recipient:
          body?.to,

        timestamp:
          body?.createdDatetime,
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
      "MESSAGEBIRD WEBHOOK POST ERROR:",
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