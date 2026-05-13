export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

type SendBy = "USER" | "HOST";

interface Body {
  to: string;

  /**
   * Plain text fallback
   */
  message?: string;

  /**
   * Optional template support
   */
  template_name?: string;

  /**
   * Template placeholders
   */
  template_variables?: Record<string, string>;

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

    /**
     * REQUIRE:
     * - message
     * OR
     * - template_name
     */

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
     * NORMALIZE PHONE
     */

    const normalizedTo = to.replace(/\s+/g, "");

    /**
     * MOCK FAILURE
     */

    if (simulate_failure) {
      return NextResponse.json(
        {
          success: false,

          message: "Failed to send MessageBird WhatsApp message",

          error_code: "MESSAGEBIRD_SEND_FAILED",
        },
        { status: 400 },
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
        process.env.MESSAGEBIRD_PHONE_NUMBER || "+15550000000";

      access_key = process.env.MESSAGE_BIRD_API_KEY || "";

      channel_id = process.env.MESSAGE_BIRD_CHANNEL_ID || "";

      /**
       * VALIDATE HOST CONFIG
       */

      if (!access_key || !channel_id) {
        return NextResponse.json(
          {
            success: false,

            message: "Incomplete host MessageBird configuration",
          },
          { status: 400 },
        );
      }
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

          provider: "MESSAGE_BIRD",
        },
      });

      /**
       * NO INTEGRATION
       */

      if (!integration) {
        return NextResponse.json(
          {
            success: false,

            message: "Doctor does not have MessageBird connected",
          },
          { status: 404 },
        );
      }

      /**
       * NOT CONNECTED
       */

      if (integration.onboarding_status !== "CONNECTED") {
        return NextResponse.json(
          {
            success: false,

            message: "Doctor MessageBird integration is not active",
          },
          { status: 400 },
        );
      }

      /**
       * VALIDATE REQUIRED CONFIG
       */

      if (!integration.access_token || !integration.metadata?.channel_id) {
        return NextResponse.json(
          {
            success: false,

            message: "Incomplete MessageBird integration configuration",
          },
          { status: 400 },
        );
      }

      senderPhoneNumber = integration.phone_number;

      access_key = integration.access_token;

      channel_id = integration.metadata?.channel_id || "";
    }

    /**
     * =====================================
     * TEMPLATE VARIABLES
     * =====================================
     */

    const variables = template_variables
      ? Object.entries(template_variables)
      : [];

    /**
     * =====================================
     * MESSAGEBIRD DOES NOT
     * NATIVELY WORK LIKE META
     * TEMPLATE PLACEHOLDERS
     *
     * So we convert template
     * variables into a clean
     * generated text message.
     * =====================================
     */

    let generatedMessage = message || "";

    if (template_name && variables.length > 0) {
      /**
       * APPOINTMENT TEMPLATE
       */

      if (template_name === "appointment_booking") {
        const doctorName = template_variables?.doctor_name || "Doctor";

        const patientName = template_variables?.patient_name || "Patient";

        const hospitalName = template_variables?.hospital_name || "Hospital";

        const patientReason = template_variables?.patient_reason || "N/A";

        const appointmentDate = template_variables?.appointment_date || "N/A";

        const appointmentTime = template_variables?.appointment_time || "N/A";

        generatedMessage = `🏥 ${hospitalName}

Hello ${doctorName},

You have a new appointment booking.

👤 Patient:
${patientName}

📝 Reason:
${patientReason}

📅 Date:
${appointmentDate}

⏰ Time:
${appointmentTime}

Please check your dashboard for more details.`;
      } else {

      /**
       * GENERIC TEMPLATE FALLBACK
       */
        generatedMessage =
          `${template_name}\n\n` +
          variables.map(([key, value]) => `${key}: ${value}`).join("\n");
      }
    }

    /**
     * =====================================
     * TEST MODE
     * =====================================
     */

    if (test) {
      const mockMessageId = `mock_msgbird_${Date.now()}`;

      console.log("MOCK MESSAGEBIRD SEND:", {
        sendby,

        from: senderPhoneNumber,

        to: normalizedTo,

        message: generatedMessage,

        template_name,

        template_variables,
      });

      return NextResponse.json(
        {
          success: true,

          mode: "TEST_MODE",

          message: "Mock MessageBird WhatsApp message sent successfully",

          data: {
            provider: "MESSAGE_BIRD",

            sendby,

            from: senderPhoneNumber,

            to: normalizedTo,

            text: generatedMessage,

            template_name: template_name || null,

            template_variables: template_variables || null,

            message_id: mockMessageId,

            timestamp: new Date(),
          },
        },
        { status: 200 },
      );
    }

    /**
     * =====================================
     * PRODUCTION STYLE SEND
     * =====================================
     */

    const payload = {
      to: normalizedTo,

      from: senderPhoneNumber,

      type: "text",

      content: {
        text: generatedMessage,
      },
    };

    const response = await fetch(
      "https://conversations.messagebird.com/v1/send",
      {
        method: "POST",

        headers: {
          Authorization: `AccessKey ${access_key}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    /**
     * OPTIONAL:
     * Save outgoing message
     * later
     */

    console.log("MESSAGEBIRD PRODUCTION SEND:", data);

    return NextResponse.json(
      {
        success: response.ok,

        mode: "PRODUCTION_STYLE",

        sendby,

        provider: "MESSAGE_BIRD",

        template_name: template_name || null,

        message: response.ok
          ? "MessageBird WhatsApp message sent successfully"
          : "MessageBird send failed",

        payload,

        messagebird_response: data,
      },
      {
        status: response.ok ? 200 : 400,
      },
    );
  } catch (err) {
    console.error("MESSAGEBIRD SEND ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to send MessageBird WhatsApp message",
      },
      { status: 500 },
    );
  }
}
