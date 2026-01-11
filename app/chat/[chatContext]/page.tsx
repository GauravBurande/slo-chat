"use client";

import DotLoader from "@/components/ui/dotloader";
import Chat from "../../components/chat";
import Header from "../../components/header";
import { MessageList } from "../../components/message-list";
import { useChatLogic } from "@/lib/useChatLogic";

export default function ChatPage() {
  const { messages, isLoading, unfetchedResponsePda, handleChat } =
    useChatLogic();

  return (
    <main className="px-10">
      <Header />

      <div className="flex bg-[url('/bg2.png')] bg-cover bg-no-repeat min-h-[90vh] w-full flex-col items-center justify-center">
        <MessageList messages={messages} />

        {(isLoading || unfetchedResponsePda) && (
          <div className="my-6">
            <DotLoader
              label={isLoading ? "thinking…" : "loading previous response…"}
            />
          </div>
        )}

        <Chat
          handleChat={handleChat}
          disabled={isLoading || !!unfetchedResponsePda}
        />
      </div>
    </main>
  );
}
