import axios from "axios";

/**
 * =========================================
 * SEND META WHATSAPP MESSAGE
 * =========================================
 *
 * Purpose:
 * - send WhatsApp message
 *   through Meta Cloud API
 * - supports text replies
 * - reusable helper
 * =========================================
 */

export async function sendMetaWhatsAppMessage({
  to,

  text,
}: {
  to: string;

  text: string;
}) {
  try {
    /**
     * =====================================
     * ENV VARIABLES
     * =====================================
     */

    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;

    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

    /**
     * VALIDATION
     */

    if (!accessToken) {
      throw new Error("Missing META_WHATSAPP_ACCESS_TOKEN");
    }

    if (!phoneNumberId) {
      throw new Error("Missing META_PHONE_NUMBER_ID");
    }

    /**
     * =====================================
     * CLEAN NUMBER
     * =====================================
     *
     * Remove:
     * +
     * spaces
     * dashes
     * =====================================
     */

    const cleanTo = to.replace(/[^0-9]/g, "");

    /**
     * =====================================
     * REQUEST PAYLOAD
     * =====================================
     */

    const payload = {
      messaging_product: "whatsapp",

      recipient_type: "individual",

      to: cleanTo,

      type: "text",

      text: {
        preview_url: false,

        body: text,
      },
    };

    /**
     * =====================================
     * SEND REQUEST
     * =====================================
     */

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,

          "Content-Type": "application/json",
        },
      },
    );

    /**
     * =====================================
     * LOG SUCCESS
     * =====================================
     */

    console.log("META WHATSAPP MESSAGE SENT", {
      to: cleanTo,

      response: response.data,
    });

    /**
     * RETURN SUCCESS
     */

    return {
      success: true,

      data: response.data,
    };
  } catch (err: any) {
    /**
     * =====================================
     * ERROR HANDLING
     * =====================================
     */

    console.error(
      "META SEND MESSAGE ERROR",
      err?.response?.data || err.message || err,
    );

    /**
     * RETURN FAILURE
     */

    return {
      success: false,

      error:
        err?.response?.data || err.message || "Failed to send WhatsApp message",
    };
  }
}
