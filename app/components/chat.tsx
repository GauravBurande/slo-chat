"use client";

import { usePrompt } from "@/context/prompt-context";

interface IChat {
  handleChat: () => void;
}

const Chat = ({ handleChat }: IChat) => {
  const { prompt, setPrompt } = usePrompt();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  const getRows = () => {
    const lineCount = prompt.split("\n").length;
    return Math.min(Math.max(lineCount, 1), 10);
  };

  return (
    <section className="flex items-center font-mono">
      <textarea
        placeholder="what do you want to chat about?"
        className="border-b-2 min-w-3xl focus:outline-none px-4 py-2 resize-none"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={getRows()}
      />
      <button
        onClick={handleChat}
        disabled={prompt === ""}
        className="uppercase font-stretch-semi-expanded cursor-pointer border-b-2 px-4 py-2 disabled:cursor-not-allowed"
      >
        start chat
      </button>
    </section>
  );
};

export default Chat;
