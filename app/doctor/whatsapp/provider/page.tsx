"use client";

import Nav from "@/app/components/nav";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  MessageCircleMore,
  Bird,
  RefreshCw,
  ShieldCheck,
  Database,
  Settings2,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ProviderResponse {
  success: boolean;

  provider: "MESSAGE_BIRD" | "META_WHATSAPP";

  provider_source: "USE_ENV" | "USE_DB";

  available_providers: string[];

  meta_enabled: boolean;

  messagebird_enabled: boolean;

  mock_mode: boolean;
}

export default function WhatsAppProviderPage() {
  const [loading, setLoading] = useState(true);

  const [switching, setSwitching] = useState(false);

  const [providerData, setProviderData] = useState<ProviderResponse | null>(
    null,
  );

  async function fetchProvider() {
    try {
      setLoading(true);

      const res = await fetch("/api/whatsapp/provider");

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch provider");
      }

      setProviderData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load provider");
    } finally {
      setLoading(false);
    }
  }

  async function switchProvider(provider: "MESSAGE_BIRD" | "META_WHATSAPP") {
    try {
      setSwitching(true);

      const res = await fetch("/api/whatsapp/provider", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to switch provider");
      }

      toast.success(data.message);

      fetchProvider();
    } catch (err: any) {
      toast.error(err.message || "Failed to switch provider");
    } finally {
      setSwitching(false);
    }
  }

  useEffect(() => {
    fetchProvider();
  }, []);

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.92), rgba(5,15,30,0.96)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-10 text-white">
        {/* HERO */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 border border-green-500/20 px-4 py-2 rounded-full text-sm mb-5">
            <Settings2 size={16} />
            WhatsApp Integration
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            WhatsApp Provider
            <span className="text-green-400"> Settings</span>
          </h1>

          <p className="text-gray-300 max-w-2xl mx-auto text-lg leading-relaxed">
            Dynamically switch between MessageBird and Meta WhatsApp
            integrations for appointment messaging and notification handling.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-green-400" size={40} />
          </div>
        ) : (
          <>
            {/* STATUS BAR */}
            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 mb-10 backdrop-blur">
              <div className="grid md:grid-cols-4 gap-5">
                {/* ACTIVE */}
                <div className="bg-black/20 rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="text-green-400" size={22} />

                    <h3 className="font-semibold">Active Provider</h3>
                  </div>

                  <p className="text-xl font-bold">
                    {providerData?.provider === "META_WHATSAPP"
                      ? "Meta WhatsApp"
                      : "MessageBird"}
                  </p>
                </div>

                {/* SOURCE */}
                <div className="bg-black/20 rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="text-blue-400" size={22} />

                    <h3 className="font-semibold">Provider Source</h3>
                  </div>

                  <p className="text-xl font-bold">
                    {providerData?.provider_source}
                  </p>
                </div>

                {/* MOCK MODE */}
                <div className="bg-black/20 rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <ShieldCheck className="text-yellow-400" size={22} />

                    <h3 className="font-semibold">Mock Mode</h3>
                  </div>

                  <p className="text-xl font-bold">
                    {providerData?.mock_mode ? "Enabled" : "Disabled"}
                  </p>
                </div>

                {/* REFRESH */}
                <div className="bg-black/20 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center gap-3 mb-3">
                    <RefreshCw className="text-purple-400" size={22} />

                    <h3 className="font-semibold">Refresh</h3>
                  </div>

                  <button
                    onClick={fetchProvider}
                    className="bg-white/10 hover:bg-white/20 transition rounded-xl py-2 text-sm"
                  >
                    Reload Settings
                  </button>
                </div>
              </div>
            </div>

            {/* PROVIDERS */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* MESSAGEBIRD */}
              <div
                className={`rounded-3xl p-7 backdrop-blur border transition ${
                  providerData?.provider === "MESSAGE_BIRD"
                    ? "bg-blue-500/10 border-blue-500/40"
                    : "bg-white/10 border-white/10"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <Bird size={32} className="text-blue-400" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">MessageBird</h2>

                  {providerData?.provider === "MESSAGE_BIRD" && (
                    <span className="bg-green-500/20 text-green-300 border border-green-500/20 px-3 py-1 rounded-full text-xs">
                      ACTIVE
                    </span>
                  )}
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  MessageBird WhatsApp provider with mock onboarding,
                  production-style messaging, webhook handling and scalable
                  provider support.
                </p>

                {/* FEATURES */}
                <div className="space-y-3 mb-8">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Mock onboarding flow
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />

                    <p className="text-sm text-gray-300">Webhook support</p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Production-style sending
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Future extensible architecture
                    </p>
                  </div>
                </div>

                <button
                  disabled={
                    switching || providerData?.provider === "MESSAGE_BIRD"
                  }
                  onClick={() => switchProvider("MESSAGE_BIRD")}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-2xl py-4 font-semibold"
                >
                  {switching
                    ? "Switching..."
                    : providerData?.provider === "MESSAGE_BIRD"
                      ? "Currently Active"
                      : "Switch to MessageBird"}
                </button>
              </div>

              {/* META */}
              <div
                className={`rounded-3xl p-7 backdrop-blur border transition ${
                  providerData?.provider === "META_WHATSAPP"
                    ? "bg-green-500/10 border-green-500/40"
                    : "bg-white/10 border-white/10"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
                  <MessageCircleMore size={32} className="text-green-400" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Meta WhatsApp</h2>

                  {providerData?.provider === "META_WHATSAPP" && (
                    <span className="bg-green-500/20 text-green-300 border border-green-500/20 px-3 py-1 rounded-full text-xs">
                      ACTIVE
                    </span>
                  )}
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  Meta WhatsApp Cloud API integration with embedded signup
                  architecture, webhook verification and scalable onboarding
                  support.
                </p>

                {/* FEATURES */}
                <div className="space-y-3 mb-8">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Embedded signup support
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Webhook verification
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Production-style Cloud API
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />

                    <p className="text-sm text-gray-300">
                      Future production ready
                    </p>
                  </div>
                </div>

                <button
                  disabled={
                    switching || providerData?.provider === "META_WHATSAPP"
                  }
                  onClick={() => switchProvider("META_WHATSAPP")}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-2xl py-4 font-semibold"
                >
                  {switching
                    ? "Switching..."
                    : providerData?.provider === "META_WHATSAPP"
                      ? "Currently Active"
                      : "Switch to Meta WhatsApp"}
                </button>
              </div>
            </div>

            {/* INFO */}
            <div className="mt-10 bg-white/10 border border-white/10 rounded-3xl p-6">
              <h3 className="font-semibold text-xl mb-3">Important Notes</h3>

              <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
                <p>
                  • If provider source is
                  <span className="text-green-400 font-semibold"> USE_ENV</span>
                  , provider changes from this page will not persist until
                  environment variables are updated.
                </p>

                <p>
                  • If provider source is
                  <span className="text-green-400 font-semibold"> USE_DB</span>,
                  provider switching updates the database configuration in real
                  time.
                </p>

                <p>
                  • Mock mode allows safe testing without real provider
                  credentials or live WhatsApp business accounts.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
