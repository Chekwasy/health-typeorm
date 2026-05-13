export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

export async function POST(req: Request) {
  try {
    await dbClient.init();

    const body = await req.json();

    /**
     * =====================================
     * LOG RAW PAYLOAD
     * =====================================
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
     * =====================================
     * PHONE NUMBER ID
     * =====================================
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
       * TEXT
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
     * DELIVERY STATUS
     * =====================================
     */

    const status = value?.statuses?.[0];

    if (status) {
      /**
       * NORMALIZE STATUS
       */

      const normalizedStatus = String(status?.status).toUpperCase();

      /**
       * COMMON DETAILS
       */

      const messageId = status?.id || null;

      const recipient = status?.recipient_id || null;

      const timestamp = status?.timestamp || new Date().toISOString();

      /**
       * META ERRORS
       */

      const errorCode = status?.errors?.[0]?.code || null;

      const errorTitle = status?.errors?.[0]?.title || null;

      const errorMessage = status?.errors?.[0]?.message || null;

      /**
       * STATUS FLAGS
       */

      const isDelivered = ["DELIVERED", "READ"].includes(normalizedStatus);

      const isPending = ["SENT", "ACCEPTED", "PENDING"].includes(
        normalizedStatus,
      );

      const isFailure = ["FAILED", "REJECTED", "UNDELIVERABLE"].includes(
        normalizedStatus,
      );

      /**
       * DELIVERED
       */

      if (isDelivered) {
        console.log("META MESSAGE DELIVERED:");

        console.log({
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          timestamp,
        });

        /**
         * FUTURE:
         * - analytics
         * - delivery tracking
         * - dashboard updates
         */
      } else if (isPending) {

      /**
       * PENDING
       */
        console.log("META MESSAGE PENDING:");

        console.log({
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          timestamp,
        });
      } else if (isFailure) {

      /**
       * FAILED
       */
        console.error("META MESSAGE FAILED:");

        console.error({
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          error_code: errorCode,

          error_title: errorTitle,

          error_message: errorMessage,

          timestamp,
        });

        /**
         * FUTURE:
         * - retries
         * - alerting
         * - admin notifications
         * - failed delivery DB tracking
         */
      } else {

      /**
       * UNKNOWN
       */
        console.warn("UNKNOWN META STATUS:");

        console.warn({
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          timestamp,
        });
      }
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
