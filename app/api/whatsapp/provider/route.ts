export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { Setting } from "@/entities/Settings";

const ALLOWED_PROVIDERS = [
  "MESSAGE_BIRD",
  "META_WHATSAPP",
] as const;

type Provider =
  (typeof ALLOWED_PROVIDERS)[number];

// GET CURRENT PROVIDER
export async function GET() {
  try {
    await dbClient.init();

    const settingsRepo =
      dbClient.client.getRepository(
        Setting
      );

    // GET FIRST SETTINGS ROW
    let settings =
      await settingsRepo.findOne({
        where: {},
      });

    // AUTO CREATE DEFAULT SETTINGS
    if (!settings) {
      settings = settingsRepo.create({
        provider_source: "USE_ENV",
        whatsapp_provider:
          "META_WHATSAPP",

        enable_meta_whatsapp: true,
        enable_messagebird: true,
        enable_mock_mode: true,
      });

      await settingsRepo.save(
        settings
      );
    }

    let provider: Provider;

    // DETERMINE SOURCE
    if (
      settings.provider_source ===
      "USE_DB"
    ) {
      provider =
        settings.whatsapp_provider;
    } else {
      provider =
        (process.env
          .WHATSAPP_PROVIDER as Provider) ||
        "META_WHATSAPP";
    }

    return NextResponse.json(
      {
        success: true,

        provider,

        provider_source:
          settings.provider_source,

        available_providers:
          ALLOWED_PROVIDERS,

        meta_enabled:
          settings.enable_meta_whatsapp,

        messagebird_enabled:
          settings.enable_messagebird,

        mock_mode:
          settings.enable_mock_mode,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "GET PROVIDER ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch provider",
      },
      { status: 500 }
    );
  }
}

// SWITCH PROVIDER
export async function POST(
  req: Request
) {
  try {
    await dbClient.init();

    const body = await req.json();

    const provider =
      body.provider as Provider;

    if (
      !provider ||
      !ALLOWED_PROVIDERS.includes(
        provider
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid provider",
        },
        { status: 400 }
      );
    }

    const settingsRepo =
      dbClient.client.getRepository(
        Setting
      );

    // GET SETTINGS
    let settings =
      await settingsRepo.findOne({
        where: {},
      });

    // CREATE DEFAULT IF MISSING
    if (!settings) {
      settings = settingsRepo.create({
        provider_source: "USE_ENV",
        whatsapp_provider:
          "META_WHATSAPP",

        enable_meta_whatsapp: true,
        enable_messagebird: true,
        enable_mock_mode: true,
      });
    }

    // FEATURE CHECKS
    if (
      provider ===
        "META_WHATSAPP" &&
      !settings.enable_meta_whatsapp
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Meta WhatsApp disabled",
        },
        { status: 403 }
      );
    }

    if (
      provider ===
        "MESSAGE_BIRD" &&
      !settings.enable_messagebird
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "MessageBird disabled",
        },
        { status: 403 }
      );
    }

    /**
     * IMPORTANT
     *
     * Only save provider switch
     * when using DB mode.
     */

    if (
      settings.provider_source ===
      "USE_DB"
    ) {
      settings.whatsapp_provider =
        provider;

      await settingsRepo.save(
        settings
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          settings.provider_source ===
          "USE_DB"
            ? `Provider switched to ${provider}`
            : "Provider source is USE_ENV. Update .env to change provider.",

        provider_source:
          settings.provider_source,

        active_provider:
          settings.provider_source ===
          "USE_DB"
            ? provider
            : process.env
                .WHATSAPP_PROVIDER ||
              "META_WHATSAPP",

        note:
          settings.provider_source ===
          "USE_DB"
            ? "Provider updated from database settings"
            : "Environment variables currently control provider selection",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "SWITCH PROVIDER ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to switch provider",
      },
      { status: 500 }
    );
  }
}