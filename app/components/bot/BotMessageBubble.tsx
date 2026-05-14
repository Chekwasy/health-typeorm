interface Props {
  sender: "USER" | "BOT";

  message: string;
}

export default function BotMessageBubble({
  sender,

  message,
}: Props) {
  return (
    <div
      className={`flex ${sender === "USER" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-lg ${
          sender === "USER"
            ? "bg-green-600 text-white rounded-br-sm"
            : "bg-white/10 text-gray-100 rounded-bl-sm"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
