export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbClient from "@/lib/db";
import { Setting } from "@/entities/Settings";

const ALLOWED_PROVIDERS = ["MESSAGE_BIRD", "META_WHATSAPP"] as const;

type Provider = (typeof ALLOWED_PROVIDERS)[number];

type ProviderSource = "USE_ENV" | "USE_DB";

/**
 * =========================================
 * GET CURRENT PROVIDER
 * =========================================
 */

export async function GET() {
  try {
    await dbClient.init();

    const settingsRepo = dbClient.client.getRepository(Setting);

    /**
     * =====================================
     * GET SETTINGS
     * =====================================
     */

    let settings = await settingsRepo.findOne({
      where: {},
    });

    /**
     * =====================================
     * ENV SOURCE
     * =====================================
     */

    const envProviderSource =
      (process.env.WHATSAPP_PROVIDER_SOURCE as ProviderSource) || "USE_ENV";

    /**
     * =====================================
     * ENV PROVIDER
     * =====================================
     */

    const envProvider =
      (process.env.WHATSAPP_PROVIDER as Provider) || "MESSAGE_BIRD";

    /**
     * =====================================
     * CREATE DEFAULT SETTINGS
     * =====================================
     */

    if (!settings) {
      settings = settingsRepo.create({
        provider_source: envProviderSource,

        whatsapp_provider: envProvider,

        enable_meta_whatsapp: true,

        enable_messagebird: true,

        enable_mock_mode: true,
      });

      await settingsRepo.save(settings);
    }

    /**
     * =====================================
     * IMPORTANT
     *
     * SYNC DB SOURCE WITH ENV SOURCE
     *
     * If .env says:
     * - USE_ENV
     * - USE_DB
     *
     * Then DB should match.
     * =====================================
     */

    let updated = false;

    if (settings.provider_source !== envProviderSource) {
      settings.provider_source = envProviderSource;

      updated = true;
    }

    /**
     * =====================================
     * IF SOURCE IS USE_ENV
     *
     * DB provider should follow .env
     * =====================================
     */

    if (
      settings.provider_source === "USE_ENV" &&
      settings.whatsapp_provider !== envProvider
    ) {
      settings.whatsapp_provider = envProvider;

      updated = true;
    }

    /**
     * SAVE CHANGES
     */

    if (updated) {
      await settingsRepo.save(settings);
    }

    /**
     * =====================================
     * DETERMINE ACTIVE PROVIDER
     * =====================================
     */

    const activeProvider =
      settings.provider_source === "USE_DB"
        ? settings.whatsapp_provider
        : envProvider;

    return NextResponse.json(
      {
        success: true,

        provider: activeProvider,

        provider_source: settings.provider_source,

        available_providers: ALLOWED_PROVIDERS,

        meta_enabled: settings.enable_meta_whatsapp,

        messagebird_enabled: settings.enable_messagebird,

        mock_mode: settings.enable_mock_mode,

        settings: {
          provider: settings.whatsapp_provider,

          provider_source: settings.provider_source,
        },

        env: {
          provider: envProvider,

          provider_source: envProviderSource,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET PROVIDER ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to fetch provider",
      },
      { status: 500 },
    );
  }
}

/**
 * =========================================
 * SWITCH PROVIDER
 * =========================================
 */

export async function POST(req: Request) {
  try {
    await dbClient.init();

    const body = await req.json();

    /**
     * FRONTEND:
     * MESSAGE_BIRD | META_WHATSAPP
     */

    const provider = body.provider as Provider;

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          success: false,

          message: "Invalid provider",
        },
        { status: 400 },
      );
    }

    const settingsRepo = dbClient.client.getRepository(Setting);

    /**
     * =====================================
     * GET SETTINGS
     * =====================================
     */

    let settings = await settingsRepo.findOne({
      where: {},
    });

    /**
     * =====================================
     * ENV SOURCE
     * =====================================
     */

    const envProviderSource =
      (process.env.WHATSAPP_PROVIDER_SOURCE as ProviderSource) || "USE_ENV";

    /**
     * =====================================
     * ENV PROVIDER
     * =====================================
     */

    const envProvider =
      (process.env.WHATSAPP_PROVIDER as Provider) || "MESSAGE_BIRD";

    /**
     * =====================================
     * CREATE SETTINGS IF MISSING
     * =====================================
     */

    if (!settings) {
      settings = settingsRepo.create({
        provider_source: envProviderSource,

        whatsapp_provider: envProvider,

        enable_meta_whatsapp: true,

        enable_messagebird: true,

        enable_mock_mode: true,
      });

      await settingsRepo.save(settings);
    }

    /**
     * =====================================
     * IMPORTANT
     *
     * ENSURE DB SOURCE MATCHES ENV
     * =====================================
     */

    if (settings.provider_source !== envProviderSource) {
      settings.provider_source = envProviderSource;
    }

    /**
     * =====================================
     * FEATURE CHECKS
     * =====================================
     */

    if (provider === "META_WHATSAPP" && !settings.enable_meta_whatsapp) {
      return NextResponse.json(
        {
          success: false,

          message: "Meta WhatsApp disabled",
        },
        { status: 403 },
      );
    }

    if (provider === "MESSAGE_BIRD" && !settings.enable_messagebird) {
      return NextResponse.json(
        {
          success: false,

          message: "MessageBird disabled",
        },
        { status: 403 },
      );
    }

    /**
     * =====================================
     * UPDATE DB PROVIDER
     * =====================================
     *
     * Frontend decides:
     * - MESSAGE_BIRD
     * - META_WHATSAPP
     */

    settings.whatsapp_provider = provider;

    /**
     * =====================================
     * SAVE SETTINGS
     * =====================================
     */

    await settingsRepo.save(settings);

    /**
     * =====================================
     * ACTIVE PROVIDER
     * =====================================
     */

    const activeProvider =
      settings.provider_source === "USE_DB"
        ? settings.whatsapp_provider
        : envProvider;

    return NextResponse.json(
      {
        success: true,

        message: `Provider switched to ${provider}`,

        provider_source: settings.provider_source,

        active_provider: activeProvider,

        settings: {
          provider: settings.whatsapp_provider,

          provider_source: settings.provider_source,

          meta_enabled: settings.enable_meta_whatsapp,

          messagebird_enabled: settings.enable_messagebird,

          mock_mode: settings.enable_mock_mode,
        },

        env: {
          provider: envProvider,

          provider_source: envProviderSource,
        },

        note:
          settings.provider_source === "USE_DB"
            ? "Database provider is active"
            : "Environment provider is active",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("SWITCH PROVIDER ERROR:", err);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to switch provider",
      },
      { status: 500 },
    );
  }
}
