export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

interface Body {
  business_name: string;

  phone_number: string;

  simulate_failure?: boolean;

  /**
   * TEST MODE
   *
   * true  -> skip DB save
   * false -> save to DB
   */
  test?: boolean;
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

          message: err.message || "Unauthorized",
        },
        { status: 401 },
      );
    }

    const doctor_id = decoded.userId;

    const body: Body = await req.json();

    const {
      business_name,
      phone_number,
      simulate_failure,
      test = false,
    } = body;

    /**
     * VALIDATION
     */

    if (!business_name) {
      return NextResponse.json(
        {
          success: false,

          message: "business_name is required",
        },
        { status: 400 },
      );
    }

    if (!phone_number) {
      return NextResponse.json(
        {
          success: false,

          message: "phone_number is required",
        },
        { status: 400 },
      );
    }

    /**
     * MOCK FAILURE
     */

    if (simulate_failure) {
      return NextResponse.json(
        {
          success: false,

          message: "MessageBird signup failed",

          error_code: "MESSAGEBIRD_SIGNUP_FAILED",
        },
        { status: 400 },
      );
    }

    const integrationRepo = dbClient.client.getRepository(WhatsAppIntegration);

    /**
     * IMPORTANT:
     *
     * Only prevent duplicate MESSAGE_BIRD
     *
     * Doctor can still later connect:
     * META_WHATSAPP
     */

    const existingMessageBirdIntegration = await integrationRepo.findOne({
      where: {
        doctor_id,

        provider: "MESSAGE_BIRD",
      },
    });

    if (existingMessageBirdIntegration) {
      return NextResponse.json(
        {
          success: false,

          message: "Doctor already has MessageBird connected",
        },
        { status: 400 },
      );
    }

    /**
     * REALISTIC MOCK GENERATION
     */

    const timestamp = Date.now();

    const integration = integrationRepo.create({
      doctor_id,

      provider: "MESSAGE_BIRD",

      onboarding_status: "CONNECTED",

      business_name,

      business_id: `mock_messagebird_business_${timestamp}`,

      phone_number,

      /**
       * IMPORTANT:
       * Encrypt in production
       */

      access_token: `mock_messagebird_access_token_${timestamp}`,

      webhook_status: "PENDING",

      metadata: {
        channel_id: `mock_channel_${timestamp}`,

        workspace_id: `mock_workspace_${timestamp}`,

        webhook_secret:
          process.env.MESSAGEBIRD_WEBHOOK_SECRET || "mock_webhook_secret",

        mock_mode: true,
      },
    });

    /**
     * SAVE TO DATABASE
     */

    if (!test) {
      await integrationRepo.save(integration);
    }

    console.log("MESSAGEBIRD MOCK SIGNUP SUCCESS:", integration);

    return NextResponse.json(
      {
        success: true,

        test_mode: test === true,

        message:
          test === true
            ? "MessageBird signup test successful (not saved to DB)"
            : "MessageBird connected successfully",

        data: {
          provider: integration.provider,

          onboarding_status: integration.onboarding_status,

          business: {
            business_name: integration.business_name,

            business_id: integration.business_id,
          },

          whatsapp: {
            phone_number: integration.phone_number,
          },

          messagebird: {
            channel_id: integration.metadata?.channel_id,

            workspace_id: integration.metadata?.workspace_id,
          },

          webhook: {
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/messagebird/webhook`,

            verification_status: integration.webhook_status,
          },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("MESSAGEBIRD SIGNUP ERROR:", err);

    /**
     * UNIQUE CONSTRAINT
     */

    if (err?.code === "23505") {
      return NextResponse.json(
        {
          success: false,

          message: "MessageBird already connected for this doctor",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message: "Failed to complete MessageBird signup",
      },
      { status: 500 },
    );
  }
}
