"use client";

import Nav from "@/app/components/nav";
import { useEffect, useState, FormEvent } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  Loader2,
  MessageCircle,
  CheckCircle2,
  Building2,
  Phone,
  ShieldCheck,
  Radio,
} from "lucide-react";

type Provider = "META_WHATSAPP" | "MESSAGE_BIRD";

export default function WhatsAppSignupPage() {
  const [provider, setProvider] = useState<Provider | null>(null);

  const [providerSource, setProviderSource] = useState("");

  const [businessName, setBusinessName] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);

  /**
   * =====================================
   * FETCH ACTIVE PROVIDER
   * =====================================
   */

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await axios.get("/api/whatsapp/provider");

        setProvider(res.data.provider);

        setProviderSource(res.data.provider_source);
      } catch (err) {
        toast.error("Failed to load provider");
      } finally {
        setPageLoading(false);
      }
    };

    fetchProvider();
  }, []);

  /**
   * =====================================
   * SUBMIT
   * =====================================
   */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!businessName || !phoneNumber) {
      toast.error("Please fill all fields");

      return;
    }

    if (phoneNumber.replace(/\s+/g, "").length < 7) {
      toast.error("Invalid phone number");

      return;
    }

    if (!provider) {
      toast.error("Provider unavailable");

      return;
    }

    try {
      setLoading(true);

      const token = Cookies.get("access_token");

      if (!token) {
        toast.error("Unauthorized");

        return;
      }

      const loadingToast = toast.loading("Connecting WhatsApp...");

      /**
       * DYNAMIC ROUTE
       */

      const endpoint =
        provider === "META_WHATSAPP"
          ? "/api/whatsapp/meta/signup"
          : "/api/whatsapp/messagebird/signup";

      const res = await axios.post(
        endpoint,
        {
          business_name: businessName,

          phone_number: phoneNumber,

          simulate_failure: false, // Set to true to simulate a failure response from the provider

          /**
           * REMOVE LATER
           */
          test: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success(res.data.message || "WhatsApp connected successfully", {
        id: loadingToast,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  /**
   * =====================================
   * LOADING SCREEN
   * =====================================
   */

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#071120] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin" />

          <span>Loading provider...</span>
        </div>
      </div>
    );
  }

  const isMeta = provider === "META_WHATSAPP";

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.88), rgba(5,15,30,0.96)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="pt-24 pb-12 px-4 flex justify-center">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8">
          {/* =====================================
              LEFT EDUCATIVE SECTION
          ===================================== */}

          <div className="bg-white/10 border border-white/10 backdrop-blur-md rounded-3xl p-8 text-white">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6 ${
                isMeta
                  ? "bg-green-500/20 text-green-300 border border-green-500/20"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/20"
              }`}
            >
              <Radio size={16} />
              Active Provider: {isMeta ? "Meta WhatsApp" : "MessageBird"}
            </div>

            <h1 className="text-4xl font-bold mb-5 leading-tight">
              Connect Your WhatsApp Business
            </h1>

            <p className="text-gray-300 leading-relaxed text-lg mb-8">
              Integrate your healthcare WhatsApp communication to receive
              appointment notifications, patient interactions and business
              messaging directly from your dashboard.
            </p>

            {/* BENEFITS */}
            <div className="space-y-5">
              <Benefit
                title="Appointment Notifications"
                desc="Automatically send appointment reminders and updates to patients."
              />

              <Benefit
                title="Patient Communication"
                desc="Enable streamlined healthcare communication through WhatsApp."
              />

              <Benefit
                title="Provider-Based Architecture"
                desc={`Your system is currently connected using ${
                  isMeta
                    ? "Meta WhatsApp Cloud API"
                    : "MessageBird WhatsApp API"
                } integration.`}
              />

              <Benefit
                title="Secure Integration"
                desc="Webhook verification and provider authentication are handled securely."
              />
            </div>

            {/* PROVIDER DETAILS */}
            <div className="mt-10 bg-black/20 border border-white/10 rounded-2xl p-5">
              <h2 className="font-semibold text-xl mb-4">
                Current System Configuration
              </h2>

              <div className="space-y-3 text-gray-300">
                <p>
                  Provider:{" "}
                  <span className="text-white font-semibold">{provider}</span>
                </p>

                <p>
                  Source:{" "}
                  <span className="text-white font-semibold">
                    {providerSource}
                  </span>
                </p>

                <p>
                  Mode:{" "}
                  <span className="text-green-400 font-semibold">
                    Mock/Test
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* =====================================
              FORM SECTION
          ===================================== */}

          <div className="bg-white/10 border border-white/10 backdrop-blur-md rounded-3xl p-8 text-white">
            <div className="mb-8">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 ${
                  isMeta ? "bg-green-600" : "bg-blue-600"
                }`}
              >
                <MessageCircle size={36} />
              </div>

              <h2 className="text-3xl font-bold mb-3">
                {isMeta ? "Meta WhatsApp Signup" : "MessageBird Signup"}
              </h2>

              <p className="text-gray-300 leading-relaxed">
                Enter your business details to connect your WhatsApp provider.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* BUSINESS NAME */}
              <div className="mb-5">
                <label className="block text-sm text-gray-300 mb-2">
                  Business Name
                </label>

                <div className="relative">
                  <Building2
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />

                  <input
                    type="text"
                    placeholder="Healthcare Business Name"
                    className="w-full pl-12 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-green-500"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
              </div>

              {/* PHONE */}
              <div className="mb-8">
                <label className="block text-sm text-gray-300 mb-2">
                  WhatsApp Business Number
                </label>

                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />

                  <input
                    type="tel"
                    placeholder="+2348012345678"
                    className="w-full pl-12 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-green-500"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* INFO BOX */}
              <div className="mb-8 bg-black/20 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-green-400 mt-1" size={20} />

                  <div>
                    <h3 className="font-semibold mb-2">Mock Integration</h3>

                    <p className="text-sm text-gray-300 leading-relaxed">
                      This currently uses a mock onboarding flow for testing and
                      demonstration purposes. Production provider authentication
                      will be added later.
                    </p>
                  </div>
                </div>
              </div>

              {/* BUTTON */}
              <button
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-bold transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMeta
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <>Connect {isMeta ? "Meta WhatsApp" : "MessageBird"}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * =====================================
 * BENEFIT COMPONENT
 * =====================================
 */

function Benefit({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="text-green-400" size={18} />
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>

        <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
