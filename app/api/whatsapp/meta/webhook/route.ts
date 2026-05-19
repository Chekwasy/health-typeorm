export const runtime = "nodejs";

import { NextResponse } from "next/server";

import dbClient from "@/lib/db";

import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

import { processMessage } from "@/lib/bot/process-message/process-message";

import { sendMetaWhatsAppMessage } from "../send-message";

/**
 * =========================================
 * META WHATSAPP WEBHOOK
 * =========================================
 *
 * Purpose:
 * - receive WhatsApp messages
 * - validate webhook
 * - process chatbot requests
 * - send AI replies
 * - handle statuses
 * =========================================
 */

export async function POST(req: Request) {
  try {
    /**
     * =====================================
     * INIT DB
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * REQUEST BODY
     * =====================================
     */

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
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * SAFE EXTRACTION
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

    const phone_number_id = value?.metadata?.phone_number_id || null;

    /**
     * =====================================
     * VALIDATE BOT NUMBER
     * =====================================
     */

    if (phone_number_id !== process.env.META_PHONE_NUMBER_ID) {
      console.warn("INVALID META PHONE NUMBER ID", {
        received: phone_number_id,

        expected: process.env.META_PHONE_NUMBER_ID,
      });

      return NextResponse.json(
        {
          success: true,

          message: "Ignored invalid phone number id",
        },
        {
          status: 200,
        },
      );
    }

    /**
     * =====================================
     * FIND INTEGRATION OWNER
     * =====================================
     */

    let integration = null;

    try {
      const integrationRepo =
        dbClient.client.getRepository(WhatsAppIntegration);

      integration = await integrationRepo.findOne({
        where: {
          provider: "META_WHATSAPP",

          phone_number_id,
        },
      });

      /**
       * LOG RESULT
       */

      console.log("META INTEGRATION:", {
        found: !!integration,

        doctor_id: integration?.doctor_id || null,
      });
    } catch (err) {
      console.error("FAILED TO LOAD META INTEGRATION", err);
    }

    /**
     * =====================================
     * INCOMING MESSAGE
     * =====================================
     */

    const incomingMessage = value?.messages?.[0];

    /**
     * PROCESS MESSAGE
     */

    if (incomingMessage) {
      /**
       * ===================================
       * BASIC DATA
       * ===================================
       */

      const from = incomingMessage.from || null;

      const type = incomingMessage.type || "text";

      const messageId = incomingMessage.id || null;

      /**
       * TEXT
       */

      const text = incomingMessage?.text?.body || "";

      /**
       * MEDIA
       */

      const image = incomingMessage?.image || null;

      const audio = incomingMessage?.audio || null;

      const video = incomingMessage?.video || null;

      const document = incomingMessage?.document || null;

      /**
       * ===================================
       * LOG MESSAGE
       * ===================================
       */

      console.log("NEW META WHATSAPP MESSAGE", {
        doctor_id: integration?.doctor_id || null,

        message_id: messageId,

        from,

        type,

        text,

        image,

        audio,

        video,

        document,
      });

      /**
       * ===================================
       * ONLY SUPPORT TEXT
       * ===================================
       */

      if (type !== "text") {
        console.warn("UNSUPPORTED META MESSAGE TYPE", {
          type,
        });

        /**
         * OPTIONAL:
         * SEND UNSUPPORTED MESSAGE
         */

        await sendMetaWhatsAppMessage({
          to: from,

          text: "Sorry, only text messages are currently supported.",
        });

        return NextResponse.json(
          {
            success: true,

            message: "Unsupported message type",
          },
          {
            status: 200,
          },
        );
      }

      /**
       * ===================================
       * EMPTY TEXT
       * ===================================
       */

      if (!text?.trim()) {
        return NextResponse.json(
          {
            success: true,

            message: "Empty message ignored",
          },
          {
            status: 200,
          },
        );
      }

      /**
       * ===================================
       * BUILD BOT USER ID
       * ===================================
       */

      const user_id = `meta:${from}`;

      /**
       * ===================================
       * PROCESS BOT MESSAGE
       * ===================================
       */

      let botResult: {
        success: boolean;

        reply?: string;
      };

      try {
        botResult = await processMessage({
          user_id,

          message: text,

          channel: "META_WHATSAPP",
        });

        /**
         * LOG BOT RESPONSE
         */

        console.log("META BOT RESPONSE", {
          user_id,

          success: botResult.success,

          reply: botResult.reply,
        });
      } catch (err) {
        console.error("META BOT PROCESSING ERROR", err);

        botResult = {
          success: false,

          reply: "Sorry, something went wrong while processing your request.",
        };
      }

      /**
       * ===================================
       * SEND WHATSAPP REPLY
       * ===================================
       */

      try {
        await sendMetaWhatsAppMessage({
          to: from,

          text: botResult.reply || "Sorry, I could not process your request.",
        });

        console.log("META WHATSAPP REPLY SENT", {
          to: from,
        });
      } catch (err) {
        console.error("FAILED TO SEND META REPLY", err);
      }
    }

    /**
     * =====================================
     * DELIVERY STATUS
     * =====================================
     */

    const status = value?.statuses?.[0];

    /**
     * STATUS EXISTS
     */

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
        console.log("META MESSAGE DELIVERED", {
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          timestamp,
        });
      } else if (isPending) {

      /**
       * PENDING
       */
        console.log("META MESSAGE PENDING", {
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          timestamp,
        });
      } else if (isFailure) {

      /**
       * FAILURE
       */
        console.error("META MESSAGE FAILED", {
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          error_code: errorCode,

          error_title: errorTitle,

          error_message: errorMessage,

          timestamp,
        });
      } else {

      /**
       * UNKNOWN
       */
        console.warn("UNKNOWN META STATUS", {
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
      {
        status: 200,
      },
    );
  } catch (err) {
    /**
     * =====================================
     * ERROR HANDLING
     * =====================================
     */

    console.error("META WEBHOOK POST ERROR", err);

    return NextResponse.json(
      {
        success: false,

        message: "Webhook processing failed",
      },
      {
        status: 500,
      },
    );
  }
}
