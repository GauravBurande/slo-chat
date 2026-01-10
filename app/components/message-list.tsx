import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Message } from "@/lib/chatUtils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-h-[60vh] overflow-y-scroll max-w-4xl space-y-4 mb-8 px-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex gap-3 ${
            msg.type === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.type === "user"
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-gray-200 text-gray-900 rounded-bl-none"
            }`}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none flex items-start gap-2">
              <span>{msg.type === "user" ? "👤" : "🤖"}</span>
              <div className="flex-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
              <button className="cursor-pointer">
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy
                    onClick={() => {
                      handleCopy(msg.text);
                    }}
                    className="w-3 h-3 hover:text-pink-600"
                  />
                )}
              </button>
            </div>
            <div
              className={`text-xs mt-1 ${
                msg.type === "user" ? "text-white/70" : "text-gray-500"
              }`}
            >
              {new Date(msg.timestamp).toLocaleString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
