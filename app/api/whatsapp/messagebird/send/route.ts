export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

type SendBy = "USER" | "HOST";

interface Body {
  to: string;

  message: string;

  /**
   * USER -> doctor's integration
   * HOST -> platform/.env
   */
  sendby?: SendBy;

  /**
   * true  -> mock send
   * false -> production style
   */
  test?: boolean;

  simulate_failure?: boolean;
}

export async function POST(req: Request) {
  try {
    await dbClient.init();

    // AUTH
    let decoded: any;

    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          message:
            err.message || "Unauthorized",
        },
        { status: 401 }
      );
    }

    const doctor_id = decoded.userId;

    const body: Body = await req.json();

    const {
      to,
      message,
      sendby = "USER",
      test = false,
      simulate_failure,
    } = body;

    // VALIDATION
    if (!to) {
      return NextResponse.json(
        {
          success: false,
          message:
            "'to' is required",
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "'message' is required",
        },
        { status: 400 }
      );
    }

    // MOCK FAILURE
    if (simulate_failure) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to send MessageBird WhatsApp message",

          error_code:
            "MESSAGEBIRD_SEND_FAILED",
        },
        { status: 400 }
      );
    }

    let senderPhoneNumber = "";
    let access_key = "";
    let channel_id = "";

    /**
     * =====================================
     * HOST SEND (.env)
     * =====================================
     */

    if (sendby === "HOST") {
      senderPhoneNumber =
        process.env
          .MESSAGEBIRD_PHONE_NUMBER ||
        "+15550000000";

      access_key =
        process.env
          .MESSAGEBIRD_API_KEY ||
        "";

      channel_id =
        process.env
          .MESSAGEBIRD_CHANNEL_ID ||
        "";
    }

    /**
     * =====================================
     * USER SEND (doctor integration)
     * =====================================
     */

    else {
      const integrationRepo =
        dbClient.client.getRepository(
          WhatsAppIntegration
        );

      const integration =
        await integrationRepo.findOne({
          where: {
            doctor_id,
            provider:
              "MESSAGE_BIRD",
          },
        });

      if (!integration) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Doctor does not have MessageBird connected",
          },
          { status: 404 }
        );
      }

      if (
        integration.onboarding_status !==
        "CONNECTED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Doctor MessageBird integration is not active",
          },
          { status: 400 }
        );
      }

      senderPhoneNumber =
        integration.phone_number;

      access_key =
        integration.access_token;

      channel_id =
        integration.metadata
          ?.channel_id || "";
    }

    /**
     * =====================================
     * TEST MODE (MOCK)
     * =====================================
     */

    if (test) {
      const mockMessageId =
        `mock_msgbird_${Date.now()}`;

      console.log(
        "MOCK MESSAGEBIRD SEND:",
        {
          sendby,

          from:
            senderPhoneNumber,

          to,

          message,
        }
      );

      return NextResponse.json(
        {
          success: true,

          mode: "TEST_MODE",

          message:
            "Mock MessageBird WhatsApp message sent successfully",

          data: {
            provider:
              "MESSAGE_BIRD",

            sendby,

            from:
              senderPhoneNumber,

            to,

            text:
              message,

            message_id:
              mockMessageId,

            timestamp:
              new Date(),
          },
        },
        { status: 200 }
      );
    }

    /**
     * =====================================
     * PRODUCTION STYLE SEND
     * =====================================
     *
     * MessageBird WhatsApp API
     */

    const payload = {
      to,

      from:
        senderPhoneNumber,

      type: "text",

      content: {
        text: message,
      },
    };

    const response = await fetch(
      "https://conversations.messagebird.com/v1/send",
      {
        method: "POST",

        headers: {
          Authorization:
            `AccessKey ${access_key}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          payload
        ),
      }
    );

    const data =
      await response.json();

    /**
     * OPTIONAL:
     * Save outgoing message to DB here
     */

    console.log(
      "MESSAGEBIRD PRODUCTION SEND:",
      data
    );

    return NextResponse.json(
      {
        success: response.ok,

        mode:
          "PRODUCTION_STYLE",

        sendby,

        provider:
          "MESSAGE_BIRD",

        message:
          response.ok
            ? "MessageBird WhatsApp message sent successfully"
            : "MessageBird send failed",

        messagebird_response:
          data,
      },
      {
        status:
          response.ok
            ? 200
            : 400,
      }
    );
  } catch (err) {
    console.error(
      "MESSAGEBIRD SEND ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to send MessageBird WhatsApp message",
      },
      { status: 500 }
    );
  }
}