import axios from "axios";

/**
 * =========================================
 * SEND MESSAGEBIRD WHATSAPP MESSAGE
 * =========================================
 */

export async function sendMessageBirdMessage({
  to,

  text,
}: {
  to: string;

  text: string;
}) {
  try {
    /**
     * =====================================
     * ENV
     * =====================================
     */

    const accessKey = process.env.MESSAGE_BIRD_API_KEY;

    const channelId = process.env.MESSAGE_BIRD_CHANNEL_ID;

    const from = process.env.MESSAGEBIRD_PHONE_NUMBER;

    /**
     * VALIDATION
     */

    if (!accessKey) {
      throw new Error("Missing MESSAGE_BIRD_API_KEY");
    }

    if (!channelId) {
      throw new Error("Missing MESSAGE_BIRD_CHANNEL_ID");
    }

    if (!from) {
      throw new Error("Missing MESSAGEBIRD_PHONE_NUMBER");
    }

    /**
     * =====================================
     * REQUEST
     * =====================================
     */

    const payload = {
      to,

      from,

      type: "text",

      content: {
        text,
      },
    };

    /**
     * =====================================
     * SEND REQUEST
     * =====================================
     */

    const response = await axios.post(
      `https://conversations.messagebird.com/v1/send`,
      payload,
      {
        headers: {
          Authorization: `AccessKey ${accessKey}`,

          "Content-Type": "application/json",

          Accept: "application/json",
        },
      },
    );

    /**
     * =====================================
     * LOG SUCCESS
     * =====================================
     */

    console.log("MESSAGEBIRD MESSAGE SENT", {
      to,

      response: response.data,
    });

    /**
     * RETURN RESPONSE
     */

    return {
      success: true,

      data: response.data,
    };
  } catch (err: any) {
    /**
     * =====================================
     * ERROR
     * =====================================
     */

    console.error(
      "MESSAGEBIRD SEND ERROR",
      err?.response?.data || err.message || err,
    );

    return {
      success: false,

      error: err?.response?.data || err.message || "Failed to send message",
    };
  }
}
