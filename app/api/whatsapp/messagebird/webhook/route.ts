export const runtime = "nodejs";

import { NextResponse } from "next/server";

import dbClient from "@/lib/db";

import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";

import { processMessage } from "@/lib/bot/process-message/process-message";

import { sendMessageBirdMessage } from "../send-message";

/**
 * =========================================
 * MESSAGEBIRD WEBHOOK
 * =========================================
 *
 * Purpose:
 * - receive WhatsApp messages
 * - validate bot channel
 * - process chatbot requests
 * - handle statuses
 * - prepare outbound replies
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

    console.log("MESSAGEBIRD WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    /**
     * =====================================
     * EXTRACT MESSAGE
     * =====================================
     */

    const message = body?.message || null;

    /**
     * =====================================
     * EXTRACT CHANNEL ID
     * =====================================
     */

    const channel_id =
      body?.channelId ||
      body?.channel_id ||
      message?.channelId ||
      message?.channel_id ||
      null;

    /**
     * =====================================
     * VALIDATE BOT CHANNEL
     * =====================================
     */

    const validChannel = channel_id === process.env.MESSAGE_BIRD_CHANNEL_ID;

    /**
     * INVALID CHANNEL
     */

    if (!validChannel) {
      console.warn("INVALID MESSAGEBIRD CHANNEL", {
        received: channel_id,

        expected: process.env.MESSAGE_BIRD_CHANNEL_ID,
      });

      return NextResponse.json(
        {
          success: true,

          message: "Ignored invalid channel",
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

      integration = await integrationRepo
        .createQueryBuilder("integration")
        .where("integration.provider = :provider", {
          provider: "MESSAGE_BIRD",
        })
        .andWhere(`integration.metadata ->> 'channel_id' = :channel_id`, {
          channel_id,
        })
        .getOne();

      /**
       * LOG RESULT
       */

      console.log("WHATSAPP INTEGRATION:", {
        found: !!integration,

        doctor_id: integration?.doctor_id || null,
      });
    } catch (err) {
      console.error("FAILED TO LOAD WHATSAPP INTEGRATION", err);
    }

    /**
     * =====================================
     * HANDLE MESSAGE EVENTS
     * =====================================
     */

    if (message) {
      /**
       * ===================================
       * BASIC MESSAGE DATA
       * ===================================
       */

      const type = message?.type || "text";

      const text = message?.content?.text || "";

      const from = message?.from || null;

      const to = message?.to || null;

      const messageId = message?.id || null;

      /**
       * ===================================
       * MEDIA
       * ===================================
       */

      const image = message?.content?.image || null;

      const audio = message?.content?.audio || null;

      const video = message?.content?.video || null;

      const document = message?.content?.document || null;

      /**
       * ===================================
       * LOG MESSAGE
       * ===================================
       */

      console.log("INCOMING WHATSAPP MESSAGE", {
        doctor_id: integration?.doctor_id || null,

        message_id: messageId,

        from,

        to,

        type,

        text,

        image,

        audio,

        video,

        document,
      });

      /**
       * ===================================
       * VALIDATE RECIPIENT
       * ===================================
       */

      const isBotRecipient = to === process.env.MESSAGEBIRD_PHONE_NUMBER;

      /**
       * NOT FOR BOT
       */

      if (!isBotRecipient) {
        console.warn("MESSAGE NOT FOR BOT NUMBER", {
          to,

          expected: process.env.MESSAGEBIRD_PHONE_NUMBER,
        });

        return NextResponse.json(
          {
            success: true,

            message: "Ignored non-bot recipient",
          },
          {
            status: 200,
          },
        );
      }

      /**
       * ===================================
       * ONLY SUPPORT TEXT
       * ===================================
       */

      if (type !== "text") {
        console.warn("UNSUPPORTED MESSAGE TYPE", {
          type,
        });

        /**
         * FUTURE:
         * Send media unsupported reply.
         */

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
       *
       * WhatsApp users are not
       * authenticated platform users.
       * ===================================
       */

      const user_id = `whatsapp:${from}`;

      /**
       * ===================================
       * PROCESS BOT MESSAGE
       * ===================================
       */

      let botResult;

      try {
        botResult = await processMessage({
          user_id,

          message: text,

          channel: "MESSAGE_BIRD",
        });

        /**
         * LOG BOT RESULT
         */

        console.log("BOT RESPONSE GENERATED", {
          user_id,

          success: botResult.success,

          reply: botResult.reply,
        });
      } catch (err) {
        console.error("BOT PROCESSING FAILED", err);

        botResult = {
          success: false,

          reply: "Sorry, something went wrong while processing your request.",
        };
      }

      /**
       * ===================================
       * SEND REPLY
       * ===================================
       *
       * FUTURE:
       * Replace with actual
       * MessageBird sender.
       * ===================================
       */

      console.log("WHATSAPP BOT REPLY", {
        to: from,

        reply: botResult.reply,
      });

      /**
       * ===================================
       * SEND WHATSAPP REPLY
       * ===================================
       */

      await sendMessageBirdMessage({
        to: from,

        text: botResult.reply || "Sorry, I could not process your request.",
      });
    }

    /**
     * =====================================
     * DELIVERY STATUS EVENTS
     * =====================================
     */

    const status = body?.status || body?.message?.status || null;

    /**
     * STATUS EXISTS
     */

    if (status) {
      const normalizedStatus = String(status).toUpperCase();

      /**
       * COMMON DATA
       */

      const messageId = body?.id || body?.message?.id || null;

      const recipient = body?.to || body?.message?.to || null;

      const timestamp =
        body?.createdDatetime ||
        body?.message?.createdDatetime ||
        new Date().toISOString();

      /**
       * PROVIDER ERRORS
       */

      const errorCode = body?.error?.code || body?.errors?.[0]?.code || null;

      const errorMessage =
        body?.error?.message ||
        body?.errors?.[0]?.description ||
        body?.errors?.[0]?.message ||
        null;

      /**
       * STATUS FLAGS
       */

      const isDelivered = ["DELIVERED", "READ"].includes(normalizedStatus);

      const isPending = ["SENT", "QUEUED", "PENDING"].includes(
        normalizedStatus,
      );

      const isFailure = [
        "FAILED",
        "REJECTED",
        "EXPIRED",
        "UNDELIVERED",
      ].includes(normalizedStatus);

      /**
       * DELIVERED
       */

      if (isDelivered) {
        console.log("MESSAGE DELIVERED", {
          recipient,

          message_id: messageId,

          status: normalizedStatus,

          timestamp,
        });
      } else if (isPending) {
        /**
         * PENDING
         */
        console.log("MESSAGE PENDING", {
          recipient,

          message_id: messageId,

          status: normalizedStatus,

          timestamp,
        });
      } else if (isFailure) {
        /**
         * FAILURE
         */
        console.error("MESSAGE DELIVERY FAILED", {
          recipient,

          message_id: messageId,

          status: normalizedStatus,

          errorCode,

          errorMessage,

          timestamp,
        });
      } else {
        /**
         * UNKNOWN
         */
        console.warn("UNKNOWN MESSAGE STATUS", {
          recipient,

          message_id: messageId,

          status: normalizedStatus,
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

    console.error("MESSAGEBIRD WEBHOOK ERROR", err);

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
