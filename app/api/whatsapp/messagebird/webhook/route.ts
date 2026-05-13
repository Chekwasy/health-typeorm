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

    console.log("MESSAGEBIRD WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    /**
     * =====================================
     * EXTRACT CHANNEL ID
     * =====================================
     */

    const channel_id =
      body?.channelId ||
      body?.channel_id ||
      body?.message?.channelId ||
      body?.message?.channel_id ||
      null;

    /**
     * =====================================
     * FIND OWNER DOCTOR
     * =====================================
     */

    let integration = null;

    if (channel_id) {
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

      if (integration) {
        console.log("MESSAGEBIRD WEBHOOK OWNER FOUND:", {
          doctor_id: integration.doctor_id,

          provider: integration.provider,
        });
      } else {
        console.warn(
          "NO MESSAGEBIRD INTEGRATION FOUND FOR CHANNEL:",
          channel_id,
        );
      }
    }

    /**
     * =====================================
     * INCOMING MESSAGE
     * =====================================
     */

    const message = body?.message;

    if (message) {
      const type = message?.type || "text";

      /**
       * TEXT
       */

      const text = message?.content?.text || null;

      /**
       * MEDIA
       */

      const image = message?.content?.image || null;

      const audio = message?.content?.audio || null;

      const video = message?.content?.video || null;

      const document = message?.content?.document || null;

      console.log("NEW MESSAGEBIRD MESSAGE:");

      console.log({
        doctor_id: integration?.doctor_id || null,

        id: message.id,

        from: message.from,

        to: message.to,

        type,

        text,

        image,

        audio,

        video,

        document,
      });

      /**
       * FUTURE:
       * - save messages
       * - doctor notifications
       * - chatbot
       * - analytics
       * - live dashboard
       */
    }

    /**
     * =====================================
     * DELIVERY STATUS
     * =====================================
     */

    const status = body?.status || body?.message?.status || null;

    if (status) {
      /**
       * NORMALIZE STATUS
       */

      const normalizedStatus = String(status).toUpperCase();

      /**
       * COMMON DETAILS
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
        console.log("MESSAGEBIRD MESSAGE DELIVERED:");

        console.log({
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
        console.log("MESSAGEBIRD MESSAGE PENDING:");

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
        console.error("MESSAGEBIRD MESSAGE FAILED:");

        console.error({
          doctor_id: integration?.doctor_id || null,

          message_id: messageId,

          recipient,

          status: normalizedStatus,

          error_code: errorCode,

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
        console.warn("UNKNOWN MESSAGEBIRD STATUS:");

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
    console.error("MESSAGEBIRD WEBHOOK POST ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}
