"use client";

import { useEffect, useRef, useState } from "react";

import axios from "axios";

import Cookies from "js-cookie";

import toast from "react-hot-toast";

import { MessageCircle, X } from "lucide-react";

import { useSelector } from "react-redux";

import BotChatWindow from "./BotChatWindow";

interface ChatMessage {
  sender: "USER" | "BOT";

  message: string;
}

export default function PatientBotChat() {
  const {
    logged,

    me,

    profileComplete,
  } = useSelector((state: any) => state.mainState);

  /**
   * =====================================
   * ONLY PATIENTS
   * =====================================
   */

  const isPatient = me?.role === "PATIENT";

  /**
   * =====================================
   * STATES
   * =====================================
   */

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "BOT",

      message:
        "Hello 👋\n\nHow can I help you today?\n\nYou can:\n- book appointments\n- check availability\n- cancel appointments\n- view bookings",
    },
  ]);

  /**
   * =====================================
   * AUTO SCROLL
   * =====================================
   */

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /**
   * =====================================
   * HIDE COMPONENT
   * =====================================
   *
   * IMPORTANT:
   * Hooks must execute first
   * before conditional return.
   */

  if (!logged || !profileComplete || !isPatient) {
    return null;
  }

  /**
   * =====================================
   * SEND MESSAGE
   * =====================================
   */

  const handleSend = async () => {
    if (!input.trim()) {
      return;
    }

    const userMessage = input.trim();

    /**
     * ADD USER MESSAGE
     */

    setMessages((prev) => [
      ...prev,

      {
        sender: "USER",

        message: userMessage,
      },
    ]);

    /**
     * CLEAR INPUT
     */

    setInput("");

    try {
      setLoading(true);

      const token = Cookies.get("access_token");

      /**
       * BOT REQUEST
       */

      const response = await axios.post(
        "/api/bot/chat",
        {
          message: userMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      /**
       * BOT RESPONSE
       */

      setMessages((prev) => [
        ...prev,

        {
          sender: "BOT",

          message: response.data.reply || "No response received",
        },
      ]);
    } catch (err: any) {
      console.error("BOT CHAT ERROR:", err);

      toast.error(err?.response?.data?.message || "Bot request failed");

      /**
       * FALLBACK MESSAGE
       */

      setMessages((prev) => [
        ...prev,

        {
          sender: "BOT",

          message: "Sorry, something went wrong while processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * =====================================
   * ENTER SEND
   * =====================================
   */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      {/* FLOATING BUTTON */}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full bg-green-600 shadow-2xl flex items-center justify-center hover:scale-105 transition"
      >
        {open ? (
          <X className="text-white w-7 h-7" />
        ) : (
          <MessageCircle className="text-white w-7 h-7" />
        )}
      </button>

      {/* CHAT WINDOW */}

      {open && (
        <BotChatWindow
          messages={messages}
          loading={loading}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleKeyDown={handleKeyDown}
          messagesEndRef={messagesEndRef}
        />
      )}
    </>
  );
}
