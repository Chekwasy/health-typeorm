export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

export async function GET(req: Request) {
  try {
    await dbClient.init();

    /**
     * =====================================
     * AUTH
     * =====================================
     */

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

    const integrationRepo = dbClient.client.getRepository(WhatsAppIntegration);

    /**
     * =====================================
     * FETCH MESSAGEBIRD INTEGRATION
     * =====================================
     */

    const integration = await integrationRepo.findOne({
      where: {
        doctor_id,

        provider: "MESSAGE_BIRD",
      },
    });

    /**
     * =====================================
     * NO INTEGRATION
     * =====================================
     */

    if (!integration) {
      return NextResponse.json(
        {
          success: true,

          connected: false,

          provider: "MESSAGE_BIRD",

          message: "Doctor has not connected MessageBird",

          data: null,
        },
        { status: 200 },
      );
    }

    /**
     * =====================================
     * CONFIG VALIDATION
     * =====================================
     */

    const configuration_complete = !!(
      integration.access_token && integration.metadata?.channel_id
    );

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        success: true,

        connected: integration.onboarding_status === "CONNECTED",

        provider: integration.provider,

        data: {
          id: integration.id,

          doctor_id: integration.doctor_id,

          /**
           * Helpful frontend flag
           */
          configuration_complete,

          business: {
            name: integration.business_name,

            business_id: integration.business_id,
          },

          whatsapp: {
            phone_number: integration.phone_number,
          },

          messagebird: {
            channel_id: integration.metadata?.channel_id || null,

            workspace_id: integration.metadata?.workspace_id || null,
          },

          onboarding_status: integration.onboarding_status,

          webhook_status: integration.webhook_status,

          mock_mode: integration.metadata?.mock_mode || false,

          created_at: integration.created_at,

          updated_at: integration.updated_at,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("MESSAGEBIRD STATUS ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to fetch MessageBird integration status",
      },
      { status: 500 },
    );
  }
}
