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
          message:
            err.message || "Unauthorized",
        },
        { status: 401 }
      );
    }

    const doctor_id = decoded.userId;

    const body: Body = await req.json();

    const {
      business_name,
      phone_number,
      simulate_failure,
      test,
    } = body;

    // VALIDATION
    if (!business_name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "business_name is required",
        },
        { status: 400 }
      );
    }

    if (!phone_number) {
      return NextResponse.json(
        {
          success: false,
          message:
            "phone_number is required",
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
            "Meta Embedded Signup failed",

          error_code:
            "META_SIGNUP_FAILED",
        },
        { status: 400 }
      );
    }

    const integrationRepo =
      dbClient.client.getRepository(
        WhatsAppIntegration
      );

    /**
     * OPTIONAL:
     * CHECK EXISTING INTEGRATION
     */

    const existingIntegration =
      await integrationRepo.findOne({
        where: {
          doctor_id,
          provider:
            "META_WHATSAPP",
        },
      });

    if (existingIntegration) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Doctor already has Meta WhatsApp connected",
        },
        { status: 400 }
      );
    }

    /**
     * REALISTIC MOCK GENERATION
     */

    const timestamp = Date.now();

    const integration =
      integrationRepo.create({
        doctor_id,

        provider:
          "META_WHATSAPP",

        onboarding_status:
          "CONNECTED",

        business_name,

        business_id:
          `mock_business_${timestamp}`,

        waba_id:
          `mock_waba_${timestamp}`,

        phone_number_id:
          `mock_phone_id_${timestamp}`,

        phone_number,

        /**
         * IMPORTANT:
         * In production:
         * encrypt token before save
         */

        access_token:
          `mock_access_token_${timestamp}`,

        webhook_status:
          "PENDING",

        metadata: {
          webhook_verify_token:
            process.env
              .META_VERIFY_TOKEN ||
            "mock_verify_token",

          mock_mode: true,

          embedded_signup:
            true,
        },
      });

    /**
     * SAVE TO DATABASE
     *
     * Skip save when:
     * test === true
     */

    if (!test) {
      await integrationRepo.save(
        integration
      );
    }

    console.log(
      "META MOCK SIGNUP SUCCESS:",
      integration
    );

    return NextResponse.json(
      {
        success: true,

        test_mode:
          test === true,

        message:
          test === true
            ? "Meta signup test successful (not saved to DB)"
            : "WhatsApp business connected successfully",

        data: {
          provider:
            integration.provider,

          onboarding_status:
            integration.onboarding_status,

          business: {
            business_name:
              integration.business_name,

            business_id:
              integration.business_id,
          },

          whatsapp: {
            waba_id:
              integration.waba_id,

            phone_number_id:
              integration.phone_number_id,

            phone_number:
              integration.phone_number,
          },

          webhook: {
            callback_url:
              `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/meta/webhook`,

            verification_status:
              integration.webhook_status,
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "META SIGNUP ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to complete Meta signup",
      },
      { status: 500 }
    );
  }
}