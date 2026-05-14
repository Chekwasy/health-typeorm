"use client";

import { Send } from "lucide-react";

import BotMessageBubble from "./BotMessageBubble";

interface ChatMessage {
  sender: "USER" | "BOT";

  message: string;
}

interface Props {
  messages: ChatMessage[];

  loading: boolean;

  input: string;

  setInput: (value: string) => void;

  handleSend: () => void;

  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  messagesEndRef: any;
}

export default function BotChatWindow({
  messages,

  loading,

  input,

  setInput,

  handleSend,

  handleKeyDown,

  messagesEndRef,
}: Props) {
  return (
    <div className="fixed bottom-24 right-5 z-50 w-[95vw] max-w-md h-[75vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#07111f]/95 backdrop-blur-xl flex flex-col">
      {/* HEADER */}

      <div className="bg-green-600 px-5 py-4 text-white flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Health Assistant</h2>

          <p className="text-xs opacity-90">Appointment booking support</p>
        </div>
      </div>

      {/* MESSAGES */}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <BotMessageBubble
            key={index}
            sender={msg.sender}
            message={msg.message}
          />
        ))}

        {/* LOADING */}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm text-sm animate-pulse">
              Typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}

      <div className="border-t border-white/10 p-3 bg-black/20 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-400"
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center hover:scale-105 transition disabled:opacity-50"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
