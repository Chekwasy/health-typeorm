export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

type SendBy = "USER" | "HOST";

interface Body {
  to: string;

  /**
   * Plain text message
   */
  message?: string;

  /**
   * Optional template
   */
  template_name?: string;

  /**
   * Template placeholders
   *
   * Example:
   * {
   *   doctor_name: "Dr John",
   *   patient_name: "Richard",
   *   appointment_date: "12 May 2026",
   *   appointment_time: "10:00 AM"
   * }
   */
  template_variables?: Record<string, string>;

  /**
   * USER -> doctor's integration
   * HOST -> platform/.env
   */
  sendby?: SendBy;

  /**
   * true  -> mock send
   * false -> real Meta API
   */
  test?: boolean;

  simulate_failure?: boolean;
}

export async function POST(req: Request) {
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

    const body: Body = await req.json();

    const {
      to,
      message,
      template_name,
      template_variables,
      sendby = "USER",
      test = false,
      simulate_failure,
    } = body;

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!to) {
      return NextResponse.json(
        {
          success: false,

          message: "'to' is required",
        },
        { status: 400 },
      );
    }

    if (!message && !template_name) {
      return NextResponse.json(
        {
          success: false,

          message: "Either message or template_name is required",
        },
        { status: 400 },
      );
    }

    /**
     * =====================================
     * MOCK FAILURE
     * =====================================
     */

    if (simulate_failure) {
      return NextResponse.json(
        {
          success: false,

          message: "Failed to send WhatsApp message",

          error_code: "META_SEND_FAILED",
        },
        { status: 400 },
      );
    }

    let senderPhoneNumber = "";

    let phone_number_id = "";

    let access_token = "";

    /**
     * =====================================
     * HOST SEND (.env)
     * =====================================
     */

    if (sendby === "HOST") {
      senderPhoneNumber = process.env.META_PHONE_NUMBER || "+15550000000";

      phone_number_id = process.env.META_PHONE_NUMBER_ID || "";

      access_token = process.env.META_ACCESS_TOKEN || "";
    } else {

    /**
     * =====================================
     * USER SEND
     * =====================================
     */
      const integrationRepo =
        dbClient.client.getRepository(WhatsAppIntegration);

      const integration = await integrationRepo.findOne({
        where: {
          doctor_id,

          provider: "META_WHATSAPP",
        },
      });

      if (!integration) {
        return NextResponse.json(
          {
            success: false,

            message: "Doctor does not have Meta WhatsApp connected",
          },
          { status: 404 },
        );
      }

      if (integration.onboarding_status !== "CONNECTED") {
        return NextResponse.json(
          {
            success: false,

            message: "Doctor WhatsApp integration is not active",
          },
          { status: 400 },
        );
      }

      /**
       * REQUIRED CONFIG
       */

      if (!integration.phone_number_id || !integration.access_token) {
        return NextResponse.json(
          {
            success: false,

            message: "Incomplete Meta integration configuration",
          },
          { status: 400 },
        );
      }

      senderPhoneNumber = integration.phone_number;

      phone_number_id = integration.phone_number_id;

      access_token = integration.access_token;
    }

    /**
     * =====================================
     * BUILD TEMPLATE PARAMETERS
     * =====================================
     */

    const templateParameters = template_variables
      ? Object.values(template_variables).map((value) => ({
          type: "text",

          text: value,
        }))
      : [];

    /**
     * =====================================
     * TEST MODE
     * =====================================
     */

    if (test) {
      const mockMessageId = `mock_msg_${Date.now()}`;

      console.log("MOCK META SEND:", {
        sendby,

        from: senderPhoneNumber,

        to,

        message,

        template_name,

        template_variables,

        templateParameters,
      });

      return NextResponse.json(
        {
          success: true,

          mode: "TEST_MODE",

          message: "Mock WhatsApp message sent successfully",

          data: {
            provider: "META_WHATSAPP",

            sendby,

            from: senderPhoneNumber,

            to,

            text: message || null,

            template_name: template_name || null,

            template_variables: template_variables || null,

            template_parameters: templateParameters,

            message_id: mockMessageId,

            timestamp: new Date(),
          },
        },
        { status: 200 },
      );
    }

    /**
     * =====================================
     * BUILD PAYLOAD
     * =====================================
     */

    const payload = template_name
      ? {
          messaging_product: "whatsapp",

          to,

          type: "template",

          template: {
            name: template_name,

            language: {
              code: "en_US",
            },

            /**
             * PLACEHOLDER SUPPORT
             */

            components: [
              {
                type: "body",

                parameters: templateParameters,
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",

          to,

          type: "text",

          text: {
            body: message,
          },
        };

    /**
     * =====================================
     * META SEND
     * =====================================
     */

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phone_number_id}/messages`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${access_token}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    /**
     * OPTIONAL:
     * SAVE OUTGOING MESSAGE
     */

    console.log("META PRODUCTION SEND:", data);

    return NextResponse.json(
      {
        success: response.ok,

        mode: "PRODUCTION_STYLE",

        sendby,

        payload,

        meta_response: data,

        message: response.ok
          ? "WhatsApp message sent successfully"
          : "Meta send failed",
      },
      {
        status: response.ok ? 200 : 400,
      },
    );
  } catch (err) {
    console.error("META SEND ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to send Meta WhatsApp message",
      },
      { status: 500 },
    );
  }
}
